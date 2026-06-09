"""Generate NSIS installer graphics for SpectraPDF."""
from PIL import Image, ImageDraw, ImageFont
import os

NAVY = (26, 26, 46)
WHITE = (255, 255, 255)
SPECTRUM = [
    (179, 163, 214),  # purple
    (108, 214, 174),  # green
    (240, 186, 100),  # orange
    (240, 128, 128),  # pink/red
]

ICONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'src-tauri', 'icons')


def draw_spectrum_bar(draw, x, y, width, height):
    """Draw the signature spectrum color bar."""
    band_w = width // len(SPECTRUM)
    for i, color in enumerate(SPECTRUM):
        x0 = x + i * band_w
        x1 = x0 + band_w if i < len(SPECTRUM) - 1 else x + width
        draw.rectangle([x0, y, x1, y + height], fill=color)


def try_load_font(size):
    """Try to load a clean font, fall back to default."""
    font_paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def try_load_bold_font(size):
    """Try to load a bold font, fall back to regular."""
    bold_paths = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    for fp in bold_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return try_load_font(size)


def gen_header():
    """150x57 header image for installer pages."""
    img = Image.new('RGB', (150, 57), NAVY)
    draw = ImageDraw.Draw(img)

    # Spectrum bar across top
    draw_spectrum_bar(draw, 0, 0, 150, 4)

    # "Spectra PDF" text centered
    font = try_load_bold_font(16)
    bbox = draw.textbbox((0, 0), "Spectra PDF", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (150 - tw) // 2
    ty = 4 + (53 - th) // 2
    draw.text((tx, ty), "Spectra PDF", fill=WHITE, font=font)

    path = os.path.join(ICONS_DIR, 'installer-header.bmp')
    img.save(path, 'BMP')
    print(f"  Header: {path}")


def gen_sidebar():
    """164x314 sidebar image for welcome/finish pages."""
    img = Image.new('RGB', (164, 314), NAVY)
    draw = ImageDraw.Draw(img)

    # Spectrum bar across top — full width
    draw_spectrum_bar(draw, 0, 0, 164, 6)

    # "Spectra" text — bottom of top third (~95px)
    font_large = try_load_bold_font(24)
    bbox = draw.textbbox((0, 0), "Spectra", font=font_large)
    tw = bbox[2] - bbox[0]
    draw.text(((164 - tw) // 2, 88), "Spectra", fill=WHITE, font=font_large)

    # "PDF" text — top of middle third (~118px)
    font_mid = try_load_font(20)
    bbox = draw.textbbox((0, 0), "PDF", font=font_mid)
    tw = bbox[2] - bbox[0]
    draw.text(((164 - tw) // 2, 118), "PDF", fill=(180, 180, 200), font=font_mid)

    # Spectrum bar across bottom — full width
    draw_spectrum_bar(draw, 0, 308, 164, 6)

    path = os.path.join(ICONS_DIR, 'installer-sidebar.bmp')
    img.save(path, 'BMP')
    print(f"  Sidebar: {path}")


if __name__ == '__main__':
    print("Generating NSIS installer graphics...")
    gen_header()
    gen_sidebar()
    print("Done.")
