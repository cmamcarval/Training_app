import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {currentPlanWeek,localDateIso,plannedSessionDate,planPosition} from "../lib/dates.ts";
import {PLAN,SUPPLEMENTAL_GUIDES} from "../lib/plan.ts";
import {normalizeActual,parseBackup,plannedOutcomeMap,trainingSummary} from "../lib/training-data.ts";

test("builds the Crux Cycle GitHub Pages shell",async()=>{
 const html=await readFile(new URL("../dist-pages/index.html",import.meta.url),"utf8");
 assert.match(html,/<title>Crux Cycle<\/title>/i);
 assert.match(html,/\/Training_app\/assets\/index-/);
 assert.doesNotMatch(html,/codex-preview|Your site is taking shape/i);
});

test("renders all 24 plan weeks without private coaching codes or orphan blocks",()=>{
 assert.equal(PLAN.weeks.length,24);
 assert.equal(PLAN.weeks[0].dates,"23–29 Nov 2026");
 assert.equal(PLAN.weeks[23].dates,"03–09 May 2027");
 const rendered=JSON.stringify(PLAN);
 for(const code of ["F0","F1","F2","C1","C2","RPE"])assert.doesNotMatch(rendered,new RegExp(code));
 const blocks=PLAN.weeks.flatMap(week=>week.sessions.flatMap(session=>session.blocks));
 assert.equal(blocks.filter(block=>block.name==="Training block").length,0);
 assert.ok(blocks.some(block=>block.name.includes("20 mm half-crimp")));
 assert.ok(blocks.some(block=>block.name.includes("General strength circuit")));
 assert.ok(blocks.some(block=>block.name==="Easy technical bouldering"));
 assert.ok(blocks.some(block=>block.name==="Easy aerobic climbing"));
 assert.ok(blocks.some(block=>block.name.startsWith("Mobility choice")));
 assert.ok(SUPPLEMENTAL_GUIDES.some(block=>block.name.startsWith("Trunk control")));
});

test("calculates plan weeks and input dates without DST drift",()=>{
 const afterLisbonDst=new Date(2027,2,29,0,0,0);
 assert.equal(currentPlanWeek(afterLisbonDst),19);
 assert.equal(localDateIso(afterLisbonDst),"2027-03-29");
 assert.deepEqual(planPosition(new Date(2026,10,22,12)),{phase:"before",week:1});
 assert.deepEqual(planPosition(new Date(2026,10,23,12)),{phase:"active",week:1});
 assert.deepEqual(planPosition(new Date(2027,4,9,12)),{phase:"active",week:24});
 assert.deepEqual(planPosition(new Date(2027,4,10,12)),{phase:"after",week:24});
 assert.equal(plannedSessionDate(1,"MON"),"2026-11-23");
 assert.equal(plannedSessionDate(1,"TUE"),"2026-11-24");
 assert.equal(plannedSessionDate(24,"WEEKEND"),"2027-05-08");
});

test("normalizes skipped sessions and selects the newest planned outcome",()=>{
 const base={plannedId:"W01-TUE",date:"2026-11-24",title:"Finger strength",duration:90,rpe:7,discipline:"boulder",venue:"indoor",notes:""};
 const old=normalizeActual({...base,id:"old",date:"2026-11-25",status:"completed",loggedAt:"2026-11-24T10:00:00Z"});
 const newest=normalizeActual({...base,id:"new",status:"skipped",loggedAt:"2026-11-24T11:00:00Z"});
 assert.ok(old&&newest);
 assert.equal(newest.duration,0);
 assert.equal(newest.rpe,undefined);
 assert.equal(plannedOutcomeMap([newest,old]).get("W01-TUE")?.id,"new");
 assert.deepEqual(trainingSummary([newest,old]),{completed:0,minutes:0,adherence:0});
});

test("validates backup contents before import",()=>{
 assert.throws(()=>parseBackup({version:2,actuals:[{id:"broken"}]}),/invalid training entry/);
 assert.equal(normalizeActual({id:"impossible",date:"2027-02-31",title:"Impossible date",status:"completed",duration:60,rpe:7,discipline:"boulder",venue:"indoor",notes:""}),null);
 assert.throws(()=>parseBackup({version:99,actuals:[]}),/Unsupported/);
});

test("preserves the revised optional training detail fields",()=>{
 const actual=normalizeActual({id:"details",date:"2026-11-24",title:"Finger strength",status:"completed",duration:100,rpe:7,discipline:"boulder",venue:"indoor",notes:"Normal arm response",left:58,right:64.5,fingerSets:3,fingerRpe:6,hardAttempts:4,fatigue:2,sleep:8,loggedAt:"2026-11-24T20:00:00Z"});
 assert.ok(actual);
 assert.deepEqual({fingerSets:actual.fingerSets,fingerRpe:actual.fingerRpe,hardAttempts:actual.hardAttempts,fatigue:actual.fatigue,sleep:actual.sleep},{fingerSets:3,fingerRpe:6,hardAttempts:4,fatigue:2,sleep:8});
});

test("uses per-session Firestore storage and Firebase offline persistence",async()=>{
 const [page,store,firebase,manifest]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../lib/training-store.ts",import.meta.url),"utf8"),
  readFile(new URL("../lib/firebase.ts",import.meta.url),"utf8"),
  readFile(new URL("../public/manifest.webmanifest",import.meta.url),"utf8")
 ]);
 assert.doesNotMatch(page,/indexedDB\.open|app-data/);
 assert.match(page,/if\(!ready\|\|loadedUid!==user\.uid\)return <Loading/);
 assert.match(page,/editing\?\.date\|\|planned\?\.date\|\|localDateIso/);
 assert.match(page,/Edit logged session/);
 assert.match(page,/window\.confirm\(`Delete/);
 assert.match(page,/Delete session/);
 assert.match(store,/'users',uid,'sessions'/);
 assert.match(store,/deleteDoc\(doc\(sessions\(uid\),id\)\)/);
 assert.match(store,/migrateLegacyPayload/);
 assert.match(firebase,/persistentLocalCache/);
 assert.equal(JSON.parse(manifest).display,"standalone");
});

test("restricts service-worker caching and Firestore access",async()=>{
 const [worker,rules]=await Promise.all([
  readFile(new URL("../public/sw.js",import.meta.url),"utf8"),
  readFile(new URL("../firestore.rules",import.meta.url),"utf8")
 ]);
 assert.match(worker,/url\.origin!==self\.location\.origin/);
 assert.match(worker,/request\.mode==='navigate'/);
 assert.match(worker,/caches\.delete/);
 assert.match(rules,/request\.auth\.uid == userId/);
 assert.doesNotMatch(rules,/email_verified/);
});
