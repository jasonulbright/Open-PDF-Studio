"""Generate SpectraPDF app icon (256x256 ICO with multiple sizes).

Creates a modern PDF icon: rounded rectangle with gradient background,
white "PDF" text, and a spectral accent stripe.

Requires: Pillow (pip install Pillow)
Usage: python scripts/generate-icon.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 24, 32, 48, 64, 128, 256]
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'build')


def create_icon(size: int) -> Image.Image:
    """Create a single icon at the given size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background — full-bleed (no margin, matches taskbar icon sizing)
    radius = max(2, size // 6)
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=radius,
        fill=(20, 30, 70, 255),
    )
    # Spectral accent stripe (gradient band across middle)
    stripe_h = max(2, size // 8)
    stripe_y = size // 2 - stripe_h // 2
    colors = [
        (139, 92, 246),   # violet
        (59, 130, 246),   # blue
        (16, 185, 129),   # emerald
        (245, 158, 11),   # amber
        (239, 68, 68),    # red
    ]
    band_w = max(1, size // len(colors))
    for i, color in enumerate(colors):
        x0 = i * band_w
        x1 = min((i + 1) * band_w, size - 1)
        draw.rectangle([x0, stripe_y, x1, stripe_y + stripe_h - 1], fill=(*color, 180))

    # "PDF" text centered
    if size >= 32:
        font_size = max(10, size // 4)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), "PDF", font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = (size - tw) // 2
        ty = size // 2 - th // 2 + size // 8  # below the stripe
        draw.text((tx, ty), "PDF", fill=(255, 255, 255, 230), font=font)

    return img


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    images = [create_icon(s) for s in SIZES]
    ico_path = os.path.join(OUTPUT_DIR, 'icon.ico')
    # Save as ICO with all sizes
    images[-1].save(ico_path, format='ICO', append_images=images[:-1], sizes=[(s, s) for s in SIZES])
    # Also save a 256px PNG for Tauri bundler
    png_path = os.path.join(OUTPUT_DIR, 'icon.png')
    images[-1].save(png_path, format='PNG')
    print(f"Created {ico_path} ({len(SIZES)} sizes)")
    print(f"Created {png_path}")


if __name__ == '__main__':
    main()
