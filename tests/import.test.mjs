import test from 'node:test';import assert from 'node:assert/strict';
import * as store from '../src/store.js';
const tasks=[{id:'a',date:'2020-01-01',name:'读书',done:true},{id:'b',date:'2099-01-01',name:'读书',done:false}];
const json=JSON.stringify({version:1,exportedAt:'2026-10-18T00:00:00Z',tasks});
function setup(){const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};return {storage,repo:new store.Repository(storage)};}
test('valid old exports import with history, duplicate names, identity and order preserved',()=>{
 const {repo,storage}=setup();repo.importJSON(json,null);assert.deepEqual(repo.read(),tasks);assert.deepEqual(JSON.parse(repo.export()).tasks,tasks);assert.equal(repo.backup(),JSON.stringify({version:1,tasks:[]}));
 repo.importJSON(json,storage.getItem(store.KEY));assert.equal(repo.read().length,2);
});
test('replacement preserves previous complete data as a downloadable backup',()=>{
 const {repo,storage}=setup();repo.mutate({type:'add',id:'old',name:'电脑任务',date:'2099-01-01'});const before=storage.getItem(store.KEY);
 repo.importJSON(json,before);assert.equal(repo.backup(),before);assert.deepEqual(repo.read(),tasks);
});
test('preview rejects malformed files without changing local data',()=>{
 const {repo,storage}=setup();storage.setItem(store.KEY,json);
 for(const bad of ['bad','null','[]','{}',JSON.stringify({version:2,tasks}),JSON.stringify({version:1,tasks:[tasks[0],tasks[0]]}),JSON.stringify({version:1,tasks:[{...tasks[0],date:'2026-02-30'}]}),JSON.stringify({version:1,tasks:[{...tasks[0],done:'false'}]}),JSON.stringify({version:1,tasks:[{...tasks[0],name:'  '}]} )]){
  assert.throws(()=>repo.importJSON(bad,json));assert.equal(storage.getItem(store.KEY),json);assert.equal(repo.backup(),null);
 }
});
test('BOM exports and empty valid backups are accepted',()=>{
 assert.deepEqual(store.parseImport('\uFEFF'+json),tasks);assert.deepEqual(store.parseImport('{"version":1,"tasks":[]}'),[]);
});
test('failed atomic save leaves current data unchanged',()=>{
 const {repo,storage}=setup();storage.setItem(store.KEY,json);storage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>repo.importJSON('{"version":1,"tasks":[]}',json),/导入未完成/);assert.equal(storage.getItem(store.KEY),json);
});
test('changed data since preview prevents replacing newer edits',()=>{
 const {repo,storage}=setup();repo.mutate({type:'add',id:'old',name:'电脑任务',date:'2099-01-01'});
 assert.throws(()=>repo.importJSON(json,null),/已变化/);assert.equal(repo.read()[0].id,'old');assert.equal(repo.backup(),null);
});
test('edits retain backup and repeated imports do not recursively nest backups',()=>{
 const {repo}=setup();repo.importJSON(json,null);const before=repo.backup();repo.mutate({type:'add',id:'new',date:'2099-01-01',name:'new'});assert.equal(repo.backup(),before);
 repo.importJSON(json,repo.snapshot());assert.equal(JSON.parse(repo.backup()).beforeImport,undefined);assert.equal(JSON.parse(repo.backup()).tasks.length,3);
});
test('import can recover unreadable local data while preserving its raw backup',()=>{
 const {repo,storage}=setup();storage.setItem(store.KEY,'broken');repo.importJSON(json,'broken');assert.equal(repo.backup(),'broken');assert.deepEqual(repo.read(),tasks);
});
test('failed replacement preserves the previous successful import backup',()=>{
 const {repo,storage}=setup();repo.importJSON(json,null);const previous=repo.backup();
 const write=storage.setItem;storage.setItem=(k,v)=>{if(k===store.KEY)throw Error('quota');write(k,v);};
 assert.throws(()=>repo.importJSON('{"version":1,"tasks":[]}',repo.snapshot()));assert.equal(repo.backup(),previous);
});
