import importlib.util, sys, io, time
spec=importlib.util.spec_from_file_location('l3','/tmp/l3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from playwright.sync_api import sync_playwright
from PIL import Image, ImageOps, ImageFilter, ImageStat
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1000,"height":700});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/three.min.js",lambda r:r.fulfill(path=m.THREE,content_type="application/javascript"));pg.route("**/gc.zgo.at/**",lambda r:r.abort())
    pg.goto("http://localhost:8777/trattato.html?t=%d"%time.time());pg.wait_for_timeout(2500)
    out=[]
    for book in (0,1):
        pg.evaluate("__libro.apart()");pg.wait_for_timeout(2300);pg.evaluate(f"__libro.read({book})");pg.wait_for_timeout(5000)
        for k in range(3): pg.evaluate("__libro.turn(1)");pg.wait_for_timeout(1200)
        B=f"__libro.books[{book}]"; L=pg.evaluate(f"{B}.L()")
        row=[]
        for th in [0.52,0.6,0.68,0.76,0.86]:
            pg.evaluate(f"{B}.flip={{leaf:{L},theta:{th}*Math.PI,grabZ:0.35}};{B}.layout();__libro.setDirty()"); pg.wait_for_timeout(120)
            im=Image.open(io.BytesIO(pg.locator('#libro3d canvas').screenshot())).convert('L')
            w,h=im.size; c=im.crop((0,0,w//2,h))
            hp=ImageStat.Stat(c.filter(ImageFilter.Kernel((3,3),[0,-1,0,-1,4,-1,0,-1,0],1,128))).stddev[0]
            row.append(round(hp,2)); out.append(ImageOps.autocontrast(c,cutoff=1).resize((w//4,h//2)))
        print('book',book,'L',L,'highpass std left half',row)
        pg.evaluate(f"{B}.flip=null;{B}.layout()"); pg.evaluate("__libro.close()"); pg.wait_for_timeout(2500)
    W,Hh=out[0].size; o=Image.new('L',(W*5+40,Hh*2+10),90)
    for i,im in enumerate(out): o.paste(im,((i%5)*(W+10),(i//5)*(Hh+10)))
    o.save('/tmp/sweep.png'); print(errs)
    b.close()
