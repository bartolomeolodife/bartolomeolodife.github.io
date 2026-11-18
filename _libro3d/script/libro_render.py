"""Rende le pagine del libro (PDF) a grandezza schermo, ritagliate al formato rifilato."""
import pymupdf, sys
SRC = "/mnt/user-data/uploads/PORTFOLIO/tratato del ribelle/LIBRO BAGNAIA DEFINITIVO SETTEMBRE.pdf"
H = 1400
d = pymupdf.open(SRC)
for i, p in enumerate(d):
    tb = p.trimbox
    z = H / tb.height
    pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), clip=tb, alpha=False)
    pix.save(f"/tmp/libro_raw/{i+1:03d}.png")
print(d.page_count, pix.width, pix.height)
