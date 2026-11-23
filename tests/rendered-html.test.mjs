import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function render(){const u=new URL("../dist/server/index.js",import.meta.url);u.searchParams.set("test",`${process.pid}-${Date.now()}`);const {default:worker}=await import(u.href);return worker.fetch(new Request("http://localhost/",{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}})}
test("renders the Crux Cycle app shell",async()=>{const r=await render();assert.equal(r.status,200);const html=await r.text();assert.match(html,/<title>Crux Cycle<\/title>/i);assert.doesNotMatch(html,/codex-preview|Your site is taking shape/i)});
test("contains all 24 immutable plan weeks and agreed corrections",async()=>{const plan=await readFile(new URL("../lib/plan.ts",import.meta.url),"utf8");const rows=plan.match(/^\+?\['\d{2}/gm)??[];assert.equal(rows.length,24);assert.match(plan,/exactly 3 quality attempts/);assert.match(plan,/exactly 2 quality attempts/);assert.equal((plan.match(/Choose checkpoint OR maintenance/g)??[]).length,1);assert.match(plan,/No fingerboard; easy movement or off/)});
test("includes offline installation assets and IndexedDB persistence",async()=>{const [page,manifest,sw]=await Promise.all([readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),readFile(new URL("../public/manifest.webmanifest",import.meta.url),"utf8"),readFile(new URL("../public/sw.js",import.meta.url),"utf8")]);assert.match(page,/indexedDB\.open/);assert.equal(JSON.parse(manifest).display,"standalone");assert.match(sw,/caches\.open/)});
