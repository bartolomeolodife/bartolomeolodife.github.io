"""Libro 3D nell'apertura della pagina Trattato (IT/EN/FR), al posto delle tre foto."""
import re
W = '/home/claude/site/web'
CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
T = {
 'it': dict(prev='Pagina precedente', nxt='Pagina successiva', cover='Copertina', p1='pagina', pn='pagine', open='Separa', close='Chiudi', join='Riunisci', both='Libro e catalogo', nl='Trattato del ribelle', nc='Statue di un ribelle',
            hs='Trascina per girarli · rotella per avvicinarti · clic per separarli', ha='Trascina un volume per girarlo · clic per aprirlo', ho='Trascina o clicca una pagina per sfogliare', aria='Il libro e il catalogo in 3D, con la cucitura a vista'),
 'en': dict(prev='Previous page', nxt='Next page', cover='Cover', p1='page', pn='pages', open='Separate', close='Close', join='Put together', both='Book and catalogue', nl='Trattato del ribelle', nc='Statue di un ribelle',
            hs='Drag to turn them · scroll to zoom · click to separate them', ha='Drag a volume to turn it · click to open it', ho='Drag or click a page to turn it', aria='The book and the catalogue in 3D, with exposed sewing'),
 'fr': dict(prev='Page précédente', nxt='Page suivante', cover='Couverture', p1='page', pn='pages', open='Séparer', close='Fermer', join='Réunir', both='Livre et catalogue', nl='Trattato del ribelle', nc='Statue di un ribelle',
            hs='Glisser pour les tourner · molette pour zoomer · cliquer pour les séparer', ha='Glisser un volume pour le tourner · cliquer pour l’ouvrir', ho='Glisser ou cliquer une page pour la tourner', aria='Le livre et le catalogue en 3D, avec la couture apparente'),
}
for lang, t in T.items():
    pre = '' if lang == 'it' else '../'
    f = f'{W}/{"" if lang == "it" else lang + "/"}trattato.html'
    s = open(f, encoding='utf-8').read()
    hero = (f'<div class="span9 tr-hero libro-hero">'
            f'<div class="libro3d" id="libro3d" role="img" aria-label="{t["aria"]}" data-base="{pre}img/libro/" data-cat="{pre}img/catalogo/" '
            f'data-name-libro="{t["nl"]}" data-name-cat="{t["nc"]}" data-both="{t["both"]}" data-p1="{t["p1"]}" data-pn="{t["pn"]}" '
            f'data-split="{t["open"]}" data-join="{t["join"]}" data-close="{t["close"]}" '
            f'data-hint-stack="{t["hs"]}" data-hint-apart="{t["ha"]}" data-hint-read="{t["ho"]}"><p class="libro-hint">{t["hs"]}</p></div>'
            f'<div class="libro-ctl"><button type="button" class="libro-prev" aria-label="{t["prev"]}">←</button>'
            f'<span class="libro-n" aria-live="polite">{t["both"]}</span>'
            f'<button type="button" class="libro-next" aria-label="{t["nxt"]}">→</button>'
            f'<button type="button" class="libro-open">{t["open"]}</button></div></div>\n</section>')
    a = s.index('<div class="span9 tr-hero'); b = s.index('</section>', a) + len('</section>')
    s = s[:a] + hero + s[b:]
    if 'id="sfoglia"' in s:
        a = s.index('<section class="block" id="sfoglia">'); b = s.index('</section>\n', a) + len('</section>\n')
        s = s[:a] + s[b:]
    if 'js/libro3d.js' not in s:
        i = s.index(f'<script src="{pre}site.js')
        s = s[:i] + CDN + f'<script src="{pre}js/libro3d.js?v=1" defer></script>' + s[i:]
    s = re.sub(r'libro3d\.js\?v=\d+', 'libro3d.js?v=16', s)
    open(f, 'w', encoding='utf-8').write(s)
    print(lang, 'ok', s.count('id="libro3d"'))
