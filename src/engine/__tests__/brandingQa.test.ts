/**
 * Locks the approved PR #10 BOOK A SHOOT branding so splash/in-app assets
 * cannot silently revert to the old black-plate PNG or a missing camera-A.
 */
import fs from "fs";
import path from "path";
// pngjs is already present via Expo tooling; keep this test free of extra types packages.
// @ts-expect-error -- no @types/pngjs in this app
import { PNG } from "pngjs";

const ROOT = path.resolve(__dirname, "../../..");

function readPng(rel: string): PNG {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  return PNG.sync.read(buf);
}

function pixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const i = (png.width * y + x) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

describe("BOOK A SHOOT branding lock", () => {
  test("app.json splash uses the cream camera-A assets, not the retired logo PNG", () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8"));
    const plugin = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-splash-screen");
    expect(plugin).toBeTruthy();
    const cfg = plugin[1];
    expect(JSON.stringify(cfg)).not.toContain("book-a-shoot-logo.png");
    expect(cfg.backgroundColor).toBe("#FFF7ED");
    expect(cfg.resizeMode).toBe("contain");
    expect(cfg.android.image).toBe("./assets/images/book-a-shoot-splash-android.png");
    expect(cfg.android.backgroundColor).toBe("#FFF7ED");
    expect(cfg.android.imageWidth).toBe(288);
    expect(cfg.ios.image).toBe("./assets/images/book-a-shoot-splash-ios.png");
    expect(cfg.ios.backgroundColor).toBe("#FFF7ED");
    expect(cfg.ios.resizeMode ?? cfg.resizeMode).toBe("contain");
  });

  test("the in-app wordmark uses the transparent camera-A and a single accessibility label", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/components/BookAShootLogo.tsx"), "utf8");
    expect(src).toContain('accessibilityLabel="BOOK A SHOOT"');
    expect(src).toContain("book-a-shoot-camera-a.png");
    expect(src).not.toContain("book-a-shoot-logo.png");
    expect(src).not.toContain("Welcome to Camartes");
    expect(src).toContain('alt: ""');
    expect(src).toContain('"aria-hidden": true');
    expect(src).toContain('importantForAccessibility="no"');
  });

  test("camera-A artwork is RGBA with a transparent plate, not a black rectangle", () => {
    const png = readPng("assets/images/book-a-shoot-camera-a.png");
    expect(png.width).toBe(554);
    expect(png.height).toBe(1024);
    const [r, g, b, a] = pixel(png, 0, 0);
    expect(a).toBe(0);
    expect(r + g + b).toBe(0);
    const transparent = [...png.data].filter((_, i) => i % 4 === 3 && png.data[i] === 0).length;
    expect(transparent).toBeGreaterThan(png.width * png.height * 0.4);
  });

  test("Android splash is cream with branding inside the Android 12 circle", () => {
    const png = readPng("assets/images/book-a-shoot-splash-android.png");
    expect(png.width).toBe(2048);
    expect(png.height).toBe(2048);
    const cream = pixel(png, 8, 8);
    expect(cream[0]).toBe(255);
    expect(cream[1]).toBe(247);
    expect(cream[2]).toBe(237);
    const cx = png.width / 2;
    const cy = png.height / 2;
    const safeR = png.width * 0.6 * 0.5;
    let maxR = 0;
    for (let y = 0; y < png.height; y += 8) {
      for (let x = 0; x < png.width; x += 8) {
        const [r, g, b] = pixel(png, x, y);
        if (Math.abs(r - 255) + Math.abs(g - 247) + Math.abs(b - 237) > 18) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist > maxR) maxR = dist;
        }
      }
    }
    expect(maxR).toBeGreaterThan(80);
    expect(maxR).toBeLessThanOrEqual(safeR);
  });

  test("iOS splash is a cream horizontal wordmark, not a black plate", () => {
    const png = readPng("assets/images/book-a-shoot-splash-ios.png");
    expect(png.width).toBe(2048);
    expect(png.height).toBe(2048);
    const cream = pixel(png, 8, 8);
    expect(cream[0]).toBe(255);
    expect(cream[1]).toBe(247);
    expect(cream[2]).toBe(237);
    let minX = png.width;
    let maxX = 0;
    let minY = png.height;
    let maxY = 0;
    for (let y = 0; y < png.height; y += 8) {
      for (let x = 0; x < png.width; x += 8) {
        const [r, g, b] = pixel(png, x, y);
        if (Math.abs(r - 255) + Math.abs(g - 247) + Math.abs(b - 237) > 18) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const w = maxX - minX;
    const h = maxY - minY;
    expect(w).toBeGreaterThan(h * 3);
    expect(h).toBeGreaterThan(80);
    expect(h).toBeLessThan(400);
  });
});
