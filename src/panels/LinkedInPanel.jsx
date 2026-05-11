import { useState } from "react";
import { API } from "../config";
import { gi, pj, sc ,pc} from "../utils";
import { ChatWidget, PaymentGate, RadarChart, SaveBar, ScoreRing } from "../components/common";

function LinkedInPanel({ paidFor, onPaidUpdate, rzpKeyId, rzpAvailable }) {
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'url'
  const [text, setText]   = useState("");
  const [url, setUrl]     = useState("");
  const [role, setRole]   = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [urlMsg, setUrlMsg]   = useState("");

  const unlocked = paidFor.linkedin || paidFor.combo;

  async function fetchFromUrl() {
    if (!url.trim()) return;
    setFetching(true); setUrlMsg("Trying to fetch LinkedIn page…"); setError("");
    try {
      const res = await fetch(`${API}/fetch-linkedin`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!data.blocked && data.text && data.text.length >= 100) {
        setText(data.text);
        setUrlMsg(`✔ Fetched ${data.text.length} characters from LinkedIn. Switched to paste mode — review and click Analyze.`);
        setInputMode('paste');
      } else {
        // Blocked — show specific guidance
        const hint = data.hint || 'LinkedIn blocks automated access. Please copy your profile sections (About, Experience, Skills) and paste below.';
        setUrlMsg('');
        setError('⚠ LinkedIn blocked: ' + hint);
        setInputMode('paste');
      }
    } catch(e) { setUrlMsg(''); setError("Fetch failed: " + e.message + ". Please paste your profile text instead."); setInputMode('paste'); }
    finally { setFetching(false); }
  }

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/analyze-linkedin`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ profileText:text, targetRole:role }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = pj(data.text);
      if (!parsed) throw new Error("Invalid AI response");
      setResult(parsed);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const g = result ? gi(result.score) : null;
  const s = result ? sc(result.score) : "#B8A9FF";

  return (
    <div>
      <div className="hero">
        <div className="badge"><div className="badge-dot"/>LinkedIn Profile AI</div>
        <h1>LinkedIn<br/>Optimizer</h1>
        <p>ATS scoring, recruiter readability, keyword optimization. Paste text or try a URL.</p>

        {unlocked && (<>
          <div className="tab-switch" style={{maxWidth:400,marginBottom:16}}>
            <button className={`ts-btn ${inputMode==='paste'?'on':''}`} onClick={()=>setInputMode('paste')}>📋 Paste Profile Text</button>
            <button className={`ts-btn ${inputMode==='url'?'on':''}`} onClick={()=>setInputMode('url')}>🔗 Try LinkedIn URL</button>
          </div>

          {inputMode === 'url' && (
            <div style={{maxWidth:600,margin:'0 auto 10px'}}>
              <div className="iw" style={{marginBottom:8}}>
                <input type="text" placeholder="https://linkedin.com/in/your-username" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchFromUrl()}/>
                <button className="btn-a" onClick={fetchFromUrl} disabled={fetching||!url.trim()}>{fetching?'Trying…':'Fetch →'}</button>
              </div>
              {error && <div style={{fontSize:12,color:'var(--warn)',textAlign:'left',padding:'8px 12px',background:'rgba(253,211,77,.06)',border:'1px solid rgba(253,211,77,.2)',borderRadius:10,marginBottom:8,lineHeight:1.6}}>{error}</div>}
              <div style={{background:'rgba(147,197,253,.06)',border:'1px solid rgba(147,197,253,.15)',borderRadius:10,padding:'10px 14px',fontSize:11,color:'var(--sky)',lineHeight:1.7,textAlign:'left'}}>
                <strong style={{display:'block',marginBottom:4}}>💡 If fetch fails (LinkedIn blocks ~90% of requests):</strong>
                1. Open your LinkedIn profile in browser<br/>
                2. Select all text on the page (Ctrl+A / Cmd+A)<br/>
                3. Copy (Ctrl+C / Cmd+C) and switch to "Paste Profile Text"<br/>
                <em style={{color:'var(--text3)'}}>Or: LinkedIn → Me → Settings → Data privacy → Get a copy of your data</em>
              </div>
            </div>
          )}

          {inputMode === 'paste' && (
            <>
              <div className="tw"><textarea placeholder="Paste your LinkedIn profile text here (About section, Experience, Skills, Certifications)…" value={text} onChange={e=>setText(e.target.value)}/></div>
              <div style={{maxWidth:600,margin:'0 auto 10px'}}>
                <input className="if" style={{width:'100%'}} placeholder="Target role (e.g. ML Engineer, Backend SWE)" value={role} onChange={e=>setRole(e.target.value)}/>
              </div>
              {error && <p style={{color:'var(--err)',fontSize:12,marginTop:8,textAlign:'center'}}>{error}</p>}
              <div className="bc"><button className="btn-af" onClick={analyze} disabled={loading||!text.trim()}>{loading?'Analyzing…':'Analyze LinkedIn Profile →'}</button></div>
            </>
          )}
        </>)}
      </div>

      {!unlocked && <PaymentGate mode="linkedin" onPaid={onPaidUpdate} rzpKeyId={rzpKeyId} rzpAvailable={rzpAvailable}/>}
      {loading && <div className="sk" style={{height:200,borderRadius:22,marginTop:16}}/>}

      {result && !loading && (
        <div className="results">
          <div className="sum-card">
            <div className="sum-top">
              <ScoreRing score={result.score} color={s}/>
              <div className="sum-info">
                <div className="gr-row"><span className="gr-badge" style={{background:g.bg,color:g.color}}>{g.grade}</span><span className="cf-badge">ATS: {result.atsScore}/100</span></div>
                <div className="tags">{result.tags?.map((t,i)=><span key={i} className="tag">{t}</span>)}</div>
                <div className="ins-box"><div className="ins-lbl">AI ASSESSMENT</div>{result.headline}</div>
              </div>
            </div>
            <div className="sp-row">
              <div className="sp-box"><div className="sp-ttl" style={{color:'var(--ok)'}}>STRENGTHS</div>{result.strengths?.map((s,i)=><div key={i} className="sp-item"><span className="sp-ic">✔</span>{s}</div>)}</div>
              <div className="sp-box"><div className="sp-ttl" style={{color:'var(--warn)'}}>GAPS</div>{result.gaps?.map((g,i)=><div key={i} className="sp-item"><span className="sp-ic">⚡</span>{g}</div>)}</div>
            </div>
          </div>

          <SaveBar result={result} mode="linkedin"/>

          <div className="mg">
            <div className="mc"><div className="mc-v" style={{color:sc(result.atsScore)}}>{result.atsScore}</div><div className="mc-l">ATS SCORE</div></div>
            <div className="mc"><div className="mc-v" style={{color:sc(result.estimatedRecruiterScore)}}>{result.estimatedRecruiterScore}</div><div className="mc-l">RECRUITER SCORE</div></div>
            <div className="mc"><div className="mc-v" style={{color:sc(result.profileCompleteness)}}>{result.profileCompleteness}</div><div className="mc-l">COMPLETENESS</div></div>
          </div>

          <div className="vg">
            <div className="gc"><div className="gc-title">Profile Health Radar</div>{result.radarData&&<RadarChart data={result.radarData}/>}</div>
            <div className="gc">
              <div className="gc-title">Keywords</div>
              {result.keywordsFound?.length>0&&(<><div style={{marginBottom:7,fontSize:10,color:'var(--ok)'}}>✔ Found</div><div className="kw-row" style={{marginBottom:12}}>{result.keywordsFound.map((k,i)=><span key={i} className="kw ok">{k}</span>)}</div></>)}
              {result.keywordsMissing?.length>0&&(<><div style={{marginBottom:7,fontSize:10,color:'var(--err)'}}>✖ Missing</div><div className="kw-row">{result.keywordsMissing.map((k,i)=><span key={i} className="kw no">{k}</span>)}</div></>)}
            </div>
          </div>

          <div className="sec-title">Section Analysis</div>
          <div className="sec-list">{result.sections?.map((s,i)=>{ const c=sc(s.score); return <div key={i} className="sec-card"><div className="sc-hd"><span className="sc-nm">{s.name}</span><span className="sc-sc" style={{color:c}}>{s.score}</span></div><div className="sc-bar"><div className="sc-fill" style={{width:`${s.score}%`,background:`linear-gradient(90deg,${c}60,${c})`}}/></div><div className="sc-fb">{s.feedback}</div></div>; })}</div>

          <div className="sec-title">Improvements</div>
          <div className="imp-list">{result.improvements?.map((s,i)=>{ const p=pc(s.priority); return <div key={i} className="imp-card"><div className="imp-dot" style={{background:p.color}}/><div className="imp-cnt"><div className="imp-ttl">{s.title}</div><div className="imp-why">{s.why}</div></div><span className="imp-badge" style={{background:p.bg,color:p.color}}>{s.priority}</span></div>; })}</div>

          <div className="sec-title">Ask the LinkedIn AI</div>
          <ChatWidget result={result} mode="linkedin" prompts={["Rewrite my headline?","Improve ATS score?","Add missing keywords?","Summary rewrite?"]}/>
        </div>
      )}
    </div>
  );
}

// ── Resume Panel ──────────────────────────────────────────────────────────────

export default LinkedInPanel;
