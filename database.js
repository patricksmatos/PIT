import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const databaseFolder = dirname(fileURLToPath(import.meta.url));
export const databasePath = resolve(
  process.env.DATABASE_PATH || join(databaseFolder, "cupcakes.sqlite")
);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const allowedFulfillment = new Set(["Pickup", "Delivery"]);
const allowedPaymentMethods = new Set(["Credit card", "PIX", "Cash"]);

const catalog = [
  {
    id: "cinnamon-toast",
    category: "regular",
    name: "Cinnamon Toast",
    description: "Cinnamon cake topped with buttercream icing and sprikled with cinnamon sugar",
    image: "./Menu/Regular/CinnamonToast.png",
    priceCents: 236,
    oldPriceCents: 248
  },
  {
    id: "key-lime",
    category: "regular",
    name: "Key Lime",
    description: "Cake made with real lime juice topped with key lime cream cheese icing and a candy lime wedge",
    image: "./Menu/Regular/KeyLime.png",
    priceCents: 236,
    oldPriceCents: 248
  },
  {
    id: "lemon-drop",
    category: "regular",
    name: "Lemon Drop",
    description: "Lemon cake made with real lemon juice and lemon buttercream icing, topped with a candy lemon wedge",
    image: "./Menu/Regular/LemonDrop.png",
    priceCents: 236,
    oldPriceCents: 248
  },
  {
    id: "strawberry",
    category: "regular",
    name: "Strawberry",
    description: "Strawberry cake topped with strawberry buttercream icing",
    image: "./Menu/Regular/Strawberry.png",
    priceCents: 236,
    oldPriceCents: 248
  },
  {
    id: "chocolate-peanut-butter-cup",
    category: "premium",
    name: "Chocolate Peanut Butter Cup",
    description: "Decadent cake made with Ghirardelli chocolate, topped with creamy peanut butter buttercream icing and crumbled Reese's Cups.",
    image: "./Menu/Premium/Chocolate Peanut Butter.png",
    priceCents: 332,
    oldPriceCents: 349
  },
  {
    id: "mocha",
    category: "premium",
    name: "Mocha",
    description: "Decadent cake made with Ghirardelli chocolate, iced with espresso buttercream and topped with a chocolate-covered espresso bean.",
    image: "./Menu/Premium/Mocha.png",
    priceCents: 332,
    oldPriceCents: 349
  },
  {
    id: "cookies-and-cream",
    category: "premium",
    name: "Cookies & Cream",
    description: "Decadent cake made with Ghirardelli chocolate, topped with white icing mixed with crushed Oreo cookies and decorated with a cookie.",
    image: "./Menu/Premium/Cookies Cream.png",
    priceCents: 332,
    oldPriceCents: 349
  },
  {
    id: "chocolate-cream-filled",
    category: "premium",
    name: "Chocolate Cream-Filled",
    description: "Decadent cake made from Ghirardelli chocolate with a cream filling, topped with chocolate icing.",
    image: "./Menu/Premium/Chocolate Cream Filled.png",
    priceCents: 332,
    oldPriceCents: 349
  }
];

function initializeDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK (category IN ('regular', 'premium')),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents > 0),
      old_price_cents INTEGER CHECK (old_price_cents IS NULL OR old_price_cents > 0),
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      fulfillment TEXT NOT NULL CHECK (fulfillment IN ('Pickup', 'Delivery')),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('Credit card', 'PIX', 'Cash')),
      total_cents INTEGER NOT NULL CHECK (total_cents > 0),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      UNIQUE (order_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
  `);

  const addProduct = database.prepare(`
    INSERT OR IGNORE INTO products
      (id, category, name, description, image, price_cents, old_price_cents)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const product of catalog) {
    addProduct.run(
      product.id,
      product.category,
      product.name,
      product.description,
      product.image,
      product.priceCents,
      product.oldPriceCents
    );
  }

  return database;
}

const database = initializeDatabase();
const getProducts = database.prepare(`
  SELECT id, category, name, description, image, price_cents, old_price_cents
  FROM products WHERE active = 1 AND (? IS NULL OR category = ?)
  ORDER BY CASE category WHEN 'regular' THEN 0 ELSE 1 END, name
`);
const getProduct = database.prepare(`
  SELECT id, name, price_cents FROM products WHERE id = ? AND active = 1
`);
const addOrder = database.prepare(`
  INSERT INTO orders (id, fulfillment, payment_method, total_cents)
  VALUES (?, ?, ?, ?)
`);
const addOrderItem = database.prepare(`
  INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
  VALUES (?, ?, ?, ?, ?)
`);

function dollars(cents) {
  return cents / 100;
}

function productJson(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    image: row.image,
    price: dollars(row.price_cents),
    oldPrice: row.old_price_cents === null ? null : dollars(row.old_price_cents)
  };
}

export function listProducts(category) {
  return getProducts.all(category, category).map(productJson);
}

function validateOrder(payload) {
  if (
    !payload ||
    !allowedFulfillment.has(payload.fulfillment) ||
    !allowedPaymentMethods.has(payload.paymentMethod) ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0 ||
    payload.items.length > 50
  ) {
    throw new HttpError(400, "Order details are invalid.");
  }

  const quantities = new Map();
  for (const item of payload.items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      throw new HttpError(400, "Order items are invalid.");
    }
    const quantity = (quantities.get(item.productId) || 0) + item.quantity;
    if (quantity > 99) throw new HttpError(400, "An item's quantity cannot exceed 99.");
    quantities.set(item.productId, quantity);
  }

  return quantities;
}

export function createOrder(payload) {
  const quantities = validateOrder(payload);
  const items = [];
  let totalCents = 0;

  for (const [productId, quantity] of quantities) {
    const product = getProduct.get(productId);
    if (!product) throw new HttpError(400, "An order item is no longer available.");
    const lineTotalCents = product.price_cents * quantity;
    totalCents += lineTotalCents;
    items.push({
      productId: product.id,
      name: product.name,
      unitPrice: dollars(product.price_cents),
      quantity,
      lineTotal: dollars(lineTotalCents)
    });
  }

  const id = randomUUID();
  database.exec("BEGIN");
  try {
    addOrder.run(id, payload.fulfillment, payload.paymentMethod, totalCents);
    for (const item of items) {
      const product = getProduct.get(item.productId);
      addOrderItem.run(id, product.id, product.name, product.price_cents, item.quantity);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return {
    id,
    fulfillment: payload.fulfillment,
    paymentMethod: payload.paymentMethod,
    total: dollars(totalCents),
    items
  };
}

export function isDatabaseFile(path) {
  return path === databasePath || path.startsWith(databasePath + "-");
}
