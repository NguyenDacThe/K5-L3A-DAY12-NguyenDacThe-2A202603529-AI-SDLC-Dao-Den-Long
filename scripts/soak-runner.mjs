import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Game } from '../src/game.mjs';
const args=process.argv.slice(2), opts={};
for(let i=0;i<args.length;i+=2){ if(!['--seed','--nights','--out'].includes(args[i])||args[i+1]===undefined) throw new Error('Invalid soak arguments'); opts[args[i]]=args[i+1]; }
const baseSeed=Number(opts['--seed']??7), nights=Number(opts['--nights']??10), out=opts['--out']??'soak.json';
if(!Number.isSafeInteger(baseSeed)||!Number.isSafeInteger(nights)||nights<1) throw new Error('Invalid seed/nights');
const t=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url))).tuning;
const started=performance.now(), results=[]; let crashes=0, game;
// Warm engine/JIT before measuring RSS; never pad the baseline with unused memory.
{ let warm=new Game(t,baseSeed); for(let i=0;i<1200;i++) warm.step({move:[0,1]}); warm=null; }
global.gc?.();
game=new Game(t,baseSeed,{},1); global.gc?.();
const mem_start_mb=process.memoryUsage().rss/2**20;
for(let i=0;i<nights;i++){
  const night=i%3+1, seed=baseSeed+i;
  try{
    if(i) game=new Game(t,seed,{},night);
    let rng=(seed^0x9e3779b9)>>>0;
    const random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/2**32;};
    let move=[0,0];
    while(game.state==='playing' && game.simTick<t[`night${night}_duration_s`]*60){
      if(game.simTick%30===0){const a=random()*Math.PI*2;move=[Math.cos(a),Math.sin(a)];}
      game.step({move,jump:random()<.05,dash:random()<.03,pulse:random()<.02,interact:random()<.1});
    }
    results.push(game.state);
    game=null; global.gc?.();
  }catch(e){crashes++;results.push('crash');console.error(e.message);}
}
game=new Game(t,baseSeed+nights-1,{},(nights-1)%3+1); global.gc?.();
const mem_end_mb=process.memoryUsage().rss/2**20;
const output={nights,crashes,results,mem_start_mb,mem_end_mb,duration_s:(performance.now()-started)/1000};
mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output));
if(crashes || mem_end_mb>1.2*mem_start_mb) process.exitCode=1;
