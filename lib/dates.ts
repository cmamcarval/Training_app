const DAY_MS=86_400_000;
const PLAN_START_UTC=Date.UTC(2026,10,30);

export function localDateIso(date=new Date()){
 const year=date.getFullYear();
 const month=String(date.getMonth()+1).padStart(2,'0');
 const day=String(date.getDate()).padStart(2,'0');
 return `${year}-${month}-${day}`;
}

export function currentPlanWeek(date=new Date()){
 const localDayUtc=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
 const week=Math.floor((localDayUtc-PLAN_START_UTC)/(7*DAY_MS))+1;
 return Math.max(1,Math.min(24,week));
}
