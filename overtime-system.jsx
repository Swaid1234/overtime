import { useState, useRef, useEffect } from "react";

/* ─── CONSTANTS ─────────────────────────────────────────────────────────────── */
const ADMIN_KEY = "ot_admin";
const SUPERVISORS_KEY = "ot_supervisors";
const REQUESTS_KEY = "ot_requests";
const DEFAULT_ADMIN_PASS = "admin1234";
const COMPANY = "سواعد";

const store = {
  get: async (k) => { try { const r = await window.storage.get(k,true); return r?JSON.parse(r.value):null; } catch{return null;} },
  set: async (k,v) => { try { await window.storage.set(k,JSON.stringify(v),true); } catch{} },
};

const calcHours = (s,e) => {
  if(!s||!e) return "—";
  const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number);
  const diff=(eh*60+em)-(sh*60+sm);
  if(diff<=0) return "—";
  const h=Math.floor(diff/60),m=diff%60;
  return m>0?`${h}س ${m}د`:`${h} ساعة`;
};

/* ─── INJECT GLOBAL STYLES & FONTS ──────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060b18;
    --surface: rgba(255,255,255,0.04);
    --surface-2: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.09);
    --gold: #c9a46e;
    --gold-glow: rgba(201,164,110,0.18);
    --blue: #4f9cf9;
    --blue-glow: rgba(79,156,249,0.15);
    --green: #34d399;
    --red: #f87171;
    --text: #f0f4ff;
    --text-2: #8a9bbf;
    --text-3: #4a5a7a;
    --ff: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--ff); direction: rtl; }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes scaleIn {
    from { opacity:0; transform:scale(0.93); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 var(--gold-glow); }
    70%  { box-shadow: 0 0 0 12px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  .page-enter { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .card-enter { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .item-1 { animation-delay: 0.05s; }
  .item-2 { animation-delay: 0.12s; }
  .item-3 { animation-delay: 0.19s; }
  .item-4 { animation-delay: 0.26s; }
  .item-5 { animation-delay: 0.33s; }

  .ot-input {
    width: 100%;
    padding: 12px 16px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-family: var(--ff);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    -webkit-appearance: none;
  }
  .ot-input:focus {
    border-color: var(--gold);
    background: rgba(255,255,255,0.07);
    box-shadow: 0 0 0 3px var(--gold-glow);
  }
  .ot-input::placeholder { color: var(--text-3); }
  .ot-input option { background: #0d1a30; color: var(--text); }

  .portal-card {
    position: relative;
    border: 1.5px solid var(--border);
    border-radius: 16px;
    padding: 22px 20px;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
    background: var(--surface);
    backdrop-filter: blur(12px);
  }
  .portal-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.35);
  }
  .portal-card.gold:hover { border-color: var(--gold); box-shadow: 0 16px 48px rgba(201,164,110,0.15); }
  .portal-card.blue:hover { border-color: var(--blue); box-shadow: 0 16px 48px rgba(79,156,249,0.12); }
  .portal-card.silver:hover { border-color: rgba(255,255,255,0.25); }

  .portal-card::before {
    content:'';
    position:absolute;
    inset:0;
    opacity:0;
    transition: opacity 0.3s;
  }
  .portal-card.gold::before { background: linear-gradient(135deg, rgba(201,164,110,0.06) 0%, transparent 60%); }
  .portal-card.blue::before { background: linear-gradient(135deg, rgba(79,156,249,0.06) 0%, transparent 60%); }
  .portal-card:hover::before { opacity:1; }

  .req-row {
    border: 1.5px solid var(--border);
    border-radius: 12px;
    padding: 14px 16px;
    background: var(--surface);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.2s;
    margin-bottom: 8px;
    animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }
  .req-row:hover {
    background: var(--surface-2);
    border-color: rgba(255,255,255,0.15);
    transform: translateX(-2px);
  }
  .req-row.no-hover { cursor: default; }
  .req-row.no-hover:hover { transform: none; background: var(--surface); border-color: var(--border); }

  .tab-btn {
    flex:1; padding:8px 6px; border-radius:8px; border:none;
    background: transparent; color: var(--text-2);
    cursor:pointer; font-size:12px; font-weight:600; font-family:var(--ff);
    transition: background 0.2s, color 0.2s;
  }
  .tab-btn.active { background: rgba(255,255,255,0.08); color: var(--text); }

  .stat-chip {
    border-radius:10px; padding:14px 8px; text-align:center;
    border: 1.5px solid var(--border);
    background: var(--surface);
    animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }

  .action-btn {
    flex:1; padding:11px; border-radius:10px; border:2px solid var(--border);
    background: var(--surface); color: var(--text-2);
    cursor:pointer; font-weight:700; font-size:13px; font-family:var(--ff);
    transition: all 0.2s;
  }
  .action-btn.approve.active { border-color: var(--green); background: rgba(52,211,153,0.08); color: var(--green); }
  .action-btn.reject.active  { border-color: var(--red);   background: rgba(248,113,113,0.08); color: var(--red); }

  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius:10px; }
`;

function useGlobalStyles() {
  useEffect(() => {
    const id = "ot-global-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);
}

/* ─── BG DECORATION ─────────────────────────────────────────────────────────── */
function BgDeco() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      <div style={{position:"absolute",top:"-20%",right:"-15%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,164,110,0.06) 0%,transparent 70%)"}}/>
      <div style={{position:"absolute",bottom:"-20%",left:"-15%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,156,249,0.07) 0%,transparent 70%)"}}/>
      {[...Array(24)].map((_,i)=>(
        <div key={i} style={{position:"absolute",width:1,height:1,borderRadius:"50%",background:"rgba(255,255,255,0.25)",
          top:`${Math.sin(i*2.3)*40+50}%`,left:`${(i/24)*100}%`,
          boxShadow:"0 0 3px 1px rgba(255,255,255,0.1)"}}/>
      ))}
    </div>
  );
}

/* ─── LAYOUT WRAPPER ─────────────────────────────────────────────────────────── */
function Page({children, wide=false}) {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"28px 16px",position:"relative"}}>
      <BgDeco/>
      <div className="page-enter" style={{width:"100%",maxWidth:wide?640:560,position:"relative",zIndex:1}}>
        {children}
      </div>
    </div>
  );
}

function Card({children,style={}}) {
  return (
    <div className="card-enter" style={{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1.5px solid rgba(255,255,255,0.09)",borderRadius:20,padding:"28px 24px",boxShadow:"0 24px 80px rgba(0,0,0,0.4)",...style}}>
      {children}
    </div>
  );
}

/* ─── LOGO ───────────────────────────────────────────────────────────────────── */
function Logo({size="md"}) {
  const s = size==="lg" ? {icon:44,main:28,sub:12} : {icon:28,main:17,sub:10};
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:s.icon,height:s.icon,borderRadius:10,background:"linear-gradient(135deg,#c9a46e,#f0c880)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(201,164,110,0.3)"}}>
        <span style={{fontSize:s.icon*0.5}}>⚡</span>
      </div>
      <div>
        <div style={{fontSize:s.main,fontWeight:700,color:"var(--text)",letterSpacing:0.5,lineHeight:1}}>{COMPANY}</div>
        {size==="lg"&&<div style={{fontSize:s.sub,color:"var(--text-2)",marginTop:3,letterSpacing:0.5}}>نظام إدارة العمل الإضافي</div>}
      </div>
    </div>
  );
}

/* ─── BUTTONS ────────────────────────────────────────────────────────────────── */
function Btn({children, variant="primary", disabled=false, onClick, full=false, size="md", style={}}) {
  const pad = size==="sm" ? "7px 16px" : size==="lg" ? "14px 28px" : "11px 22px";
  const fs  = size==="sm" ? 12 : size==="lg" ? 15 : 13;
  const base = {
    padding:pad, borderRadius:10, border:"none", cursor:disabled?"not-allowed":"pointer",
    fontSize:fs, fontWeight:700, fontFamily:"var(--ff)", letterSpacing:0.3,
    transition:"all 0.2s", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
    width:full?"100%":"auto", ...style,
  };
  const variants = {
    primary:  {background:disabled?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#c9a46e,#e8b870)", color:disabled?"var(--text-3)":"#1a0e00", boxShadow:disabled?"none":"0 4px 20px rgba(201,164,110,0.3)"},
    secondary:{background:"rgba(255,255,255,0.07)", color:"var(--text)", border:"1.5px solid rgba(255,255,255,0.12)"},
    danger:   {background:"rgba(248,113,113,0.12)",  color:"var(--red)",  border:"1.5px solid rgba(248,113,113,0.3)"},
    success:  {background:"linear-gradient(135deg,#059669,#34d399)", color:"#fff", boxShadow:"0 4px 16px rgba(52,211,153,0.25)"},
    ghost:    {background:"transparent", color:"var(--text-2)", border:"1.5px solid var(--border)"},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...variants[variant]}}>{children}</button>;
}

/* ─── BADGE ──────────────────────────────────────────────────────────────────── */
const statusMap = {
  pending_supervisor: {label:"بانتظار المشرف",  dot:"#f59e0b"},
  pending_management: {label:"بانتظار الإدارة", dot:"#4f9cf9"},
  approved:           {label:"معتمد",             dot:"#34d399"},
  rejected:           {label:"مرفوض",             dot:"#f87171"},
};
function Badge({status}) {
  const s = statusMap[status]||statusMap.pending_supervisor;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",fontSize:11,fontWeight:600,color:"var(--text-2)",whiteSpace:"nowrap"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:s.dot,flexShrink:0,boxShadow:`0 0 6px ${s.dot}`}}/>
      {s.label}
    </span>
  );
}

/* ─── FIELD DISPLAY ──────────────────────────────────────────────────────────── */
function FR({label,value,highlight=false}) {
  return (
    <div style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)",alignItems:"flex-start"}}>
      <span style={{fontSize:11,color:"var(--text-3)",fontWeight:600,minWidth:120,paddingTop:1,letterSpacing:0.3}}>{label}</span>
      <span style={{fontSize:13,color:highlight?"var(--gold)":"var(--text)",fontWeight:highlight?700:500,flex:1}}>{value}</span>
    </div>
  );
}

/* ─── LABEL ──────────────────────────────────────────────────────────────────── */
function Label({children}) {
  return <div style={{fontSize:11,fontWeight:600,color:"var(--text-2)",marginBottom:6,letterSpacing:0.4}}>{children}</div>;
}

/* ─── ERROR BOX ──────────────────────────────────────────────────────────────── */
function Err({msg}) {
  if(!msg) return null;
  return <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",color:"var(--red)",fontSize:12,padding:"10px 14px",borderRadius:8,marginTop:4}}>{msg}</div>;
}

/* ─── SUCCESS BOX ────────────────────────────────────────────────────────────── */
function SuccessMsg({msg}) {
  if(!msg) return null;
  return <div style={{background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",color:"var(--green)",fontSize:12,padding:"10px 14px",borderRadius:8}}>{msg}</div>;
}

/* ─── SECTION HEADER ─────────────────────────────────────────────────────────── */
function SectionHead({children}) {
  return <div style={{fontSize:11,fontWeight:700,color:"var(--text-3)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>{children}</div>;
}

/* ─── DIVIDER ────────────────────────────────────────────────────────────────── */
function Divider() { return <div style={{height:1,background:"var(--border)",margin:"20px 0"}}/>; }

/* ─── PROGRESS BAR ───────────────────────────────────────────────────────────── */
function StepBar({step, total=2}) {
  return (
    <div style={{display:"flex",gap:6,marginBottom:24}}>
      {Array.from({length:total},(_,i)=>(
        <div key={i} style={{flex:1,height:3,borderRadius:3,background:step>i?"linear-gradient(90deg,var(--gold),#f0c880)":"rgba(255,255,255,0.08)",transition:"background 0.3s"}}/>
      ))}
    </div>
  );
}

/* ─── SIGNATURE CANVAS ───────────────────────────────────────────────────────── */
function SigCanvas({onSave}) {
  const ref=useRef(null); const [drawing,setDrawing]=useState(false); const [has,setHas]=useState(false); const last=useRef(null);
  const pos=(e,c)=>{const r=c.getBoundingClientRect(),sx=c.width/r.width,sy=c.height/r.height,src=e.touches?e.touches[0]:e;return{x:(src.clientX-r.left)*sx,y:(src.clientY-r.top)*sy};};
  const start=(e)=>{e.preventDefault();setDrawing(true);last.current=pos(e,ref.current);};
  const move=(e)=>{
    e.preventDefault();if(!drawing)return;
    const c=ref.current,ctx=c.getContext("2d"),p=pos(e,c);
    ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);
    ctx.strokeStyle="rgba(201,164,110,0.9)";ctx.lineWidth=2;ctx.lineCap="round";ctx.stroke();
    last.current=p;setHas(true);
  };
  const clear=()=>{ref.current.getContext("2d").clearRect(0,0,ref.current.width,ref.current.height);setHas(false);};
  return(
    <div>
      <div style={{border:"1.5px dashed rgba(255,255,255,0.15)",borderRadius:12,background:"rgba(255,255,255,0.03)",position:"relative",overflow:"hidden"}}>
        <canvas ref={ref} width={500} height={100} style={{width:"100%",height:100,cursor:"crosshair",display:"block",touchAction:"none"}}
          onMouseDown={start} onMouseMove={move} onMouseUp={()=>setDrawing(false)} onMouseLeave={()=>setDrawing(false)}
          onTouchStart={start} onTouchMove={move} onTouchEnd={()=>setDrawing(false)}/>
        {!has&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"var(--text-3)",fontSize:13,pointerEvents:"none"}}>✍️ وقّع هنا</div>}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
        <Btn variant="ghost" size="sm" onClick={clear}>مسح</Btn>
        <Btn size="sm" disabled={!has} onClick={()=>{if(has)onSave(ref.current.toDataURL());}}>حفظ ✓</Btn>
      </div>
    </div>
  );
}

/* ─── REQUEST CARD ───────────────────────────────────────────────────────────── */
function ReqCard({req, onClick, delay=0}) {
  return(
    <div className={`req-row${onClick?"":" no-hover"}`} style={{animationDelay:`${delay}s`}} onClick={onClick||undefined}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontWeight:700,color:"var(--text)",fontSize:14}}>{req.form.employeeName}</span>
        <Badge status={req.status}/>
      </div>
      <div style={{display:"flex",gap:14,fontSize:11,color:"var(--text-3)",flexWrap:"wrap"}}>
        <span>📅 {req.form.date}</span>
        <span>🕐 {req.form.startTime}–{req.form.endTime}</span>
        <span style={{color:"var(--gold)",fontWeight:600}}>⏱ {calcHours(req.form.startTime,req.form.endTime)}</span>
      </div>
      <div style={{fontSize:11,color:"var(--text-3)",marginTop:6}}>📌 {req.form.reason}</div>
    </div>
  );
}

/* ─── PDF EXPORT ─────────────────────────────────────────────────────────────── */
const exportPDF = null; // replaced by modal
const buildPDF = (req) => {
  const hours = calcHours(req.form.startTime, req.form.endTime);
  const sigBox = (title, imgSrc, name, date, action) => `
    <div class="sig-box">
      <div class="sig-title">${title}</div>
      <div class="sig-area">${imgSrc?`<img src="${imgSrc}" style="max-width:100%;max-height:80px;object-fit:contain;"/>`:'<div style="height:60px;"></div>'}</div>
      ${name?`<div class="sig-name">${name}</div>`:''}
      ${action==='approve'?'<div class="stamp-approved">موافق ✓</div>':action==='reject'?'<div class="stamp-rejected">مرفوض ✗</div>':''}
      ${date?`<div class="sig-date">${date}</div>`:''}
    </div>`;
  const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
  <title>طلب عمل إضافي - ${req.form.employeeName}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Arial','Segoe UI',sans-serif;direction:rtl;color:#1a1a2e;background:#fff;padding:30px;font-size:13px;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1a3a5c;padding-bottom:16px;margin-bottom:20px;}.company{font-size:26px;font-weight:900;color:#1a3a5c;}.company-sub{font-size:11px;color:#7a96b0;margin-top:3px;}.doc-title{font-size:17px;font-weight:900;color:#1a3a5c;background:#e8f0fb;padding:10px 20px;border-radius:8px;border:2px solid #1a3a5c;}.section{margin-bottom:18px;}.section-title{font-size:12px;font-weight:900;color:#1a3a5c;background:#f0f5ff;padding:6px 12px;border-radius:6px;margin-bottom:10px;border-right:4px solid #1a3a5c;}table{width:100%;border-collapse:collapse;}td{padding:7px 10px;border:1px solid #dce8f5;font-size:13px;vertical-align:top;}td:first-child{background:#f8fafd;font-weight:700;color:#5a7a9a;width:160px;}.highlight{background:#fff8e1!important;color:#856404!important;font-weight:800!important;}.sigs{display:flex;gap:16px;margin-top:20px;}.sig-box{flex:1;border:1.5px solid #dce8f5;border-radius:8px;padding:10px;text-align:center;}.sig-title{font-size:11px;font-weight:800;color:#5a7a9a;margin-bottom:8px;border-bottom:1px solid #edf2f7;padding-bottom:6px;}.sig-area{min-height:80px;display:flex;align-items:center;justify-content:center;border:1px dashed #dce8f5;border-radius:6px;margin-bottom:6px;background:#f8fafd;}.sig-name{font-size:11px;color:#1a3a5c;font-weight:700;margin-top:4px;}.sig-date{font-size:10px;color:#aab8cc;margin-top:2px;}.stamp-approved{display:inline-block;border:2px solid #1a7a4a;color:#1a7a4a;border-radius:50%;width:52px;height:52px;line-height:52px;font-size:10px;font-weight:900;margin:6px auto;}.stamp-rejected{display:inline-block;border:2px solid #c0392b;color:#c0392b;border-radius:50%;width:52px;height:52px;line-height:52px;font-size:10px;font-weight:900;margin:6px auto;}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #dce8f5;display:flex;justify-content:space-between;font-size:10px;color:#aab8cc;}@media print{.no-print{display:none!important;}}</style></head><body>
  <div class="no-print" style="text-align:center;margin-bottom:20px;"><button onclick="window.print()" style="padding:10px 28px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ طباعة / حفظ PDF</button></div>
  <div class="header"><div><div class="company">⚡ ${COMPANY}</div><div class="company-sub">شركة سواعد للخدمات المهنية</div></div><div style="text-align:center"><div class="doc-title">نموذج طلب العمل الإضافي</div></div><div style="text-align:left;font-size:11px;color:#aab8cc;">تاريخ التقديم<br/>${req.submittedAt||''}</div></div>
  <div class="section"><div class="section-title">بيانات الموظف</div><table><tr><td>اسم الموظف</td><td>${req.form.employeeName}</td><td>رقم الهوية</td><td>${req.form.nationalId||'—'}</td></tr><tr><td>رقم الجوال</td><td>${req.form.mobile||'—'}</td><td>القسم</td><td>${req.form.department||'—'}</td></tr><tr><td>موقع العمل</td><td colspan="3">${req.form.workLocation||'—'}</td></tr></table></div>
  <div class="section"><div class="section-title">تفاصيل العمل الإضافي</div><table><tr><td>التاريخ</td><td>${req.form.date}</td><td>نوع الأوفر تايم</td><td>${req.form.hoursType}</td></tr><tr><td>وقت البداية</td><td>${req.form.startTime}</td><td>وقت النهاية</td><td>${req.form.endTime}</td></tr><tr><td class="highlight">إجمالي الساعات</td><td class="highlight" colspan="3">${hours}</td></tr><tr><td>سبب العمل الإضافي</td><td colspan="3">${req.form.reason}</td></tr></table></div>
  ${req.supervisorNote||req.managementNote?`<div class="section"><div class="section-title">الملاحظات</div><table>${req.supervisorNote?`<tr><td>ملاحظة المشرف</td><td>${req.supervisorNote}</td></tr>`:''} ${req.managementNote?`<tr><td>ملاحظة الإدارة</td><td>${req.managementNote}</td></tr>`:''}</table></div>`:''}
  <div class="sigs">${sigBox('توقيع الموظف',req.employeeSignature,req.form.employeeName,req.submittedAt,'approve')}${sigBox('توقيع المشرف',req.supervisorSignature,req.supervisorName||'',req.supervisorAt,req.supervisorAction)}${sigBox('اعتماد الإدارة',req.managementSignature,'الإدارة',req.managementAt,req.managementAction)}</div>
  <div class="footer"><span>شركة ${COMPANY} للخدمات المهنية</span><span>صادر إلكترونياً</span></div>
  </body></html>`;
  return html;
};

/* ═══════════════════════ MAIN APP ═══════════════════════════════════════════ */
export default function App() {
  useGlobalStyles();

  const [view, setView]         = useState("home");
  const [requests, setReqs]     = useState({});
  const [supervisors, setSups]  = useState({});
  const [session, setSession]   = useState(null);
  const [selected, setSel]      = useState(null);
  const [pdfReq, setPdfReq]      = useState(null);
  const [adminTab, setAdminTab] = useState("all");
  const [supTab, setSupTab]     = useState("pending");

  const emptyForm = {employeeName:"",nationalId:"",mobile:"",department:"",workLocation:"",date:"",startTime:"",endTime:"",reason:"",hoursType:"عادي"};
  const [form, setForm]   = useState(emptyForm);
  const [empSig, setEmpSig] = useState(null);
  const [step, setStep]   = useState(1);

  const [supSig, setSupSig]       = useState(null);
  const [supNote, setSupNote]     = useState("");
  const [supAction, setSupAction] = useState("approve");

  const [mgmtSig, setMgmtSig]       = useState(null);
  const [mgmtNote, setMgmtNote]     = useState("");
  const [mgmtAction, setMgmtAction] = useState("approve");
  const [mgmtStep, setMgmtStep]     = useState(1);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [newSup, setNewSup]       = useState({name:"",username:"",password:""});
  const [error, setErr]   = useState("");
  const [msg, setMsg]     = useState("");

  useEffect(()=>{
    (async()=>{
      const reqs=await store.get(REQUESTS_KEY); const sups=await store.get(SUPERVISORS_KEY);
      if(reqs) setReqs(reqs); if(sups) setSups(sups);
    })();
  },[]);

  const saveReqs=async(r)=>{ setReqs(r); await store.set(REQUESTS_KEY,r); };
  const saveSups=async(s)=>{ setSups(s); await store.set(SUPERVISORS_KEY,s); };
  const genCode=()=>{ const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join(""); };
  const today=()=>new Date().toLocaleDateString("ar-SA");
  const reqList=Object.values(requests);

  const submitEmployee=async()=>{
    if(!form.employeeName||!form.date||!form.startTime||!form.endTime||!form.reason){setErr("يرجى تعبئة جميع الحقول المطلوبة");return;}
    if(!empSig){setErr("يرجى إضافة توقيعك");return;}
    const code=genCode();
    const req={code,form,employeeSignature:empSig,status:"pending_supervisor",submittedAt:today(),
      supervisorSignature:null,supervisorNote:"",supervisorAction:null,supervisorAt:null,supervisorName:null,
      managementSignature:null,managementNote:"",managementAction:null,managementAt:null};
    await saveReqs({...requests,[code]:req});
    setErr(""); setView("employee_done");
  };

  const adminLogin=async()=>{
    const cfg=await store.get(ADMIN_KEY);
    if(loginPass!==(cfg?.password||DEFAULT_ADMIN_PASS)){setErr("كلمة المرور غير صحيحة");return;}
    setSession({role:"admin"}); setErr(""); setView("admin_dashboard");
  };

  const supLogin=()=>{
    const sup=Object.values(supervisors).find(s=>s.username===loginUser&&s.password===loginPass);
    if(!sup){setErr("بيانات الدخول غير صحيحة");return;}
    setSession({role:"supervisor",id:sup.id,name:sup.name}); setErr(""); setView("supervisor_dashboard");
  };

  const addSupervisor=async()=>{
    if(!newSup.name||!newSup.username||!newSup.password){setErr("يرجى تعبئة جميع الحقول");return;}
    if(Object.values(supervisors).find(s=>s.username===newSup.username)){setErr("اسم المستخدم مستخدم مسبقاً");return;}
    const id="sup_"+Date.now();
    const updated={...supervisors,[id]:{id,...newSup}};
    await saveSups(updated);
    setNewSup({name:"",username:"",password:""}); setErr(""); setMsg("تم إضافة المشرف بنجاح");
    setTimeout(()=>setMsg(""),3000);
  };

  const deleteSupervisor=async(id)=>{ const u={...supervisors}; delete u[id]; await saveSups(u); };

  const submitSupervisor=async()=>{
    if(supAction==="approve"&&!supSig){setErr("يرجى إضافة توقيعك");return;}
    const updated={...requests,[selected]:{...requests[selected],
      supervisorSignature:supAction==="approve"?supSig:null,
      supervisorNote:supNote,supervisorAction:supAction,supervisorAt:today(),supervisorName:session.name,
      status:supAction==="approve"?"pending_management":"rejected"}};
    await saveReqs(updated); setErr(""); setSupSig(null); setSupNote(""); setView("supervisor_dashboard");
  };

  const submitManagement=async()=>{
    if(mgmtAction==="approve"&&!mgmtSig){setErr("يرجى رفع صورة توقيع الإدارة");return;}
    const updated={...requests,[selected]:{...requests[selected],
      managementSignature:mgmtAction==="approve"?mgmtSig:null,
      managementNote:mgmtNote,managementAction:mgmtAction,managementAt:today(),
      status:mgmtAction==="approve"?"approved":"rejected"}};
    await saveReqs(updated); setErr(""); setMgmtSig(null); setMgmtNote(""); setMgmtStep(1); setView("admin_dashboard");
  };

  const logout=()=>{ setSession(null); setView("home"); setLoginUser(""); setLoginPass(""); };

  const pendingReqs  = reqList.filter(r=>r.status==="pending_supervisor");
  const waitingMgmt  = reqList.filter(r=>r.status==="pending_management");
  const approvedReqs = reqList.filter(r=>r.status==="approved");
  const rejectedReqs = reqList.filter(r=>r.status==="rejected");
  const notApproved  = reqList.filter(r=>r.status!=="approved");

  /* ══════════════════════════ VIEWS ══════════════════════════════════════════ */

  /* ── HOME ─────────────────────────────────────────────────────────────────── */
  if(view==="home") return(
    <Page>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div className="page-enter item-1" style={{display:"inline-block",marginBottom:24}}>
          <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,#c9a46e,#f0c880)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 8px 32px rgba(201,164,110,0.35)",animation:"float 4s ease-in-out infinite"}}>
            <span style={{fontSize:34}}>⚡</span>
          </div>
          <h1 style={{fontSize:30,fontWeight:700,color:"var(--text)",margin:"0 0 8px",letterSpacing:"-0.5px"}}>{COMPANY}</h1>
          <p style={{fontSize:13,color:"var(--text-3)",letterSpacing:1}}>OVERTIME MANAGEMENT SYSTEM</p>
        </div>

        {reqList.length>0&&(
          <div className="page-enter item-2" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:32}}>
            {[
              {label:"الكل",     v:reqList.length,      color:"var(--text)"},
              {label:"معلقة",    v:pendingReqs.length+waitingMgmt.length, color:"#f59e0b"},
              {label:"معتمدة",   v:approvedReqs.length, color:"var(--green)"},
              {label:"مرفوضة",  v:rejectedReqs.length, color:"var(--red)"},
            ].map((s,i)=>(
              <div key={i} className="stat-chip" style={{animationDelay:`${0.05+i*0.07}s`}}>
                <div style={{fontSize:22,fontWeight:700,color:s.color,marginBottom:2}}>{s.v}</div>
                <div style={{fontSize:10,color:"var(--text-3)",fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:10,textAlign:"right"}}>
          {[
            {label:"تقديم طلب أوفر تايم",icon:"👤",desc:"للموظفين — تعبئة وتوقيع رقمي",cls:"gold",delay:0.15,
              action:()=>{setView("employee_form");setStep(1);setEmpSig(null);setForm(emptyForm);setErr("");}},
            {label:"بوابة المشرف",        icon:"✅",desc:"مراجعة الطلبات والموافقة",cls:"blue",delay:0.22,
              action:()=>{setView("supervisor_login");setErr("");setLoginUser("");setLoginPass("");}},
            {label:"بوابة الإدارة",        icon:"🏛️",desc:"الاعتماد النهائي ولوحة التحكم",cls:"silver",delay:0.29,
              action:()=>{setView("admin_login");setErr("");setLoginPass("");}},
          ].map(p=>(
            <div key={p.label} className={`portal-card ${p.cls} page-enter`} style={{animationDelay:`${p.delay}s`}} onClick={p.action}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:26,flexShrink:0}}>{p.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:2}}>{p.label}</div>
                  <div style={{fontSize:12,color:"var(--text-3)"}}>{p.desc}</div>
                </div>
                <div style={{color:"var(--text-3)",fontSize:18,opacity:0.5}}>←</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );

  /* ── EMPLOYEE FORM ────────────────────────────────────────────────────────── */
  if(view==="employee_form") return(
    <Page>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <Logo/>
          <Btn variant="ghost" size="sm" onClick={()=>setView("home")}>رجوع ←</Btn>
        </div>
        <StepBar step={step}/>

        {step===1&&(
          <div style={{animation:"fadeUp 0.4s both"}}>
            <SectionHead>بيانات الموظف</SectionHead>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><Label>الاسم الكامل *</Label><input className="ot-input" placeholder="محمد أحمد" value={form.employeeName} onChange={e=>setForm(p=>({...p,employeeName:e.target.value}))}/></div>
                <div><Label>رقم الهوية * (10 أرقام)</Label><input className="ot-input" placeholder="1XXXXXXXXX" maxLength={10} value={form.nationalId} onChange={e=>setForm(p=>({...p,nationalId:e.target.value.replace(/\D/g,"")}))} /></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><Label>رقم الجوال * (10 أرقام)</Label><input className="ot-input" placeholder="05XXXXXXXX" maxLength={10} value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value.replace(/\D/g,"")}))} /></div>
                <div><Label>القسم / الإدارة</Label><input className="ot-input" placeholder="قسم العمليات" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}/></div>
              </div>
              <div><Label>موقع العمل</Label><input className="ot-input" placeholder="مبنى الرئيسية — الرياض" value={form.workLocation} onChange={e=>setForm(p=>({...p,workLocation:e.target.value}))}/></div>

              <Divider/>
              <SectionHead>تفاصيل الأوفر تايم</SectionHead>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div><Label>التاريخ *</Label><input type="date" className="ot-input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
                <div><Label>من *</Label><input type="time" className="ot-input" value={form.startTime} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))}/></div>
                <div><Label>إلى *</Label><input type="time" className="ot-input" value={form.endTime} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))}/></div>
              </div>

              {form.startTime&&form.endTime&&calcHours(form.startTime,form.endTime)!=="—"&&(
                <div style={{background:"linear-gradient(135deg,rgba(201,164,110,0.1),rgba(240,200,128,0.06))",border:"1px solid rgba(201,164,110,0.2)",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",animation:"fadeIn 0.3s both"}}>
                  <span style={{fontSize:12,color:"var(--text-2)",fontWeight:500}}>⏱ إجمالي الساعات</span>
                  <span style={{fontSize:18,fontWeight:700,color:"var(--gold)"}}>{calcHours(form.startTime,form.endTime)}</span>
                </div>
              )}

              <div>
                <Label>نوع الأوفر تايم</Label>
                <select className="ot-input" value={form.hoursType} onChange={e=>setForm(p=>({...p,hoursType:e.target.value}))}>
                  {["عادي","إجازة رسمية","عطلة نهاية الأسبوع","طارئ"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div><Label>سبب العمل الإضافي *</Label><textarea className="ot-input" style={{height:80,resize:"vertical"}} placeholder="اكتب السبب..." value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}/></div>

              <Err msg={error}/>
              <Btn full size="lg" onClick={()=>{
                if(!form.employeeName||!form.nationalId||!form.mobile||!form.date||!form.startTime||!form.endTime||!form.reason){setErr("يرجى تعبئة الحقول المطلوبة");return;}
                if(!/^[0-9]{10}$/.test(form.nationalId)){setErr("رقم الهوية يجب أن يكون 10 أرقام بالضبط");return;}
                if(!/^[0-9]{10}$/.test(form.mobile)){setErr("رقم الجوال يجب أن يكون 10 أرقام بالضبط");return;}
                setErr("");setStep(2);
              }}>التالي — التوقيع</Btn>
            </div>
          </div>
        )}

        {step===2&&(
          <div style={{animation:"fadeUp 0.4s both"}}>
            <SectionHead>توقيع الموظف</SectionHead>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",marginBottom:20,fontSize:13,color:"var(--text-2)",lineHeight:1.8}}>
              أنا <strong style={{color:"var(--text)"}}>{form.employeeName}</strong> أقر بصحة المعلومات وأطلب الموافقة على العمل الإضافي بتاريخ <strong style={{color:"var(--gold)"}}>{form.date}</strong> لمدة <strong style={{color:"var(--gold)"}}>{calcHours(form.startTime,form.endTime)}</strong>.
            </div>
            {empSig
              ?<div style={{marginBottom:20}}>
                <Label>توقيعك</Label>
                <div style={{border:"1px solid rgba(201,164,110,0.3)",borderRadius:12,overflow:"hidden",background:"rgba(255,255,255,0.02)"}}>
                  <img src={empSig} alt="" style={{width:"100%",display:"block"}}/>
                </div>
                <div style={{marginTop:8}}><Btn variant="ghost" size="sm" onClick={()=>setEmpSig(null)}>إعادة التوقيع</Btn></div>
              </div>
              :<div style={{marginBottom:20}}><Label>وقّع هنا *</Label><SigCanvas onSave={setEmpSig}/></div>}
            <Err msg={error}/>
            <div style={{display:"flex",gap:10,marginTop:12}}>
              <Btn variant="ghost" onClick={()=>setStep(1)}>← رجوع</Btn>
              <Btn full size="lg" onClick={submitEmployee}>إرسال الطلب ↑</Btn>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );

  /* ── EMPLOYEE DONE ────────────────────────────────────────────────────────── */
  if(view==="employee_done") return(
    <Page>
      <Card style={{textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#059669,#34d399)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(52,211,153,0.3)",animation:"scaleIn 0.5s both"}}>
          <span style={{fontSize:32}}>✓</span>
        </div>
        <h2 style={{fontSize:22,fontWeight:700,color:"var(--text)",marginBottom:8}}>تم إرسال الطلب</h2>
        <p style={{color:"var(--text-3)",fontSize:13,marginBottom:24}}>طلبك في طابور المراجعة لدى المشرف</p>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 20px",textAlign:"right",marginBottom:24}}>
          <div style={{fontSize:12,color:"var(--text-3)",marginBottom:8}}>ملخص الطلب</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--text)"}}>{form.employeeName}</div>
          <div style={{fontSize:12,color:"var(--gold)",marginTop:4}}>{form.date} · {form.startTime}–{form.endTime} · {calcHours(form.startTime,form.endTime)}</div>
        </div>
        <Btn full size="lg" onClick={()=>setView("home")}>العودة للرئيسية</Btn>
      </Card>
    </Page>
  );

  /* ── ADMIN LOGIN ──────────────────────────────────────────────────────────── */
  if(view==="admin_login") return(
    <Page>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
          <Logo/>
          <Btn variant="ghost" size="sm" onClick={()=>setView("home")}>رجوع ←</Btn>
        </div>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:32,marginBottom:8}}>🏛️</div>
          <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>بوابة الإدارة</div>
          <div style={{fontSize:12,color:"var(--text-3)",marginTop:4}}>صلاحيات كاملة — اعتماد ورفض</div>
        </div>
        <div style={{marginBottom:16}}>
          <Label>كلمة المرور</Label>
          <input type="password" className="ot-input" placeholder="••••••••" value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adminLogin()}/>
        </div>
        <Err msg={error}/>
        <div style={{marginTop:16}}><Btn full size="lg" onClick={adminLogin}>دخول</Btn></div>
      </Card>
    </Page>
  );

  /* ── SUPERVISOR LOGIN ─────────────────────────────────────────────────────── */
  if(view==="supervisor_login") return(
    <Page>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
          <Logo/>
          <Btn variant="ghost" size="sm" onClick={()=>setView("home")}>رجوع ←</Btn>
        </div>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>بوابة المشرف</div>
          <div style={{fontSize:12,color:"var(--text-3)",marginTop:4}}>بياناتك من الإدارة</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:16}}>
          <div><Label>اسم المستخدم</Label><input className="ot-input" placeholder="username" value={loginUser} onChange={e=>setLoginUser(e.target.value)}/></div>
          <div><Label>كلمة المرور</Label><input type="password" className="ot-input" placeholder="••••••••" value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&supLogin()}/></div>
        </div>
        {Object.keys(supervisors).length===0&&<div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,padding:"10px 14px",fontSize:12,color:"var(--red)",marginBottom:12}}>لا يوجد مشرفون حتى الآن. الإدارة تضيفهم من لوحتها.</div>}
        <Err msg={error}/>
        <div style={{marginTop:16}}><Btn full size="lg" onClick={supLogin}>دخول</Btn></div>
      </Card>
    </Page>
  );

  /* ── ADMIN DASHBOARD ──────────────────────────────────────────────────────── */
  if(view==="admin_dashboard"){
    const tabMap={all:reqList,pending:notApproved,approved:approvedReqs,supervisors:[]};
    const tabReqs=tabMap[adminTab]||[];
    return(
      <Page wide>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <Logo size="lg"/>
            <Btn variant="ghost" size="sm" onClick={logout}>خروج</Btn>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
            {[
              {label:"إجمالي الطلبات", v:reqList.length,        color:"var(--text)",   delay:0},
              {label:"غير معتمدة",    v:notApproved.length,    color:"#f59e0b",        delay:0.06},
              {label:"معتمدة",        v:approvedReqs.length,   color:"var(--green)",   delay:0.12},
              {label:"مرفوضة",       v:rejectedReqs.length,   color:"var(--red)",     delay:0.18},
            ].map((s,i)=>(
              <div key={i} className="stat-chip" style={{animationDelay:`${s.delay}s`}}>
                <div style={{fontSize:24,fontWeight:700,color:s.color,marginBottom:3}}>{s.v}</div>
                <div style={{fontSize:10,color:"var(--text-3)",fontWeight:500}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:4,marginBottom:20}}>
            {[{k:"all",l:"كل الطلبات"},{k:"pending",l:"⏳ غير معتمدة"},{k:"approved",l:"✅ معتمدة"},{k:"supervisors",l:"👥 المشرفون"}].map(t=>(
              <button key={t.k} className={`tab-btn${adminTab===t.k?" active":""}`} onClick={()=>setAdminTab(t.k)}>{t.l}</button>
            ))}
          </div>

          {adminTab==="supervisors"&&(
            <div>
              <SuccessMsg msg={msg}/>
              {msg&&<div style={{marginBottom:12}}/>}
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",borderRadius:12,padding:18,marginBottom:20}}>
                <SectionHead>إضافة مشرف جديد</SectionHead>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <input className="ot-input" placeholder="اسم المشرف" value={newSup.name} onChange={e=>setNewSup(p=>({...p,name:e.target.value}))}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <input className="ot-input" placeholder="اسم المستخدم" value={newSup.username} onChange={e=>setNewSup(p=>({...p,username:e.target.value}))}/>
                    <input className="ot-input" placeholder="كلمة المرور" value={newSup.password} onChange={e=>setNewSup(p=>({...p,password:e.target.value}))}/>
                  </div>
                  <Err msg={error}/>
                  <Btn variant="success" full onClick={addSupervisor}>إضافة المشرف ✓</Btn>
                </div>
              </div>
              <SectionHead>المشرفون الحاليون ({Object.keys(supervisors).length})</SectionHead>
              {Object.values(supervisors).length===0&&<div style={{color:"var(--text-3)",fontSize:13,textAlign:"center",padding:24}}>لا يوجد مشرفون بعد</div>}
              {Object.values(supervisors).map(sup=>(
                <div key={sup.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 16px",marginBottom:8,border:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontWeight:600,color:"var(--text)",fontSize:14}}>{sup.name}</div>
                    <div style={{fontSize:12,color:"var(--text-3)",marginTop:2}}>@{sup.username}</div>
                  </div>
                  <Btn variant="danger" size="sm" onClick={()=>deleteSupervisor(sup.id)}>حذف</Btn>
                </div>
              ))}
            </div>
          )}

          {adminTab!=="supervisors"&&(
            <div>
              {tabReqs.length===0&&<div style={{color:"var(--text-3)",fontSize:14,textAlign:"center",padding:40}}>{adminTab==="pending"?"🎉 لا توجد طلبات معلقة":"لا توجد طلبات"}</div>}
              {tabReqs.map((r,i)=><ReqCard key={r.code} req={r} delay={i*0.04} onClick={()=>{setSel(r.code);setMgmtStep(1);setMgmtSig(null);setMgmtNote("");setMgmtAction("approve");setErr("");setView("admin_request");}}/>)}
            </div>
          )}
        </Card>
      </Page>
    );
  }

  /* ── ADMIN REQUEST DETAIL ─────────────────────────────────────────────────── */
  if(view==="admin_request"&&selected){
    const r=requests[selected];
    const hours=calcHours(r.form.startTime,r.form.endTime);
    return(
      <Page>
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <Btn variant="ghost" size="sm" onClick={()=>setView("admin_dashboard")}>← رجوع</Btn>
            <Badge status={r.status}/>
            <Btn variant="success" size="sm" onClick={()=>setPdfReq(r)}>📄 PDF</Btn>
          </div>

          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",borderRadius:12,padding:"4px 16px",marginBottom:16}}>
            <FR label="الاسم الكامل"     value={r.form.employeeName}/>
            <FR label="رقم الهوية"       value={r.form.nationalId||"—"}/>
            <FR label="رقم الجوال"       value={r.form.mobile||"—"}/>
            <FR label="القسم"             value={r.form.department||"—"}/>
            <FR label="موقع العمل"        value={r.form.workLocation||"—"}/>
            <FR label="التاريخ"           value={r.form.date}/>
            <FR label="الوقت"             value={`${r.form.startTime} – ${r.form.endTime}`}/>
            <FR label="إجمالي الساعات"   value={hours} highlight/>
            <FR label="نوع الأوفر تايم"  value={r.form.hoursType}/>
            <FR label="السبب"             value={r.form.reason}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            {[
              {label:"الموظف",src:r.employeeSignature,date:r.submittedAt,action:"approve"},
              {label:`المشرف${r.supervisorName?` (${r.supervisorName})`:""}`,src:r.supervisorSignature,date:r.supervisorAt,action:r.supervisorAction},
              {label:"الإدارة",src:r.managementSignature,date:r.managementAt,action:r.managementAction},
            ].map((sig,i)=>(
              <div key={i} style={{border:"1px solid var(--border)",borderRadius:10,padding:10,textAlign:"center"}}>
                <div style={{fontSize:10,fontWeight:600,color:"var(--text-3)",marginBottom:6,paddingBottom:6,borderBottom:"1px solid var(--border)"}}>{sig.label}</div>
                <div style={{minHeight:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.02)",borderRadius:6,marginBottom:4}}>
                  {sig.src?<img src={sig.src} alt="" style={{maxWidth:"100%",maxHeight:46,objectFit:"contain"}}/>:<span style={{color:"var(--border)",fontSize:18}}>—</span>}
                </div>
                {sig.action==="approve"&&<div style={{fontSize:9,color:"var(--green)",fontWeight:700}}>✓ موافق</div>}
                {sig.action==="reject"&&<div style={{fontSize:9,color:"var(--red)",fontWeight:700}}>✗ مرفوض</div>}
                {sig.date&&<div style={{fontSize:9,color:"var(--text-3)",marginTop:2}}>{sig.date}</div>}
              </div>
            ))}
          </div>

          {r.supervisorNote&&<div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#f59e0b"}}><strong>ملاحظة المشرف:</strong> {r.supervisorNote}</div>}

          {r.status==="pending_management"&&(
            <div style={{animation:"fadeUp 0.3s both"}}>
              <div style={{background:"rgba(79,156,249,0.08)",border:"1px solid rgba(79,156,249,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--blue)"}}>
                ✅ وافق المشرف {r.supervisorName&&`(${r.supervisorName})`} بتاريخ {r.supervisorAt}
              </div>

              {mgmtStep===1&&(
                <div>
                  <div style={{display:"flex",gap:10,marginBottom:12}}>
                    <button className={`action-btn approve${mgmtAction==="approve"?" active":""}`} onClick={()=>setMgmtAction("approve")}>✅ اعتماد</button>
                    <button className={`action-btn reject${mgmtAction==="reject"?" active":""}`} onClick={()=>setMgmtAction("reject")}>❌ رفض</button>
                  </div>
                  <div style={{marginBottom:12}}><Label>ملاحظات (اختياري)</Label><textarea className="ot-input" style={{height:65}} value={mgmtNote} onChange={e=>setMgmtNote(e.target.value)}/></div>
                  <Btn full size="lg" onClick={()=>{if(mgmtAction==="approve")setMgmtStep(2);else submitManagement();}}>
                    {mgmtAction==="approve"?"التالي — التوقيع":"تأكيد الرفض"}
                  </Btn>
                </div>
              )}

              {mgmtStep===2&&(
                <div style={{animation:"fadeUp 0.3s both"}}>
                  <SectionHead>توقيع الإدارة</SectionHead>
                  {mgmtSig
                    ?<div style={{marginBottom:14}}>
                      <div style={{border:"1px solid rgba(201,164,110,0.3)",borderRadius:12,overflow:"hidden",background:"rgba(255,255,255,0.02)",marginBottom:8}}>
                        <img src={mgmtSig} alt="" style={{width:"100%",maxHeight:130,objectFit:"contain",display:"block"}}/>
                      </div>
                      <Btn variant="ghost" size="sm" onClick={()=>setMgmtSig(null)}>تغيير الصورة</Btn>
                    </div>
                    :<div style={{marginBottom:14}}>
                      <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,border:"1.5px dashed rgba(201,164,110,0.3)",borderRadius:12,background:"rgba(201,164,110,0.04)",padding:"28px 16px",cursor:"pointer",transition:"border-color 0.2s",minHeight:110}}>
                        <span style={{fontSize:30}}>📁</span>
                        <span style={{fontSize:13,color:"var(--text-2)",fontWeight:600}}>ارفع صورة توقيع الإدارة</span>
                        <span style={{fontSize:11,color:"var(--text-3)"}}>PNG · JPG · JPEG</span>
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                          const file=e.target.files[0]; if(!file) return;
                          const reader=new FileReader(); reader.onload=ev=>setMgmtSig(ev.target.result); reader.readAsDataURL(file);
                        }}/>
                      </label>
                    </div>}
                  <Err msg={error}/>
                  <div style={{display:"flex",gap:10,marginTop:12}}>
                    <Btn variant="ghost" onClick={()=>setMgmtStep(1)}>← رجوع</Btn>
                    <Btn full size="lg" onClick={submitManagement}>اعتماد نهائي 🏛️</Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {(r.status==="approved"||r.status==="rejected")&&(
            <div style={{marginTop:12}}>
              {r.managementNote&&<div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"var(--green)"}}><strong>ملاحظة الإدارة:</strong> {r.managementNote}</div>}
              <Btn variant="success" full size="lg" onClick={()=>setPdfReq(r)}>📄 تصدير PDF رسمي — سواعد</Btn>
            </div>
          )}
        </Card>
      </Page>
    );
  }

  /* ── SUPERVISOR DASHBOARD ─────────────────────────────────────────────────── */
  if(view==="supervisor_dashboard"){
    const myPending=reqList.filter(r=>r.status==="pending_supervisor");
    const myDone=reqList.filter(r=>r.status!=="pending_supervisor");
    const showList=supTab==="pending"?myPending:myDone;
    return(
      <Page wide>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div>
              <Logo size="lg"/>
              <div style={{fontSize:12,color:"var(--text-3)",marginTop:6,paddingRight:2}}>مرحباً، <span style={{color:"var(--gold)"}}>{session?.name}</span></div>
            </div>
            <Btn variant="ghost" size="sm" onClick={logout}>خروج</Btn>
          </div>

          <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:4,marginBottom:20}}>
            <button className={`tab-btn${supTab==="pending"?" active":""}`} onClick={()=>setSupTab("pending")}>⏳ بانتظار الموافقة ({myPending.length})</button>
            <button className={`tab-btn${supTab==="done"?" active":""}`} onClick={()=>setSupTab("done")}>📋 السابقة ({myDone.length})</button>
          </div>

          {showList.length===0&&<div style={{color:"var(--text-3)",fontSize:14,textAlign:"center",padding:40}}>{supTab==="pending"?"🎉 لا توجد طلبات معلقة حالياً":"لا توجد طلبات سابقة"}</div>}
          {showList.map((r,i)=><ReqCard key={r.code} req={r} delay={i*0.04}
            onClick={r.status==="pending_supervisor"?()=>{setSel(r.code);setSupSig(null);setSupNote("");setSupAction("approve");setErr("");setView("supervisor_review");}:null}/>)}
        </Card>
      </Page>
    );
  }

  /* ── SUPERVISOR REVIEW ────────────────────────────────────────────────────── */
  if(view==="supervisor_review"&&selected){
    const r=requests[selected];
    const hours=calcHours(r.form.startTime,r.form.endTime);
    return(
      <Page>
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <Btn variant="ghost" size="sm" onClick={()=>setView("supervisor_dashboard")}>← رجوع</Btn>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-2)"}}>مراجعة الطلب</span>
          </div>

          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--border)",borderRadius:12,padding:"4px 16px",marginBottom:16}}>
            <FR label="الاسم الكامل"     value={r.form.employeeName}/>
            <FR label="رقم الهوية"       value={r.form.nationalId||"—"}/>
            <FR label="رقم الجوال"       value={r.form.mobile||"—"}/>
            <FR label="القسم"             value={r.form.department||"—"}/>
            <FR label="موقع العمل"        value={r.form.workLocation||"—"}/>
            <FR label="التاريخ"           value={r.form.date}/>
            <FR label="الوقت"             value={`${r.form.startTime} – ${r.form.endTime}`}/>
            <FR label="إجمالي الساعات"   value={hours} highlight/>
            <FR label="نوع الأوفر تايم"  value={r.form.hoursType}/>
            <FR label="السبب"             value={r.form.reason}/>
          </div>

          {r.employeeSignature&&(
            <div style={{marginBottom:16}}>
              <Label>توقيع الموظف</Label>
              <div style={{border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",background:"rgba(255,255,255,0.02)"}}>
                <img src={r.employeeSignature} alt="" style={{width:"100%",display:"block"}}/>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <button className={`action-btn approve${supAction==="approve"?" active":""}`} onClick={()=>setSupAction("approve")}>✅ موافقة</button>
            <button className={`action-btn reject${supAction==="reject"?" active":""}`} onClick={()=>setSupAction("reject")}>❌ رفض</button>
          </div>

          <div style={{marginBottom:14}}><Label>ملاحظات (اختياري)</Label><textarea className="ot-input" style={{height:65}} value={supNote} onChange={e=>setSupNote(e.target.value)}/></div>

          {supAction==="approve"&&(
            supSig
              ?<div style={{marginBottom:14}}>
                <Label>توقيعك</Label>
                <div style={{border:"1px solid rgba(201,164,110,0.3)",borderRadius:10,overflow:"hidden",background:"rgba(255,255,255,0.02)",marginBottom:8}}>
                  <img src={supSig} alt="" style={{width:"100%",display:"block"}}/>
                </div>
                <Btn variant="ghost" size="sm" onClick={()=>setSupSig(null)}>إعادة التوقيع</Btn>
              </div>
              :<div style={{marginBottom:14}}><Label>وقّع هنا *</Label><SigCanvas onSave={setSupSig}/></div>
          )}

          <Err msg={error}/>
          <div style={{marginTop:12}}>
            <Btn full size="lg" onClick={submitSupervisor}>
              {supAction==="approve"?"تأكيد الموافقة وإرسال للإدارة":"تأكيد الرفض"}
            </Btn>
          </div>
        </Card>
      </Page>
    );
  }

  /* ── PDF MODAL ──────────────────────────────────────────────────────────── */
  if(pdfReq) {
    const html = buildPDF(pdfReq);
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px",overflow:"auto"}}>
        <div style={{display:"flex",gap:10,marginBottom:16,flexShrink:0}}>
          <button onClick={()=>setPdfReq(null)} style={{padding:"9px 20px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,cursor:"pointer",fontFamily:"var(--ff)",fontSize:13,fontWeight:600}}>← إغلاق</button>
          <button onClick={()=>{
            const iframe = document.getElementById("ot-pdf-iframe");
            iframe.contentWindow.print();
          }} style={{padding:"9px 22px",background:"linear-gradient(135deg,#c9a46e,#e8b870)",color:"#1a0e00",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"var(--ff)",fontSize:13,fontWeight:700}}>🖨️ طباعة / حفظ PDF</button>
        </div>
        <iframe
          id="ot-pdf-iframe"
          srcDoc={html}
          style={{width:"100%",maxWidth:800,height:"calc(100vh - 100px)",borderRadius:12,border:"none",background:"#fff"}}
          title="PDF Preview"
        />
      </div>
    );
  }

  return null;
}
