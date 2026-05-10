const REEL=['M','M','M','M','M','M','W','W','W','W','W','C','C','C','C','D','D','S','S','B','B','B'];
const PAYTABLE={'3M':8,'3W':15,'3C':40,'3D':45,'2M':3,'2W':3};
const CHEST_POOL=[2,2,2,2,3,3,3,5,5];
const BET=0.01;
const META={
  M:{emoji:'🍖',name:'MEAT',cls:'meat'},
  W:{emoji:'📜',name:'WANTED',cls:'wanted'},
  C:{emoji:'💰',name:'CHEST',cls:'chest'},
  D:{emoji:'🍇',name:'DEVIL',cls:'devil'},
  S:{emoji:'🎩',name:'HAT',cls:'hat'},
  B:{emoji:'',name:'',cls:'blank'}
};
const WIN_MESSAGES={
  '3M':['Three Meat! Luffy approves.','Meat on the payline!'],
  '3W':['Wanted Posters matched!','The crew is notorious!'],
  '3C':['Three Chests! Treasure found!','The vault opens!'],
  '3D':['Devil Fruit! Rare power awakens!','The sea trembles!'],
  '2M':['Two Meat. Small victory.','A taste of glory.'],
  '2W':['Two Posters. Keep pressing.','Notoriety grows.']
};
const LOSS_MESSAGES=[
  'The sea gives nothing freely...','Press on, crew.',
  'The Grand Line tests your resolve.','Calm waters. Keep sailing.',
  'No treasure this tide.','The horizon holds more.',
  'Every sailor knows dry spells.'
];
const PROB_DATA=[
  {key:'3D',label:'Devil Fruit ×3',prob:0.000751,mult:45,cls:'devil',emoji:'🍇',avgEvery:1333},
  {key:'BON',label:'Treasure Hunt',prob:0.000751,mult:9,cls:'hat',emoji:'🎩',avgEvery:1333},
  {key:'3C',label:'Chest ×3',prob:0.006011,mult:40,cls:'chest',emoji:'💰',avgEvery:166},
  {key:'3W',label:'Wanted ×3',prob:0.011739,mult:15,cls:'wanted',emoji:'📜',avgEvery:85},
  {key:'3M',label:'Meat ×3',prob:0.020285,mult:8,cls:'meat',emoji:'🍖',avgEvery:49},
  {key:'2W',label:'Wanted ×2',prob:0.039914,mult:3,cls:'wanted',emoji:'📜',avgEvery:25},
  {key:'2M',label:'Meat ×2',prob:0.054095,mult:3,cls:'meat',emoji:'🍖',avgEvery:18},
];

let balance=5.00,spinCount=0,isSpinning=false,picksLeft=0,bonusPicks=[],chestVals=[];
let winCounts={'3D':0,'3C':0,'3W':0,'3M':0,'2W':0,'2M':0,'BON':0};

// OCEAN CANVAS
(function initOcean(){
  const canvas=document.getElementById('ocean-canvas');
  const ctx=canvas.getContext('2d');
  let W,H,t=0;
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
  function drawOcean(){
    ctx.clearRect(0,0,W,H);
    [{amp:18,period:0.006,speed:0.6,alpha:0.06,y:H*0.55},
     {amp:14,period:0.009,speed:0.9,alpha:0.05,y:H*0.62},
     {amp:10,period:0.013,speed:1.3,alpha:0.04,y:H*0.70},
     {amp:6, period:0.018,speed:1.8,alpha:0.03,y:H*0.78}
    ].forEach(l=>{
      ctx.beginPath();ctx.moveTo(0,l.y);
      for(let x=0;x<=W;x+=4){
        const y=l.y+Math.sin(x*l.period+t*l.speed)*l.amp+Math.sin(x*l.period*1.7+t*l.speed*0.8)*(l.amp*0.4);
        ctx.lineTo(x,y);
      }
      ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
      ctx.fillStyle=`rgba(26,122,110,${l.alpha})`;ctx.fill();
    });
    if(!ctx._stars){ctx._stars=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H*0.5,r:Math.random()*1.2,tw:Math.random()*Math.PI*2}));}
    ctx._stars.forEach(s=>{
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,220,180,${0.2+0.15*Math.sin(s.tw+t*0.02)})`;ctx.fill();s.tw+=0.01;
    });
    t+=0.5;requestAnimationFrame(drawOcean);
  }
  window.addEventListener('resize',resize);resize();drawOcean();
})();

// PROBABILITY PANEL
function buildProbPanel(){
  const panel=document.getElementById('prob-panel');
  if(!panel)return;
  panel.innerHTML=`
    <div class="prob-header">
      <span class="prob-title">ODDS VIEWER</span>
      <span class="prob-subtitle">Live tracking · per spin</span>
    </div>
    <div id="prob-rows"></div>
    <div class="prob-rtp">RTP 90.14% &nbsp;·&nbsp; Hits every ~7.5 spins</div>
  `;
  renderProbRows();
}

function renderProbRows(){
  const el=document.getElementById('prob-rows');
  if(!el)return;
  el.innerHTML=PROB_DATA.map(d=>{
    const seen=winCounts[d.key]||0;
    const expected=spinCount>0?(spinCount*d.prob).toFixed(1):'0.0';
    const barW=Math.min(d.prob*1800,100);
    const pct=(d.prob*100).toFixed(4);
    const delta=seen-(spinCount*d.prob);
    const deltaStr=delta>=0?`+${delta.toFixed(1)}`:`${delta.toFixed(1)}`;
    const deltaClass=delta>=0?'delta-ahead':'delta-behind';
    return `
      <div class="prob-item">
        <div class="prob-item-top">
          <span class="prob-ico ${d.cls}">${d.emoji}</span>
          <div class="prob-text">
            <span class="prob-name">${d.label}</span>
            <span class="prob-odds">${pct}% · ~1 in ${d.avgEvery.toLocaleString()}</span>
          </div>
          <span class="prob-pay">$${(d.mult*BET).toFixed(2)}</span>
        </div>
        <div class="prob-track"><div class="prob-fill ${d.cls}" style="width:${barW}%"></div></div>
        <div class="prob-counts">
          Seen <strong>${seen}</strong> / Expected <strong>${expected}</strong>
          ${spinCount>0?`<span class="prob-delta ${deltaClass}">(${deltaStr})</span>`:''}
        </div>
      </div>
    `;
  }).join('');
}

// FLOATING DELTA
function spawnDelta(amount,isWin){
  const el=document.getElementById('balance');
  const rect=el.getBoundingClientRect();
  const div=document.createElement('div');
  div.className='delta-float '+(isWin?'delta-win':'delta-loss');
  div.textContent=isWin?`+$${amount.toFixed(2)}`:`-$${BET.toFixed(2)}`;
  div.style.left=(rect.left+rect.width/2)+'px';
  div.style.top=rect.top+'px';
  document.body.appendChild(div);
  setTimeout(()=>div.remove(),1100);
}

// TILE RENDERING
function setTile(id,sym,lineClass){
  const el=document.getElementById(id);
  const meta=META[sym];
  el.className='symbol-tile '+(lineClass||'off-line');
  if(meta.cls!=='blank')el.classList.add(meta.cls);
  el.innerHTML=meta.emoji?`<span class="sym-emoji">${meta.emoji}</span><span class="sym-name">${meta.name}</span>`:'';
}
function randSym(){return REEL[Math.floor(Math.random()*REEL.length)];}

// SPIN
function spin(){
  if(isSpinning)return;
  if(balance<BET){setMessage('No credits remain. Press RESET to sail again.');return;}
  isSpinning=true;
  document.getElementById('spin-btn').disabled=true;
  balance-=BET;spinCount+=1;
  setMessage('...');setWinDisplay(0,false);
  spawnDelta(BET,false);
  const stops=[0,1,2].map(()=>Math.floor(Math.random()*REEL.length));
  const payline=stops.map(s=>REEL[s]);
  const top=[randSym(),randSym(),randSym()];
  const bot=[randSym(),randSym(),randSym()];
  animateReels(payline,top,bot,()=>{
    evaluateSpin(payline,top,bot);
    isSpinning=false;
    document.getElementById('spin-btn').disabled=false;
  });
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

// EVALUATION
function evaluateSpin(payline,top,bot){
  const[s0,s1,s2]=payline;
  const midIds=['r0-mid','r1-mid','r2-mid'];

  if(s0==='S'&&s1==='S'&&s2==='S'){
    winCounts['BON']++;updateHUD();setWinDisplay(0,false);
    pulseWinTiles(midIds,'hat');setMessage('THREE STRAW HATS — Treasure Hunt triggered!');
    screenFlash();renderProbRows();setTimeout(()=>openBonus(),900);return;
  }
  if(s0!=='B'&&s0===s1&&s1===s2){
    const key='3'+s0,mult=PAYTABLE[key];
    if(mult){
      const win=mult*BET;balance+=win;
      if(winCounts[key]!==undefined)winCounts[key]++;
      setWinDisplay(win,true);updateHUD();spawnDelta(win,true);
      const msgs=WIN_MESSAGES[key];
      setMessage(msgs[Math.floor(Math.random()*msgs.length)]+`  +$${win.toFixed(2)}`);
      pulseWinTiles(midIds,META[s0].cls);spawnParticles(win);screenFlash();renderProbRows();return;
    }
  }
  if(s0!=='B'&&s0===s1&&s2!==s0){
    const key='2'+s0,mult=PAYTABLE[key];
    if(mult){
      const win=mult*BET;balance+=win;
      if(winCounts[key]!==undefined)winCounts[key]++;
      setWinDisplay(win,true);updateHUD();spawnDelta(win,true);
      const msgs=WIN_MESSAGES[key];
      setMessage(msgs[Math.floor(Math.random()*msgs.length)]+`  +$${win.toFixed(2)}`);
      pulseWinTiles(['r0-mid','r1-mid'],META[s0].cls);spawnParticles(win*0.5);renderProbRows();return;
    }
  }

  updateHUD();setWinDisplay(0,false);
  const offSyms=[...top,...bot];
  const isNearMiss=['M','W','C','D','S'].some(sym=>offSyms.filter(s=>s===sym).length>=2);
  if(isNearMiss){
    setMessage('So close... the treasure is near.');
    ['r0-top','r1-top','r2-top','r0-bot','r1-bot','r2-bot'].forEach(id=>{
      const el=document.getElementById(id);el.classList.add('near-miss-fade');
      setTimeout(()=>el.classList.remove('near-miss-fade'),1400);
    });
  }else{setMessage(LOSS_MESSAGES[spinCount%LOSS_MESSAGES.length]);}
  renderProbRows();
  if(balance<=0)setTimeout(()=>setMessage('Your voyage ends here. Press RESET to sail again.'),600);
}

// VISUAL FX
function pulseWinTiles(ids,cls){
  ids.forEach(id=>{
    const el=document.getElementById(id);
    el.classList.add('win-tile','win-glow',cls);
    setTimeout(()=>{el.classList.remove('win-tile');setTimeout(()=>el.classList.remove('win-glow',cls),800);},600);
  });
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
    p.className='particle';
    p.style.cssText=`left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};--tx:${tx}px;--ty:${ty}px;--dur:${dur}s;animation-delay:${Math.random()*0.15}s;`;
    container.appendChild(p);setTimeout(()=>p.remove(),(dur+0.2)*1000);
  }
}

// HUD
function setMessage(msg){const el=document.getElementById('message');el.style.opacity='0';setTimeout(()=>{el.textContent=msg;el.style.opacity='1';},120);}
function setWinDisplay(amount,hasWin){const el=document.getElementById('win-display');el.textContent='$'+amount.toFixed(2);el.classList.toggle('has-win',hasWin&&amount>0);}
function updateHUD(){document.getElementById('balance').textContent='$'+balance.toFixed(2);document.getElementById('spin-count').textContent=spinCount;}

// BONUS
function openBonus(){
  picksLeft=3;bonusPicks=[];chestVals=[...CHEST_POOL].sort(()=>Math.random()-0.5);
  const grid=document.getElementById('chest-grid');grid.innerHTML='';
  chestVals.forEach(val=>{
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
  spawnParticles(payout*2);spawnDelta(payout,true);
}
function closeBonus(){
  document.getElementById('bonus-overlay').classList.add('hidden');
  const total=bonusPicks.reduce((a,b)=>a+b,0);
  setWinDisplay(total*BET,true);
  setMessage(`Treasure secured. $${(total*BET).toFixed(2)} added to your hold.`);
  renderProbRows();
}

// CONTROLS
function resetGame(){
  balance=5.00;spinCount=0;isSpinning=false;
  winCounts={'3D':0,'3C':0,'3W':0,'3M':0,'2W':0,'2M':0,'BON':0};
  updateHUD();setWinDisplay(0,false);setMessage('New voyage. Press SPIN to set sail.');
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id=>
    setTile(id,'B',id.includes('mid')?'on-line':'off-line'));
  renderProbRows();
}
function togglePaytable(){document.getElementById('paytable').classList.toggle('hidden');}

// Press B to force bonus for demo/walkthrough
document.addEventListener('keydown',e=>{if((e.key==='b'||e.key==='B')&&!isSpinning)openBonus();});

window.onload=()=>{
  updateHUD();setWinDisplay(0,false);
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id=>
    setTile(id,'B',id.includes('mid')?'on-line':'off-line'));
  buildProbPanel();
};