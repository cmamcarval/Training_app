import {collection,doc,getDoc,getDocs,onSnapshot,serverTimestamp,setDoc,writeBatch} from 'firebase/firestore';
import {getFirebase} from './firebase';
import {normalizeActual,sortActuals,type Actual} from './training-data';

export type SyncMeta={fromCache:boolean;hasPendingWrites:boolean};

const sessions=(uid:string)=>collection(getFirebase().db,'users',uid,'sessions');
const serializable=(actual:Actual)=>Object.fromEntries(Object.entries(actual).filter(([,value])=>value!==undefined));

async function migrateLegacyPayload(uid:string){
 const marker=doc(getFirebase().db,'users',uid,'app','migration-v2');
 const markerSnapshot=await getDoc(marker);
 if(markerSnapshot.data()?.version===2)return;
 const target=sessions(uid);
 const [existing,legacy]=await Promise.all([
  getDocs(target),
  getDoc(doc(getFirebase().db,'users',uid,'app','state'))
 ]);
 const payload=legacy.data()?.payload as {actuals?:unknown[]}|undefined;
 if(!Array.isArray(payload?.actuals)||payload.actuals.length===0){
  await setDoc(marker,{version:2,completedAt:serverTimestamp()});
  return;
 }
 const existingIds=new Set(existing.docs.map(item=>item.id));
 const missing=payload.actuals
  .map((row,index)=>normalizeActual(row,'',index))
  .filter((row):row is Actual=>Boolean(row&&!existingIds.has(row.id)));
 for(let start=0;start<missing.length;start+=400){
  const batch=writeBatch(getFirebase().db);
  for(const actual of missing.slice(start,start+400))batch.set(doc(target,actual.id),{...serializable(actual),updatedAt:serverTimestamp()});
  await batch.commit();
 }
 await setDoc(marker,{version:2,completedAt:serverTimestamp()});
}

export function subscribeActuals(uid:string,onData:(actuals:Actual[],meta:SyncMeta)=>void,onError:(error:Error)=>void){
 const off=onSnapshot(sessions(uid),{includeMetadataChanges:true},snapshot=>{
  const rows=snapshot.docs.map(item=>normalizeActual(item.data(),item.id)).filter((row):row is Actual=>Boolean(row));
  onData(sortActuals(rows),{fromCache:snapshot.metadata.fromCache,hasPendingWrites:snapshot.metadata.hasPendingWrites});
 },error=>onError(error));
 void migrateLegacyPayload(uid).catch(error=>onError(error instanceof Error?error:new Error('Could not migrate existing training data.')));
 return off;
}

export async function saveActual(uid:string,actual:Actual){
 await setDoc(doc(sessions(uid),actual.id),{...serializable(actual),updatedAt:serverTimestamp()});
}

export function importActuals(uid:string,actuals:Actual[]){
 const commits:Promise<void>[]=[];
 for(let start=0;start<actuals.length;start+=400){
  const batch=writeBatch(getFirebase().db);
  for(const actual of actuals.slice(start,start+400))batch.set(doc(sessions(uid),actual.id),{...serializable(actual),updatedAt:serverTimestamp()});
  commits.push(batch.commit());
 }
 return Promise.all(commits).then(()=>undefined);
}
