const REEL=['M','M','M','M','M','M','W','W','W','W','W','C','C','C','C','D','D','S','S','B','B','B'];
const PAYTABLE={'3M':8,'3W':15,'3C':40,'3D':45,'2M':3,'2W':3};
const CHEST_POOL=[2,2,2,2,3,3,3,5,5];
const DENOM=1.00;
const BET_LEVELS=[1,3,5];
let currentBetLevel=0;
let BET=DENOM*BET_LEVELS[currentBetLevel];

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

const WIN_TIERS={
  tier1:{keys:['2M','2W'],particles:6,shake:false,banner:false,flashIntensity:0.05},
  tier2:{keys:['3M','3W'],particles:15,shake:false,banner:true,flashIntensity:0.12},
  tier3:{keys:['3C','3D'],particles:30,shake:true,banner:true,flashIntensity:0.25},
  tier4:{keys:['bonus'],particles:50,shake:true,banner:true,flashIntensity:0.4},
};

function getWinTier(key){
  for(const[tier,data] of Object.entries(WIN_TIERS)){
    if(data.keys.includes(key))return{tier,data};
  }
  return null;
}

let balance=100.00,spinCount=0,isSpinning=false,picksLeft=0,bonusPicks=[],chestVals=[];
let winCounts={'3D':0,'3C':0,'3W':0,'3M':0,'2W':0,'2M':0,'BON':0};
let lightningInterval=null;

// ── LIGHTNING BOLT IDLE ──────────────────────────────────────────────────────
function spawnLightningBolt(){
  const btn=document.getElementById('spin-btn');
  if(!btn||isSpinning)return;
  const rect=btn.getBoundingClientRect();
  const cx=rect.left+rect.width/2;
  const cy=rect.top+rect.height/2;
  const count=3+Math.floor(Math.random()*3);
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      const bolt=document.createElement('div');
      bolt.className='lightning-bolt';
      const angle=Math.random()*Math.PI*2;
      const dist=60+Math.random()*40;
      const tx=Math.cos(angle)*dist;
      const ty=Math.sin(angle)*dist;
      const size=8+Math.random()*12;
      bolt.style.cssText=`
        left:${cx}px;top:${cy}px;
        width:${size}px;height:2px;
        --tx:${tx}px;--ty:${ty}px;
        transform:rotate(${angle}rad);
        transform-origin:left center;
      `;
      document.getElementById('particle-container').appendChild(bolt);
      setTimeout(()=>bolt.remove(),400);
    },i*60);
  }
}

function startLightningIdle(){
  if(lightningInterval)clearInterval(lightningInterval);
  lightningInterval=setInterval(()=>{
    if(!isSpinning)spawnLightningBolt();
  },2200);
}

function stopLightningIdle(){
  if(lightningInterval){clearInterval(lightningInterval);lightningInterval=null;}
}

// ── ONBOARDING ───────────────────────────────────────────────────────────────
const ONBOARDING_STEPS=[
  {title:'The Grand Line Awaits',text:'Welcome to Grand Line Reels. A One Piece themed slot machine. Let us show you how to play.',highlight:null},
  {title:'The Reels',text:'These are your three reels. Each spins independently and lands on a random symbol. Every spin is a new chance.',highlight:'reel-frame'},
  {title:'The Payline',text:'Only the middle row pays. The gold line marks it. Match symbols across all three reels on this line to win.',highlight:'reels-wrapper'},
  {title:'Symbol Values',text:'Meat and Wanted Posters are common. Treasure Chests and Devil Fruits are rare and pay more. The Straw Hat is special.',highlight:'paytable'},
  {title:'The Odds Viewer',text:'Three Straw Hats anywhere triggers the Treasure Hunt bonus. The odds viewer tracks your live session stats.',highlight:'prob-panel'},
  {title:'Set Your Bet',text:'Choose $1, $3, or $5 per spin. Higher bets mean bigger wins. You start with $100. Good luck, pirate.',highlight:'bet-selector'},
];

let onboardingStep=0;
let spotlightRect=null;

function startOnboarding(){
  onboardingStep=0;
  document.getElementById('onboarding-overlay').classList.remove('hidden');
  renderOnboardingStep();
}

function renderOnboardingStep(){
  const step=ONBOARDING_STEPS[onboardingStep];
  const total=ONBOARDING_STEPS.length;

  document.getElementById('ob-title').textContent=step.title;
  document.getElementById('ob-text').textContent=step.text;
  document.getElementById('ob-step').textContent=`${onboardingStep+1} of ${total}`;
  document.getElementById('ob-prev').style.opacity=onboardingStep===0?'0.3':'1';
  document.getElementById('ob-prev').disabled=onboardingStep===0;
  document.getElementById('ob-next').textContent=
    onboardingStep===total-1?'⚓ START SAILING':'NEXT →';

  const dots=document.getElementById('ob-dots');
  dots.innerHTML=ONBOARDING_STEPS.map((_,i)=>
    `<div class="ob-dot ${i===onboardingStep?'ob-dot-active':''}"></div>`
  ).join('');

  // Update spotlight
  updateSpotlight(step.highlight);
}

function updateSpotlight(highlightId){
  const canvas=document.getElementById('spotlight-canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(!highlightId){
    // No highlight: full dark overlay
    ctx.fillStyle='rgba(6,13,26,0.82)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    return;
  }

  const el=document.getElementById(highlightId);
  if(!el){
    ctx.fillStyle='rgba(6,13,26,0.82)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    return;
  }

  const rect=el.getBoundingClientRect();
  const pad=20;
  const x=rect.left-pad;
  const y=rect.top-pad;
  const w=rect.width+pad*2;
  const h=rect.height+pad*2;
  const r=16;

  // Dark overlay
  ctx.fillStyle='rgba(6,13,26,0.88)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Cut out spotlight hole using composite operation
  ctx.globalCompositeOperation='destination-out';
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
  ctx.fill();

  // Reset composite and draw gold border glow around spotlight
  ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle='rgba(201,151,58,0.8)';
  ctx.lineWidth=2;
  ctx.shadowColor='rgba(201,151,58,0.6)';
  ctx.shadowBlur=16;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
  ctx.stroke();

  // Position the modal below or beside the spotlight
  positionModal(rect,pad);
}

function positionModal(targetRect,pad){
  const modal=document.getElementById('onboarding-modal');
  const modalH=modal.offsetHeight||200;
  const modalW=modal.offsetWidth||400;
  const vp={w:window.innerWidth,h:window.innerHeight};

  // Try below first
  let top=targetRect.bottom+pad+20;
  let left=targetRect.left+(targetRect.width/2)-(modalW/2);

  // If below goes off screen, try above
  if(top+modalH>vp.h-20){
    top=targetRect.top-pad-modalH-20;
  }

  // If above goes off screen, center vertically
  if(top<20){
    top=vp.h/2-modalH/2;
  }

  // Clamp left
  left=Math.max(16,Math.min(left,vp.w-modalW-16));

  modal.style.position='fixed';
  modal.style.top=top+'px';
  modal.style.left=left+'px';
  modal.style.transform='none';
}

function nextOnboardingStep(){
  if(onboardingStep>=ONBOARDING_STEPS.length-1){
    closeOnboarding();
  }else{
    onboardingStep++;
    renderOnboardingStep();
  }
}

function prevOnboardingStep(){
  if(onboardingStep>0){
    onboardingStep--;
    renderOnboardingStep();
  }
}

function closeOnboarding(){
  document.getElementById('onboarding-overlay').classList.add('hidden');
  document.getElementById('paytable').classList.remove('hidden');
  setTimeout(()=>document.getElementById('paytable').classList.add('hidden'),3000);
}

// ── OCEAN CANVAS ─────────────────────────────────────────────────────────────
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

// ── PROBABILITY PANEL ────────────────────────────────────────────────────────
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

// ── BET SELECTOR ─────────────────────────────────────────────────────────────
function setBet(level){
  if(isSpinning)return;
  currentBetLevel=level;
  BET=DENOM*BET_LEVELS[level];
  document.querySelectorAll('.bet-btn').forEach((b,i)=>{
    b.classList.toggle('bet-active',i===level);
  });
  document.getElementById('bet-display').textContent='$'+BET.toFixed(2);
  renderProbRows();
}

// ── FLOATING DELTA ───────────────────────────────────────────────────────────
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

// ── WIN BANNER ───────────────────────────────────────────────────────────────
function showWinBanner(amount,key){
  const existing=document.getElementById('win-banner');
  if(existing)existing.remove();
  const tier=getWinTier(key);
  const tierNum=tier?tier.tier:'tier1';
  const label=tierNum==='tier3'?'BIG WIN':tierNum==='tier4'?'BONUS WIN':tierNum==='tier2'?'WIN':'';
  if(!label)return;
  const banner=document.createElement('div');
  banner.id='win-banner';
  banner.className=`win-banner win-banner-${tierNum}`;
  banner.innerHTML=`<div class="wb-label">${label}</div><div class="wb-amount">$${amount.toFixed(2)}</div>`;
  document.getElementById('game-area').appendChild(banner);
  setTimeout(()=>{
    banner.classList.add('wb-fade');
    setTimeout(()=>banner.remove(),600);
  },tierNum==='tier3'||tierNum==='tier4'?2000:1200);
}

// ── TILE RENDERING ───────────────────────────────────────────────────────────
function setTile(id,sym,lineClass){
  const el=document.getElementById(id);
  const meta=META[sym];
  el.className='symbol-tile '+(lineClass||'off-line');
  if(meta.cls!=='blank')el.classList.add(meta.cls);
  el.innerHTML=meta.emoji?`<span class="sym-emoji">${meta.emoji}</span><span class="sym-name">${meta.name}</span>`:'';
}
function randSym(){return REEL[Math.floor(Math.random()*REEL.length)];}

// ── SPIN ─────────────────────────────────────────────────────────────────────
function spin(){
  if(isSpinning)return;
  if(balance<BET){setMessage('No credits remain. Press RESET to sail again.');return;}
  isSpinning=true;
  stopLightningIdle();
  document.getElementById('spin-btn').disabled=true;
  document.getElementById('spin-btn').classList.add('spinning-active');
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
    document.getElementById('spin-btn').classList.remove('spinning-active');
    startLightningIdle();
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

// ── EVALUATION ───────────────────────────────────────────────────────────────
function evaluateSpin(payline,top,bot){
  const[s0,s1,s2]=payline;
  const midIds=['r0-mid','r1-mid','r2-mid'];

  if(s0==='S'&&s1==='S'&&s2==='S'){
    winCounts['BON']++;updateHUD();setWinDisplay(0,false);
    pulseWinTiles(midIds,'hat','tier4');
    setMessage('THREE STRAW HATS — Treasure Hunt triggered!');
    triggerWinEffects('bonus',0,midIds,'hat');
    renderProbRows();
    setTimeout(()=>openBonus(),1200);return;
  }
  if(s0!=='B'&&s0===s1&&s1===s2){
    const key='3'+s0,mult=PAYTABLE[key];
    if(mult){
      const win=mult*BET;balance+=win;
      if(winCounts[key]!==undefined)winCounts[key]++;
      setWinDisplay(win,true);updateHUD();spawnDelta(win,true);
      const msgs=WIN_MESSAGES[key];
      setMessage(msgs[Math.floor(Math.random()*msgs.length)]+`  +$${win.toFixed(2)}`);
      triggerWinEffects(key,win,midIds,META[s0].cls);
      renderProbRows();return;
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
      triggerWinEffects(key,win,['r0-mid','r1-mid'],META[s0].cls);
      renderProbRows();return;
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

// ── TIERED WIN EFFECTS ───────────────────────────────────────────────────────
function triggerWinEffects(key,win,tileIds,cls){
  const tierInfo=getWinTier(key==='bonus'?'bonus':key);
  if(!tierInfo)return;
  const{tier,data}=tierInfo;
  pulseWinTiles(tileIds,cls,tier);
  spawnParticles(data.particles,tier);
  screenFlash(data.flashIntensity,tier);
  if(data.shake){
    document.getElementById('reel-frame').classList.add('screen-shake');
    setTimeout(()=>document.getElementById('reel-frame').classList.remove('screen-shake'),600);
  }
  if(data.banner&&key!=='bonus')showWinBanner(win,key);
}

function pulseWinTiles(ids,cls,tier){
  ids.forEach(id=>{
    const el=document.getElementById(id);
    el.classList.add('win-tile',`win-glow-${tier}`,cls);
    const duration=tier==='tier3'||tier==='tier4'?1200:700;
    setTimeout(()=>{
      el.classList.remove('win-tile');
      setTimeout(()=>el.classList.remove(`win-glow-${tier}`,cls),800);
    },duration);
  });
}

function screenFlash(intensity,tier){
  const flash=document.getElementById('screen-flash');
  flash.style.background=
    tier==='tier4'?`rgba(42,187,168,${intensity})`
    :tier==='tier3'?`rgba(160,60,255,${intensity})`
    :`rgba(201,151,58,${intensity})`;
  flash.classList.remove('flash-active');
  void flash.offsetWidth;
  flash.classList.add('flash-active');
  setTimeout(()=>flash.classList.remove('flash-active'),500);
}

function spawnParticles(count,tier){
  const container=document.getElementById('particle-container');
  const btn=document.getElementById('spin-btn');
  const rect=btn.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const colorSets={
    tier1:['#F0C060','#C9973A'],
    tier2:['#F0C060','#FFE090','#FFFFFF'],
    tier3:['#E080FF','#A040C0','#FFE090','#FFFFFF'],
    tier4:['#2ABBA8','#60FFEE','#FFE090','#FFFFFF'],
  };
  const colors=colorSets[tier]||colorSets.tier1;
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    const size=tier==='tier3'||tier==='tier4'?6+Math.random()*8:3+Math.random()*5;
    const angle=Math.random()*Math.PI*2;
    const dist=(tier==='tier3'||tier==='tier4'?120:80)+Math.random()*200;
    const tx=Math.cos(angle)*dist,ty=Math.sin(angle)*dist-80;
    const dur=0.6+Math.random()*0.8;
    p.className='particle';
    p.style.cssText=`left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};--tx:${tx}px;--ty:${ty}px;--dur:${dur}s;animation-delay:${Math.random()*0.2}s;`;
    container.appendChild(p);setTimeout(()=>p.remove(),(dur+0.3)*1000);
  }
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function setMessage(msg){const el=document.getElementById('message');el.style.opacity='0';setTimeout(()=>{el.textContent=msg;el.style.opacity='1';},120);}
function setWinDisplay(amount,hasWin){const el=document.getElementById('win-display');el.textContent='$'+amount.toFixed(2);el.classList.toggle('has-win',hasWin&&amount>0);}
function updateHUD(){document.getElementById('balance').textContent='$'+balance.toFixed(2);document.getElementById('spin-count').textContent=spinCount;}

// ── BONUS ────────────────────────────────────────────────────────────────────
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
  spawnParticles(50,'tier4');spawnDelta(payout,true);
  showWinBanner(payout,'bonus');
}
function closeBonus(){
  document.getElementById('bonus-overlay').classList.add('hidden');
  const total=bonusPicks.reduce((a,b)=>a+b,0);
  setWinDisplay(total*BET,true);
  setMessage(`Treasure secured. $${(total*BET).toFixed(2)} added to your hold.`);
  renderProbRows();
}

// ── CONTROLS ─────────────────────────────────────────────────────────────────
function resetGame(){
  balance=100.00;spinCount=0;isSpinning=false;
  BET=DENOM*BET_LEVELS[currentBetLevel];
  winCounts={'3D':0,'3C':0,'3W':0,'3M':0,'2W':0,'2M':0,'BON':0};
  updateHUD();setWinDisplay(0,false);setMessage('New voyage. Press SPIN to set sail.');
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id=>
    setTile(id,'B',id.includes('mid')?'on-line':'off-line'));
  renderProbRows();
}
function togglePaytable(){document.getElementById('paytable').classList.toggle('hidden');}

document.addEventListener('keydown',e=>{if((e.key==='b'||e.key==='B')&&!isSpinning)openBonus();});
window.addEventListener('resize',()=>{
  if(!document.getElementById('onboarding-overlay').classList.contains('hidden')){
    renderOnboardingStep();
  }
});

window.onload=()=>{
  updateHUD();setWinDisplay(0,false);
  document.getElementById('bet-display').textContent='$'+BET.toFixed(2);
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id=>
    setTile(id,'B',id.includes('mid')?'on-line':'off-line'));
  buildProbPanel();
  startLightningIdle();
  setTimeout(()=>startOnboarding(),800);
};