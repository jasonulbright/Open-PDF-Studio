"""Convert an external icon image to SpectraPDF ICO format.

Crops transparent/white border, resizes to fill, generates multi-size ICO.

Usage: python scripts/convert-icon.py <input.png>
"""

from PIL import Image
import os
import sys

SIZES = [16, 24, 32, 48, 64, 128, 256]
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'build')


def autocrop(img: Image.Image) -> Image.Image:
    """Crop transparent or near-white borders."""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    # Find bounding box of non-transparent, non-white pixels
    pixels = img.load()
    w, h = img.size
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Skip transparent or near-white pixels
            if a < 20 or (r > 240 and g > 240 and b > 240):
                continue
            left = min(left, x)
            top = min(top, y)
            right = max(right, x)
            bottom = max(bottom, y)
    if right <= left or bottom <= top:
        return img  # nothing to crop
    # Add 1px to right/bottom for inclusive crop
    return img.crop((left, top, right + 1, bottom + 1))


def make_square(img: Image.Image) -> Image.Image:
    """Pad to square if not already."""
    w, h = img.size
    if w == h:
        return img
    size = max(w, h)
    square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    square.paste(img, ((size - w) // 2, (size - h) // 2))
    return square


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/convert-icon.py <input.png>")
        sys.exit(1)

    src_path = sys.argv[1]
    img = Image.open(src_path).convert('RGBA')
    print(f"Input: {img.size[0]}x{img.size[1]}")

    cropped = autocrop(img)
    print(f"After crop: {cropped.size[0]}x{cropped.size[1]}")

    square = make_square(cropped)
    print(f"After square: {square.size[0]}x{square.size[1]}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    images = []
    for s in SIZES:
        resized = square.resize((s, s), Image.LANCZOS)
        images.append(resized)

    ico_path = os.path.join(OUTPUT_DIR, 'icon.ico')
    images[-1].save(ico_path, format='ICO', append_images=images[:-1],
                    sizes=[(s, s) for s in SIZES])
    png_path = os.path.join(OUTPUT_DIR, 'icon.png')
    images[-1].save(png_path, format='PNG')
    print(f"Created {ico_path} ({len(SIZES)} sizes)")
    print(f"Created {png_path}")


if __name__ == '__main__':
    main()
