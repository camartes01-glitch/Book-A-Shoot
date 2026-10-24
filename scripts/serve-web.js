#!/usr/bin/env node
/**
 * Static production web server for `dist/` directory.
 * Serves the statically exported Expo website on port 43158 (or PORT env var).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_DIR = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT || 43158);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname);
  let filePath = path.join(DIST_DIR, urlPath === "/" ? "index.html" : urlPath);

  // If directory, try index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // If path doesn't have an extension and doesn't exist, try appending .html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlCandidate = filePath + ".html";
    if (fs.existsSync(htmlCandidate)) {
      filePath = htmlCandidate;
    }
  }

  // Fallback to index.html for SPA routing if not found
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Build not found. Please run `npm run build` first.");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[Book-A-Shoot Preview] Serving ${DIST_DIR} at http://${HOST}:${PORT}`);
});
