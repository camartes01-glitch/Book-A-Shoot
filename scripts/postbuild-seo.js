#!/usr/bin/env node
/**
 * Runs after `expo export -p web`.
 *
 * 1. Writes dist/sitemap.xml from the pages that were actually built. A page
 *    is included only when it declares a canonical URL equal to its own path
 *    and is not marked noindex, so the sitemap can never list a duplicate,
 *    private or missing page.
 * 2. Copies the not-found page to dist/404.html so Vercel returns a real 404
 *    status for unknown URLs.
 *
 * Fails the build if a page that must be indexable is missing from the
 * sitemap, so a broken page can't be deployed silently.
 */
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "..", "dist");
const SITE = "https://www.bookashoot.online";
const MUST_INCLUDE = ["/", "/photographers", "/photographers/hyderabad", "/photographers/wedding/hyderabad"];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "_expo" || entry.name === "assets" ? [] : walk(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

function routeOf(file) {
  const rel = path.relative(DIST, file).split(path.sep).join("/").replace(/\.html$/, "");
  if (rel === "index") return "/";
  return `/${rel.replace(/\/index$/, "")}`;
}

function canonicalPath(html) {
  const tag = html.match(/<link[^>]*rel="canonical"[^>]*>/i);
  const href = tag && tag[0].match(/href="([^"]+)"/i);
  if (!href) return null;
  const url = href[1].replace(/&amp;/g, "&");
  if (!url.startsWith(SITE)) return null;
  return url.slice(SITE.length) || "/";
}

function isNoindex(html) {
  return /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html);
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function priorityFor(route) {
  if (route === "/") return "1.0";
  if (route === "/photographers" || /^\/photographers\/[^/]+$/.test(route)) return "0.9";
  if (/^\/(photographers|cinematography)\/[^/]+\/[^/]+$/.test(route)) return "0.8";
  if (route.startsWith("/blog/")) return "0.7";
  if (route === "/terms" || route === "/privacy") return "0.3";
  return "0.6";
}

function main() {
  if (!fs.existsSync(DIST)) throw new Error("dist/ not found: run expo export first.");

  const routes = new Set();
  for (const file of walk(DIST)) {
    const route = routeOf(file);
    if (route.includes("[") || route.includes("(") || route.startsWith("/+") || route.startsWith("/_")) continue;
    const html = fs.readFileSync(file, "utf8");
    if (isNoindex(html)) continue;
    if (canonicalPath(html) !== route) continue;
    routes.add(route);
  }

  const missing = MUST_INCLUDE.filter((r) => !routes.has(r));
  if (missing.length) {
    throw new Error(`Sitemap is missing required pages: ${missing.join(", ")}. Check their canonical tags.`);
  }

  const sorted = [...routes].sort((a, b) => Number(priorityFor(b)) - Number(priorityFor(a)) || a.localeCompare(b));
  const body = sorted
    .map(
      (route) =>
        // No <lastmod>: a build date on every page is not a real modification
        // date, and Google ignores lastmod values that aren't accurate.
        `  <url>\n    <loc>${escapeXml(SITE + (route === "/" ? "/" : route))}</loc>\n    <priority>${priorityFor(route)}</priority>\n  </url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), xml);

  const notFound = path.join(DIST, "+not-found.html");
  if (fs.existsSync(notFound)) fs.copyFileSync(notFound, path.join(DIST, "404.html"));

  console.log(`postbuild-seo: sitemap.xml with ${sorted.length} pages; 404.html ${fs.existsSync(notFound) ? "written" : "skipped"}`);
}

main();
