"""Render the real Three.js passes in Chrome and check pixels, controls and sizing.
Run after npm run build and node tests/build-fixture.mjs. No running server needed.
"""
from pathlib import Path
from io import BytesIO
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
import argparse
import json
import math

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--baseline',action='store_true')
args=parser.parse_args()
out=ROOT/'shots';out.mkdir(exist_ok=True)
checks=[]
errors=[]
requests=[]
def check(name,passed,detail=None):
    checks.append({'name':name,'passed':bool(passed),'detail':detail})
    print(('PASS ' if passed else 'FAIL ')+name+(' '+json.dumps(detail) if detail is not None else ''),flush=True)
def image(page,path=None):
    return Image.open(BytesIO(page.screenshot(path=str(path) if path else None))).convert('RGB')
def differences(a,b,region=None,exclude=None):
    d=ImageChops.difference(a,b)
    n=0
    for y in range(d.height):
        for x in range(d.width):
            if region and not(region[0]<=x<region[2] and region[1]<=y<region[3]):continue
            if exclude and exclude[0]<=x<exclude[2] and exclude[1]<=y<exclude[3]:continue
            if max(d.getpixel((x,y)))>8:n+=1
    return n
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        if self.path=='/favicon.ico':
            self.send_response(204);self.end_headers();return
        super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
seed="""let rngState=81723; Math.random=()=>{rngState=(1664525*rngState+1013904223)>>>0;return rngState/4294967296};"""
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--ignore-gpu-blocklist'])
    page=browser.new_page(viewport={'width':320,'height':320},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    fixture='render-fixture-before' if args.baseline else 'render-fixture'
    page.goto(f'{base}/shots/{fixture}.html')
    page.wait_for_load_state('networkidle')
    page.wait_for_function('!!window.fixture')
    frames=[]
    for behind in [False,True]:
        page.evaluate('(v)=>window.fixture.render(v)',behind)
        frames.append(image(page))
    leak=differences(*frames,region=(75,75,245,245))
    frames[1].save(out/('occlusion-before.png' if args.baseline else 'occlusion-after.png'))
    check('Opaque signs occlude hidden outlines',leak==0,{'leaking_pixels':leak})
    colors=[]
    for x in [-3,3]:
        point=page.evaluate('(x)=>window.fixture.ground(x)',x)
        frame=image(page)
        colors.append(frame.getpixel((point['x'],point['y'])))
    delta=max(abs(a-b) for a,b in zip(*colors))
    check('Wet-ground markings keep their color across camera angles',delta<=1,{'colors':colors,'channel_delta':delta})
    frames=[]
    for visible in [False,True]:
        page.evaluate('(v)=>window.fixture.decal(v)',visible)
        frames.append(image(page))
    ghost=differences(*frames,region=(50,50,270,270),exclude=(135,135,185,185))
    check('Transparent decal margins do not acquire rectangular outlines',ghost==0,{'ghost_pixels':ghost})
    if not args.baseline:
        check('Normal pass restores render state even after a render error',page.evaluate('window.fixture.stateRestored()'))
        page.close()
        page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1)
        page.add_init_script(seed)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('request',lambda r:requests.append(r.url))
        def goto(path):
            page.goto(base+path);page.wait_for_load_state('networkidle')
            page.locator('#veil').evaluate('(el)=>el.style.display="none"')
            page.wait_for_timeout(150)
        goto('/index.html?t=9&rot=0')
        first=image(page,out/'after-overview.png')
        page.wait_for_timeout(350)
        second=image(page)
        stable=differences(first,second)
        exact=first.tobytes()==second.tobytes()
        check('Packaged fixed-time scene is pixel-stable',exact,{'changed_pixels_above_8':stable,'exact_match':exact})
        check('No interface elements',page.locator('button,input,select,nav,header,footer').count()==0)
        # Actual front, back and side views of the complete packaged scene.
        for name,camera in [('front','0,2.5,7'),('east','7,3,-1'),('rear','-5.5,4.5,-6.5'),('west','-7,3,0'),('interior','2.2,1.25,2.4')]:
            goto(f'/index.html?t=9&rot=0&cam={camera}&tgt=-.7,.65,-.8')
            image(page,out/f'after-{name}.png')
        check('Full packaged scene renders at five additional camera positions',True)
        goto('/shots/world-fixture.html?t=0&rot=0')
        state=page.evaluate('worldTest.snapshot()')
        hits=page.evaluate('worldTest.ceilingGap()')
        gap=hits[1]['distance']-hits[0]['distance']
        check('Ceiling light and housing have separate surfaces',gap>.001,{'gap':gap})
        check('Initial normal buffer matches drawing buffer',state['normalSize']==state['resolution']==state['drawingSize'],state['normalSize'])
        before=state['camera']
        page.mouse.move(700,400);page.mouse.down();page.mouse.move(1000,450,steps=18);page.mouse.up()
        page.wait_for_function('(a)=>Math.hypot(...worldTest.snapshot().camera.map((v,i)=>v-a[i]))>1',arg=before)
        check('Drag rotates the camera',True)
        page.wait_for_timeout(400)
        state=page.evaluate('worldTest.snapshot()');before=math.dist(state['camera'],state['target'])
        page.mouse.wheel(0,-480)
        page.wait_for_function('(d)=>Math.hypot(...worldTest.snapshot().camera.map((v,i)=>v-worldTest.snapshot().target[i]))<d*.9',arg=before)
        check('Wheel zooms in',True)
        before=page.evaluate('worldTest.snapshot().target')
        page.mouse.move(700,400);page.mouse.down(button='right');page.mouse.move(820,460,steps=15);page.mouse.up(button='right')
        page.wait_for_function('(a)=>Math.hypot(...worldTest.snapshot().target.map((v,i)=>v-a[i]))>.1',arg=before)
        check('Right drag pans the camera',True)
        goto('/shots/world-fixture.html?t=0&rot=0')
        initial=page.evaluate('worldTest.snapshot()')
        page.evaluate('worldTest.advance(8.1)')
        later=page.evaluate('worldTest.snapshot()')
        check('Rain continues moving in simulation',initial['rain']!=later['rain'])
        check('Traffic signal changes from red to green',later['signal'][2][1]>initial['signal'][2][1]*10 and later['signal'][0][0]<initial['signal'][0][0]*.1,later['signal'])
        doors=[]
        for _ in range(24):
            page.evaluate('worldTest.advance(.75)')
            doors.append(page.evaluate('worldTest.snapshot().door'))
        check('Automatic doors still open and close',min(doors)<-.65 and max(doors)>-.43,{'min':min(doors),'max':max(doors)})
        goto('/shots/world-fixture.html?t=9&rot=0')
        original=image(page)
        page.set_viewport_size({'width':900,'height':650});page.wait_for_timeout(150)
        state=page.evaluate('worldTest.snapshot()')
        check('Resized normal buffer matches compositor',state['normalSize']==state['resolution']==state['drawingSize'],state['normalSize'])
        page.set_viewport_size({'width':1280,'height':900});page.wait_for_timeout(200)
        restored=differences(original,image(page))
        check('Resize round trip preserves outline thickness and alignment',restored==0,{'changed_pixels':restored})
        mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        mobile.on('pageerror',lambda e:errors.append(str(e)))
        mobile.goto(f'{base}/shots/world-fixture.html?t=9&rot=0');mobile.wait_for_load_state('networkidle')
        mobile.locator('#veil').evaluate('(el)=>el.style.display="none"')
        state=mobile.evaluate('worldTest.snapshot()')
        check('High-DPI portrait render targets align',state['normalSize']==state['resolution']==state['drawingSize'],state['normalSize'])
        mobile.screenshot(path=str(out/'after-mobile.png'))
        check('Portrait canvas fits viewport',mobile.locator('canvas').bounding_box()['width']==390 and mobile.evaluate('document.documentElement.scrollWidth===innerWidth'))
        mobile.close()
        # Check the actual offline, double-clickable delivery, without a server.
        page.goto((ROOT/'index.html').as_uri()+'?t=9&rot=0');page.wait_for_load_state('networkidle')
        check('Single HTML works directly from file URL',page.locator('canvas').count()==1)
        external=[u for u in requests if not(u.startswith(base) or u.startswith('data:') or u.startswith('blob:') or u.startswith('file:'))]
        check('No external assets or network dependencies',not external,external)
    check('No JavaScript or shader errors',not errors,errors)
    browser.close()
finally:
    server.shutdown()
report={'baseline':args.baseline,'passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks,'errors':errors}
(out/('render-results-before.json' if args.baseline else 'render-results.json')).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'total':report['total']}))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
