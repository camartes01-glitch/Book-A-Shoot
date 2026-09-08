#!/usr/bin/env python3
"""Generate native splash assets for the text-based BOOK A SHOOT wordmark.

In-app UI uses React Native text plus the transparent camera-A mark. Native OS
splash screens require a static image, so these files composite cream, dark
BOOK/SHOOT, and the same camera-A PNG (black plate already removed).

Android 12+ circularly masks the splash icon. The Android asset is a square
cream canvas with a stacked wordmark kept inside ~60% diameter.
iOS uses a horizontal wordmark on the same cream field, contain/scaleAspectFit.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ANDROID_OUT = ROOT / "assets/images/book-a-shoot-splash-android.png"
IOS_OUT = ROOT / "assets/images/book-a-shoot-splash-ios.png"
CAMERA_A = ROOT / "assets/images/book-a-shoot-camera-a.png"
PREVIEW = Path("/opt/cursor/artifacts/camera_a_wordmark_android12_mask_preview.png")

CANVAS = 2048
CREAM = (255, 247, 237)
INK = (31, 41, 55)
SAFE_DIAMETER = int(CANVAS * 0.60)

FONT_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"),
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def paste_camera_a(canvas: Image.Image, cx: float, top: float, height: float) -> int:
    """Place the transparent camera-A mark. Returns scaled width."""
    symbol = Image.open(CAMERA_A).convert("RGBA")
    width = max(1, round(symbol.width * (height / symbol.height)))
    scaled = symbol.resize((width, int(round(height))), Image.Resampling.LANCZOS)
    x = int(round(cx - width / 2))
    y = int(round(top))
    canvas.paste(scaled, (x, y), scaled)
    return width


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, cx: float, y: float, fnt: ImageFont.FreeTypeFont) -> int:
    w, h = text_size(draw, text, fnt)
    draw.text((cx - w / 2, y), text, font=fnt, fill=INK, spacing=0)
    return h


def stacked_wordmark(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    cx = CANVAS / 2
    book_font = font(210)
    shoot_font = font(210)
    attr_font = font(72)
    a_h = 280
    gap = 28
    book_h = text_size(draw, "BOOK", book_font)[1]
    shoot_h = text_size(draw, "SHOOT", shoot_font)[1]
    attr_h = text_size(draw, "By Camartes", attr_font)[1]
    total = book_h + a_h + shoot_h + attr_h + gap * 3
    y = (CANVAS - total) / 2
    y += draw_centered_text(draw, "BOOK", cx, y, book_font) + gap
    paste_camera_a(canvas, cx, y, a_h)
    y += a_h + gap
    y += draw_centered_text(draw, "SHOOT", cx, y, shoot_font) + gap
    draw_centered_text(draw, "By Camartes", cx, y, attr_font)


def horizontal_wordmark(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    fnt = font(220)
    a_h = 220
    gap = 36
    book_w, book_h = text_size(draw, "BOOK", fnt)
    shoot_w, shoot_h = text_size(draw, "SHOOT", fnt)
    symbol = Image.open(CAMERA_A).convert("RGBA")
    a_w = a_h * (symbol.width / symbol.height)
    total_w = book_w + gap + a_w + gap + shoot_w
    x = (CANVAS - total_w) / 2
    cy = CANVAS / 2
    book_y = cy - book_h / 2 - 18
    draw.text((x, book_y), "BOOK", font=fnt, fill=INK)
    paste_camera_a(canvas, x + book_w + gap + a_w / 2, cy - a_h / 2, a_h)
    draw.text((x + book_w + gap + a_w + gap, book_y), "SHOOT", font=fnt, fill=INK)


def mask_preview(src: Image.Image, dest: Path) -> None:
    preview = src.convert("RGBA")
    overlay = Image.new("RGBA", (CANVAS, CANVAS), (17, 24, 39, 140))
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    r = SAFE_DIAMETER // 2
    cx = cy = CANVAS // 2
    ImageDraw.Draw(mask).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    Image.composite(preview, Image.alpha_composite(preview, overlay), mask).save(dest, "PNG", optimize=True)


def main() -> None:
    android = Image.new("RGB", (CANVAS, CANVAS), CREAM)
    stacked_wordmark(android)
    android.save(ANDROID_OUT, "PNG", optimize=True)

    ios = Image.new("RGB", (CANVAS, CANVAS), CREAM)
    horizontal_wordmark(ios)
    ios.save(IOS_OUT, "PNG", optimize=True)

    mask_preview(android, PREVIEW)
    print(f"wrote {ANDROID_OUT} ({ANDROID_OUT.stat().st_size} bytes)")
    print(f"wrote {IOS_OUT} ({IOS_OUT.stat().st_size} bytes)")
    print(f"wrote {PREVIEW}")


if __name__ == "__main__":
    main()
