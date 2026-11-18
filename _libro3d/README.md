# Trattato del ribelle — libro e catalogo sfogliabili in 3D (lavoro sospeso)

Questo ramo (`libro-3d`) conserva tutto il lavoro sul libro sfogliabile della pagina Trattato.
Il sito pubblicato (`main`) è tornato alla pagina com'era prima, con le tre foto accanto al titolo.
GitHub Pages pubblica solo `main`: questo ramo non è visibile online, è un archivio.

Sospeso il 18 novembre 2026. Il risultato non convinceva Barto, ma l'idea resta da riprendere.

## Cosa c'è

- `trattato.html`, `en/trattato.html`, `fr/trattato.html`: la pagina con il 3D al posto delle tre foto in apertura.
- `js/libro3d.js`: tutto il motore (three.js r128 da cdnjs).
  - Scena, luci, ombre; carta opaca con luce calcolata per pixel.
  - Pile di fogli curve verso la piega, con ombra calda nella piega.
  - Il foglio che gira si piega come carta e si posa sulla pila; proietta ombra ma non la riceve, per evitare le strisce.
  - Dorso cucito a vista con nodi.
  - Nel catalogo, a copertina aperta, la piega mostra cinque segnature tonde con il filo bianco a ogni stazione.
  - Modalità: impilati (come nelle foto), separati e girabili uno per uno, aperti e sfogliabili.
  - API di prova in `window.__libro`.
- `img/libro/` (208 pagine + copertine) e `img/catalogo/` (80 pagine + copertine): pagine rese dai PDF, con colore della carta e trasparenza del retro.
- Regole `.libro3d`, `.libro-hero`, `.libro-ctl` in fondo a `site.css`.
- `_libro3d/script/`
  - `libro_page.py`: inserisce il 3D nelle tre pagine.
  - `libro_render.py` e `libro_paper.py`: rendono le pagine dai PDF e applicano carta e trasparenza.
- `_libro3d/test/`: prove con Playwright e Chrome (swiftshader).
  - `stale.py`: verifica che una pagina non compaia prima di essere caricata.
  - `steps.py`: controlla il giro di pagina fotogramma per fotogramma.
  - `sweep.py`: cerca strisce sulla pagina che gira.
- `_libro3d/riferimenti/`: le foto del catalogo vero, i dettagli della piega, il confronto foto/3D e lo stato finale su computer e telefono.

## PDF di partenza

Nella cartella PORTFOLIO di Barto, in `tratato del ribelle/`:

- `LIBRO BAGNAIA DEFINITIVO SETTEMBRE.pdf`
- `CATALOGO DEFINITIVO SETTEMBRE .pdf`
- `COPERTINA_FINALE 12.06.pdf`
- `COPERTINE CATALOGO definitive.pdf`

## Storia (commit su main prima del ritiro)

- `5640845`: primo sfogliabile 2D (StPageFlip). Bocciato: troppo "cheap", la carta sembrava lucida.
- `2c93ec2` → `d9a89b4`: versione 3D.
  - Libro rotabile da chiuso.
  - Piega curva.
  - Libro e catalogo impilati e separabili.
  - Copertine dai PDF.
  - Cucitura del catalogo rifatta sulle foto.
  - Correzione dello sfarfallio a sinistra.

## Cosa non andava secondo Barto

- La rilegatura del catalogo non era fedele all'originale. È stata rifatta più volte; l'ultima versione segue le foto della piega.
- Un difetto sulla pagina sinistra durante il giro.
  - Causa trovata alla fine: il foglio si faceva ombra da solo (shadow acne) quando era di taglio rispetto alla luce, che viene da sinistra.
  - Corretta nell'ultimo commit, ma Barto non l'ha più valutata.
- Nel complesso il risultato non gli piaceva.
  - Da ripensare l'impostazione: più vicina alla fotografia, oppure molto più essenziale e tipografica.

## Per riprendere

```
git checkout libro-3d
cd /percorso/del/sito && python3 -m http.server 8777
# aprire http://localhost:8777/trattato.html
```

Per rimetterlo online, unire le modifiche di questo ramo in `main`, escludendo `_libro3d/`.
Prima di farlo, allineare il numero di versione di `site.css`/`site.js` con quello di `main`.
