export type Block={name:string;detail:string;meta?:string}; export type Session={day:string;title:string;intent:string;minutes:string;optional?:boolean;blocks:Block[]}; export type PlanWeek={week:number;dates:string;meso:string;label:string;deload:boolean;note:string;sessions:Session[]};
export const EFFORT_GUIDE='Effort scale: 4/10 is very easy; 6/10 is moderate with about four clean efforts left; 7/10 is hard but repeatable; 8/10 is very hard with about two clean efforts left; 9/10 is near-max with one clean effort left; 10/10 is maximal and is not prescribed here.';
const fingerWarmup:Block={name:'Warm-up · 25–35 min',detail:'10–15 min general movement, then 15–20 min progressive easy climbing. Add 2–3 easy 7-second pulls per hand on the 20 mm edge, increasing gradually without fatigue.'};
const climbingWarmup:Block={name:'Warm-up · 25–35 min',detail:'10–15 min general movement, then 15–20 min progressive easy climbing. Finish with 3–5 familiar boulders that gradually approach the style and intensity of today’s main block.'};
const effortText=(target:string)=>({
 '≤4':'4/10 or easier (very easy; breathing stays controlled and at least six good efforts remain)',
 '5–6':'5–6/10 (easy to moderate; at least four clean efforts remain)',
 '5–7':'5–7/10 (controlled; stop before movement quality or technique falls)',
 '6':'6/10 (moderate and smooth; about four clean efforts remain)',
 '6–7':'6–7/10 (moderate to hard; about three or four clean efforts remain)',
 '7':'7/10 (hard but repeatable; about three clean efforts remain)',
 '7–8':'7–8/10 (hard; about two or three clean efforts remain)',
 '8':'8/10 (very hard but controlled; about two clean efforts remain)',
 '8–9':'8–9/10 (very hard to near-max; one or two clean efforts remain, never a grind)'
}[target]||`${target}/10`);
const plain=(text:string)=>text
 .replace(/RPE\s*(≤?\d(?:[–-]\d)?)/g,(_,x)=>`effort ${effortText(String(x).replace('-', '–'))}`)
 .replace(/\bcomp boulders\b/gi,'competition-style boulders')
 .replace(/\bsublimit\b/gi,'below-limit')
 .replace(/~70–80%(?: limit)?/g,'about 70–80% of your limit')
 .replace(/technique\/varied climbing/g,'varied, technique-focused climbing')
 .replace(/\+ mobility/g,', then 8–12 min easy shoulder, forearm and hip mobility')
 .replace(/\+ shoulders/g,', then 2 × 12–15 band external rotations and 2 × 8–12 controlled scapular pull-ups')
 .replace(/with realistic timing/g,'using 4 min per boulder and 15–20 min between the two sets')
 .replace(/full rests/g,'3–5 min rests')
 .replace(/^then\s+/i,'');
const protocolDefaults:Record<string,{effort:string;rest:string}>={F0:{effort:'6–7',rest:'2–3 min'},'F0-light':{effort:'5–6',rest:'2 min'},F1:{effort:'8–9',rest:'2.5–3 min'},'F1-light':{effort:'7–8',rest:'2.5–3 min'},'F1-heavy':{effort:'8–9',rest:'3 min'},'F1-moderate':{effort:'7–8',rest:'2.5–3 min'},F2:{effort:'8–9',rest:'3 min'},'F2-light':{effort:'7–8',rest:'2.5–3 min'}};
function fingerBlock(prescription:string,guardrail:string):Block{
 const match=prescription.match(/^(F0-light|F1-light|F1-heavy|F1-moderate|F2-light|F0|F1|F2)\s+(\d+)\s*×\s*7 s(?:\s+RPE\s+([\d–-]+))?/);
 if(!match)return{name:'Finger loading',detail:plain(prescription),meta:plain(guardrail)};
 const [,code,sets,rawEffort]=match,defaults=protocolDefaults[code],target=(rawEffort||defaults.effort).replace('-','–');
 const sessionRule=guardrail==='Fingerboard first; full rests.'?'Complete every finger pull before starting the climbing block.':plain(guardrail);
 return{name:`20 mm half-crimp · ${sets} × 7 sec per hand`,detail:`Use your standardized Tindeq setup and the same shoulder, elbow and wrist position as your baseline. Pull one hand at a time. Choose resistance separately for each hand so the final pull feels like ${effortText(target)}. Rest ${defaults.rest} before that same hand pulls again; alternate hands during the rest if convenient.`,meta:`Record left and right kg separately. ${sessionRule} Stop for sharp pain, a changing grip, or loss of arm position.`};
}
function activityBlock(text:string,index=0):Block{
 const value=plain(text.trim().replace(/\.$/,''))+'.',lower=value.toLowerCase();
 const name=lower.includes('weighted pull')?'Weighted pull-ups':lower.startsWith('push ')?'Push strength':lower.includes('landing')?'Landing control':lower.includes('record zones')?'What to record':lower.includes('route interval')?'Route intervals':lower.includes('aerobic')?'Easy aerobic climbing':lower.includes('mobility')?'Mobility':lower.includes('limit problem')?'Limit bouldering':lower.includes('coordination')||lower.includes('dynamic')?'Coordination and dynamic bouldering':lower.includes('benchmark')?'Six-boulder benchmark':lower.includes('unfamiliar boulder')?'Competition-style bouldering round':lower.includes('competition-style')||lower.includes('hard problems')?'Competition-style bouldering':index===0?'Climbing':'Training block';
 let detail=lower.includes('easy aerobic')?`${value} Keep the forearm pump low and the pace conversational; reduce the grade before you need to shake out.`:value;
 if(lower.includes('weighted pull')&&!lower.includes('effort'))detail+=' Choose a load that leaves 1–2 clean repetitions possible at the end of every set.';
 if(lower.startsWith('push ')&&!lower.includes('effort'))detail+=' Choose a variation or load that leaves 2–3 clean repetitions possible at the end of every set.';
 if(lower.includes('moderate bouldering'))detail+=' Choose problems you can normally complete within 1–3 attempts; stop before fatigue changes your movement.';
 if(lower.includes('limit problem')||lower.includes('coordination')||lower.includes('unfamiliar boulder')||lower.includes('competition-style'))detail+=' End the block if movement speed, accuracy, or landing control clearly drops.';
 if(lower.includes('landing-control'))detail='Spend 5–10 min practising quiet, balanced landings from comfortable heights. Increase height only while control stays consistent.';
 if(lower==='mobility.')detail='Spend 8–12 min on easy shoulder, forearm, wrist and hip mobility. Use comfortable ranges; do not force painful positions.';
 return{name,detail};
}
function appendQualifier(blocks:Block[],part:string){
 if(blocks.length===0)return false;
 const clean=plain(part.trim().replace(/\.$/,''));
 const lower=clean.toLowerCase();
 let sentence='';
 if(/^\d+(?:[–-]\d+)? min rest/.test(lower))sentence=`Take ${clean.toLowerCase()} between attempts.`;
 else if(lower==='stop if output drops')sentence='Stop the block as soon as output or movement quality drops.';
 else if(lower==='quality over attempts')sentence='Prioritize movement quality; do not add attempts to chase completion.';
 else if(lower==='note late-round drop-off')sentence='Record any decline in accuracy or power late in the round.';
 if(!sentence)return false;
 blocks[blocks.length-1].detail+=` ${sentence}`;
 return true;
}
function fingerSession(text:string,guardrail:string):Block[]{
 const parts=text.split(';').map(x=>x.trim()).filter(Boolean),first=parts.shift()||'';
 if(/^No fingerboard/i.test(first))return[{name:'Taper recovery',detail:'Do not do finger loading today. Either rest completely or do 20–40 min of very easy movement that leaves you feeling fresher.'}];
 if(!/^F[012]/.test(first))return[first,...parts].map(activityBlock);
 const activities:Block[]=[];
 for(const part of parts)if(!appendQualifier(activities,part))activities.push(activityBlock(part,activities.length));
 return[fingerWarmup,fingerBlock(first,guardrail),...activities];
}
function developmentBlocks(text:string):Block[]{
 const parts=text.split(';').map(x=>x.trim()).filter(Boolean),blocks:Block[]=[];
 for(const part of parts){
  if(appendQualifier(blocks,part))continue;
  const c1=part.match(/^C1\s+(\d+) rounds?/i); if(c1){blocks.push({name:`General strength circuit · ${c1[1]} rounds`,detail:'Each round: split squat 8–10 per side; push-ups 8–12; row 10–12; Romanian deadlift 8–10; Pallof press 10 per side; band external rotation 12–15. Rest 30–60 sec between exercises and 2 min between rounds.',meta:'Finish every set with 2–4 clean repetitions still possible.'});continue}
  if(/^C2/i.test(part)){blocks.push({name:'Strength maintenance · 2 rounds',detail:'Only if fresh: push 8–10; row 8–10; single-leg squat 8 per side; Pallof press or other anti-rotation exercise 10 per side. Rest as needed and finish in 15–25 min.',meta:'Effort 6–7/10. Skip this block if climbing quality or recovery is down.'});continue}
  blocks.push(activityBlock(part,blocks.length));
 }
 return[climbingWarmup,...blocks];
}
const m=(detail:string):Session=>({day:'MON',title:'Recovery & movement',intent:'Recover, move well, and arrive fresh for Tuesday.',minutes:'20–60',optional:true,blocks:[{name:'Recovery, mobility or easy climbing',detail:plain(detail)},{name:'Readiness check',detail:'This should feel restorative. If it becomes a hard climbing day, stop calling it recovery and reduce Tuesday finger loading by 25–40% or move it 24–48 hours.'}]});
const f=(deload=false):Session=>({day:'FRI',title:'Recruitment activation',intent:'Finish sharper than you arrived. No fatigue chase.',minutes:deload?'15–25':'20–40',optional:true,blocks:[{name:'Progressive warm-up · 10–15 min',detail:'Move generally, then climb 3–5 familiar easy-to-moderate boulders, increasing intensity gradually.'},{name:'Crisp recruitment · 2–3 efforts',detail:'Choose a familiar powerful move or very short boulder at about 80–90% of maximum. Do one crisp attempt, rest 3–5 min, and repeat for 2–3 total efforts. Stop immediately if speed or coordination drops.',meta:deload?'Deload: use very light activation or take the day off.':'You should leave feeling fresher, not trained.'}]});
const we:Session={day:'WEEKEND',title:'Flexible weekend',intent:'Outdoor sport, outdoor boulder, indoor, mixed, or rest.',minutes:'—',optional:true,blocks:[{name:'Athlete choice',detail:'No workout is required. Climb or rest according to opportunity and recovery. Log the discipline, duration, session effort from 1–10, and number of genuinely hard attempts.'}]};
const s=(day:string,title:string,intent:string,minutes:string,blocks:Block[]):Session=>({day,title,intent,minutes,blocks});
const weeksRaw:Array<[string,string,string,boolean,string,string,string,string,string]>=[
['30 Nov–06 Dec 2026','General preparation','Recovery ~60%',false,'F0 3 × 7 s RPE 6; then 45 min technique/varied climbing RPE 5–7.','45 min moderate bouldering; C1 2 rounds, keeping 2–4 reps in reserve.','F0-light 3 × 7 s RPE 5–6; easy aerobic climbing 2 × 10 min, 3–5 min rest; mobility.','Build work capacity gently after Nationals.','Fingerboard first; full rests.'],
['07–13 Dec 2026','General preparation','Build ~80%',false,'F0 4 × 7 s RPE 6–7; then 60 min technique/varied climbing RPE 5–7.','60 min moderate bouldering; C1 3 rounds, keeping 2–4 reps in reserve.','F0-light 3 × 7 s RPE 5–6; easy aerobic climbing 3 × 10 min, 3–5 min rest; mobility.','Build work capacity without chasing fatigue.','Fingerboard first; full rests.'],
['14–20 Dec 2026','General preparation','Highest GPP',false,'F0 4 × 7 s RPE 7; then 75 min technique/varied climbing RPE 5–7.','75 min moderate bouldering; C1 3 rounds, keeping 2–4 reps in reserve.','F0-light 3 × 7 s RPE 5–6; easy aerobic climbing 2 × 15 min, 3–5 min rest; mobility.','Highest work-capacity week in the block.','Fingerboard first; full rests.'],
['21–27 Dec 2026','General preparation','Deload ~60–65%',true,'F0 3 × 7 s RPE 6; then 45 min technique/varied climbing RPE 5–7.','40 min moderate bouldering; C1 2 rounds, keeping 2–4 reps in reserve.','F0-light 2 × 7 s RPE 5–6; easy aerobic climbing 2 × 10 min, 3–5 min rest; mobility.','Let adaptation consolidate; do not repay missed work.','Fingerboard first; full rests.'],
['28 Dec–03 Jan 2027','Strength accumulation','Entry',false,'F1 4 × 7 s RPE 8; then 30–45 min technical bouldering.','3 limit problems × 2–3 quality attempts, 3–5 min rest; weighted pull-ups 3 × 4–6 RPE 7–8; push 2 × 6–10.','F1-light 3 × 7 s RPE 7–8; easy aerobic climbing 2 × 12–15 min + mobility.','Develop finger force while preserving weekend routes.','Avoid another limit block Tuesday.'],
['04–10 Jan 2027','Strength accumulation','Build',false,'F1 5 × 7 s RPE 8; then 30–45 min technical bouldering.','4 limit problems × 3–4 quality attempts, 3–5 min rest; weighted pull-ups 3 × 4–6 RPE 7–8; push 2 × 6–10.','F1-light 3 × 7 s RPE 7–8; easy aerobic climbing 2 × 12–15 min + mobility.','Build strength volume with clean positions.','Avoid another limit block Tuesday.'],
['11–17 Jan 2027','Strength accumulation','Highest strength volume',false,'F1 5 × 7 s RPE 8–9; then 30–45 min technical bouldering.','4 limit problems × 3–4 quality attempts, 3–5 min rest; weighted pull-ups 3 × 4–6 RPE 7–8; push 2 × 6–10.','F1-light 3 × 7 s RPE 7–8; easy aerobic climbing 2 × 12–15 min + mobility.','Highest strength volume; quality still governs.','Avoid another limit block Tuesday.'],
['18–24 Jan 2027','Strength accumulation','Deload 60–70%',true,'F1 3 × 7 s RPE 7–8; then 30–45 min technical bouldering.','3 limit problems × 2–3 quality attempts, 3–5 min rest; weighted pull-ups 2 × 4 RPE 7–8; push 2 × 6–10.','F1-light 2 × 7 s RPE 7–8; easy aerobic climbing 2 × 10 min + mobility.','Deload and review finger quality and recovery.','Avoid another limit block Tuesday.'],
['25–31 Jan 2027','Strength intensification','Entry',false,'F1-heavy 4 × 7 s RPE 8–9; then 20–35 min easy technical bouldering.','3 hard limit problems × 2 attempts, 4–5 min rest; weighted pull-ups 2 × 3–5.','F1-moderate 3 × 7 s RPE 7–8; 20–25 min easy aerobic climbing + shoulders.','Increase maximal force; keep attempts controlled.','No grinding or technical degradation.'],
['01–07 Feb 2027','Strength intensification','Build',false,'F1-heavy 5 × 7 s RPE 8–9; then 20–35 min easy technical bouldering.','4 hard limit problems × exactly 3 attempts, 4–5 min rest; weighted pull-ups 2 × 3–5.','F1-moderate 3 × 7 s RPE 7–8; 20–25 min easy aerobic climbing + shoulders.','Build maximal force without losing position.','No grinding or technical degradation.'],
['08–14 Feb 2027','Strength intensification','Highest intensity',false,'F1-heavy 4 × 7 s RPE 8–9; then 20–35 min easy technical bouldering.','5 hard limit problems × 3 attempts, 4–5 min rest; weighted pull-ups 2 × 3–5.','F1-moderate 3 × 7 s RPE 7–8; 20–25 min easy aerobic climbing + shoulders.','Highest intensity; stop when quality falls.','No grinding or technical degradation.'],
['15–21 Feb 2027','Strength intensification','Deload 60–65%',true,'F1-heavy 3 × 7 s RPE 8; then 20–35 min easy technical bouldering.','2 hard limit problems × 2 attempts, 4–5 min rest; omit weighted pull-ups.','F1-moderate 2 × 7 s RPE 7–8; 20–25 min easy aerobic climbing + shoulders.','Reduce fatigue while retaining intensity.','No grinding or technical degradation.'],
['22–28 Feb 2027','Power / contact','Entry',false,'F2 3 × 7 s RPE 8–9; 20–30 min easy technical movement.','4 coordination/dynamic problems × 2–3 quality attempts; 3–5 min rest; safe landing-control practice; C2 2 rounds.','F2-light 2 × 7 s RPE 7–8; 20–30 min easy aerobic climbing + mobility.','Convert strength into accurate explosive movement.','High quality, low finger volume.'],
['01–07 Mar 2027','Power / contact','Build',false,'F2 3 × 7 s RPE 8–9; 20–30 min easy technical movement.','5 coordination/dynamic problems × exactly 3 quality attempts; 3–5 min rest; safe landing-control practice; C2 2 rounds.','F2-light 2 × 7 s RPE 7–8; 20–30 min easy aerobic climbing + mobility.','Build power exposure with controlled landings.','High quality, low finger volume.'],
['08–14 Mar 2027','Power / contact','Highest power exposure',false,'F2 3 × 7 s RPE 8–9; 20–30 min easy technical movement.','6 coordination/dynamic problems × 3–4 quality attempts; 3–5 min rest; safe landing-control practice; C2 2 rounds.','F2-light 2 × 7 s RPE 7–8; 20–30 min easy aerobic climbing + mobility.','Highest power exposure; accuracy over volume.','High quality, low finger volume.'],
['15–21 Mar 2027','Power / contact','Deload 60–65%',true,'F2 2 × 7 s RPE 8–9; 20–30 min easy technical movement.','3 coordination/dynamic problems × exactly 2 quality attempts; 3–5 min rest; safe landing-control practice; C2 2 rounds only if fresh.','F2-light 1 × 7 s RPE 7–8; 20–30 min easy aerobic climbing + mobility.','Deload power volume while keeping crisp movement.','High quality, low finger volume.'],
['22–28 Mar 2027','Conversion / specific capacity','Entry',false,'F2 3 × 7 s RPE 8–9; easy technical climbing 20–30 min.','2 sets of 3 unfamiliar boulders, 4–5 min/problem, 15–20 min between sets; record zones, tops and late-round drop-off; C2 only if fresh.','F2-light 2 × 7 s RPE 7–8; 3 × 4 sublimit boulders at ~70–80%, 60–90 s between, 5–6 min between sets.','Repeat high-quality efforts across a long round.','If weekend supplied hard route intervals, substitute easy aerobic climbing Thursday.'],
['29 Mar–04 Apr 2027','Conversion / specific capacity','Build',false,'F2 3 × 7 s RPE 8–9; easy technical climbing 20–30 min.','2 sets of 3 unfamiliar boulders, 4–5 min/problem, 15–20 min between sets; record zones, tops and late-round drop-off; C2 only if fresh.','F2-light 2 × 7 s RPE 7–8; 3 × 6–8 min route intervals, 4 min rest.','Build repeated-effort and route capacity.','If weekend supplied hard route intervals, substitute easy aerobic climbing Thursday.'],
['05–11 Apr 2027','Conversion / specific capacity','Competition-specific high',false,'F2 3 × 7 s RPE 8–9; easy technical climbing 20–30 min.','2 sets of 3 unfamiliar boulders, 4–5 min/problem, 15–20 min between sets; record zones, tops and late-round drop-off; C2 only if fresh.','F2-light 2 × 7 s RPE 7–8; 3 × 4 sublimit boulders; stop if output drops.','Competition-specific high; monitor late-round quality.','If weekend supplied hard route intervals, substitute easy aerobic climbing Thursday.'],
['12–18 Apr 2027','Conversion / specific capacity','Deload 60–65%',true,'F2 2 × 7 s RPE 8–9; easy technical climbing 20–30 min.','1 set of 3 unfamiliar boulders, relaxed pacing; C2 only if fresh.','F2-light 1 × 7 s RPE 7–8; 2 × 10 min easy aerobic climbing.','Deload and retain movement quality.','Do not cram missed capacity work.'],
['19–25 Apr 2027','Performance / evaluation','Benchmark',false,'F2 3 × 7 s RPE 8–9; then 20–30 min easy technique.','Full 6-boulder benchmark: 2 × 3 problems with realistic timing; note late-round drop-off.','F2-light 2 × 7 s; 20–25 min easy aerobic climbing.','Express gains and establish a performance benchmark.','No fatigue accumulation.'],
['26 Apr–02 May 2027','Performance / evaluation','~80% volume',false,'F2 3 × 7 s RPE 8–9; then 20–30 min easy technique.','4–5 competition boulders, full rests; quality over attempts.','F2-light 2 × 7 s; 20–25 min easy aerobic climbing.','Sharpen while reducing overall volume.','No fatigue accumulation.'],
['03–09 May 2027','Performance / evaluation','~60–70% volume',false,'F2 2 × 7 s RPE 8–9; then 20–30 min easy technique.','3–4 competition boulders, low volume and high quality.','F2-light 1 × 7 s; 20–25 min easy aerobic climbing.','Reduce volume further and keep confidence high.','No fatigue accumulation.'],
['10–16 May 2027','Performance / evaluation','Taper ~40–50%',true,'F2 2 × 7 s RPE 7–8; then 20–30 min easy technique. Choose checkpoint OR maintenance, not both.','2–3 hard problems, 1–2 attempts each, early in the week.','No fingerboard; easy movement or off.','Taper for the chosen target; stay fresh.','No fatigue accumulation.']];
const monday='Recovery, mobility or optional easy climbing at RPE ≤4.';
export const PLAN={version:'1.1',mesos:[{name:'General preparation',start:1,end:4},{name:'Strength accumulation',start:5,end:8},{name:'Strength intensification',start:9,end:12},{name:'Power',start:13,end:16},{name:'Conversion',start:17,end:20},{name:'Performance',start:21,end:24}],weeks:weeksRaw.map((r,i):PlanWeek=>{const n=i+1,hasThursdayFinger=/^F[012]/.test(r[6]),thursday=fingerSession(r[6],'Reduce or omit finger loading if Wednesday was unusually hard.');if(hasThursdayFinger)thursday.push({name:'Readiness rule',detail:'If Wednesday was unusually hard, omit this finger block or reduce its load or sets. Do not turn Thursday into another maximal session.'});return{week:n,dates:r[0],meso:r[1],label:r[2].replace('GPP','general preparation'),deload:r[3],note:r[7],sessions:[m(monday),s('TUE','Finger strength + climbing','Primary finger loading on fresh fingers.','90–150',fingerSession(r[4],r[8])),s('WED','Primary climbing development',r[7],'90–150',developmentBlocks(r[5])),s('THU',hasThursdayFinger?'Lighter finger strength + aerobic climbing':'Easy movement or rest',hasThursdayFinger?'Second, generally lighter finger exposure.':'Taper day: recover and avoid added finger fatigue.',hasThursdayFinger?'60–150':'0–40',thursday),f(r[3]),we]}})};
