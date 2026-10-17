import {localDate,monthCells,dayTasks,validDate} from './model.js';
import {Repository,KEY} from './store.js';
const $=s=>document.querySelector(s),app=$('#app');
// Access storage lazily: denied access must not prevent the calendar from opening.
const repo=new Repository({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)});
let today=localDate(),month=new Date(today+'T12:00:00'),selected=null,tasks=[],blocked=false,editing=null,returnFocus=null,drag=null;
let offlineText='正在准备离线使用…',installEvent=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const longDate=d=>new Date(d+'T12:00:00').toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
function error(message){const box=$('#error');box.hidden=false;box.textContent=message;const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>box.hidden=true;box.append(close);}
function read(){try{tasks=repo.read();blocked=false;}catch(e){tasks=[];blocked=true;error(e.message);}}
function mutate(action){try{const r=repo.mutate(action);read();render();return r;}catch(e){error(e.message);read();render();return null;}}
function render(){
 today=localDate();
 if(selected){renderDetail();return;}
 const y=month.getFullYear(),m=month.getMonth();
 app.innerHTML=`<div class="page-head"><div><p class="eyebrow">把日子，过成喜欢的样子</p><h1>${m+1}月<span>${y}</span></h1></div><nav class="month-controls" aria-label="月份导航"><button class="today-button" id="today">今天</button><button id="prev" aria-label="上个月">‹</button><button id="next" aria-label="下个月">›</button></nav></div><section class="calendar" aria-label="${y}年${m+1}月日历"><div class="weekdays">${['一','二','三','四','五','六','日'].map(x=>`<span>周${x}</span>`).join('')}</div><div class="days">${monthCells(y,m).map((date,i)=>{
  if(!date)return '<span aria-hidden="true"></span>';
  const list=dayTasks(tasks,date),done=list.filter(t=>t.done).length;
  return `<button class="day ${date===today?'today':''} ${i%7>4?'weekend':''}" data-date="${date}" ${date===today?'aria-current="date"':''} aria-label="${longDate(date)}${list.length?`，${done}/${list.length} 项完成`:''}"><span class="number">${Number(date.slice(-2))}</span>${list.length?`<span class="progress-track"><i style="width:${done/list.length*100}%"></i></span><span class="day-count">${done}/${list.length}</span>`:'<span style="height:20px"></span>'}</button>`;
 }).join('')}</div><div class="calendar-bottom"><span><i class="dot"></i>今天</span><span>轻点日期，安排一天</span></div></section>`;
 $('#today').onclick=()=>{month=new Date(localDate()+'T12:00:00');render();};
 $('#prev').onclick=()=>{month=new Date(y,m-1,1,12);render();};$('#next').onclick=()=>{month=new Date(y,m+1,1,12);render();};
 app.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.date;});
}
function renderDetail(){
 const list=dayTasks(tasks,selected),done=list.filter(t=>t.done),pending=list.filter(t=>!t.done),readonly=selected<today||blocked;
 const date=new Date(selected+'T12:00:00');
 app.innerHTML=`<a href="#" class="back">‹ 返回日历</a><div class="page-head date-head"><div><p class="eyebrow">${selected===today?'TODAY · 今天':selected<today?'回看这一天':'留给未来的自己'}</p><h1>${date.getMonth()+1}月${date.getDate()}日</h1><p class="date-sub">${date.getFullYear()}年 · ${date.toLocaleDateString('zh-CN',{weekday:'long'})}${list.length?` · ${done.length}/${list.length} 项完成`:''}</p></div>${!readonly?'<button id="add-task" class="primary">＋ 添加任务</button>':''}</div>${readonly?`<p class="readonly">${blocked?'数据暂不可用，请先导出备份。':'这一天已经过去，计划仅供回看。'}</p>`:''}${list.length?`<div class="detail-progress"><i style="width:${done.length/list.length*100}%"></i></div>`:''}${pending.length?group(pending,'待完成',readonly):''}${done.length?group(done,'已完成',readonly):''}${!list.length?'<div class="empty-detail"><div class="empty-symbol">☷</div>这一天，留一点空白。<p>'+(!readonly?'从一件想做的小事开始。':'还没有记录。')+'</p></div>':''}`;
 $('#add-task')?.addEventListener('click',()=>openTask());
 app.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const id=b.dataset.toggle;mutate({type:'toggle',id});app.querySelector(`[data-toggle="${CSS.escape(id)}"]`)?.focus();});
 app.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openTask(b.dataset.edit));
 app.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const r=mutate({type:'delete',id:b.dataset.delete});if(r?.ticket)undoToast(r.ticket);});
 app.querySelectorAll('.drag-handle').forEach(handle=>{
  handle.onpointerdown=e=>{
   if(e.button!==0)return;e.preventDefault();const row=handle.closest('.task');
   drag={id:row.dataset.id,handle,row,y:e.clientY,startY:e.clientY,moved:false};handle.setPointerCapture(e.pointerId);row.classList.add('dragging');
  };
  handle.onpointermove=e=>{
   if(!drag)return;drag.y=e.clientY;if(Math.abs(e.clientY-drag.startY)>3)drag.moved=true;
   app.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));
   const row=dropBefore(e.clientY);row?.classList.add('drop-target');
   if(e.clientY<90)window.scrollBy(0,-12);if(e.clientY>innerHeight-90)window.scrollBy(0,12);
  };
  handle.onpointerup=()=>{
   if(!drag)return;const {id,moved,y}=drag;const target=dropBefore(y)?.dataset.id;cancelDrag();
   if(moved)mutate({type:'move',id,beforeId:target??null});app.querySelector(`[data-id="${CSS.escape(id)}"] .drag-handle`)?.focus();
  };
  handle.onpointercancel=cancelDrag;
  handle.onkeydown=e=>{
   if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();
   const id=handle.closest('.task').dataset.id,arr=dayTasks(tasks,selected).filter(t=>!t.done),i=arr.findIndex(t=>t.id===id);
   if(e.key==='ArrowUp'&&i===0||e.key==='ArrowDown'&&i===arr.length-1)return;
   const beforeId=e.key==='Home'?arr[0].id:e.key==='End'?null:e.key==='ArrowUp'?arr[i-1]?.id:arr[i+2]?.id;
   mutate({type:'move',id,beforeId:beforeId??null});app.querySelector(`[data-id="${CSS.escape(id)}"] .drag-handle`)?.focus();
  };
 });
}
function group(list,label,readonly){return `<h2 class="task-section-title">${label} · ${list.length}</h2><ul class="task-list">${list.map(t=>`<li class="task ${t.done?'done':''}" data-id="${escape(t.id)}"><button class="check" data-toggle="${escape(t.id)}" role="checkbox" aria-checked="${t.done}" aria-label="${t.done?'取消完成':'完成'}：${escape(t.name)}" ${readonly?'disabled':''}><span>${t.done?'✓':''}</span></button><button class="task-name" data-edit="${escape(t.id)}" aria-label="编辑任务：${escape(t.name)}" ${readonly?'disabled':''}>${escape(t.name)}</button>${!readonly?`<button class="delete" data-delete="${escape(t.id)}" aria-label="删除：${escape(t.name)}">×</button>${!t.done?`<button class="drag-handle" aria-label="调整顺序：${escape(t.name)}" title="拖动排序，或使用上下方向键">≡</button>`:''}`:''}</li>`).join('')}</ul>`;}
function dropBefore(y){return [...app.querySelectorAll('.task:not(.done)')].filter(x=>x.dataset.id!==drag?.id).find(x=>{const r=x.getBoundingClientRect();return y<r.top+r.height/2;});}
function cancelDrag(){drag=null;app.querySelectorAll('.dragging,.drop-target').forEach(x=>x.classList.remove('dragging','drop-target'));}
function openTask(id=null){editing=id;returnFocus=document.activeElement;$('#modal-title').textContent=id?'编辑任务':'添加任务';$('#modal-date').textContent=longDate(selected);$('#task-name').value=id?tasks.find(t=>t.id===id).name:'';$('#form-error').textContent='';$('#task-dialog').showModal();$('#task-name').focus();}
$('#cancel-task').onclick=()=>$('#task-dialog').close();
$('#task-dialog').addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else $('#add-task')?.focus();});
$('#task-form').onsubmit=e=>{
 e.preventDefault();const name=$('#task-name').value.trim();if(!name){$('#form-error').textContent='请输入任务名称。';return;}
 const r=mutate(editing?{type:'rename',id:editing,name}:{type:'add',id:crypto.randomUUID(),date:selected,name});
 if(r)$('#task-dialog').close();else $('#form-error').textContent='未保存，请查看提示后重试。';
};
function undoToast(ticket){
 const toast=document.createElement('div');toast.className='toast';const text=document.createElement('span');text.textContent='任务已删除';const button=document.createElement('button');button.textContent='撤销 · 5秒';toast.append(text,button);$('#toasts').append(toast);
 const timer=setInterval(()=>{const left=Math.ceil((ticket.expires-Date.now())/1000);if(left<=0){clearInterval(timer);toast.remove();}else button.textContent=`撤销 · ${left}秒`;},100);
 button.onclick=()=>{const r=mutate({type:'undo',ticket});if(r){clearInterval(timer);toast.remove();}};
}
$('#settings').onclick=()=>{$('#offline-status').textContent=offlineText;$('#settings-dialog').showModal();};
$('#close-settings').onclick=()=>$('#settings-dialog').close();
$('#export').onclick=()=>{
 try{const blob=new Blob([repo.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`日序-全部计划-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch{error('无法访问浏览器存储，导出失败。');}
};
function route(){const value=location.hash.slice(1);selected=validDate(value)?value:null;if(selected)month=new Date(selected+'T12:00:00');$('#task-dialog').close();render();window.scrollTo(0,0);}
addEventListener('hashchange',route);addEventListener('storage',e=>{if(e.key===KEY||e.key===null){read();render();}});
function refreshDate(){if(today!==localDate()){read();render();}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){read();render();}});addEventListener('focus',refreshDate);setInterval(refreshDate,1000);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install').hidden=false;});
$('#install').onclick=async()=>{await installEvent?.prompt();installEvent=null;$('#install').hidden=true;};
// Always start at the current month, as specified; detail links use hash navigation thereafter.
history.replaceState(null,'',location.pathname+location.search);read();render();
if('serviceWorker' in navigator&&isSecureContext){navigator.serviceWorker.register('./sw.js').then(async()=>{await navigator.serviceWorker.ready;offlineText='离线资源已就绪';$('#offline-status').textContent=offlineText;}).catch(()=>{offlineText='离线资源准备失败，请联网重新打开。';});}else offlineText='安装和离线功能需要 HTTPS 或 localhost。';
