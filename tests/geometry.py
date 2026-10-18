from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
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
 page=b.new_page(viewport={'width':1400,'height':950},device_scale_factor=1)
 page.add_init_script('let rng=81723;Math.random=()=>{rng=(1664525*rng+1013904223)>>>0;return rng/4294967296}')
 page.goto((ROOT/'shots'/fixture).as_uri()+'?t=0&rot=0&fx=0&cam=-1.2,1.1,2.5&tgt=-.18,.6,-.48')
 page.wait_for_load_state('networkidle')
 page.locator('#veil').evaluate('(el)=>el.style.display="none"')
 page.screenshot(path=str(ROOT/'shots'/f'geometry-{suffix}-door-closed.png'))
 open_saved=False
 report=page.evaluate('worldTest.geometry()')
 collisions=list(report['doorCollisions'])
 for _ in range(60):
  page.evaluate('worldTest.advance(.5)')
  collisions.extend(page.evaluate('worldTest.geometry().doorCollisions'))
  if not open_saved and page.evaluate('worldTest.snapshot().door')<-.69:
   page.screenshot(path=str(ROOT/'shots'/f'geometry-{suffix}-door-open.png'));open_saved=True
 check('Sliding doors clear structural posts through full open/close cycles',not collisions,{'collision_samples':len(collisions),'examples':collisions[:3]})
 check('Front-left facade has no overlapping coplanar exterior faces',not report['cornerCoplanar'],report['cornerCoplanar'])
 check('All three bicycles have wheels aligned with their frames',len(report['wheels'])==3 and all(w['valid'] and w['axisAlignment']<.01 for w in report['wheels']),report['wheels'])
 check('Bicycle wheel proportions preserve a readable silhouette',all(w['diameterToWheelbase']>.45 for w in report['wheels']),report['wheels'])
 check('Bicycles clear walls, vending machines, crates and other solid props',not report['bikeCollisions'],report['bikeCollisions'][:5])
 check('All bicycle components stay on the square base',not report['outsideBase'],report['outsideBase'])
 # Inspect the actual composition at a fixed time from the relevant near views.
 views=[('overview','6.55,5.95,6.55','.02,.48,.02'),('door','-1.2,1.1,2.5','-.18,.60,-.48'),('corner','-3.7,.75,1.0','-2.42,.18,-.48'),('parking-bike','.4,1.1,.9','-2.10,.24,.10'),('side-bikes','3.5,1.7,-.3','1.15,.26,-2.05')]
 for name,camera,target in views:
  page.goto((ROOT/'shots'/fixture).as_uri()+f'?t=9&rot=0&fx=0&cam={camera}&tgt={target}')
  page.wait_for_load_state('networkidle')
  page.locator('#veil').evaluate('(el)=>el.style.display="none"')
  page.screenshot(path=str(ROOT/'shots'/f'geometry-{suffix}-{name}.png'))
 b.close()
result={'passed':sum(c['passed'] for c in checks),'total':len(checks),'checks':checks}
(ROOT/'shots'/f'geometry-results-{suffix}.json').write_text(json.dumps(result,indent=2)+'\n')
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
