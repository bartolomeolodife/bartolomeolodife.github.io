"""Applica l'effetto carta alle pagine: tinta avorio, inchiostro su carta non patinata, trasparenza del retro."""
import numpy as np
from PIL import Image, ImageFilter
import sys
N = 208
PAPER = np.array([241, 237, 227], np.float32) / 255   # avorio della carta del libro
INK = 0.13            # nero dell'inchiostro rispetto alla carta (non patinata: mai nero pieno)
SHOW = 0.055          # quanto traspare il retro del foglio
OUT = '/home/claude/site/web/img/libro'
def load(i):
    return np.asarray(Image.open(f'/tmp/libro_raw/{i:03d}.png').convert('RGB'), np.float32) / 255
def back_of(i):
    return i + 1 if i % 2 == 1 else i - 1   # pagina dispari = recto, il suo retro è la pari successiva
only = [int(a) for a in sys.argv[1:]] or range(1, N + 1)
for i in only:
    f = load(i)
    b = back_of(i)
    col = PAPER * (INK + (1 - INK) * f)
    if 1 <= b <= N:
        bl = Image.open(f'/tmp/libro_raw/{b:03d}.png').convert('L').transpose(Image.FLIP_LEFT_RIGHT)
        bl = bl.filter(ImageFilter.GaussianBlur(1.3)).resize((f.shape[1], f.shape[0]))
        dark = (1 - np.asarray(bl, np.float32) / 255) * SHOW
        col = col * (1 - dark[..., None])
    Image.fromarray((np.clip(col, 0, 1) * 255 + .5).astype(np.uint8)).save(f'{OUT}/{i:03d}.webp', quality=80, method=6)
print('ok')
