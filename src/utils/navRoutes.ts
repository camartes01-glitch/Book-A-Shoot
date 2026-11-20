/** Public marketing-site routes — the ONLY places the landing bottom nav
 * appears (for guests and signed-in customers alike). Every authenticated
 * screen ((tabs), booking wizard, booking details, chat, auth) is excluded by
 * construction, so the two navs can never show together or leak elsewhere. */
const MARKETING_EXACT = new Set(["/", "/index", "/landing", "/services", "/about", "/blogs", "/contact", "/terms", "/privacy", "/careers"]);
const MARKETING_PREFIXES = ["/blog/", "/photographers/", "/cinematography/"];

export function isMarketingRoute(pathname: string, firstSegment: string | undefined): boolean {
  if (firstSegment === "(tabs)" || firstSegment === "(auth)") return false;
  const path = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
  return MARKETING_EXACT.has(path) || MARKETING_PREFIXES.some((p) => path.startsWith(p));
}
