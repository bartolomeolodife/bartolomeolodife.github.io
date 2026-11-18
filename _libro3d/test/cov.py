import importlib.util, sys, io, time
spec=importlib.util.spec_from_file_location('l3','/tmp/l3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from playwright.sync_api import sync_playwright
from PIL import Image
book=int(sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1000,"height":700});errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/three.min.js",lambda r:r.fulfill(path=m.THREE,content_type="application/javascript"));pg.route("**/gc.zgo.at/**",lambda r:r.abort())
    pg.goto("http://localhost:8777/trattato.html?t=%d"%time.time());pg.wait_for_timeout(2500)
    pg.evaluate("__libro.apart()");pg.wait_for_timeout(2300);pg.evaluate(f"__libro.read({book})");pg.wait_for_timeout(5000)
    pg.evaluate("__libro.S.dist*=0.55;__libro.S.yaw+=0.35")
    B=f"__libro.books[{book}]"; ims=[]
    for th in [0.97,0.8,0.6,0.35]:
        pg.evaluate(f"{B}.flip={{leaf:0,theta:{th}*Math.PI,grabZ:0.2}};{B}.layout();__libro.setDirty()"); pg.wait_for_timeout(150)
        ims.append(Image.open(io.BytesIO(pg.locator('#libro3d canvas').screenshot())))
    w,h=ims[0].size; o=Image.new('RGB',(w*2+10,h*2+10),'gray')
    for k,i in enumerate(ims): o.paste(i,((k%2)*(w+10),(k//2)*(h+10)))
    o.save(f'/tmp/cov{book}.png'); print(errs)
    b.close()
