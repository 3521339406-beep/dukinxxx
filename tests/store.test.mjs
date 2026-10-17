import test from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../src/store.js').catch(()=>({}));
function memory(){let data=null;return {getItem:()=>data,setItem:(_,v)=>{data=v;}};}
test('repository implemented',()=>assert.equal(typeof mod.Repository,'function'));
test('immediate save survives new repository and export is full JSON',()=>{
 const storage=memory(),repo=new mod.Repository(storage);repo.mutate({type:'add',id:'a',date:'2099-01-01',name:'读书'});
 assert.equal(new mod.Repository(storage).read()[0].name,'读书');assert.equal(JSON.parse(repo.export()).tasks.length,1);
});
test('failed persistence leaves previous saved state intact',()=>{
 const storage=memory(),repo=new mod.Repository(storage);storage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>repo.mutate({type:'add',id:'a',date:'2099-01-01',name:'a'}),/保存失败/);assert.deepEqual(repo.read(),[]);
});
test('corrupt and future schema data preserved and writes blocked',()=>{
 for(const raw of ['broken','{"version":2,"tasks":[]}','{"version":1,"tasks":[{}]}']){
 const storage=memory();storage.setItem('',raw);const repo=new mod.Repository(storage);
 assert.throws(()=>repo.read());assert.throws(()=>repo.mutate({type:'add',id:'a',name:'a',date:'2099-01-01'}));assert.equal(repo.export(),raw);
 }
});
