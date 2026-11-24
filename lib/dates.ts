const DAY_MS=86_400_000;
const PLAN_START_UTC=Date.UTC(2026,10,23);
const PLAN_WEEKS=24;

export type PlanPosition={phase:'before'|'active'|'after';week:number};

export function localDateIso(date=new Date()){
 const year=date.getFullYear();
 const month=String(date.getMonth()+1).padStart(2,'0');
 const day=String(date.getDate()).padStart(2,'0');
 return `${year}-${month}-${day}`;
}

export function currentPlanWeek(date=new Date()){
 return planPosition(date).week;
}

export function planPosition(date=new Date()):PlanPosition{
 const localDayUtc=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
 const dayOffset=Math.floor((localDayUtc-PLAN_START_UTC)/DAY_MS);
 if(dayOffset<0)return {phase:'before',week:1};
 if(dayOffset>=PLAN_WEEKS*7)return {phase:'after',week:PLAN_WEEKS};
 return {phase:'active',week:Math.floor(dayOffset/7)+1};
}

export function plannedSessionDate(week:number,day:string){
 const offsets:Record<string,number>={MON:0,TUE:1,WED:2,THU:3,FRI:4,WEEKEND:5};
 const dayOffset=offsets[day];
 if(!Number.isInteger(week)||week<1||week>PLAN_WEEKS||dayOffset===undefined)throw new Error('Invalid planned session date.');
 return new Date(PLAN_START_UTC+((week-1)*7+dayOffset)*DAY_MS).toISOString().slice(0,10);
}

export function planWeekDateRange(week:number){
 if(!Number.isInteger(week)||week<1||week>PLAN_WEEKS)throw new Error('Invalid plan week.');
 const start=new Date(PLAN_START_UTC+(week-1)*7*DAY_MS),end=new Date(start.getTime()+6*DAY_MS);
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const startDay=String(start.getUTCDate()).padStart(2,'0'),endDay=String(end.getUTCDate()).padStart(2,'0');
 if(start.getUTCFullYear()!==end.getUTCFullYear())return `${startDay} ${months[start.getUTCMonth()]} ${start.getUTCFullYear()}–${endDay} ${months[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
 if(start.getUTCMonth()!==end.getUTCMonth())return `${startDay} ${months[start.getUTCMonth()]}–${endDay} ${months[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
 return `${startDay}–${endDay} ${months[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
}
