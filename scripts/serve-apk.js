#!/usr/bin/env node
/**
 * Cursor CVM preview server for the customer-app debug/release APK.
 * - Listens on 0.0.0.0 (ingress is not localhost)
 * - Serves a simple download landing page at "/" and "/download"
 * - Supports HTTP range requests so large APKs resume/stream properly
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const APK_DIR = path.resolve(__dirname, "..", "apk-dist");
const APK_NAME = "camartes-customer.apk";
const APK_PATH = path.join(APK_DIR, APK_NAME);
const PORT = Number(process.env.PORT || 43159);
const HOST = process.env.HOST || "0.0.0.0";

const DOWNLOAD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Download Camartes Customer App</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #FFF7ED; color: #111827; max-width: 34rem; margin: 48px auto; padding: 0 20px; }
    a.btn { display: inline-block; background: #FF6B35; color: #fff; font-weight: 800; text-decoration: none; padding: 14px 20px; border-radius: 12px; margin: 8px 8px 8px 0; }
    p { color: #6B7280; line-height: 1.5; }
    code { background: #FFEDD5; padding: 2px 6px; border-radius: 4px; color: #111827; }
    ul { color: #374151; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Camartes — Customer Booking App</h1>
  <p>Android debug-signed APK for testing. Package: <code>com.camartes.customer</code></p>
  <p><a class="btn" href="/${APK_NAME}">Download APK on this phone</a></p>
  <p>Open this page from <strong>Cursor Preview</strong> on your Android phone, then tap the orange button. Do not use <code>127.0.0.1</code> — that points to your phone, not the cloud machine.</p>
  <ul>
    <li>Enable <strong>Install unknown apps</strong> for your browser or file manager.</li>
    <li>If Play Protect warns, choose <strong>Install anyway</strong> (this is a locally-signed test build, not from Play Store).</li>
  </ul>
  <p>Sign in with a mobile number — the OTP is shown on-screen (no SMS gateway is wired up yet).</p>
</body>
</html>`;

function sendApk(req, res) {
  if (!fs.existsSync(APK_PATH)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("APK not found");
    return;
  }
  const st = fs.statSync(APK_PATH);
  const size = st.size;
  const headers = {
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": `attachment; filename="${APK_NAME}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=60",
    "Access-Control-Allow-Origin": "*",
  };
  const range = String(req.headers.range || "");
  const m = /^bytes=(\d*)-(\d*)$/i.exec(range);
  let start = 0;
  let end = size - 1;
  if (m) {
    if (m[1]) start = Number(m[1]);
    if (m[2]) end = Number(m[2]);
    end = Math.min(end, size - 1);
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    headers["Content-Length"] = String(end - start + 1);
    res.writeHead(206, headers);
  } else {
    headers["Content-Length"] = String(size);
    res.writeHead(200, headers);
  }
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(APK_PATH, { start, end }).pipe(res);
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  if (pathname === `/${APK_NAME}`) {
    sendApk(req, res);
    return;
  }
  const body = Buffer.from(DOWNLOAD_HTML);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store" });
  if (req.method === "HEAD") return res.end();
  res.end(body);
});

server.keepAliveTimeout = 600000;
server.headersTimeout = 610000;
server.requestTimeout = 600000;
server.timeout = 600000;

server.listen(PORT, HOST, () => {
  console.log(`Camartes Customer APK preview http://${HOST}:${PORT}`);
});
