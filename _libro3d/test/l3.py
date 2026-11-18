import sys
from playwright.sync_api import sync_playwright
THREE='/home/claude/site/scripts/node_modules/three/build/three.min.js'
def run(vp, shots, mobile=False):
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        kw=dict(viewport=vp)
        if mobile: kw.update(is_mobile=True,has_touch=True,device_scale_factor=2)
        pg=b.new_page(**kw);errs=[];pg.on("pageerror",lambda e:errs.append(str(e)));pg.on("console",lambda m: errs.append(m.text) if m.type in('error','warning') else None)
        pg.route("**/three.min.js",lambda r:r.fulfill(path=THREE,content_type="application/javascript"))
        pg.route("**/gc.zgo.at/**",lambda r:r.abort())
        pg.goto("http://localhost:8777/trattato.html");pg.wait_for_timeout(800)
        pg.evaluate("document.getElementById('sfoglia').scrollIntoView()");pg.wait_for_timeout(2500)
        for name,act in shots:
            if act: pg.evaluate(act)
            pg.wait_for_timeout(2600 if act else 300)
            pg.locator('#libro3d').screenshot(path=f"/tmp/{name}.png")
        print(errs[:6], pg.evaluate("window.__libro&&__libro.state()"))
        b.close()
if __name__=='__main__':
    run({"width":1440,"height":900},[('c0',None),('c1',"(()=>{})()"),('o1',"__libro.open()"),('o2',"__libro.turn(1)"),('o3',"for(let i=0;i<1;i++)__libro.turn(1)")])
