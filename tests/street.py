from pathlib import Path
from playwright.sync_api import sync_playwright
import sys,json
ROOT=Path(__file__).resolve().parents[1]
baseline='--baseline' in sys.argv
suffix='before' if baseline else 'after'
fixture='world-fixture-v2.html' if baseline else 'world-fixture.html'
checks=[]
def check(name,passed,detail):
 checks.append({'name':name,'passed':bool(passed),'detail':detail})
 print(('PASS ' if passed else 'FAIL ')+name+' '+json.dumps(detail),flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1400,'height':950})
 page.add_init_script('let rng=81723;Math.random=()=>{rng=(1664525*rng+1013904223)>>>0;return rng/4294967296}')
 page.goto((ROOT/'shots'/fixture).as_uri()+'?t=9&rot=0&fx=0')
 page.wait_for_load_state('networkidle')
 data=page.evaluate('worldTest.street()')
 check('Every overhead cable terminates on an insulator',data['wireCount']>=4 and not data['unsupportedEnds'],data['unsupportedEnds'])
 check('Cables clear the roof, facade and equipment',not data['cableHits'],data['cableHits'])
 check('All poles leave the tactile route clear',data['tactileCount']==3 and not data['blockedPoles'],data['blockedPoles'])
 check('Manholes stay outside zebra crossings',data['manholeCount']==3 and not data['crosswalkCovers'],data['crosswalkCovers'])
 check('Stop signs have no opaque rectangular background',len(data['signSilhouettes'])==2 and all(abs(r-.5)<.01 for r in data['signSilhouettes']) and not data['signIssues'],{'issues':data['signIssues'],'triangle_area_ratios':data['signSilhouettes']})
 check('Roof surfaces have no overlapping coplanar faces',not data['roofCoplanar'],data['roofCoplanar'])
 check('Rooftop fan faces are separated from the casing',not data['fanCoplanar'],data['fanCoplanar'])
 views=[('overview','6.55,5.95,6.55','.02,.48,.02'),('roof','3.8,5,-.4','-.9,1.6,-1.5'),('sign','2.3,1.3,3.2','1.0,.9,1.2'),('tactile','4.5,4.5,4.8','0,.12,.7'),('wires','4.8,3.8,4.4','-.4,1.9,.2')]
 for name,cam,tgt in views:
  page.goto((ROOT/'shots'/fixture).as_uri()+f'?t=9&rot=0&fx=0&cam={cam}&tgt={tgt}')
  page.wait_for_load_state('networkidle');page.locator('#veil').evaluate('(el)=>el.style.display="none"')
  page.screenshot(path=str(ROOT/'shots'/f'street-{suffix}-{name}.png'))
 b.close()
result={'passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks}
(ROOT/'shots'/f'street-results-{suffix}.json').write_text(json.dumps(result,indent=2)+'\n')
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
