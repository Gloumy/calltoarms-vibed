"""Génère les icônes PWA à partir de public/logo.png.

Lance : python scripts/generate-pwa-icons.py

Sorties dans public/ :
  - icon-192.png        (192x192, transparent, "any")
  - icon-512.png        (512x512, transparent, "any")
  - icon-maskable.png   (512x512, fond violet, safe zone 80% pour Android adaptive)
  - apple-touch-icon.png (180x180, fond violet — iOS arrondit les coins automatiquement)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'logo.png'
OUT = ROOT / 'public'

BRAND = (83, 74, 183, 255)  # #534AB7

def trim_transparent(img: Image.Image) -> Image.Image:
    """Crop l'image à son contenu non-transparent."""
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img

def fit_into(canvas_size: int, content: Image.Image, content_ratio: float, bg) -> Image.Image:
    """Place content centré sur un carré canvas_size×canvas_size,
    en occupant content_ratio de la dimension la plus longue.
    """
    canvas = Image.new('RGBA', (canvas_size, canvas_size), bg)
    target = int(canvas_size * content_ratio)
    w, h = content.size
    scale = target / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = content.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (canvas_size - new_w) // 2
    y = (canvas_size - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

def main():
    if not SRC.exists():
        raise SystemExit(f'Source manquante : {SRC}')

    logo = Image.open(SRC).convert('RGBA')
    print(f'Source: {logo.size[0]}x{logo.size[1]}')

    content = trim_transparent(logo)
    print(f'Trimmed: {content.size[0]}x{content.size[1]}')

    # Icône "any" (transparente, contenu remplit ~95%)
    transparent = (0, 0, 0, 0)
    fit_into(512, content, 0.95, transparent).save(OUT / 'icon-512.png', optimize=True)
    fit_into(192, content, 0.95, transparent).save(OUT / 'icon-192.png', optimize=True)

    # Icône maskable : fond plein, contenu à 70% pour rester dans la safe zone
    # (Android peut découper jusqu'à 20% sur chaque bord selon la forme du masque)
    fit_into(512, content, 0.70, BRAND).save(OUT / 'icon-maskable.png', optimize=True)

    # Apple touch icon : fond plein, contenu ~85% (iOS n'applique pas de masque mais arrondit)
    fit_into(180, content, 0.85, BRAND).save(OUT / 'apple-touch-icon.png', optimize=True)

    print('\nIcônes générées :')
    for f in ['icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png']:
        path = OUT / f
        print(f'  {f} ({path.stat().st_size // 1024} KB)')

if __name__ == '__main__':
    main()
