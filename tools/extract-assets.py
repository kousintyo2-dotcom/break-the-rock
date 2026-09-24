"""Cut the supplied magenta-keyed sprite sheets (art/source) into game assets (public/assets).

Run: python3 tools/extract-assets.py   (requires Pillow + numpy)
Regions are rough boxes; each sprite is trimmed to its opaque bounds after keying.
"""
from pathlib import Path
from PIL import Image
import numpy as np

SRC = Path('art/source')
OUT = Path('public/assets')

# name: (sheet, (x0, y0, x1, y1), target height or None, kind)
SPRITES = {
    'core-1':        ('sheet1-core-wood', (30, 440, 210, 625), 150, 'sprite'),
    'core-2':        ('sheet1-core-wood', (215, 440, 470, 625), 150, 'sprite'),
    'core-3':        ('sheet1-core-wood', (475, 420, 840, 640), 180, 'sprite'),
    'core-4':        ('sheet1-core-wood', (850, 370, 1160, 680), 260, 'sprite'),
    'wall-wood':     ('sheet1-core-wood', (1170, 170, 1425, 880), 520, 'sprite'),
    'wall-brick':    ('sheet2-basic-walls', (40, 70, 310, 860), 520, 'sprite'),
    'wall-iron':     ('sheet2-basic-walls', (370, 70, 640, 860), 520, 'sprite'),
    'wall-concrete': ('sheet2-basic-walls', (690, 70, 970, 860), 520, 'sprite'),
    'wall-armored':  ('sheet2-basic-walls', (1015, 70, 1315, 860), 520, 'sprite'),
    'wall-glass':    ('sheet2-basic-walls', (1360, 70, 1655, 860), 520, 'sprite'),
    'wall-energy':   ('sheet3-special-walls', (15, 75, 325, 850), 520, 'sprite'),
    'wall-void':     ('sheet3-special-walls', (350, 75, 655, 850), 520, 'sprite'),
    'wall-gold':     ('sheet3-special-walls', (690, 75, 990, 850), 520, 'sprite'),
    'wall-boost':    ('sheet3-special-walls', (1030, 75, 1325, 850), 520, 'sprite'),
    'wall-chain':    ('sheet3-special-walls', (1350, 75, 1660, 850), 520, 'sprite'),
    'wall-fullcharge': ('sheet4-thewall-backgrounds', (190, 0, 580, 535), 520, 'sprite'),
    'the-wall':      ('sheet4-thewall-backgrounds', (690, 0, 1345, 535), None, 'sprite'),
    'bg-warehouse':  ('sheet4-thewall-backgrounds', (40, 540, 470, 960), None, 'background'),
    'bg-factory':    ('sheet4-thewall-backgrounds', (510, 540, 940, 960), None, 'background'),
    'bg-lab':        ('sheet4-thewall-backgrounds', (980, 540, 1415, 960), None, 'background'),
    'bg-anomaly':    ('sheet5-anomaly-fx', (15, 25, 455, 1060), None, 'sprite'),
    'fx-impact':     ('sheet5-anomaly-fx', (470, 70, 990, 450), 256, 'fx'),
    'fx-critical':   ('sheet5-anomaly-fx', (975, 20, 1445, 490), 256, 'fx'),
    'fx-speed':      ('sheet5-anomaly-fx', (475, 530, 1240, 710), 96, 'fx'),
}


def key_magenta(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    spill = np.minimum(r, b) - g  # how "magenta" a pixel is
    alpha = np.clip((150 - spill) / 60, 0, 1)  # >=150 fully keyed, <=90 opaque
    # Remove magenta fringe on semi-transparent / edge pixels only.
    edge = alpha < 1
    padded = np.pad(alpha, 1, constant_values=1)
    near = np.zeros_like(edge)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            near |= padded[1 + dy:padded.shape[0] - 1 + dy, 1 + dx:padded.shape[1] - 1 + dx] < 0.5
    fix = (edge | near) & (spill > 30)
    excess = np.where(fix, spill - 20, 0)
    r2 = np.clip(r - excess, 0, 255)
    b2 = np.clip(b - excess, 0, 255)
    out = np.dstack([r2, g, b2, alpha * 255]).astype(np.uint8)
    return out


def trim(rgba: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(rgba[..., 3] > 16)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def background(rgb: np.ndarray) -> Image.Image:
    # Backgrounds are rectangles on magenta: find the opaque rect and inset a few pixels.
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    solid = (np.minimum(r, b) - g) < 60
    rows = np.nonzero(solid.mean(1) > 0.9)[0]
    cols = np.nonzero(solid.mean(0) > 0.9)[0]
    crop = rgb[rows.min() + 3:rows.max() - 2, cols.min() + 3:cols.max() - 2]
    img = Image.fromarray(crop.astype(np.uint8), 'RGB')
    # Mirror-tile so the backdrop can scroll seamlessly.
    w, h = img.size
    tile = Image.new('RGB', (w * 2, h))
    tile.paste(img, (0, 0))
    tile.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    return tile


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sheets = {}
    for name, (sheet, box, height, kind) in SPRITES.items():
        if sheet not in sheets:
            sheets[sheet] = np.asarray(Image.open(SRC / f'{sheet}.png').convert('RGB'))
        x0, y0, x1, y1 = box
        region = sheets[sheet][y0:y1, x0:x1]
        if kind == 'background':
            img = background(region)
        else:
            img = Image.fromarray(trim(key_magenta(region)), 'RGBA')
        if height and img.height > height:
            img = img.resize((round(img.width * height / img.height), height), Image.LANCZOS)
        if kind == 'background':
            img.save(OUT / f'{name}.jpg', quality=86, optimize=True)
        else:
            img.save(OUT / f'{name}.png', optimize=True)
        print(f'{name:16s} {img.size}')


if __name__ == '__main__':
    main()
