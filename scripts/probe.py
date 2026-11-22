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
 ("REQ-010","src/pages/cv.astro","  noindex\n","\n","npx playwright test -g REQ-010",True),
 ("REQ-019","src/lib/issue.ts","i.title === title","false","npx vitest run -t REQ-019",False),
 ("REQ-035","src/lib/origins.ts","if (o && o !== own) found.add(o);","if (false) found.add(o as string);","npx vitest run -t REQ-035",False),
 ("REQ-052",".github/workflows/ci.yml","needs: [test, gitleaks, build-pages]","needs: [build-pages]","npx vitest run -t REQ-052",False),
 ("REQ-025","src/lib/numbers.ts","export const MEDIAN_MIN_N = 20;","export const MEDIAN_MIN_N = 19;","npx vitest run -t REQ-025",False),
 ("REQ-028","src/lib/numbers.ts","x.pr.merged_by === s.owner","true","npx vitest run -t REQ-028",False),
 ("REQ-029","src/lib/numbers.ts",".sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))",".sort((a, b) => b.sessions - a.sessions)","npx vitest run -t REQ-029",False),
 ("REQ-031","src/components/StatTile.astro",'<span class="v">{text}</span>','<span class="v">{text}x</span>',"npx playwright test -g REQ-031",True),
 ("REQ-032","src/pages/method.astro","{method.counts.pull_requests} pull requests","{method.counts.pull_requests + 1} pull requests","npx playwright test -g REQ-032",True),
 ("REQ-023","src/lib/format.ts","n = ${stat.n}","${stat.n}","npx playwright test -g REQ-023",True),
 ("REQ-033",".github/workflows/ci.yml","name: Numbers match the snapshot","name: Numbers","npx vitest run -t REQ-033",False),
 ("REQ-005","src/pages/method.astro",'data-block="approval"','data-block="approvals"',"npx playwright test -g REQ-005",True),
 ("REQ-001","src/components/Home.astro",'data-block="method-summary"','data-block="summary"',"npx playwright test -g REQ-001",True),
 ("REQ-011","src/lib/nav.ts","  { href: '/method/', label: 'Method' },\n","","npx playwright test -g REQ-011",True),
 ("REQ-052",".github/workflows/ci.yml","if: steps.legal.outcome == 'success'","if: always()","npx vitest run -t REQ-052",False),
 ("REQ-040","public/loop.js","go(4);\n})();","go(0);\n})();","npx playwright test -g \"the loop starts\"",True),
 ("REQ-040","public/loop.js","li.addEventListener('focus'","li.addEventListener('blur'","npx playwright test -g \"the loop starts\"",True),
 ("REQ-054","src/lib/mark.ts","Array.from({ length: s.nv }","Array.from({ length: s.nv + 1 }","npx vitest run -t REQ-054",False),
 ("REQ-054","src/lib/mark.ts","high: 10","high: 11","npx vitest run -t REQ-054",False),
 ("REQ-055","src/lib/mark.ts","G.ringMin + (i * (G.ringMax - G.ringMin))","G.ringMax + (i * (G.ringMax - G.ringMin))","npx vitest run -t REQ-055",False),
 ("REQ-055","src/lib/mark.ts","const k = total > 360 ? (360 - gaps) / (total - gaps) : 1;","const k = 1;","npx vitest run -t REQ-055",False),
 ("REQ-056","src/lib/mark.ts","'not merged by me'","'merged by me'","npx vitest run -t REQ-056",False),
 ("REQ-057","public/mark.js","i = (i + 1) % n;","i = (i + 2) % n;","npx playwright test -g REQ-057",True),
 ("REQ-057","src/components/Home.astro",'aria-live="polite"','aria-live="off"',"npx playwright test -g REQ-057",True),
 ("REQ-058","src/styles/site.css",".mark:hover .ring,",".mark:hovr .ring,","npx playwright test -g REQ-058",True),
 ("REQ-058","src/styles/site.css","{.ring{animation:none}","{.ringx{animation:none}","npx playwright test -g REQ-058",True),
 ("REQ-053","src/components/Home.astro",'<Mark id="mark" />',"","npx playwright test -g REQ-053",True),
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
