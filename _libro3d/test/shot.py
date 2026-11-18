import importlib.util, sys
spec=importlib.util.spec_from_file_location('l3','/tmp/l3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from playwright.sync_api import sync_playwright
book=int(sys.argv[1]); out=sys.argv[2]; zoom=float(sys.argv[3]) if len(sys.argv)>3 else 1
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1200,"height":800},device_scale_factor=2);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/three.min.js",lambda r:r.fulfill(path=m.THREE,content_type="application/javascript"));pg.route("**/gc.zgo.at/**",lambda r:r.abort())
    pg.goto("http://localhost:8777/trattato.html?t=%d"%__import__('time').time());pg.wait_for_timeout(2500)
    pg.evaluate("__libro.apart()");pg.wait_for_timeout(2300);pg.evaluate(f"__libro.read({book})");pg.wait_for_timeout(5000)
    if zoom!=1: pg.evaluate(f"__libro.S.dist*={zoom};__libro.setDirty()");pg.wait_for_timeout(400)
    pg.locator('#libro3d').screenshot(path=out)
    print(errs)
    b.close()
