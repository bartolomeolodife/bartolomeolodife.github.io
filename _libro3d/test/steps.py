import importlib.util, sys, io, time
spec=importlib.util.spec_from_file_location('l3','/tmp/l3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
book=int(sys.argv[1]); startL=int(sys.argv[2]); N=48
def grab(pg):
    pg.evaluate("__libro.setDirty()"); pg.wait_for_timeout(60)
    return Image.open(io.BytesIO(pg.locator('#libro3d canvas').screenshot())).convert('L')
def d(a,b,half):
    w,h=a.size; box=(0,0,w//2,h) if half=='L' else (w//2,0,w,h)
    return ImageStat.Stat(ImageChops.difference(a.crop(box),b.crop(box))).mean[0]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1000,"height":700});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/three.min.js",lambda r:r.fulfill(path=m.THREE,content_type="application/javascript"));pg.route("**/gc.zgo.at/**",lambda r:r.abort())
    pg.goto("http://localhost:8777/trattato.html?t=%d"%time.time());pg.wait_for_timeout(2500)
    pg.evaluate("__libro.apart()");pg.wait_for_timeout(2300);pg.evaluate(f"__libro.read({book})");pg.wait_for_timeout(5000)
    for k in range(startL-1): pg.evaluate("__libro.turn(1)");pg.wait_for_timeout(1200)
    pg.wait_for_timeout(1500)
    B=f"__libro.books[{book}]"
    for direction in (1,-1):
        L=pg.evaluate(f"{B}.L()")
        leaf = L if direction>0 else L-1
        frames=[grab(pg)]
        ths=[i/N*3.14159265 for i in range(N+1)]
        if direction<0: ths=ths[::-1]
        for th in ths:
            pg.evaluate(f"{B}.flip={{leaf:{leaf},theta:{th},grabZ:0.35}};{B}.layout()"); frames.append(grab(pg))
        pg.evaluate(f"{B}.flip=null;{B}.layout()")
        pg.evaluate(f"__libro.turn({direction})"); pg.wait_for_timeout(1600); frames.append(grab(pg))
        dl=[round(d(frames[i],frames[i+1],'L'),2) for i in range(len(frames)-1)]
        dr=[round(d(frames[i],frames[i+1],'R'),2) for i in range(len(frames)-1)]
        print('book',book,'dir',direction,'L',L,'->',pg.evaluate(f"{B}.L()"))
        print('  start  L/R', dl[0], dr[0], '  end L/R', dl[-1], dr[-1])
        print('  left  ', dl)
        print('  right ', dr)
        frames[0].save(f'/tmp/st_{book}_{direction}_a.png'); frames[-2].save(f'/tmp/st_{book}_{direction}_b.png'); frames[-1].save(f'/tmp/st_{book}_{direction}_c.png')
    print(errs[:3])
    b.close()
