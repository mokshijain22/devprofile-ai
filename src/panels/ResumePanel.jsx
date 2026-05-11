import { useEffect, useRef, useState } from "react";
import { API } from "../config";
import { LC, gi, pj, sc, pc } from "../utils";
import { ChatWidget, PaymentGate, RadarChart, SaveBar, ScoreRing } from "../components/common";

function ResumePanel({ paidFor, onPaidUpdate, rzpKeyId, rzpAvailable }) {
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'upload'
  const [text, setText]     = useState("");
  const [role, setRole]     = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState("");
  const [pdfName, setPdfName] = useState("");
  const [drag, setDrag]     = useState(false);
  const fileRef = useRef(null);
  const unlocked = paidFor.resume || paidFor.combo;

  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      }
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  function extractPdfText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Use PDF.js from CDN if available, otherwise fall back to text extraction
          if (window.pdfjsLib) {
            const typedArray = new Uint8Array(e.target.result);
            const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              fullText += content.items.map(item => item.str).join(' ') + '\n';
            }
            resolve(fullText);
          } else {
            // Fallback: read as text if possible
            const textReader = new FileReader();
            textReader.onload = (te) => resolve(te.target.result);
            textReader.onerror = () => reject(new Error('Could not read file'));
            textReader.readAsText(file);
          }
        } catch(err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    });
  }

  async function handleFile(file) {
    if (!file) return;
    setPdfName(file.name);
    try {
      let extracted = '';
      if (file.type === 'application/pdf') {
        extracted = await extractPdfText(file);
      } else {
        // Plain text / docx as text
        extracted = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.onerror = () => rej(new Error('Could not read file'));
          r.readAsText(file);
        });
      }
      if (!extracted || extracted.trim().length < 50) {
        setError("Could not extract text from this file. Please paste your resume text instead.");
        setInputMode('paste');
        return;
      }
      setText(extracted.trim());
      setInputMode('paste');
    } catch(e) {
      setError("File read error: " + e.message + ". Try pasting your resume text instead.");
      setInputMode('paste');
    }
  }

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/analyze-resume`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ resumeText:text, targetRole:role, targetCompany:company }) });
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
        <div className="badge"><div className="badge-dot"/>Resume AI Analyzer</div>
        <h1>Resume<br/>Optimizer</h1>
        <p>ATS optimization, impact scoring, and improvement suggestions. Upload PDF or paste text.</p>

        {unlocked && (<>
          <div className="tab-switch" style={{maxWidth:400,marginBottom:16}}>
            <button className={`ts-btn ${inputMode==='paste'?'on':''}`} onClick={()=>setInputMode('paste')}>📋 Paste Resume Text</button>
            <button className={`ts-btn ${inputMode==='upload'?'on':''}`} onClick={()=>setInputMode('upload')}>📄 Upload PDF</button>
          </div>

          {inputMode === 'upload' && (
            <div
              className={`upload-area ${drag?'drag':''}`}
              onDragOver={e=>{e.preventDefault();setDrag(true);}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
              onClick={()=>fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" onChange={e=>handleFile(e.target.files[0])}/>
              <div className="upload-icon">📄</div>
              <div className="upload-title">Drop your resume here or click to browse</div>
              <div className="upload-sub">Supports PDF, TXT · Text is extracted and analyzed</div>
              {pdfName && <div className="upload-done">✔ {pdfName} loaded — switch to "Paste" to review</div>}
            </div>
          )}

          {inputMode === 'paste' && (
            <>
              <div className="tw"><textarea placeholder="Paste your full resume text here (Contact, Summary, Experience, Skills, Education, Projects, Certifications)…" value={text} onChange={e=>setText(e.target.value)} style={{minHeight:130}}/></div>
              {pdfName && <div style={{fontSize:11,color:'var(--mint)',textAlign:'center',marginBottom:8}}>✔ Text extracted from {pdfName}</div>}
            </>
          )}

          {(inputMode==='paste' || text) && (<>
            <div className="ir">
              <input className="if" placeholder="Target role (e.g. ML Engineer)" value={role} onChange={e=>setRole(e.target.value)}/>
              <input className="if" placeholder="Target company (optional)" value={company} onChange={e=>setCompany(e.target.value)}/>
            </div>
            {error && <p style={{color:'var(--err)',fontSize:12,marginTop:8,textAlign:'center'}}>{error}</p>}
            <div className="bc"><button className="btn-af" onClick={analyze} disabled={loading||!text.trim()}>{loading?'Analyzing…':'Analyze Resume →'}</button></div>
          </>)}
        </>)}
      </div>

      {!unlocked && <PaymentGate mode="resume" onPaid={onPaidUpdate} rzpKeyId={rzpKeyId} rzpAvailable={rzpAvailable}/>}
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

          <SaveBar result={result} mode="resume"/>

          <div className="mg">
            <div className="mc"><div className="mc-v" style={{color:sc(result.atsScore)}}>{result.atsScore}</div><div className="mc-l">ATS SCORE</div></div>
            <div className="mc"><div className="mc-v" style={{color:sc(result.readabilityScore)}}>{result.readabilityScore}</div><div className="mc-l">READABILITY</div></div>
            <div className="mc"><div className="mc-v" style={{color:sc(result.estimatedJobMatchScore)}}>{result.estimatedJobMatchScore}</div><div className="mc-l">JOB MATCH</div></div>
          </div>

          <div className="vg">
            <div className="gc"><div className="gc-title">Resume Health Radar</div>{result.radarData&&<RadarChart data={result.radarData}/>}</div>
            <div className="gc">
              <div className="gc-title">Keywords</div>
              {result.keywordsFound?.length>0&&(<><div style={{marginBottom:7,fontSize:10,color:'var(--ok)'}}>✔ Found in resume</div><div className="kw-row" style={{marginBottom:12}}>{result.keywordsFound.map((k,i)=><span key={i} className="kw ok">{k}</span>)}</div></>)}
              {result.keywordsMissing?.length>0&&(<><div style={{marginBottom:7,fontSize:10,color:'var(--err)'}}>✖ Missing — add these</div><div className="kw-row">{result.keywordsMissing.map((k,i)=><span key={i} className="kw no">{k}</span>)}</div></>)}
            </div>
          </div>

          <div className="sec-title">Section Analysis</div>
          <div className="sec-list">{result.sections?.map((s,i)=>{ const c=sc(s.score); return <div key={i} className="sec-card"><div className="sc-hd"><span className="sc-nm">{s.name}</span><span className="sc-sc" style={{color:c}}>{s.score}</span></div><div className="sc-bar"><div className="sc-fill" style={{width:`${s.score}%`,background:`linear-gradient(90deg,${c}60,${c})`}}/></div><div className="sc-fb">{s.feedback}</div></div>; })}</div>

          <div className="sec-title">Improvements</div>
          <div className="imp-list">{result.improvements?.map((s,i)=>{ const p=pc(s.priority); return <div key={i} className="imp-card"><div className="imp-dot" style={{background:p.color}}/><div className="imp-cnt"><div className="imp-ttl">{s.title}</div><div className="imp-why">{s.why}</div>{s.where&&<span className="imp-wh">{s.where}</span>}</div><span className="imp-badge" style={{background:p.bg,color:p.color}}>{s.priority}</span></div>; })}</div>

          {result.missingElements?.length>0 && (<>
            <div className="sec-title">Missing Elements</div>
            <div className="kw-row" style={{marginBottom:14}}>{result.missingElements.map((e,i)=><span key={i} className="kw no">{e}</span>)}</div>
          </>)}

          <div className="sec-title">Ask the Resume AI</div>
          <ChatWidget result={result} mode="resume" prompts={["Rewrite experience bullet?","Improve ATS score?","Add impact numbers?","Tailor for role?"]}/>
        </div>
      )}
    </div>
  );
}


export default ResumePanel;
