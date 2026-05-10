const REEL=['M','M','M','M','M','M','W','W','W','W','W','C','C','C','C','D','D','S','S','B','B','B'];
const PAYTABLE={'3M':8,'3W':15,'3C':40,'3D':45,'2M':3,'2W':3};
const CHEST_POOL=[2,2,2,2,3,3,3,5,5];
const BET=0.01;
const META={M:{emoji:'🍖',name:'MEAT',cls:'meat'},W:{emoji:'��',name:'WANTED',cls:'wanted'},C:{emoji:'💰',name:'CHEST',cls:'chest'},D:{emoji:'🍇',name:'DEVIL',cls:'devil'},S:{emoji:'🎩',name:'HAT',cls:'hat'},B:{emoji:'',name:'',cls:'blank'}};
const WIN_MESSAGES={'3M':['Three Meat! Luffy approves.','Meat on the payline!'],'3W':['Wanted Posters matched!','The crew is notorious!'],'3C':['Three Chests! Treasure found!','The vault opens!'],'3D':['Devil Fruit! Rare power awakens!','The sea trembles!'],'2M':['Two Meat. Small victory.','A taste of glory.'],'2W':['Two Posters. Keep pressing.','Notoriety grows.']};
const LOSS_MESSAGES=['The sea gives nothing freely...','Press on, crew.','The Grand Line tests your resolve.','Calm waters. Keep sailing.','No treasure this tide.','The horizon holds more.','Every sailor knows dry spells.'];
let balance=5.00,spinCount=0,isSpinning=false,picksLeft=0,bonusPicks=[],chestVals=[];

(function initOcean(){
  const canvas=document.getElementById('ocean-canvas');
  const ctx=canvas.getContext('2d');
  let W,H,t=0;
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
  function drawOcean(){
    ctx.clearRect(0,0,W,H);
    const layers=[{amp:18,period:0.006,speed:0.6,alpha:0.06,y:H*0.55},{amp:14,period:0.009,speed:0.9,alpha:0.05,y:H*0.62},{amp:10,period:0.013,speed:1.3,alpha:0.04,y:H*0.70},{amp:6,period:0.018,speed:1.8,alpha:0.03,y:H*0.78}];
    layers.forEach(layer=>{
      ctx.beginPath();ctx.moveTo(0,layer.y);
      for(let x=0;x<=W;x+=4){const y=layer.y+Math.sin(x*layer.period+t*layer.speed)*layer.amp+Math.sin(x*layer.period*1.7+t*layer.speed*0.8)*(layer.amp*0.4);ctx.lineTo(x,y);}
      ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
      ctx.fillStyle=`rgba(26,122,110,${layer.alpha})`;ctx.fill();
    });
    if(!ctx._stars){ctx._stars=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H*0.5,r:Math.random()*1.2,twinkle:Math.random()*Math.PI*2}));}
    ctx._stars.forEach(star=>{
      const alpha=0.2+0.15*Math.sin(star.twinkle+t*0.02);
      ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,220,180,${alpha})`;ctx.fill();
      star.twinkle+=0.01;
    });
    t+=0.5;requestAnimationFrame(drawOcean);
  }
  window.addEventListener('resize',resize);resize();drawOcean();
})();

function setTile(id,sym,lineClass){
  const el=document.getElementById(id);
  const meta=META[sym];
  el.className='symbol-tile '+(lineClass||'off-line');
  if(meta.cls!=='blank')el.classList.add(meta.cls);
  el.innerHTML=meta.emoji?`<span class="sym-emoji">${meta.emoji}</span><span class="sym-name">${meta.name}</span>`:'';
}
function randSym(){return REEL[Math.floor(Math.random()*REEL.length)];}

function spin(){
  if(isSpinning)return;
  if(balance<BET){setMessage('No credits remain. Press RESET to play again.');return;}
  isSpinning=true;
  document.getElementById('spin-btn').disabled=true;
  balance-=BET;spinCount+=1;
  setMessage('...');setWinDisplay(0,false);
  const stops=[Math.floor(Math.random()*REEL.length),Math.floor(Math.random()*REEL.length),Math.floor(Math.random()*REEL.length)];
  const payline=[REEL[stops[0]],REEL[stops[1]],REEL[stops[2]]];
  const top=[randSym(),randSym(),randSym()];
  const bot=[randSym(),randSym(),randSym()];
  animateReels(payline,top,bot,()=>{evaluateSpin(payline,top,bot);isSpinning=false;document.getElementById('spin-btn').disabled=false;});
}

function animateReels(payline,top,bot,done){
  const midIds=['r0-mid','r1-mid','r2-mid'];
  const topIds=['r0-top','r1-top','r2-top'];
  const botIds=['r0-bot','r1-bot','r2-bot'];
  [...midIds,...topIds,...botIds].forEach(id=>document.getElementById(id).classList.add('spinning'));
  [0,1,2].forEach(i=>{
    setTimeout(()=>{
      const ids=[topIds[i],midIds[i],botIds[i]];
      ids.forEach(id=>document.getElementById(id).classList.remove('spinning'));
      setTile(topIds[i],top[i],'off-line');
      setTile(midIds[i],payline[i],'on-line');
      setTile(botIds[i],bot[i],'off-line');
      ids.forEach(id=>{const el=document.getElementById(id);el.classList.add('landing');setTimeout(()=>el.classList.remove('landing'),300);});
      if(i===2)setTimeout(done,180);
    },[380,560,740][i]);
  });
}

function evaluateSpin(payline,top,bot){
  const[s0,s1,s2]=payline;
  const midIds=['r0-mid','r1-mid','r2-mid'];
  if(s0==='S'&&s1==='S'&&s2==='S'){
    setWinDisplay(0,false);updateHUD();
    pulseWinTiles(midIds,'hat');setMessage('THREE STRAW HATS — Treasure Hunt triggered!');
    screenFlash();setTimeout(()=>openBonus(),900);return;
  }
  if(s0!=='B'&&s0===s1&&s1===s2){
    const key='3'+s0;const mult=PAYTABLE[key];
    if(mult){const win=mult*BET;balance+=win;setWinDisplay(win,true);updateHUD();
      const msgs=WIN_MESSAGES[key];setMessage(msgs[Math.floor(Math.random()*msgs.length)]+`  +$${win.toFixed(2)}`);
      pulseWinTiles(midIds,META[s0].cls);spawnParticles(win);screenFlash();return;}
  }
  if(s0!=='B'&&s0===s1&&s2!==s0){
    const key='2'+s0;const mult=PAYTABLE[key];
    if(mult){const win=mult*BET;balance+=win;setWinDisplay(win,true);updateHUD();
      const msgs=WIN_MESSAGES[key];setMessage(msgs[Math.floor(Math.random()*msgs.length)]+`  +$${win.toFixed(2)}`);
      pulseWinTiles(['r0-mid','r1-mid'],META[s0].cls);spawnParticles(win*0.5);return;}
  }
  updateHUD();setWinDisplay(0,false);
  const offSyms=[...top,...bot];
  const isNearMiss=['M','W','C','D','S'].some(sym=>offSyms.filter(s=>s===sym).length>=2);
  if(isNearMiss){
    setMessage('So close... the treasure is near.');
    ['r0-top','r1-top','r2-top','r0-bot','r1-bot','r2-bot'].forEach(id=>{const el=document.getElementById(id);el.classList.add('near-miss-fade');setTimeout(()=>el.classList.remove('near-miss-fade'),1400);});
  }else{setMessage(LOSS_MESSAGES[spinCount%LOSS_MESSAGES.length]);}
  if(balance<=0)setTimeout(()=>setMessage('Your voyage ends here. Press RESET to sail again.'),600);
}

function pulseWinTiles(ids,cls){
  ids.forEach(id=>{const el=document.getElementById(id);el.classList.add('win-tile','win-glow',cls);setTimeout(()=>{el.classList.remove('win-tile');setTimeout(()=>el.classList.remove('win-glow',cls),800);},600);});
}
function screenFlash(){document.body.classList.remove('win-flash');void document.body.offsetWidth;document.body.classList.add('win-flash');setTimeout(()=>document.body.classList.remove('win-flash'),500);}
function spawnParticles(winAmount){
  const container=document.getElementById('particle-container');
  const count=Math.min(6+Math.floor(winAmount*60),30);
  const btn=document.getElementById('spin-btn');
  const rect=btn.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const colors=['#F0C060','#C9973A','#FFE090','#FFFFFF','#2ABBA8'];
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    const size=4+Math.random()*6,angle=Math.random()*Math.PI*2,dist=80+Math.random()*180;
    const tx=Math.cos(angle)*dist,ty=Math.sin(angle)*dist-60,dur=0.6+Math.random()*0.6;
    const color=colors[Math.floor(Math.random()*colors.length)];
    p.className='particle';
    p.style.cssText=`left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${color};--tx:${tx}px;--ty:${ty}px;--dur:${dur}s;animation-delay:${Math.random()*0.15}s;`;
    container.appendChild(p);setTimeout(()=>p.remove(),(dur+0.2)*1000);
  }
}

function setMessage(msg){const el=document.getElementById('message');el.style.opacity='0';setTimeout(()=>{el.textContent=msg;el.style.opacity='1';},120);}
function setWinDisplay(amount,hasWin){const el=document.getElementById('win-display');el.textContent='$'+amount.toFixed(2);el.classList.toggle('has-win',hasWin&&amount>0);}
function updateHUD(){document.getElementById('balance').textContent='$'+balance.toFixed(2);document.getElementById('spin-count').textContent=spinCount;}

function openBonus(){
  picksLeft=3;bonusPicks=[];chestVals=[...CHEST_POOL].sort(()=>Math.random()-0.5);
  const grid=document.getElementById('chest-grid');grid.innerHTML='';
  chestVals.forEach((val,i)=>{
    const btn=document.createElement('button');btn.className='chest-btn';btn.textContent='💰';
    btn.dataset.val=val;btn.onclick=()=>pickChest(btn,val);grid.appendChild(btn);
  });
  document.getElementById('bonus-instruction').textContent='Pick 3 chests. Your crew is counting on you.';
  document.getElementById('bonus-result').classList.add('hidden');
  document.getElementById('bonus-close').classList.add('hidden');
  document.getElementById('bonus-overlay').classList.remove('hidden');
}
function pickChest(btn,val){
  if(picksLeft<=0)return;picksLeft--;bonusPicks.push(val);
  btn.disabled=true;btn.textContent=val+'×';btn.className=`chest-btn revealed-${val} reveal-anim`;
  document.getElementById('bonus-instruction').textContent=picksLeft>0?`Good find! ${picksLeft} more chest${picksLeft>1?'s':''} to go.`:'All picks made — revealing the rest...';
  if(picksLeft===0)setTimeout(revealAll,500);
}
function revealAll(){
  document.querySelectorAll('.chest-btn').forEach(btn=>{
    if(!btn.disabled){const val=parseInt(btn.dataset.val);btn.disabled=true;btn.textContent=val+'×';btn.classList.add(`revealed-${val}`,'unselected');}
  });
  const total=bonusPicks.reduce((a,b)=>a+b,0),payout=total*BET;balance+=payout;
  document.getElementById('balance').textContent='$'+balance.toFixed(2);
  document.getElementById('bonus-total-display').textContent=`${total}× total · You found $${payout.toFixed(2)}`;
  document.getElementById('bonus-result').classList.remove('hidden');
  document.getElementById('bonus-close').classList.remove('hidden');
  document.getElementById('bonus-instruction').textContent=`The vault yielded $${payout.toFixed(2)} in treasure.`;
  spawnParticles(payout*2);
}
function closeBonus(){
  document.getElementById('bonus-overlay').classList.add('hidden');
  const total=bonusPicks.reduce((a,b)=>a+b,0);
  setWinDisplay(total*BET,true);setMessage(`Treasure secured. $${(total*BET).toFixed(2)} added to your hold.`);
}
function resetGame(){
  balance=5.00;spinCount=0;isSpinning=false;updateHUD();setWinDisplay(0,false);
  setMessage('New voyage. Press SPIN to set sail.');
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id=>setTile(id,'B',id.includes('mid')?'on-line':'off-line'));
}
function togglePaytable(){document.getElementById('paytable').classList.toggle('hidden');}
window.onload=()=>{updateHUD();setWinDisplay(0,false);['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id=>setTile(id,'B',id.includes('mid')?'on-line':'off-line'));};
