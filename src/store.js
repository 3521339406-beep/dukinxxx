import {change,validDate} from './model.js';
export const KEY='personal-planner-v1';
export function parseImport(raw){
 try{
  const data=JSON.parse(raw.replace(/^\uFEFF/,'')),ids=new Set();
  if(!data||data.version!==1||!Array.isArray(data.tasks))throw Error();
  return data.tasks.map(t=>{
   if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||!validDate(t.date)||typeof t.name!=='string'||!t.name.trim()||typeof t.done!=='boolean')throw Error();
   ids.add(t.id);return {id:t.id,date:t.date,name:t.name,done:t.done};
  });
 }catch{throw Error('文件格式无效或版本不支持，请选择日序导出的 JSON 文件。');}
}
export class Repository {
 constructor(storage){this.storage=storage;}
 read(){
  const raw=this.storage.getItem(KEY);if(raw===null)return [];
  try{
   const data=JSON.parse(raw),ids=new Set();
   if(data.version!==1||!Array.isArray(data.tasks))throw Error();
   for(const t of data.tasks){
    if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||!validDate(t.date)||typeof t.name!=='string'||!t.name.trim()||typeof t.done!=='boolean')throw Error();ids.add(t.id);
   }return data.tasks;
  }catch{throw Error('本地数据无法读取。原始数据已保留，请先导出备份。');}
 }
 mutate(action,context){
  const result=change(this.read(),action,context);
  try{const beforeImport=this.backup();this.storage.setItem(KEY,JSON.stringify({version:1,tasks:result.tasks,...(beforeImport===null?{}:{beforeImport})}));}
  catch{throw Error('保存失败：浏览器存储不可用或已满，本次修改未保存。请先导出备份。');}return result;
 }
 snapshot(){return this.storage.getItem(KEY);}
 backup(){try{const data=JSON.parse(this.snapshot());return typeof data?.beforeImport==='string'?data.beforeImport:null;}catch{return null;}}
 importJSON(raw,expected){
  const tasks=parseImport(raw),current=this.snapshot();
  if(current!==expected)throw Error('本机数据已变化，请重新选择文件并确认导入。');
  try{
   let beforeImport=current??JSON.stringify({version:1,tasks:[]});
   // Strip earlier backup metadata so repeated imports never nest old backups.
   try{const data=JSON.parse(beforeImport);if(Object.hasOwn(data,'beforeImport')){delete data.beforeImport;beforeImport=JSON.stringify(data);}}catch{}
   // One atomic localStorage write saves the replacement AND its recovery copy.
   // Quota failures preserve both the previous tasks and previous backup.
   this.storage.setItem(KEY,JSON.stringify({version:1,tasks,beforeImport}));
  }catch{throw Error('导入未完成：无法保存备份或新数据，原有计划未替换。请检查浏览器存储空间。');}
  return tasks;
 }
 export(){const raw=this.storage.getItem(KEY);try{return JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks:this.read()},null,2);}catch{return raw??'{}';}}
}
