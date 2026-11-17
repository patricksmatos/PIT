import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOrder,
  databasePath,
  HttpError,
  isDatabaseFile,
  listProducts
} from "./database/database.js";

const root = dirname(fileURLToPath(import.meta.url));
const databaseFolder = resolve(root, "database");
const port = Number(process.env.PORT || 3000);
const maxRequestBytes = 1024 * 1024;

function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxRequestBytes) {
      throw new HttpError(413, "Request body is too large.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

async function serveFile(pathname, response, headOnly) {
  const relativePath = pathname === "/" ? "MenuRegular.html" : decodeURIComponent(pathname).slice(1);
  const filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    throw new HttpError(403, "Access denied.");
  }
  if (
    filePath === databaseFolder ||
    filePath.startsWith(databaseFolder + sep) ||
    isDatabaseFile(filePath)
  ) {
    throw new HttpError(404, "File not found.");
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(headOnly ? undefined : file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      throw new HttpError(404, "File not found.");
    }
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/api/products" && request.method === "GET") {
      const category = url.searchParams.get("category");
      if (category !== null && category !== "regular" && category !== "premium") {
        throw new HttpError(400, "Product category is invalid.");
      }
      sendJson(response, 200, listProducts(category));
      return;
    }

    if (url.pathname === "/api/orders" && request.method === "POST") {
      sendJson(response, 201, createOrder(await readJson(request)));
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      throw new HttpError(404, "API endpoint not found.");
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      throw new HttpError(405, "Method not allowed.");
    }
    await serveFile(url.pathname, response, request.method === "HEAD");
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error("Request failed.", error);
    sendJson(response, 500, { error: "The request could not be completed." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Cupcakes PIT is available at http://127.0.0.1:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});
