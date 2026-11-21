"""Break the code behind each probed requirement, run its tests, expect them to fail, restore the file. Evidence for tier V3.
Usage: python3 scripts/probe.py   (rebuilds the site for the browser probes; takes about a minute)"""
import subprocess,sys
def run(cmd): return subprocess.run(cmd,shell=True,capture_output=True,text=True)
probes=[
 ("REQ-004","src/lib/upstream.ts",".slice(0, 5)",".slice(0, 6)","npx vitest run -t REQ-004",False),
 ("REQ-015","src/lib/schema.ts","if (orders.has(raw.order))","if (false)","npx vitest run -t REQ-015",False),
 ("REQ-026","src/lib/dates.ts","'Sep'","'Sept'","npx vitest run -t REQ-026",False),
 ("REQ-018","src/lib/sync.ts","if (remote.latest_release !== entry.portfolio.release)","if (false)","npx vitest run -t REQ-018",False),
 ("REQ-007","src/lib/legal.ts","text.includes(PENDING)","false","npx vitest run -t REQ-007",False),
 ("REQ-036","public/theme.js","localStorage.setItem(KEY, 'dark')","localStorage.setItem(KEY, '1')","npx playwright test -g REQ-036",True),
 ("REQ-009","src/pages/404.astro","  noindex\n","\n","npx playwright test -g REQ-009",True),
 ("REQ-042","src/styles/site.css","color-scheme:dark;","color-scheme:dark;--bg:#FFFFFF;","npx playwright test -g REQ-042",True),
]
for rid,f,a,b,cmd,build in probes:
    s=open(f).read()
    if a not in s: print(rid,"PATTERN NOT FOUND");continue
    open(f,'w').write(s.replace(a,b,1))
    if build: run("npm run build")
    r=run(cmd)
    killed = r.returncode!=0
    open(f,'w').write(s)
    if build: run("npm run build")
    print(rid,f,"killed" if killed else "SURVIVED")
