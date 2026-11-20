import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/proof/phase-4';mkdirSync(dir,{recursive:true});mkdirSync('docs/demo/raw',{recursive:true});
mkdirSync('data',{recursive:true});writeFileSync('data/phase4-test-board.json',JSON.stringify({entries:[]}));
const testEnv={...process.env,LEADERBOARD_FILE:'data/phase4-test-board.json'};
const server=spawn(process.execPath,['scripts/server.mjs'],{env:{...testEnv,PORT:'0'},stdio:['ignore','pipe','inherit']});
const base=await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{const url=/http:\/\/localhost:\d+/.exec(b.toString())?.[0];if(url)resolve(url);});server.on('error',reject);});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720}}),checks=[],errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
try{
 const page=await context.newPage();await page.goto(base);
 await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
 await page.locator('#rebind-up').click();await page.keyboard.press('KeyS');assert.match(await page.locator('#key-conflict-msg').textContent(),/đang dùng/);
 await page.locator('#rebind-up').click();await page.keyboard.press('ArrowUp');
 await page.locator('#reduce-motion').check();await page.locator('#large-text').check();await page.reload();
 await page.getByRole('button',{name:'Cài đặt',exact:true}).click();assert.equal(await page.locator('#rebind-up').textContent(),'ArrowUp');assert.ok(await page.locator('#reduce-motion').isChecked());assert.ok(await page.locator('#large-text').isChecked());
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).fontSize),'22.5px');checks.push('rebinding, conflicts, persistence, reduce motion and 1.25x text');
 await page.screenshot({path:`${dir}/accessibility.png`});await page.locator('#reset-keys-btn').click();assert.equal(await page.locator('#rebind-up').textContent(),'W');
 await page.getByRole('button',{name:'Quay lại',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu hành trình'}).click();await page.getByRole('button',{name:'Bắt đầu đêm 1',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('#game').dataset.simTick)>=300);await page.locator('#shade-direction').waitFor({state:'visible'});checks.push('visual shade spawn direction');await page.close();
 const fixture=await context.newPage();
 await fixture.route('**/src/web-v11.mjs',async route=>{const original=await route.fetch();await route.fulfill({response:original,body:(await original.text()).replace('new Game(tuning, 2026 + campaign.night, {}, campaign.night)',"new Game(tuning,2027,{random_motes:false,random_shades:false,time_left_s:1/60,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}]},1)")});});
 await fixture.goto(base);await fixture.getByRole('button',{name:'Bắt đầu hành trình'}).click();await fixture.getByRole('button',{name:'Bắt đầu đêm 1',exact:true}).click();await fixture.locator('#name-form').waitFor({state:'visible'});
 await fixture.locator('#player-name').fill('bad@@');await fixture.locator('#save-score-btn').click();assert.ok(await fixture.locator('#name-error').textContent());
 await fixture.locator('#player-name').fill('May_Release');await fixture.locator('#save-score-btn').click();await fixture.locator('#leaderboard-body').getByText('May_Release',{exact:true}).waitFor();
 const entries=await fixture.evaluate(()=>JSON.parse(localStorage.getItem('dao-den-long.leaderboard.v1')));assert.equal(entries.filter(e=>e.name==='May_Release').length,1);assert.equal(entries.find(e=>e.name==='May_Release').score,0);
 await fixture.screenshot({path:`${dir}/leaderboard-fixture.png`});await fixture.reload();await fixture.getByRole('button',{name:'Bảng xếp hạng',exact:true}).click();await fixture.getByText('May_Release',{exact:true}).waitFor();
 const download=fixture.waitForEvent('download');await fixture.locator('#export-board').click();await(await download).saveAs(`${dir}/leaderboard-export.json`);
 checks.push('loss fixture: valid/invalid name, zero won-score, single entry, reload persistence and JSON export');
 const exportRun=spawnSync(process.execPath,['scripts/server.mjs','--export-leaderboard',`${dir}/leaderboard-cli.json`],{encoding:'utf8',env:testEnv});assert.equal(exportRun.status,0,exportRun.stderr);assert.ok(JSON.parse(readFileSync(`${dir}/leaderboard-cli.json`)).entries.some(e=>e.name==='May_Release'));
 assert.deepEqual(errors,[]);writeFileSync(`${dir}/browser.json`,JSON.stringify({browser:browser.version(),checks,errors,note:'Leaderboard score fixture is synthetic; settings and normal 5-second spawn check use production logic.'},null,2)+'\n');
 await context.close();
 // Separate, explicitly recorded real demo: normal gameplay, then real test/bench reports.
 const videoContext=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:'docs/demo/raw',size:{width:1280,height:720}}});
 const demo=await videoContext.newPage();await demo.goto(base);await demo.getByRole('button',{name:'Bắt đầu hành trình'}).click();await demo.getByRole('button',{name:'Bắt đầu đêm 1',exact:true}).click();
 await demo.keyboard.down('KeyW');await demo.waitForTimeout(5000);await demo.keyboard.up('KeyW');await demo.keyboard.down('KeyD');await demo.keyboard.down('ShiftLeft');await demo.waitForTimeout(1000);await demo.keyboard.up('ShiftLeft');await demo.waitForTimeout(3000);await demo.keyboard.up('KeyD');await demo.keyboard.down('Space');await demo.waitForTimeout(500);await demo.keyboard.up('Space');await demo.keyboard.down('KeyF');await demo.waitForTimeout(300);await demo.keyboard.up('KeyF');
 await demo.screenshot({path:`${dir}/game.png`});await demo.waitForTimeout(1500);
 await demo.goto(`${base}/?bench=1&seed=42&duration=5`);await demo.waitForFunction(()=>window.__BENCH_RESULTS__,null,{timeout:20000});
 const reports={benchmark:JSON.parse(readFileSync('bench.json')),soak:JSON.parse(readFileSync('soak.json')),tests:readFileSync(`${dir}/tests.txt`,'utf8').split('\n').slice(-10).join('\n')};
 await demo.setContent('<html lang="vi"><body style="background:#0e1430;color:#f5f1e6;font:22px monospace;padding:32px"><h1>Đảo Đèn Lồng v1.0.0 · Bằng chứng chạy thật</h1><pre style="white-space:pre-wrap"></pre></body></html>');
 await demo.locator('pre').textContent().catch(()=>{});
 for(const [name,value] of Object.entries(reports)){await demo.locator('pre').evaluate((el,v)=>el.textContent=v,`${name}\n${typeof value==='string'?value:JSON.stringify(value,null,2)}`);await demo.waitForTimeout(4500);}
 const path=await demo.video().path();await videoContext.close();writeFileSync(`${dir}/demo-source.json`,JSON.stringify({webm:path,note:'Actual browser play and five-second benchmark excerpt; displayed benchmark/soak/test numbers read from actual generated reports.'},null,2));
 console.log(JSON.stringify({checks,video:path,errors}));
}finally{await browser.close();server.kill();}
