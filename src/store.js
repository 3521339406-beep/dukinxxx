import {change,validDate} from './model.js';
export const KEY='personal-planner-v1';
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
  try{this.storage.setItem(KEY,JSON.stringify({version:1,tasks:result.tasks}));}
  catch{throw Error('保存失败：浏览器存储不可用或已满，本次修改未保存。请先导出备份。');}return result;
 }
 export(){const raw=this.storage.getItem(KEY);try{return JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks:this.read()},null,2);}catch{return raw??'{}';}}
}
