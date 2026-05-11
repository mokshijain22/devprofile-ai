import { useRef, useState } from "react";
import { API, GH_PROXY } from "../config";
import { LC, gi, pj, sc ,pc} from "../utils";
import { ChatWidget, PaymentGate, RadarChart, SaveBar, ScoreRing } from "../components/common";
import RepoPicker from "../components/RepoPicker";

const REPO_PROMPT = `You are a senior engineer doing a code repository audit. Be FAIR and CALIBRATED.

IMPORTANT SCORING RULES:
- A repo with README + working code + lock file should score AT LEAST 50-60
- Having a Dockerfile is a significant positive (+8)
- Having package-lock.json means it's maintained (+5)
- Missing tests is a penalty of -12, not -30
- Missing CI is a penalty of -5, not -20
- Missing license is -3, not -10
- A project with 0 stars is normal for personal/student projects — do NOT penalize stars
- The ceiling from signals is a MAXIMUM, not a target — you can score higher if the repo deserves it
- Real scoring range: 40-85 for typical repos. Only completely empty/broken repos score below 35.

Return ONLY valid JSON (no markdown, no backticks):
{
  "score": number,
  "grade": "A+"|"A"|"B+"|"B"|"C+"|"C"|"D",
  "confidence": "High"|"Medium"|"Low",
  "insight": "2-3 sentence honest assessment",
  "tags": ["t1","t2","t3"],
  "problems": ["p1","p2","p3"],
  "strengths": ["s1","s2"],
  "radarData": [
    {"label":"Quality","value":number},
    {"label":"Structure","value":number},
    {"label":"Docs","value":number},
    {"label":"Security","value":number},
    {"label":"Maintainability","value":number}
  ],
  "repoStats": {"files":number,"largestFile":"name","complexity":"Low|Medium|High"},
  "languages": [{"name":"Lang","pct":number}],
  "whyCategories": [
    {"name":"Code Quality","score":number,"reasons":[{"type":"good|warning|critical","text":"reason"}]},
    {"name":"Documentation","score":number,"reasons":[{"type":"good|warning|critical","text":"reason"}]},
    {"name":"Testing","score":number,"reasons":[{"type":"good|warning|critical","text":"reason"}]},
    {"name":"Architecture","score":number,"reasons":[{"type":"good|warning|critical","text":"reason"}]}
  ],
  "categories": [{"name":"name","score":number,"preview":"1 line","detail":"detail"}],
  "suggestions": [{"title":"title","why":"why","where":"path","priority":"high|medium|low"}],
  "proMetrics": {"security":number,"vulnerabilities":number,"maintainability":number,"techDebt":"Xh"}
}`;

async function fetchRepoData(owner, repo) {
  const base = `repos/${owner}/${repo}`;
  const [repoJson, readmeRes, treeRes] = await Promise.all([
    fetch(GH_PROXY(base), { credentials:"include" }).then(r => { if (!r.ok) throw new Error(`Repo not found (${r.status})`); return r.json(); }),
    fetch(GH_PROXY(`${base}/readme`), { credentials:"include" }).catch(() => ({ ok:false })),
    fetch(GH_PROXY(`${base}/git/trees/HEAD?recursive=1`), { credentials:"include" }).catch(() => ({ ok:false })),
  ]);
  const hasReadme = readmeRes.ok !== false && (readmeRes.ok === true || (readmeRes && readmeRes.ok));
  let readme = "";
  if (readmeRes && readmeRes.ok) {
    try { const rd = await readmeRes.json(); readme = atob((rd.content||"").replace(/\n/g,"")).slice(0,1500); } catch {}
  }
  const treeJson   = (treeRes && treeRes.ok) ? await treeRes.json() : { tree:[] };
  const files      = (treeJson.tree||[]).filter(f => f.type==="blob");
  const fileTree   = files.map(f => f.path).slice(0,60);
  const hasCI      = files.some(f => /^\.github\/workflows\//i.test(f.path) || /^\.travis\.yml$/i.test(f.path.split("/").pop()) || /^\.circleci\//i.test(f.path));
  const hasLicense = files.some(f => /^(license|licence)(\.md|\.txt)?$/i.test(f.path.split("/").pop()));
  const hasLock    = files.some(f => /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|cargo\.lock)$/i.test(f.path.split("/").pop()));
  const hasDocker  = files.some(f => /^dockerfile(\..*)?$/i.test(f.path.split("/").pop()));
  const testFiles  = files.filter(f => /\.(test|spec)\.[jt]sx?$|__tests__|\/tests?\//i.test(f.path)).length;
  const totalFiles = files.length;
  const monthsSince = (Date.now() - new Date(repoJson.pushed_at)) / (1000*60*60*24*30);

  // FAIR ceiling: start generous, apply specific penalties
  let ceiling = 78;
  if (!hasReadme)       ceiling -= 14;
  if (testFiles === 0)  ceiling -= 12;
  if (!hasCI)           ceiling -= 5;
  if (!hasLicense)      ceiling -= 3;
  if (totalFiles < 3)   ceiling -= 20;
  if (monthsSince > 24) ceiling -= 5;
  // Bonuses
  if (hasDocker)        ceiling += 5;
  if (hasLock)          ceiling += 4;
  if (testFiles > 5)    ceiling += 8;
  if (repoJson.stargazers_count > 50) ceiling += 5;
  ceiling = Math.max(25, Math.min(ceiling, 90));

  return {
    repoData: repoJson, readme, fileTree,
    signals: { totalFiles, testFiles, hasReadme, hasCI, hasLicense, hasLock, hasDocker, openIssues: repoJson.open_issues_count, monthsSinceLastPush: Math.round(monthsSince), ceiling }
  };
}

function RepoPanel({ ghUser, oauthAvailable, paidFor, onPaidUpdate }) {
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [logs, setLogs]       = useState([]);
  const [showPick, setShowPick] = useState(false);
  const [proOn, setProOn]     = useState(false);
  const rRef = useRef(null);
  const addLog = m => setLogs(l => [...l, m]);

  async function analyze() {
    let match = url.match(/github\.com\/([^/]+)\/([^/?\s]+)/);
    if (!match) { const s = url.trim().match(/^([^/\s]+)\/([^/\s]+)$/); if(s) match=[null,s[1],s[2]]; }
    if (!match) { setError("Invalid GitHub URL or owner/repo"); return; }
    const [,owner,repo] = match;
    const clean = repo.replace(/\.git$/,"");
    setLoading(true); setError(""); setResult(null); setLogs([]);
    try {
      addLog(`Fetching ${owner}/${clean}…`);
      const { repoData, readme, fileTree, signals } = await fetchRepoData(owner, clean);
      addLog(`${signals.totalFiles} files · ${signals.testFiles} tests · CI=${signals.hasCI} · Docker=${signals.hasDocker} · LockFile=${signals.hasLock} · Ceiling=${signals.ceiling}`);
      addLog("Calling AI model…");
      const prompt = `${REPO_PROMPT}

Repo: ${repoData.full_name}
Description: ${repoData.description||'None'}
Language: ${repoData.language}
Stars: ${repoData.stargazers_count} | Forks: ${repoData.forks_count}
License: ${repoData.license?.name||'None'}
Created: ${repoData.created_at?.split('T')[0]}

SIGNALS (computed, use these):
${JSON.stringify(signals,null,2)}

README excerpt:
${readme.slice(0,1000)}

File tree:
${fileTree.join(', ')}

SCORE CEILING: ${signals.ceiling}
Note: This appears to be a ${signals.totalFiles < 20 ? 'small personal/student' : 'mid-sized'} project. Judge accordingly.
A repo with README, Dockerfile, lock file, and working code deserves at least 50-60.`;

      const res = await fetch(`${API}/analyze`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = pj(data.text);
      if (!parsed) throw new Error("Invalid AI response");
      // Allow up to ceiling+5 grace
      parsed.score = Math.min(parsed.score, signals.ceiling + 5);
      parsed._repoData = repoData; parsed._signals = signals;
      setResult(parsed);
      addLog(`Done — ${parsed.score}/100 (${parsed.grade})`);
      setTimeout(() => rRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const g = result ? gi(result.score) : null;
  const s = result ? sc(result.score) : "#B8A9FF";

  return (
    <div>
      <div className="hero">
        <div className="badge"><div className="badge-dot"/>GitHub Repository AI</div>
        <h1>Repo Quality<br/>Evaluator</h1>
        <p>Deep analysis of code quality, structure, testing, and maintainability.</p>
        <div className="iw">
          <input type="text" placeholder="https://github.com/owner/repo  or  owner/repo"
            value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()}/>
          {ghUser && <button className="btn-gl" onClick={()=>setShowPick(true)}>Browse</button>}
          <button className="btn-a" onClick={analyze} disabled={loading||!url.trim()}>{loading?'Analyzing…':'Analyze →'}</button>
        </div>
        {error && <p style={{color:'var(--err)',fontSize:12,marginTop:10}}>{error}</p>}
      </div>

      {logs.length>0 && <div className="log">{logs.map((m,i)=><div key={i} className="log-l">{m}</div>)}</div>}
      {loading && <div style={{marginTop:20}}><div className="sk" style={{height:160,borderRadius:22,marginBottom:14}}/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><div className="sk" style={{height:180,borderRadius:18}}/><div className="sk" style={{height:180,borderRadius:18}}/></div></div>}

      {result && !loading && (
        <div className="results" ref={rRef}>
          <div className="sum-card">
            <div className="sum-top">
              <ScoreRing score={result.score} color={s}/>
              <div className="sum-info">
                <div className="gr-row">
                  <span className="gr-badge" style={{background:g.bg,color:g.color}}>{g.grade}</span>
                  <span className="cf-badge">{result.confidence} Confidence</span>
                  {result._repoData?.private && <span className="cf-badge" style={{color:'var(--sky)',borderColor:'rgba(147,197,253,.2)',background:'rgba(147,197,253,.08)'}}>🔒 Private</span>}
                </div>
                {result._repoData && (
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:9,fontSize:11,color:'var(--text2)'}}>
                    <span>⭐ {result._repoData.stargazers_count?.toLocaleString()}</span>
                    <span>🔀 {result._repoData.forks_count}</span>
                    <span>⚠ {result._repoData.open_issues_count} issues</span>
                    <span>{result._repoData.language}</span>
                  </div>
                )}
                <div className="tags">{result.tags?.map((t,i)=><span key={i} className="tag">{t}</span>)}</div>
                <div className="ins-box"><div className="ins-lbl">AI INSIGHT</div>{result.insight}</div>
              </div>
            </div>
            <div className="sp-row">
              <div className="sp-box"><div className="sp-ttl" style={{color:'var(--err)'}}>PROBLEMS</div>{result.problems?.map((p,i)=><div key={i} className="sp-item"><span className="sp-ic">✖</span>{p}</div>)}</div>
              <div className="sp-box"><div className="sp-ttl" style={{color:'var(--ok)'}}>STRENGTHS</div>{result.strengths?.map((s,i)=><div key={i} className="sp-item"><span className="sp-ic">✔</span>{s}</div>)}</div>
            </div>
          </div>

          <SaveBar result={result} mode="repo"/>

          <div className="sec-title">Visual Intelligence</div>
          <div className="vg">
            <div className="gc"><div className="gc-title">Code Health Radar</div>{result.radarData&&<RadarChart data={result.radarData}/>}</div>
            <div className="gc">
              <div className="gc-title">Languages & Stats</div>
              {result.languages && (<><div className="lang-bar">{result.languages.map((l,i)=><div key={i} className="lang-seg" style={{flex:l.pct,background:LC[i%LC.length]}}/>)}</div><div className="lang-leg" style={{marginBottom:12}}>{result.languages.map((l,i)=><span key={i} className="lang-it"><span className="lang-dot" style={{background:LC[i%LC.length]}}/>{l.name} {l.pct}%</span>)}</div></>)}
              {result.repoStats && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div style={{background:'var(--glass2)',borderRadius:10,padding:'9px 11px'}}><div style={{fontFamily:'var(--fd)',fontSize:17,fontWeight:700}}>{result.repoStats.files}</div><div style={{fontSize:9,color:'var(--text3)',marginTop:2}}>FILES</div></div><div style={{background:'var(--glass2)',borderRadius:10,padding:'9px 11px'}}><div style={{fontFamily:'var(--fd)',fontSize:17,fontWeight:700,color:result.repoStats.complexity==='High'?'var(--err)':result.repoStats.complexity==='Medium'?'var(--warn)':'var(--ok)'}}>{result.repoStats.complexity}</div><div style={{fontSize:9,color:'var(--text3)',marginTop:2}}>COMPLEXITY</div></div></div>}
            </div>
          </div>

          <div className="sec-title">AI Suggestions</div>
          <div className="imp-list">
            {result.suggestions?.map((s,i)=>{
              const p = pc(s.priority);
              return <div key={i} className="imp-card"><div className="imp-dot" style={{background:p.color}}/><div className="imp-cnt"><div className="imp-ttl">{s.title}</div><div className="imp-why">{s.why}</div>{s.where&&<span className="imp-wh">{s.where}</span>}</div><span className="imp-badge" style={{background:p.bg,color:p.color}}>{s.priority}</span></div>;
            })}
          </div>

          {result.proMetrics && (<>
            <div style={{background:'var(--glass)',border:'1px solid var(--border2)',borderRadius:13,padding:'13px 17px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:13,flexWrap:'wrap',gap:9}}>
              <div><div style={{fontFamily:'var(--fd)',fontSize:12,fontWeight:600}}>Pro Metrics</div><div style={{fontSize:10,color:'var(--text2)',marginTop:1}}>Security & maintainability deep-dive</div></div>
              <div style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}} onClick={()=>setProOn(p=>!p)}>
                <span style={{fontSize:11,color:'var(--text2)'}}>{proOn?'On':'Off'}</span>
                <div style={{width:38,height:20,borderRadius:10,border:'1px solid var(--border2)',position:'relative',background:proOn?'linear-gradient(135deg,var(--lav2),#4F8EFF)':'var(--glass2)',transition:'background .3s'}}>
                  <div style={{position:'absolute',top:2,width:14,height:14,borderRadius:'50%',background:'white',transition:'left .3s',left:proOn?22:2}}/>
                </div>
              </div>
            </div>
            {proOn && <div className="mg" style={{animation:'fU .3s ease'}}>
              <div className="mc"><div className="mc-v" style={{color:sc(result.proMetrics.security)}}>{result.proMetrics.security}</div><div className="mc-l">SECURITY</div></div>
              <div className="mc"><div className="mc-v" style={{color:sc(result.proMetrics.maintainability)}}>{result.proMetrics.maintainability}</div><div className="mc-l">MAINTAINABILITY</div></div>
              <div className="mc"><div className="mc-v" style={{color:'var(--warn)',fontSize:16}}>{result.proMetrics.techDebt}</div><div className="mc-l">TECH DEBT</div></div>
            </div>}
          </>)}

          <div className="sec-title" style={{marginTop:20}}>Ask About This Repo</div>
          <ChatWidget result={result} mode="repo" prompts={["What are the biggest risks?","How to improve score?","Explain the architecture","Best practices missing?"]}/>
        </div>
      )}
      {showPick && <RepoPicker onSelect={r=>{setShowPick(false);setUrl(`https://github.com/${r.full_name}`);}} onClose={()=>setShowPick(false)}/>}
    </div>
  );
}


export default RepoPanel;
