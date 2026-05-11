import { useState } from "react";
import { API } from "../config";
import { gi, pj, sc,pc } from "../utils";
import { ChatWidget, PaymentGate, RadarChart, SaveBar, ScoreRing } from "../components/common";

function ProfilePanel({ paidFor, onPaidUpdate, rzpKeyId, rzpAvailable }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");

  async function analyze() {
    const u = username.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\/$/,'');
    if (!u) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/analyze-profile`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username:u }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = pj(data.text);
      if (!parsed) throw new Error("Invalid AI response");
      parsed._user = data.user; parsed._repos = data.repos; parsed._signals = data.signals;
      setResult(parsed);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const g = result ? gi(result.score) : null;
  const s = result ? sc(result.score) : "#B8A9FF";

  return (
    <div>
      <div className="hero">
        <div className="badge"><div className="badge-dot"/>GitHub Profile AI</div>
        <h1>Profile<br/>Evaluator</h1>
        <p>Analyze your GitHub presence, activity, and hirability score.</p>
        <div className="iw">
          <input type="text" placeholder="github.com/username or just username"
            value={username} onChange={e=>setUsername(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&(paidFor.profile||paidFor.combo)&&analyze()}
            disabled={!paidFor.profile && !paidFor.combo}/>
          <button className="btn-a" onClick={analyze}
            disabled={loading||!username.trim()||(!paidFor.profile&&!paidFor.combo)}>
            {loading?'Analyzing…':'Analyze →'}
          </button>
        </div>
        {(!paidFor.profile && !paidFor.combo) && (
          <p style={{fontSize:11,color:'var(--text3)',marginTop:8}}>Unlock below to analyze any GitHub profile</p>
        )}
        {error && <p style={{color:'var(--err)',fontSize:12,marginTop:10}}>{error}</p>}
      </div>

      {!paidFor.profile && !paidFor.combo && <PaymentGate mode="profile" onPaid={onPaidUpdate} rzpKeyId={rzpKeyId} rzpAvailable={rzpAvailable}/>}
      {loading && <div className="sk" style={{height:200,borderRadius:22,marginTop:16}}/>}

      {result && !loading && (
        <div className="results">
          <div className="sum-card">
            {result._user && <div className="ph"><img src={result._user.avatar_url} alt="" className="ph-av"/><div><div className="ph-name">{result._user.name||result._user.login}</div><div className="ph-user">@{result._user.login}</div>{result._user.bio&&<div className="ph-bio">{result._user.bio}</div>}</div></div>}
            <div className="sum-top">
              <ScoreRing score={result.score} color={s}/>
              <div className="sum-info">
                <div className="gr-row"><span className="gr-badge" style={{background:g.bg,color:g.color}}>{g.grade}</span>{result._signals&&<span className="cf-badge">★ {result._signals.totalStars} total stars</span>}</div>
                <div className="tags">{result.tags?.map((t,i)=><span key={i} className="tag">{t}</span>)}</div>
                <div className="ins-box"><div className="ins-lbl">AI ASSESSMENT</div>{result.headline}</div>
              </div>
            </div>
            <div className="sp-row">
              <div className="sp-box"><div className="sp-ttl" style={{color:'var(--ok)'}}>STRENGTHS</div>{result.strengths?.map((s,i)=><div key={i} className="sp-item"><span className="sp-ic">✔</span>{s}</div>)}</div>
              <div className="sp-box"><div className="sp-ttl" style={{color:'var(--warn)'}}>GAPS</div>{result.gaps?.map((g,i)=><div key={i} className="sp-item"><span className="sp-ic">⚡</span>{g}</div>)}</div>
            </div>
          </div>

          <SaveBar result={result} mode="profile"/>

          <div className="sec-title">Key Metrics</div>
          <div className="mg">
            <div className="mc"><div className="mc-v" style={{color:sc(result.hirability||result.score)}}>{result.hirability||'—'}</div><div className="mc-l">HIRABILITY</div></div>
            <div className="mc"><div className="mc-v" style={{color:sc(result.openSourceScore||result.score)}}>{result.openSourceScore||'—'}</div><div className="mc-l">OPEN SOURCE</div></div>
            <div className="mc"><div className="mc-v" style={{color:sc(result.consistencyScore||result.score)}}>{result.consistencyScore||'—'}</div><div className="mc-l">CONSISTENCY</div></div>
          </div>

          <div className="vg">
            <div className="gc"><div className="gc-title">Profile Health Radar</div>{result.radarData&&<RadarChart data={result.radarData}/>}</div>
            <div className="gc">
              <div className="gc-title">Top Languages</div>
              {result._signals?.topLangs&&(<><div className="lang-bar">{result._signals.topLangs.map((l,i)=><div key={i} className="lang-seg" style={{flex:1,background:LC[i%LC.length]}}/>)}</div><div className="lang-leg">{result._signals.topLangs.map((l,i)=><span key={i} className="lang-it"><span className="lang-dot" style={{background:LC[i%LC.length]}}/>{l}</span>)}</div></>)}
              {result._user&&<div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                <div style={{background:'var(--glass2)',borderRadius:9,padding:'9px 11px'}}><div style={{fontFamily:'var(--fd)',fontSize:17,fontWeight:700}}>{result._user.followers}</div><div style={{fontSize:9,color:'var(--text3)',marginTop:2}}>FOLLOWERS</div></div>
                <div style={{background:'var(--glass2)',borderRadius:9,padding:'9px 11px'}}><div style={{fontFamily:'var(--fd)',fontSize:17,fontWeight:700}}>{result._user.public_repos}</div><div style={{fontSize:9,color:'var(--text3)',marginTop:2}}>REPOS</div></div>
              </div>}
            </div>
          </div>

          <div className="sec-title">How to Improve</div>
          <div className="imp-list">{result.improvements?.map((s,i)=>{ const p=pc(s.priority); return <div key={i} className="imp-card"><div className="imp-dot" style={{background:p.color}}/><div className="imp-cnt"><div className="imp-ttl">{s.title}</div><div className="imp-why">{s.why}</div></div><span className="imp-badge" style={{background:p.bg,color:p.color}}>{s.priority}</span></div>; })}</div>

          <div className="sec-title">Ask the Career AI</div>
          <ChatWidget result={result} mode="profile" prompts={["How to get more stars?","Improve hirability?","What repos to add?","Best practices?"]}/>
        </div>
      )}
    </div>
  );
}

// ── LinkedIn Panel ────────────────────────────────────────────────────────────

export default ProfilePanel;
