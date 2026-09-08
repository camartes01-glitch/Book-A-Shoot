#!/usr/bin/env python3
"""Build the in-app wordmark and native splash from the supplied BOOK A SHOOT artwork.

BOOK and SHOOT are copied as original letter pixels (not a font).
The camera-A is the existing supplied crop, pasted into the original lockup.
The black plate is removed by flood-filling empty pixels from the image edges so
dark lettering is never treated as background.
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/images/camartes-logo-source.png"
CAMERA_CROP = ROOT / "assets/images/camartes-camera-a.png"
WORDMARK_OUT = ROOT / "assets/images/book-a-shoot-wordmark.png"
ANDROID_OUT = ROOT / "assets/images/book-a-shoot-splash-android.png"
IOS_OUT = ROOT / "assets/images/book-a-shoot-splash-ios.png"

CANVAS = 2048
CREAM = (255, 247, 237, 255)
SAFE_DIAMETER = int(CANVAS * 0.60)
TAGLINE_Y = 575
PAD = 16
CAMERA_X0, CAMERA_X1 = 600, 1070
MIN_LETTER_PIXELS = 500


def flood_background(alpha: np.ndarray, threshold: int = 16) -> np.ndarray:
    """Mark the empty plate connected to the image edges. Letters stay foreground."""
    h, w = alpha.shape
    background = np.zeros((h, w), dtype=bool)
    seen = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        queue.append((0, x))
        queue.append((h - 1, x))
    for y in range(h):
        queue.append((y, 0))
        queue.append((y, w - 1))
    while queue:
        y, x = queue.popleft()
        if seen[y, x]:
            continue
        seen[y, x] = True
        if alpha[y, x] >= threshold:
            continue
        background[y, x] = True
        if y > 0:
            queue.append((y - 1, x))
        if y + 1 < h:
            queue.append((y + 1, x))
        if x > 0:
            queue.append((y, x - 1))
        if x + 1 < w:
            queue.append((y, x + 1))
    return background


def label_components(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    next_id = 0
    ys, xs = np.where(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if labels[y, x]:
            continue
        next_id += 1
        queue: deque[tuple[int, int]] = deque([(y, x)])
        labels[y, x] = next_id
        while queue:
            cy, cx = queue.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and labels[ny, nx] == 0:
                        labels[ny, nx] = next_id
                        queue.append((ny, nx))
    return labels


def letter_mask(rgba: np.ndarray, orange: np.ndarray) -> np.ndarray:
    """Keep BOOK/SHOOT connected regions; drop the camera hole and By Camartes."""
    r = rgba[:, :, 0].astype(np.int32)
    g = rgba[:, :, 1].astype(np.int32)
    b = rgba[:, :, 2].astype(np.int32)
    a = rgba[:, :, 3]
    lum = (r + g + b) / 3.0
    background = flood_background(a)
    dark = (~background) & (~orange) & (lum < 80) & (a > 12)
    labels = label_components(dark)
    keep = np.zeros(dark.shape, dtype=bool)
    for cid in range(1, int(labels.max()) + 1):
        ys, xs = np.where(labels == cid)
        if ys.size < MIN_LETTER_PIXELS:
            continue
        if float(ys.mean()) >= TAGLINE_Y:
            continue
        if xs.max() < CAMERA_X1 and xs.min() > CAMERA_X0:
            continue
        keep[ys, xs] = True
    return keep


def orange_mask(rgba: np.ndarray) -> np.ndarray:
    r = rgba[:, :, 0].astype(np.int16)
    g = rgba[:, :, 1].astype(np.int16)
    b = rgba[:, :, 2].astype(np.int16)
    a = rgba[:, :, 3]
    lum = (r.astype(np.int32) + g + b) / 3.0
    return (a > 8) & (r > 90) & (g > 30) & (r >= g - 8) & (r > b + 15) & (lum > 40)


def extract_wordmark(src: Image.Image, camera_crop: Image.Image) -> Image.Image:
    rgba = np.array(src.convert("RGBA"))
    orange = orange_mask(rgba)
    letters = letter_mask(rgba, orange)

    out = np.zeros_like(rgba)
    # Preserve original BOOK/SHOOT pixels (including dark ink and hairline alpha).
    out[letters] = rgba[letters]

    ys, xs = np.where(orange)
    if ys.size == 0:
        raise SystemExit("camera-A not found in supplied artwork")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    placed = camera_crop.convert("RGBA").resize((x1 - x0, y1 - y0), Image.Resampling.NEAREST)
    canvas = Image.fromarray(out, "RGBA")
    canvas.alpha_composite(placed, (x0, y0))
    out = np.array(canvas)

    ys, xs = np.where(out[:, :, 3] > 0)
    if ys.size == 0:
        raise SystemExit("wordmark extraction produced an empty image")
    cx0 = max(0, int(xs.min()) - PAD)
    cy0 = max(0, int(ys.min()) - PAD)
    cx1 = min(out.shape[1], int(xs.max()) + 1 + PAD)
    cy1 = min(out.shape[0], int(ys.max()) + 1 + PAD)
    return Image.fromarray(out[cy0:cy1, cx0:cx1], "RGBA")


def fit_contain(mark: Image.Image, max_w: float, max_h: float) -> Image.Image:
    scale = min(max_w / mark.width, max_h / mark.height)
    width = max(1, int(round(mark.width * scale)))
    height = max(1, int(round(mark.height * scale)))
    return mark.resize((width, height), Image.Resampling.LANCZOS)


def paste_centered(canvas: Image.Image, mark: Image.Image) -> None:
    x = (canvas.width - mark.width) // 2
    y = (canvas.height - mark.height) // 2
    canvas.paste(mark, (x, y), mark)


def write_android_densities(src: Image.Image) -> None:
    densities = {
        "drawable-mdpi": 288,
        "drawable-hdpi": 432,
        "drawable-xhdpi": 576,
        "drawable-xxhdpi": 864,
        "drawable-xxxhdpi": 1152,
    }
    res = ROOT / "android/app/src/main/res"
    if not res.exists():
        return
    rgba = src.convert("RGBA")
    for folder, size in densities.items():
        dest_dir = res / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        scaled = rgba.resize((size, size), Image.Resampling.LANCZOS)
        scaled.save(dest_dir / "splashscreen_logo.png", "PNG", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing supplied logo artwork: {SOURCE}")
    if not CAMERA_CROP.exists():
        raise SystemExit(f"missing camera-A crop: {CAMERA_CROP}")
    source = Image.open(SOURCE).convert("RGBA")
    camera = Image.open(CAMERA_CROP).convert("RGBA")
    wordmark = extract_wordmark(source, camera)
    wordmark.save(WORDMARK_OUT, "PNG", optimize=True)

    android = Image.new("RGBA", (CANVAS, CANVAS), CREAM)
    android_mark = fit_contain(wordmark, SAFE_DIAMETER * 0.90, SAFE_DIAMETER * 0.90)
    paste_centered(android, android_mark)
    android.convert("RGB").save(ANDROID_OUT, "PNG", optimize=True)
    write_android_densities(android)

    ios = Image.new("RGBA", (CANVAS, CANVAS), CREAM)
    ios_mark = fit_contain(wordmark, CANVAS * 0.78, 520)
    paste_centered(ios, ios_mark)
    ios.convert("RGB").save(IOS_OUT, "PNG", optimize=True)

    print(f"source {source.size} -> wordmark {wordmark.size} {WORDMARK_OUT.name}")
    print(f"camera-A crop reused {camera.size} from {CAMERA_CROP.name} (not redrawn)")
    print(f"android splash {android_mark.size} inside {SAFE_DIAMETER}px circle -> {ANDROID_OUT.name}")
    print(f"ios splash {ios_mark.size} -> {IOS_OUT.name}")
    print("BOOK/SHOOT copied from connected letter regions (not a substitute font)")


if __name__ == "__main__":
    main()
