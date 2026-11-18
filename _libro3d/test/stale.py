import importlib.util, time, sys
spec=importlib.util.spec_from_file_location('l3','/tmp/l3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from playwright.sync_api import sync_playwright
book=int(sys.argv[1]) if len(sys.argv)>1 else 0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1200,"height":800});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/three.min.js",lambda r:r.fulfill(path=m.THREE,content_type="application/javascript"));pg.route("**/gc.zgo.at/**",lambda r:r.abort())
    def slow(route): time.sleep(0.2); route.continue_()
    pg.route("**/img/libro/*.webp",slow); pg.route("**/img/catalogo/*.webp",slow)
    pg.goto("http://localhost:8777/trattato.html?t=99");pg.wait_for_timeout(3000)
    pg.evaluate(f"""window.__mis=0;window.__frames=0;(function f(){{const b=__libro.books[{book}];if(b.opened&&b.want){{__frames++;const h=b.have();if(h.l!==b.want.l||h.r!==b.want.r)__mis++;}}requestAnimationFrame(f)}})()""")
    pg.evaluate("__libro.apart()");pg.wait_for_timeout(2500);pg.evaluate(f"__libro.read({book})");pg.wait_for_timeout(5000)
    for k in range(10): pg.evaluate("__libro.turn(1)");pg.wait_for_timeout(1300)
    for k in range(4): pg.evaluate("__libro.turn(-1)");pg.wait_for_timeout(1300)
    print('book',book,'frames',pg.evaluate("__frames"),'frames with a page not yet ready',pg.evaluate("__mis"),errs[:3])
    b.close()
