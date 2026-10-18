import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const base=process.env.TEST_URL||'http://127.0.0.1:4287',key='personal-planner-v1';
const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),desktop=await browser.newContext({viewport:{width:1280,height:900}});
const mobile=await phone.newPage(),page=await desktop.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));mobile.on('pageerror',e=>errors.push(e.message));
await mkdir('qa',{recursive:true});
try{
 await mobile.goto(base);await mobile.locator('.day.today').click();
 for(let i=0;i<2;i++){await mobile.locator('#add-task').click();await mobile.locator('#task-name').fill('手机上的同名任务');await mobile.getByRole('button',{name:'保存',exact:true}).click();}
 await mobile.locator('.check').first().click();await mobile.locator('#settings').click();
 const wait=mobile.waitForEvent('download');await mobile.locator('#export').click();const file=await wait,path=await file.path(),source=JSON.parse(await readFile(path,'utf8'));
 await page.goto(base);await page.locator('.day.today').click();await page.locator('#add-task').click();await page.locator('#task-name').fill('电脑原有任务');await page.getByRole('button',{name:'保存',exact:true}).click();
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('#settings').click();
 await page.locator('#import-file').setInputFiles(path);await page.locator('#import-preview').waitFor({state:'visible'});
 assert.match(await page.locator('#import-summary').innerText(),/2 项任务/);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),before);
 await page.locator('#cancel-import').click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),before);
 await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('格式无效'));assert.equal(await page.locator('#import-preview').isVisible(),false);
 await page.locator('#import-file').setInputFiles(path);await page.locator('#confirm-import').click();await page.waitForFunction(()=>document.querySelector('#import-status').textContent.includes('已导入 2'));
 assert.deepEqual(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).tasks,source.tasks);
 const backupWait=page.waitForEvent('download');await page.locator('#export-backup').click();assert.equal(await readFile(await (await backupWait).path(),'utf8'),before);
 await page.screenshot({path:'qa/import-desktop.png',fullPage:true});await page.reload();await page.locator('.day.today').click();assert.equal(await page.locator('.task').count(),2);assert.equal(await page.locator('.done').count(),1);
 // A preview is invalidated if another tab changes storage before confirmation.
 await page.locator('#settings').click();await page.locator('#import-file').setInputFiles(path);await page.locator('#import-preview').waitFor({state:'visible'});
 const other=await desktop.newPage();await other.goto(base);await other.locator('.day.today').click();await other.locator('#add-task').click();await other.locator('#task-name').fill('另一个窗口的新任务');await other.getByRole('button',{name:'保存',exact:true}).click();
 await page.locator('#confirm-import').click();assert.match(await page.locator('#import-status').innerText(),/已变化/);assert.equal(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).tasks.length,3);
 // Repeat import replaces instead of duplicating tasks.
 await page.locator('#import-file').setInputFiles(path);await page.locator('#confirm-import').click();assert.equal(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).tasks.length,2);
 // A second tab must not resurrect a pre-import deletion into the replacement.
 await other.locator('.delete').first().click();assert.equal(await other.locator('.toast').count(),1);
 await page.locator('#import-file').setInputFiles(path);await page.locator('#confirm-import').click();
 await other.waitForFunction(()=>document.querySelectorAll('.toast').length===0,{},{timeout:2000});
 // Same controls fit the mobile settings sheet, including explicit destructive confirmation.
 await mobile.locator('#import-file').setInputFiles(path);await mobile.locator('#import-preview').waitFor({state:'visible'});await mobile.screenshot({path:'qa/import-mobile.png',fullPage:true});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('PASS: actual phone export → separate desktop import; preview/cancel/invalid file; full replacement; downloaded backup; refresh; stale preview protection; repeated import; mobile layout; no browser errors.');
}finally{await browser.close();}
