(() => {
  const products = { regular: [], premium: [] };
  const productList = document.getElementById("product-list");
  const categoryButtons = Array.from(document.querySelectorAll("[data-menu-category]"));
  const initialCategory = categoryButtons.find((button) => button.classList.contains("active"));

  function createProductItem(product) {
    const item = document.createElement("li");
    item.className = "item";
    item.dataset.productId = product.id;

    const dot = document.createElement("div");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");

    const main = document.createElement("div");
    main.className = "item-main";

    const header = document.createElement("div");
    header.className = "item-header";

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = product.name;

    const price = document.createElement("span");
    price.className = "price";
    if (product.oldPrice) {
      const oldPrice = document.createElement("span");
      oldPrice.className = "old";
      oldPrice.textContent = `$ ${product.oldPrice.toFixed(2)}`;
      price.append(oldPrice);

      const currentPrice = document.createElement("span");
      currentPrice.textContent = `$ ${product.price.toFixed(2)}`;
      price.append(currentPrice);

      const savings = document.createElement("span");
      savings.className = "save";
      const discount = Math.round((1 - product.price / product.oldPrice) * 100);
      savings.textContent = `(${discount}%)`;
      price.append(savings);
    } else {
      price.textContent = `$${product.price.toFixed(2)}`;
    }

    header.append(name, price);

    const description = document.createElement("div");
    description.className = "desc";
    description.textContent = product.description;
    main.append(header, description);

    const actions = document.createElement("div");
    actions.className = "thumb-action";

    const image = document.createElement("div");
    image.className = "thumb-mini";
    image.setAttribute("role", "img");
    image.setAttribute("aria-label", `${product.name} cupcake`);
    image.style.backgroundImage = `url("${product.image}")`;

    const addButton = document.createElement("button");
    addButton.className = "add-btn";
    addButton.type = "button";
    addButton.dataset.price = product.price;
    addButton.dataset.productId = product.id;
    addButton.textContent = "Add";

    actions.append(image, addButton);
    item.append(dot, main, actions);
    return item;
  }

  function showCategory(category) {
    if (!Object.prototype.hasOwnProperty.call(products, category)) return;

    productList.replaceChildren(...products[category].map(createProductItem));
    categoryButtons.forEach((button) => {
      const isActive = button.dataset.menuCategory === category;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showCategory(button.dataset.menuCategory);
    });
  });

  async function loadProducts() {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error(`Product request failed with status ${response.status}.`);
      const catalog = await response.json();
      if (!Array.isArray(catalog)) throw new Error("The product catalog response is invalid.");
      catalog.forEach((product) => {
        if (Object.prototype.hasOwnProperty.call(products, product.category)) {
          products[product.category].push(product);
        }
      });
      if (initialCategory) showCategory(initialCategory.dataset.menuCategory);
    } catch (error) {
      console.error("Could not load products from the database.", error);
      const message = document.createElement("li");
      message.className = "desc";
      message.textContent = "Products are temporarily unavailable. Please try again later.";
      productList.replaceChildren(message);
    }
  }

  loadProducts();
})();
