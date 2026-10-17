// Optional browser QA: install Playwright separately, or set PLAYWRIGHT_PATH to its package directory.
import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {mkdir,readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,timezoneId:'Asia/Shanghai'});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('qa',{recursive:true});
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4287');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 assert.ok(await page.locator('.day').count()>=28);assert.equal(await page.locator('.task').count(),0);
 assert.equal(await page.locator('.weekdays span').first().textContent(),'周一');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'qa/calendar-mobile.png',fullPage:true});
 await page.locator('.day.today').click();
 async function add(name){await page.locator('#add-task').click();await page.locator('#task-name').fill(name);await page.getByRole('button',{name:'保存',exact:true}).click();}
 await add('阅读 20 分钟');await add('阅读 20 分钟');await add('散步');
 assert.equal(await page.locator('.task').count(),3);
 const ids=await page.locator('.task').evaluateAll(rows=>rows.map(r=>r.dataset.id));assert.equal(new Set(ids).size,3);
 await page.locator('.check').first().click();assert.equal(await page.locator('.task').last().getAttribute('data-id'),ids[0]);
 await page.locator('.done .check').click();assert.deepEqual(await page.locator('.task').evaluateAll(rows=>rows.map(r=>r.dataset.id)),[ids[1],ids[2],ids[0]]);
 await page.locator('.drag-handle').last().focus();await page.keyboard.press('Home');assert.equal(await page.locator('.task').first().getAttribute('data-id'),ids[0]);
 // Real pointer dragging through the same Pointer Events path used by touch.
 const handle=await page.locator('.drag-handle').first().boundingBox(),last=await page.locator('.task').last().boundingBox();
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(last.x+last.width/2,last.y+last.height+4,{steps:12});await page.mouse.up();
 assert.equal(await page.locator('.task').last().getAttribute('data-id'),ids[0]);
 // Actual touch input, separate from the mouse Pointer Events check above.
 // Some mobile browsers expose zero movementY; client coordinates still change.
 await page.evaluate(()=>document.addEventListener('pointermove',e=>Object.defineProperty(e,'movementY',{value:0}),{capture:true}));
 const cdp=await context.newCDPSession(page),touchHandle=await page.locator('.drag-handle').last().boundingBox(),touchFirst=await page.locator('.task').first().boundingBox();
 const tx=touchHandle.x+touchHandle.width/2,ty=touchHandle.y+touchHandle.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
 for(let step=1;step<=10;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx,y:ty+(touchFirst.y-ty)*step/10}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await page.locator('.task').first().getAttribute('data-id'),ids[0],'touch drag moves last task to first');
 await page.locator('.task-name').first().click();await page.locator('#task-name').fill('修改后的任务');await page.getByRole('button',{name:'保存',exact:true}).click();
 assert.equal(await page.locator('.task-name').first().textContent(),'修改后的任务');
 await page.locator('.delete').first().click();assert.equal(await page.locator('.task').count(),2);await page.locator('.toast button').click();assert.equal(await page.locator('.task').count(),3);
 await page.locator('.check').first().click();await page.screenshot({path:'qa/detail-mobile.png',fullPage:true});
 await page.locator('#settings').click();const downloadWait=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadWait;const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.tasks.length,3);assert.equal(exported.version,1);
 await page.locator('#close-settings').click();await page.reload();assert.equal(await page.locator('.calendar').count(),1);await page.locator('.day.today').click();assert.equal(await page.locator('.task').count(),3);
 await page.locator('.delete').first().click();await page.waitForTimeout(5200);assert.equal(await page.locator('.toast').count(),0);
 await page.locator('.back').click();const today=await page.locator('.day.today').getAttribute('data-date');
 const past=await page.locator('.day').evaluateAll((days,t)=>days.map(x=>x.dataset.date).find(d=>d<t),today);await page.locator(`[data-date="${past}"]`).click();assert.equal(await page.locator('#add-task').count(),0);assert.equal(await page.locator('.readonly').count(),1);
 await page.locator('.back').click();await page.locator('#next').click();await page.locator('.day').first().click();await add('未来任务');await page.locator('.check').click();assert.equal(await page.locator('.done').count(),1);
 await context.setOffline(true);await page.reload();assert.equal(await page.locator('.calendar').count(),1);await page.locator('.day.today').click();await add('离线任务');assert.equal(await page.locator('.task').count(),3);await page.reload();await page.locator('.day.today').click();assert.equal(await page.locator('.task').count(),3);await context.setOffline(false);
 await page.locator('.back').click();await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'qa/calendar-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: mobile layout, Monday calendar, duplicate identity, add/edit, complete/uncheck order, keyboard & pointer sort, delete/undo/expiry, full JSON download, persistence, past read-only, future completion, offline reload/edit, desktop, no browser errors.');
}finally{await browser.close();}
