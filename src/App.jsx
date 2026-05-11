import { useEffect, useState } from "react";
import { STYLES } from "./styles";
import RepoPanel from "./panels/RepoPanel";
import ProfilePanel from "./panels/ProfilePanel";
import LinkedInPanel from "./panels/LinkedInPanel";
import ResumePanel from "./panels/ResumePanel";

const MODES = [
  { id:'repo',    icon:'🐙', label:'GitHub Repo' },
  { id:'profile', icon:'👤', label:'GH Profile'  },
  { id:'linkedin',icon:'💼', label:'LinkedIn'     },
  { id:'resume',  icon:'📄', label:'Resume'       },
];

export default function App() {
  const [mode, setMode]           = useState('repo');
  const [ghUser, setGhUser]       = useState(null);
  const [oauthAvailable, setOA]   = useState(false);
  const [rzpAvailable, setRZP]    = useState(false);
  const [rzpKeyId, setRzpKeyId]   = useState(null);
  const [paidFor, setPaidFor]     = useState({});
  const [globalErr, setGlobalErr] = useState("");

  useEffect(() => {
    fetch("/auth/me", { credentials:"include" })
      .then(r=>r.json()).then(d=>{ if(d.connected) setGhUser(d.user); }).catch(()=>{});
    fetch("/auth/status")
      .then(r=>r.json()).then(d=>{ setOA(!!d.oauthAvailable); setRZP(!!d.razorpayAvailable); setRzpKeyId(d.razorpayKeyId); }).catch(()=>{});
    fetch("/api/payment/status", { credentials:"include" })
      .then(r=>r.json()).then(d=>{ if(d.paidFor) setPaidFor(d.paidFor); }).catch(()=>{});

    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) { setGlobalErr(decodeURIComponent(p.get("error"))); window.history.replaceState({},"","/"); }

    // Load Razorpay script with onload so window.Razorpay is ready before pay()
    if (!window.Razorpay) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => console.log('[DevProfile] Razorpay script loaded');
      s.onerror = () => console.error('[DevProfile] Razorpay script failed to load');
      document.head.appendChild(s);
    }
  }, []);

  function updatePaid(newPaidFor) {
    // newPaidFor is the full paidFor object from server
    setPaidFor(prev => ({ ...prev, ...newPaidFor }));
  }

  const sharedProps = { paidFor, onPaidUpdate: updatePaid, rzpKeyId, rzpAvailable };

  const isUnlocked = (m) => paidFor[m] || paidFor.combo;

  return (
    <>
      <style>{STYLES}</style>
      <div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>

      <nav className="nav">
        <div className="logo"><div className="logo-dot"/>DevProfile AI</div>
        <div className="nav-r">
          {ghUser ? (
            <div className="auth-chip">
              <img src={ghUser.avatar} alt="" className="auth-av"/>
              <div><div className="auth-nm">{ghUser.name||ghUser.login}</div><div className="auth-sub">Private repos unlocked</div></div>
              <button className="btn-so" onClick={async()=>{ await fetch("/auth/logout",{method:"POST",credentials:"include"}); setGhUser(null); }}>Sign out</button>
            </div>
          ) : (
            <button className="btn-gh" onClick={()=>{ if(!oauthAvailable) setGlobalErr("Add GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET to .env"); else window.location.href="/auth/github"; }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
              Connect GitHub
            </button>
          )}
          {/* If any plan active — show status + reset button for testing */}
          {Object.keys(paidFor).length > 0 && import.meta.env.DEV && (
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{fontSize:10,color:'var(--mint)',fontFamily:'var(--fd)',fontWeight:600,background:'rgba(127,255,212,.1)',border:'1px solid rgba(127,255,212,.2)',borderRadius:100,padding:'4px 10px'}}>
                {paidFor.combo ? '✔ Combo Active' : '✔ Unlocked'}
              </div>
              <button title="Reset payment (for testing)" style={{background:'transparent',border:'1px solid var(--border)',borderRadius:100,padding:'3px 8px',fontSize:9,color:'var(--text3)',cursor:'pointer',fontFamily:'var(--fd)'}}
                onClick={async()=>{ await fetch("/api/payment/reset",{method:"POST",credentials:"include"}); setPaidFor({}); }}>
                Reset
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="app">
        {globalErr && <div style={{background:'rgba(255,143,171,.1)',border:'1px solid rgba(255,143,171,.3)',borderRadius:11,padding:'9px 14px',fontSize:12,color:'var(--err)',marginBottom:14}}>{globalErr}</div>}

        {/* Unlock banner when combo is active */}
        {paidFor.combo && (
          <div className="unlock-banner">
            ✔ Combo plan active — all 4 analyzers unlocked for this session
          </div>
        )}

        <div className="tabs" style={{marginBottom:36}}>
          {MODES.map(m => (
            <button key={m.id} className={`tab ${mode===m.id?'on':''}`} onClick={()=>setMode(m.id)}>
              <span className="tab-icon">{m.icon}</span>
              {m.label}
              {isUnlocked(m.id) && mode!==m.id && <span style={{width:5,height:5,borderRadius:'50%',background:'var(--mint)',display:'inline-block',marginLeft:4}}/>}
            </button>
          ))}
        </div>

        {mode==='repo'     && <RepoPanel ghUser={ghUser} oauthAvailable={oauthAvailable} {...sharedProps}/>}
        {mode==='profile'  && <ProfilePanel {...sharedProps}/>}
        {mode==='linkedin' && <LinkedInPanel {...sharedProps}/>}
        {mode==='resume'   && <ResumePanel {...sharedProps}/>}
      </div>
    </>
  );
}