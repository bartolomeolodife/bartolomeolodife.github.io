import importlib.util, sys, io, time
spec=importlib.util.spec_from_file_location('l3','/tmp/l3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from playwright.sync_api import sync_playwright
from PIL import Image
def run(p, vw, vh, mobile, tag):
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    ctx=b.new_context(viewport={"width":vw,"height":vh},device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
    pg=ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.route("**/three.min.js",lambda r:r.fulfill(path=m.THREE,content_type="application/javascript"));pg.route("**/gc.zgo.at/**",lambda r:r.abort())
    pg.goto("http://localhost:8777/trattato.html?t=%d"%time.time());pg.wait_for_timeout(3000)
    shots=[]
    def g(): shots.append(Image.open(io.BytesIO(pg.locator('#libro3d').screenshot())))
    g(); pg.evaluate("__libro.apart()");pg.wait_for_timeout(2500); g()
    pg.evaluate("__libro.read(1)");pg.wait_for_timeout(5500); g()
    pg.evaluate("__libro.turn(1)");pg.wait_for_timeout(420); g()
    w,h=shots[0].size; sc=0.5 if mobile else 0.6
    shots=[s.resize((int(w*sc),int(h*sc))) for s in shots]; w,h=shots[0].size
    o=Image.new('RGB',(w*4+30,h),'gray')
    for i,s in enumerate(shots): o.paste(s,(i*(w+10),0))
    o.save(f'/tmp/fin_{tag}.png'); print(tag, errs)
    b.close()
with sync_playwright() as p:
    run(p,1200,800,False,'desk'); run(p,390,844,True,'phone')
