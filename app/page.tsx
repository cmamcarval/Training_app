"use client";

import {useEffect,useState,type FormEvent} from "react";
import {createUserWithEmailAndPassword,onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signOut,type User} from "firebase/auth";
import {currentPlanWeek,localDateIso} from "../lib/dates";
import {getFirebase} from "../lib/firebase";
import {EFFORT_GUIDE,PLAN,type PlanWeek} from "../lib/plan";
import {EMPTY_DATA,parseBackup,plannedOutcomeMap,trainingSummary,type Actual,type AppData,type Status} from "../lib/training-data";
import {importActuals,saveActual,subscribeActuals,type SyncMeta} from "../lib/training-store";

type Tab="today"|"plan"|"log"|"progress";
type PlannedLog={id:string;title:string};
type LogContext={planned?:PlannedLog};

const dayKey=()=>["SUN","MON","TUE","WED","THU","FRI","SAT"][new Date().getDay()];
const shortDay=(day:string)=>({MON:"Mon",TUE:"Tue",WED:"Wed",THU:"Thu",FRI:"Fri",WEEKEND:"Weekend"}[day]||day);
const plannedId=(week:number,day:string)=>`W${String(week).padStart(2,"0")}-${day}`;

export default function Home(){
 const [tab,setTab]=useState<Tab>("today");
 const [viewWeekNo,setViewWeekNo]=useState(currentPlanWeek());
 const [data,setData]=useState<AppData>(EMPTY_DATA);
 const [ready,setReady]=useState(false);
 const [loadedUid,setLoadedUid]=useState<string>();
 const [user,setUser]=useState<User|null|undefined>(undefined);
 const [selected,setSelected]=useState<{week:PlanWeek;day:string}|null>(null);
 const [logContext,setLogContext]=useState<LogContext|null>(null);
 const [syncMeta,setSyncMeta]=useState<SyncMeta>();
 const [notice,setNotice]=useState("");

 useEffect(()=>{
  const {auth}=getFirebase();
  const off=onAuthStateChanged(auth,setUser);
  const base=location.pathname.startsWith('/Training_app')?'/Training_app/':'/';
  navigator.serviceWorker?.register(`${base}sw.js`).catch(()=>{});
  return off;
 },[]);

 useEffect(()=>{
  setData(EMPTY_DATA);
  setReady(false);
  setLoadedUid(undefined);
  setSyncMeta(undefined);
  setNotice("");
  if(!user)return;
  return subscribeActuals(user.uid,(actuals,meta)=>{
   setData({version:2,actuals});
   setSyncMeta(meta);
   setLoadedUid(user.uid);
   setReady(true);
  },error=>{
   setNotice(`Sync problem: ${error.message}`);
   setLoadedUid(user.uid);
   setReady(true);
  });
 },[user]);

 if(user===undefined)return <Loading message="Loading Crux Cycle…"/>;
 if(!user)return <AuthGate/>;
 if(!ready||loadedUid!==user.uid)return <Loading message="Loading your training log…"/>;

 const uid=user.uid;
 const todayWeek=PLAN.weeks[currentPlanWeek()-1]!;
 const key=dayKey();
 const todaySession=(todayWeek.sessions.find(session=>session.day===key)||(key==="SAT"||key==="SUN"?todayWeek.sessions.find(session=>session.day==="WEEKEND"):todayWeek.sessions[0]))!;
 const done=plannedOutcomeMap(data.actuals);
 const todayId=plannedId(todayWeek.week,todaySession.day);

 function add(actual:Omit<Actual,"id"|"loggedAt">){
  const existingId=actual.plannedId?done.get(actual.plannedId)?.id:undefined;
  const row:Actual={...actual,id:existingId||crypto.randomUUID(),loggedAt:new Date().toISOString()};
  setLogContext(null);
  setNotice("");
  void saveActual(uid,row).catch(error=>{
   const message=error instanceof Error?error.message:"Could not save this session.";
   setNotice(`Save failed: ${message}`);
  });
  return Promise.resolve();
 }

 function exportJson(){
  const backup={version:2,exportedAt:new Date().toISOString(),actuals:data.actuals};
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));
  const link=document.createElement("a");
  link.href=url;
  link.download=`crux-cycle-backup-${localDateIso()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 async function importJson(file?:File){
  if(!file)return;
  try{
   const actuals=parseBackup(JSON.parse(await file.text()));
   if(!window.confirm(`Import ${actuals.length} training entries? Matching entry IDs will be replaced.`))return;
   setNotice(`Queued ${actuals.length} training entries for import.`);
   void importActuals(uid,actuals).then(()=>setNotice(`Imported ${actuals.length} training entries.`)).catch(error=>setNotice(error instanceof Error?`Import failed: ${error.message}`:'Import failed.'));
  }catch(error){
   setNotice(error instanceof Error?error.message:"Could not import that backup.");
  }
 }

 const syncLabel=!syncMeta?"Sync unavailable":syncMeta.hasPendingWrites?"Syncing…":syncMeta.fromCache?"Offline cache":"Synced";
 return <main className="app-shell">
  <header className="topbar">
   <div className="brand"><div className="mark">C</div><div><strong>CRUX CYCLE</strong><span>24-week performance plan</span></div></div>
   <div className="header-actions"><span className={`sync-pill ${syncMeta?.fromCache?'offline':''}`}>{syncLabel}</span><button className="icon-button" onClick={exportJson} aria-label="Export backup">⇩</button><button className="avatar" onClick={()=>signOut(getFirebase().auth)} title="Sign out">{(user.email||'AC').slice(0,2).toUpperCase()}</button></div>
  </header>
  <section className="content">
   {notice&&<div className="app-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss message">×</button></div>}
   {tab==="today"&&<Today week={todayWeek} day={todaySession} actual={done.get(todayId)} onLog={()=>setLogContext({planned:{id:todayId,title:todaySession.title}})} onView={()=>setSelected({week:todayWeek,day:todaySession.day})}/>}
   {tab==="plan"&&<Plan weekNo={viewWeekNo} setWeekNo={setViewWeekNo} onSelect={(week,day)=>setSelected({week,day})} done={done}/>}
   {tab==="log"&&<Log data={data} onAdd={()=>setLogContext({})} exportJson={exportJson} importJson={importJson}/>}
   {tab==="progress"&&<Progress data={data}/>}
  </section>
  <nav className="bottom-nav" aria-label="Main navigation">{([['today','⌂','Today'],['plan','▦','Plan'],['log','＋','Log'],['progress','↗','Progress']] as const).map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><b>{icon}</b><span>{label}</span></button>)}</nav>
  {logContext&&<LogSheet planned={logContext.planned} onClose={()=>setLogContext(null)} onSave={add}/>}
  {selected&&<SessionSheet week={selected.week} day={selected.day} onClose={()=>setSelected(null)} onLog={()=>{const session=selected.week.sessions.find(item=>item.day===selected.day)!;setLogContext({planned:{id:plannedId(selected.week.week,selected.day),title:session.title}});setSelected(null)}}/>}
 </main>;
}

function Loading({message}:{message:string}){return <main className="auth-shell"><div className="auth-mark">C</div><p>{message}</p></main>}

function AuthGate(){
 const [mode,setMode]=useState<'signin'|'register'>('signin'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const fail=(value:unknown)=>{const code=(value as {code?:string}).code||'';setError(code.includes('invalid-credential')?'Email or password is incorrect.':code.includes('email-already')?'An account already exists for this email.':code.includes('weak-password')?'Use a password of at least 10 characters.':'Could not complete that request. Please try again.')};
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');setMessage('');try{const {auth}=getFirebase();if(mode==='register')await createUserWithEmailAndPassword(auth,email,password);else await signInWithEmailAndPassword(auth,email,password)}catch(value){fail(value)}finally{setBusy(false)}}
 async function reset(){if(!email){setError('Enter your email first.');return}setBusy(true);setError('');try{await sendPasswordResetEmail(getFirebase().auth,email);setMessage('Password reset email sent.')}catch(value){fail(value)}finally{setBusy(false)}}
 return <main className="auth-shell"><section className="auth-card"><div className="auth-mark">C</div><div className="eyebrow">PRIVATE TRAINING LOG</div><h1>{mode==='signin'?'Welcome back':'Create your account'}</h1><p>Your plan works offline and syncs securely across your devices.</p>{error&&<div className="auth-error">{error}</div>}{message&&<div className="auth-message">{message}</div>}<form onSubmit={submit}><label>Email<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required/></label><label>Password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} minLength={mode==='register'?10:6} required/></label><button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signin'?'Sign in':'Create account'}</button><button type="button" className="text-button" onClick={()=>{setMode(mode==='signin'?'register':'signin');setError('');setMessage('')}}>{mode==='signin'?'Create an account':'I already have an account'}</button>{mode==='signin'&&<button type="button" className="text-button" disabled={busy} onClick={reset}>Forgot password?</button>}</form><small>Training data is stored under your Firebase user ID and protected by Firestore rules.</small></section></main>;
}

function Today({week,day,actual,onLog,onView}:{week:PlanWeek;day:PlanWeek['sessions'][number];actual?:Actual;onLog:()=>void;onView:()=>void}){return <>
 <div className="eyebrow">WEEK {String(week.week).padStart(2,"0")} · {week.meso.toUpperCase()}</div><div className="hero-row"><div><h1>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</h1><p>{week.label} · {week.dates}</p></div><div className="readiness"><span></span>Plan fixed</div></div>
 <article className="workout-card"><div className="card-stripe"></div><div className="workout-head"><div><div className="tag">{shortDay(day.day)} · {day.optional?"OPTIONAL":"PLANNED"}</div><h2>{day.title}</h2><p>{day.intent}</p></div><div className="duration">{day.minutes}<small>MIN</small></div></div><div className="blocks">{day.blocks.map((block,index)=><div className="block" key={index}><div className="block-num">{String(index+1).padStart(2,"0")}</div><div><h3>{block.name}</h3><p>{block.detail}</p>{block.meta&&<div className="meta">{block.meta}</div>}</div></div>)}</div><button className="primary" onClick={onLog}>{actual?`Logged · ${actual.status}`:"Start / log session"}</button><button className="text-button" onClick={onView}>View full prescription</button></article>
 <section className="note"><b>Coach note</b><p>{week.note}</p></section><section className="baseline"><span>TINDEQ BASELINE · 20 MM</span><b>57.7 <small>kg L</small> / 64.4 <small>kg R</small></b><p>Historical approximate values. Use a fresh standardized test before changing loads.</p></section>
 </>}

function Plan({weekNo,setWeekNo,onSelect,done}:{weekNo:number;setWeekNo:(value:number)=>void;onSelect:(week:PlanWeek,day:string)=>void;done:Map<string,Actual>}){const week=PLAN.weeks[weekNo-1];return <><div className="section-title"><div><div className="eyebrow">IMMUTABLE REFERENCE PLAN</div><h1>Training plan</h1></div><select value={weekNo} onChange={event=>setWeekNo(+event.target.value)}>{PLAN.weeks.map(item=><option key={item.week} value={item.week}>Week {item.week}</option>)}</select></div><div className="meso-track">{PLAN.mesos.map(meso=><div key={meso.name} className={weekNo>=meso.start&&weekNo<=meso.end?"on":""} style={{flex:meso.end-meso.start+1}}></div>)}</div><article className="week-card"><div><span>WEEK {String(week.week).padStart(2,"0")}</span><h2>{week.meso}</h2><p>{week.dates} · {week.label}</p></div><b>{week.deload?"DELOAD":"BUILD"}</b></article><div className="session-list">{week.sessions.map(session=>{const actual=done.get(plannedId(week.week,session.day));const marker=actual?.status==='completed'?'✓':actual?.status==='partial'?'◐':actual?.status==='skipped'?'—':'›';return <button key={session.day} onClick={()=>onSelect(week,session.day)}><div className="day-tile">{shortDay(session.day)}</div><div><b>{session.title}</b><span>{session.intent}</span></div><em className={actual?.status||''}>{marker}</em></button>})}</div><p className="source-note">The plan's loads and volumes are unchanged; its shorthand is expanded into instructions. Logs and adjustments are stored separately.</p></>}

function Log({data,onAdd,exportJson,importJson}:{data:AppData;onAdd:()=>void;exportJson:()=>void;importJson:(file?:File)=>Promise<void>}){return <><div className="section-title"><div><div className="eyebrow">ACTUAL TRAINING</div><h1>Session log</h1></div><button className="square-add" onClick={onAdd}>＋</button></div><div className="tool-row"><button onClick={exportJson}>Export backup</button><label className="file-button">Import backup<input hidden type="file" accept="application/json" onChange={event=>{const file=event.target.files?.[0];event.target.value='';void importJson(file)}}/></label></div>{data.actuals.length===0?<div className="empty"><div>⌁</div><h2>No sessions logged</h2><p>Your planned sessions stay untouched. Log what you actually did here.</p><button className="primary" onClick={onAdd}>Log a session</button></div>:<div className="log-list">{data.actuals.map(actual=><article key={actual.id}><div className="log-date">{new Date(actual.date+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div><div><b>{actual.title}</b><span>{actual.discipline} · {actual.duration} min{actual.rpe?` · effort ${actual.rpe}/10`:''}</span></div><em>{actual.status}</em></article>)}</div>}</>}

function Progress({data}:{data:AppData}){const summary=trainingSummary(data.actuals),fingers=data.actuals.filter(actual=>actual.left!==undefined||actual.right!==undefined).slice(0,8).reverse(),scale=Math.max(70,...fingers.flatMap(actual=>[actual.left||0,actual.right||0]));return <><div className="eyebrow">TRAINING SIGNALS</div><h1>Progress</h1><div className="stat-grid"><article><span>SESSIONS</span><b>{summary.completed}</b><small>completed</small></article><article><span>VOLUME</span><b>{summary.minutes}</b><small>non-skipped minutes</small></article><article><span>FOLLOW-THROUGH</span><b>{summary.adherence}%</b><small>logged planned sessions</small></article></div><article className="chart-card"><div className="chart-head"><div><span>20 MM HALF-CRIMP</span><h2>Tindeq loads</h2></div><div className="legend"><i></i>L <i></i>R</div></div>{fingers.length?<div className="bars">{fingers.map(actual=><div key={actual.id}><span style={{height:`${Math.max(4,(actual.left||0)/scale*100)}%`}}></span><span style={{height:`${Math.max(4,(actual.right||0)/scale*100)}%`}}></span></div>)}</div>:<div className="chart-empty"><b>57.7 L / 64.4 R</b><span>Historical baseline only</span></div>}<p>Values come from session logs. Compare only identical measurement setups; the app does not infer formal test results.</p></article><section className="safety"><b>Current note · biceps area</b><p>Log symptoms if loading changes movement or pain worsens. The app will never diagnose or automatically raise finger loads.</p></section></>}

function SessionSheet({week,day,onClose,onLog}:{week:PlanWeek;day:string;onClose:()=>void;onLog:()=>void}){const session=week.sessions.find(item=>item.day===day)!;return <div className="overlay" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><article className="sheet" role="dialog" aria-modal="true" aria-label={`${shortDay(day)} training prescription`}><button className="close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">WEEK {week.week} · {shortDay(day)}</div><h2>{session.title}</h2><p className="lead">{session.intent}</p>{session.blocks.map((block,index)=><section className="detail-block" key={index}><span>{String(index+1).padStart(2,'0')}</span><div><h3>{block.name}</h3><p>{block.detail}</p>{block.meta&&<b>{block.meta}</b>}</div></section>)}<section className="effort-guide"><b>How effort works</b><p>{EFFORT_GUIDE}</p></section><button className="primary" onClick={onLog}>Log what I did</button><button className="text-button" onClick={onClose}>Close</button></article></div>}

function LogSheet({planned,onClose,onSave}:{planned?:PlannedLog;onClose:()=>void;onSave:(actual:Omit<Actual,'id'|'loggedAt'>)=>Promise<void>}){
 const [status,setStatus]=useState<Status>('completed'),[duration,setDuration]=useState(90),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const chooseStatus=(next:Status)=>{setStatus(next);if(next==='skipped')setDuration(0);else if(duration===0)setDuration(90)};
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError('');
  const fields=new FormData(event.currentTarget),effort=Number(fields.get('rpe'));
  const actual:Omit<Actual,'id'|'loggedAt'>={
   ...(planned?{plannedId:planned.id}:{}),date:String(fields.get('date')),title:String(fields.get('title')),status,duration:status==='skipped'?0:duration,
   ...(status==='skipped'?{}:{rpe:effort}),discipline:String(fields.get('discipline')),venue:String(fields.get('venue')),notes:String(fields.get('notes')),
   ...(fields.get('left')?{left:Number(fields.get('left'))}:{}),...(fields.get('right')?{right:Number(fields.get('right'))}:{})
  };
  try{await onSave(actual)}catch(value){setError(value instanceof Error?value.message:'Could not save this session.')}finally{setSaving(false)}
 }
 return <div className="overlay"><form className="sheet form" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Log training session"><button type="button" className="close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">PLAN VS ACTUAL</div><h2>Log session</h2>{error&&<div className="auth-error">{error}</div>}<label>Date<input name="date" type="date" defaultValue={localDateIso()} required/></label><label>Session<input name="title" defaultValue={planned?.title||"Unplanned climbing"} required/></label><div className="segmented">{(['completed','partial','skipped'] as Status[]).map(item=><button type="button" className={status===item?'on':''} onClick={()=>chooseStatus(item)} key={item}>{item}</button>)}</div><div className="two"><label>Duration · min<input name="duration" type="number" min="0" value={duration} onChange={event=>setDuration(Math.max(0,Number(event.target.value)))} disabled={status==='skipped'} required/></label><label>Session effort · 1–10<input name="rpe" type="number" min="1" max="10" defaultValue="7" disabled={status==='skipped'} required={status!=='skipped'}/></label></div><p className="field-help">4 easy · 6 moderate · 7 hard but repeatable · 8 very hard · 9 near-max · 10 maximal</p><div className="two"><label>Discipline<select name="discipline"><option>boulder</option><option>sport</option><option>mixed</option><option>conditioning</option><option>recovery</option></select></label><label>Venue<select name="venue"><option>indoor</option><option>outdoor</option><option>other</option></select></label></div><div className="two"><label>Tindeq L · kg<input name="left" type="number" min="0" step="0.1"/></label><label>Tindeq R · kg<input name="right" type="number" min="0" step="0.1"/></label></div><label>Notes<textarea name="notes" rows={3} placeholder="Optional symptoms, grades, attempts…"/></label><button className="primary" type="submit" disabled={saving}>{saving?'Saving…':'Save actual session'}</button></form></div>;
}
