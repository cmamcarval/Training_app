export type Status='completed'|'partial'|'skipped';
export type Actual={id:string;plannedId?:string;date:string;title:string;status:Status;duration:number;rpe?:number;discipline:string;venue:string;notes:string;left?:number;right?:number;loggedAt:string};
export type AppData={version:2;actuals:Actual[]};
export const EMPTY_DATA:AppData={version:2,actuals:[]};

const statuses=new Set<Status>(['completed','partial','skipped']);
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value);
const optionalNumber=(value:unknown)=>finite(value)&&(value as number)>=0?value as number:undefined;
const validDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function normalizeActual(value:unknown,fallbackId='',legacyOrder=0):Actual|null{
 if(!value||typeof value!=='object')return null;
 const row=value as Record<string,unknown>,status=row.status as Status;
 const id=typeof row.id==='string'&&row.id?row.id:fallbackId;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(id)||!validDate(row.date)||typeof row.title!=='string'||!row.title.trim()||row.title.length>200||!statuses.has(status))return null;
 const duration=status==='skipped'?0:finite(row.duration)&&(row.duration as number)>=0?row.duration as number:0;
 const effort=status==='skipped'?undefined:finite(row.rpe)&&(row.rpe as number)>=1&&(row.rpe as number)<=10?row.rpe as number:undefined;
 if(status!=='skipped'&&effort===undefined)return null;
 const baseTime=Date.parse(`${row.date as string}T12:00:00Z`)-legacyOrder;
 const loggedAt=typeof row.loggedAt==='string'&&!Number.isNaN(Date.parse(row.loggedAt))?row.loggedAt:new Date(baseTime).toISOString();
 return{
  id,
  ...(typeof row.plannedId==='string'&&row.plannedId?{plannedId:row.plannedId}:{}),
  date:row.date as string,
  title:row.title,
  status,
  duration,
  ...(effort===undefined?{}:{rpe:effort}),
  discipline:typeof row.discipline==='string'?row.discipline:'other',
  venue:typeof row.venue==='string'?row.venue:'other',
  notes:typeof row.notes==='string'?row.notes.slice(0,10_000):'',
  ...(optionalNumber(row.left)===undefined?{}:{left:optionalNumber(row.left)}),
  ...(optionalNumber(row.right)===undefined?{}:{right:optionalNumber(row.right)}),
  loggedAt
 };
}

export function sortActuals(rows:Actual[]){
 return [...rows].sort((a,b)=>b.date.localeCompare(a.date)||b.loggedAt.localeCompare(a.loggedAt)||b.id.localeCompare(a.id));
}

export function parseBackup(value:unknown):Actual[]{
 if(!value||typeof value!=='object')throw new Error('This is not a Crux Cycle backup.');
 const backup=value as Record<string,unknown>;
 if((backup.version!==1&&backup.version!==2)||!Array.isArray(backup.actuals))throw new Error('Unsupported or incomplete backup file.');
 const rows=backup.actuals.map((row,index)=>normalizeActual(row,'',index));
 if(rows.some(row=>row===null))throw new Error('The backup contains an invalid training entry.');
 return sortActuals(rows as Actual[]);
}

export function plannedOutcomeMap(actuals:Actual[]){
 const map=new Map<string,Actual>();
 for(const actual of sortActuals(actuals))if(actual.plannedId&&!map.has(actual.plannedId))map.set(actual.plannedId,actual);
 return map;
}

export function trainingSummary(actuals:Actual[]){
 const outcomes=[...plannedOutcomeMap(actuals).values()];
 const effective=[...outcomes,...actuals.filter(row=>!row.plannedId)];
 const followed=outcomes.filter(row=>row.status==='completed'||row.status==='partial').length;
 return{
  completed:effective.filter(row=>row.status==='completed').length,
  minutes:effective.filter(row=>row.status!=='skipped').reduce((sum,row)=>sum+row.duration,0),
  adherence:outcomes.length?Math.round(followed/outcomes.length*100):0
 };
}
