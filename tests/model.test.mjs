import test from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../src/model.js').catch(()=>({}));
test('task rules module is implemented',()=>assert.equal(typeof mod.change,'function'));
const today='2026-10-17';
function apply(tasks, action, date=today, now=1000){return mod.change(tasks,action,{today:date,now});}
test('duplicate names have independent identities and trimmed names',()=>{
 let a=apply([],{type:'add',date:today,name:'  阅读  ',id:'a'}).tasks;
 a=apply(a,{type:'add',date:today,name:'阅读',id:'b'}).tasks;
 assert.deepEqual(a.map(t=>[t.id,t.name]),[['a','阅读'],['b','阅读']]);
 assert.throws(()=>apply(a,{type:'add',date:today,name:'   ',id:'c'}));
});
test('complete moves to bottom, uncheck to end of incomplete, future completable',()=>{
 let a=['a','b','c'].map(id=>({id,name:id,date:'2026-10-18',done:false}));
 a=apply(a,{type:'toggle',id:'a'}).tasks;
 assert.deepEqual(a.map(t=>t.id),['b','c','a']);
 a=apply(a,{type:'toggle',id:'a'}).tasks;
 assert.deepEqual(a.map(t=>t.id),['b','c','a']);assert.equal(a[2].done,false);
});
test('past dates reject all mutations, including after midnight',()=>{
 const tasks=[{id:'a',name:'a',date:'2026-10-16',done:false}];
 for(const type of ['toggle','rename','delete','move'])assert.throws(()=>apply(tasks,{type,id:'a',name:'b',beforeId:null}));
 assert.throws(()=>apply([],{type:'add',date:'2026-10-16',name:'a',id:'a'}));
 assert.throws(()=>apply([{...tasks[0],date:today}],{type:'toggle',id:'a'},'2026-10-18'));
});
test('drag moves only incomplete same-date tasks',()=>{
 const a=['a','b','c'].map(id=>({id,name:id,date:today,done:id==='c'}));
 assert.deepEqual(apply(a,{type:'move',id:'b',beforeId:'a'}).tasks.map(t=>t.id),['b','a','c']);
 assert.throws(()=>apply(a,{type:'move',id:'c',beforeId:'a'}));
 assert.throws(()=>apply(a,{type:'move',id:'b',beforeId:'c'}));
});
test('delete undo restores original order strictly before five seconds',()=>{
 const a=['a','b'].map(id=>({id,name:id,date:today,done:false}));
 const d=apply(a,{type:'delete',id:'a'});
 assert.deepEqual(d.tasks.map(t=>t.id),['b']);
 assert.deepEqual(apply(d.tasks,{type:'undo',ticket:d.ticket},today,5999).tasks,a);
 assert.throws(()=>apply(d.tasks,{type:'undo',ticket:d.ticket},today,6000));
 assert.throws(()=>apply(d.tasks,{type:'undo',ticket:d.ticket},'2026-10-18',2000));
});
test('Monday calendar offset and leap month',()=>{
 assert.equal(mod.monthCells(2026,9)[0],null);
 assert.equal(mod.monthCells(2026,9)[3],'2026-10-01');
 assert.equal(mod.monthCells(2024,1).filter(Boolean).length,29);
 assert.equal(mod.monthCells(2026,5)[0],'2026-06-01');
});
test('independent undo preserves order when adjacent tasks were deleted',()=>{
 const a=['a','b','c'].map(id=>({id,name:id,date:today,done:false}));
 const first=apply(a,{type:'delete',id:'a'}),second=apply(first.tasks,{type:'delete',id:'b'});
 let restored=apply(second.tasks,{type:'undo',ticket:first.ticket},today,2000).tasks;
 restored=apply(restored,{type:'undo',ticket:second.ticket},today,2000).tasks;
 assert.deepEqual(restored,a);
});
