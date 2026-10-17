export function localDate(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function validDate(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+'T12:00:00');return !isNaN(d)&&localDate(d)===s; }
export function monthCells(year,month) {
 const first=new Date(year,month,1,12), days=new Date(year,month+1,0,12).getDate();
 const cells=Array((first.getDay()+6)%7).fill(null);
 for(let i=1;i<=days;i++)cells.push(localDate(new Date(year,month,i,12)));
 while(cells.length%7)cells.push(null);return cells;
}
export function dayTasks(tasks,date){return tasks.filter(t=>t.date===date).sort((a,b)=>Number(a.done)-Number(b.done));}
export function change(input,action,{today=localDate(),now=Date.now()}={}) {
 let tasks=input.map(t=>({...t}));let ticket;
 const fail=message=>{throw new Error(message);};
 const editable=date=>{if(!validDate(date)||date<today)fail('过去的日期只可查看。');};
 const name=value=>{if(typeof value!=='string'||!value.trim())fail('请输入任务名称。');return value.trim();};
 if(action.type==='add'){
  editable(action.date);if(!action.id||tasks.some(t=>t.id===action.id))fail('任务标识重复，请重试。');
  tasks.push({id:action.id,date:action.date,name:name(action.name),done:false});
 }else if(action.type==='undo'){
  const t=action.ticket; if(!t||now>=t.expires)fail('撤销时间已结束。');editable(t.task.date);
  if(tasks.some(x=>x.id===t.task.id))fail('任务已恢复。');
  const nextId=t.afterIds.find(id=>tasks.some(x=>x.id===id));
  const previousId=t.beforeIds.find(id=>tasks.some(x=>x.id===id));
  const next=tasks.findIndex(x=>x.id===nextId),previous=tasks.findIndex(x=>x.id===previousId);
  tasks.splice(next>=0?next:previous>=0?previous+1:tasks.length,0,{...t.task});
 }else{
  const index=tasks.findIndex(t=>t.id===action.id);if(index<0)fail('任务已不存在，请重试。');const task=tasks[index];editable(task.date);
  if(action.type==='rename')task.name=name(action.name);
  else if(action.type==='toggle'){tasks.splice(index,1);task.done=!task.done;tasks.push(task);}
  else if(action.type==='delete'){ticket={task:{...task},afterIds:tasks.slice(index+1).map(t=>t.id),beforeIds:tasks.slice(0,index).reverse().map(t=>t.id),expires:now+5000};tasks.splice(index,1);}
  else if(action.type==='move'){
   if(task.done)fail('已完成任务不能排序。');
   if(action.beforeId===task.id)return {tasks:input};
   const target=tasks.find(t=>t.id===action.beforeId);
   if(action.beforeId&&(!target||target.done||target.date!==task.date))fail('只能调整同一天的未完成任务。');
   tasks.splice(index,1);const at=target?tasks.findIndex(t=>t.id===target.id):tasks.length;tasks.splice(at,0,task);
  }else fail('未知操作。');
 }
 // A stable partition keeps completed tasks at the bottom without changing either group's order.
 tasks.sort((a,b)=>Number(a.done)-Number(b.done));return {tasks,ticket};
}
