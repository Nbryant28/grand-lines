// Grand Line Reels - Game Logic
// Reads paytable and reel strips from config.json

const REEL = ['M','M','M','M','M','M','W','W','W','W','W','C','C','C','C','D','D','S','S','B','B','B'];

const PAYTABLE = {
  '3M': 8, '3W': 15, '3C': 40, '3D': 45, '2M': 3, '2W': 3
};

const CHEST_POOL = [2,2,2,2,3,3,3,5,5];

const SYMBOL_META = {
  M: { label: 'MEAT',   cls: 'meat',   icon: '🍖' },
  W: { label: 'WANTED', cls: 'wanted', icon: '📜' },
  C: { label: 'CHEST',  cls: 'chest',  icon: '💰' },
  D: { label: 'DEVIL',  cls: 'devil',  icon: '🍇' },
  S: { label: 'HAT',    cls: 'hat',    icon: '🎩' },
  B: { label: '',        cls: 'blank',  icon: '' },
};

const BET = 0.01;
let balance = 5.00;
let spinCount = 0;
let isSpinning = false;
let picksRemaining = 0;
let bonusPicks = [];
let chestValues = [];

function randStop() {
  return Math.floor(Math.random() * REEL.length);
}

function getThreeStops() {
  return [randStop(), randStop(), randStop()];
}

function setTile(id, symbol) {
  const el = document.getElementById(id);
  const meta = SYMBOL_META[symbol];
  el.className = 'symbol-tile' + (id.includes('mid') ? ' payline' : '');
  if (meta.cls !== 'blank') el.classList.add(meta.cls);
  el.innerHTML = `${meta.icon}<span class="sym-label">${meta.label}</span>`;
}

function flashWin(positions) {
  positions.forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('win-flash');
    setTimeout(() => el.classList.remove('win-flash'), 700);
  });
}

function dimNearMiss(midIds, winIds) {
  midIds.forEach(id => {
    if (!winIds.includes(id)) {
      document.getElementById(id).classList.add('near-miss');
      setTimeout(() => document.getElementById(id).classList.remove('near-miss'), 1200);
    }
  });
}

function setMessage(msg) {
  document.getElementById('message').textContent = msg;
}

function updateStats(win) {
  document.getElementById('balance').textContent = '$' + balance.toFixed(2);
  document.getElementById('win-display').textContent = '$' + win.toFixed(2);
  document.getElementById('spin-count').textContent = spinCount;
}

function checkWin(s0, s1, s2) {
  // Bonus trigger
  if (s0 === 'S' && s1 === 'S' && s2 === 'S') return { type: 'bonus', mult: 0 };
  // Three of a kind
  if (s0 === s1 && s1 === s2 && s0 !== 'B') {
    const key = '3' + s0;
    if (PAYTABLE[key]) return { type: 'win', mult: PAYTABLE[key], key };
  }
  // Two of a kind (reels 1 and 2)
  if (s0 === s1 && s0 !== 'B' && s2 !== s0) {
    const key = '2' + s0;
    if (PAYTABLE[key]) return { type: 'win', mult: PAYTABLE[key], key };
  }
  return { type: 'loss', mult: 0 };
}

function doSpinAnimation(callback) {
  const allTiles = [
    'r0-top','r0-mid','r0-bot',
    'r1-top','r1-mid','r1-bot',
    'r2-top','r2-mid','r2-bot'
  ];
  allTiles.forEach(id => document.getElementById(id).classList.add('spinning'));

  let ticks = 0;
  const interval = setInterval(() => {
    // Randomize display during spin
    ['r0-top','r0-mid','r0-bot'].forEach(id => setTile(id, REEL[randStop()]));
    ['r1-top','r1-mid','r1-bot'].forEach(id => setTile(id, REEL[randStop()]));
    ['r2-top','r2-mid','r2-bot'].forEach(id => setTile(id, REEL[randStop()]));
    ticks++;
    if (ticks >= 10) {
      clearInterval(interval);
      allTiles.forEach(id => document.getElementById(id).classList.remove('spinning'));
      callback();
    }
  }, 80);
}

function spin() {
  if (isSpinning) return;
  if (balance < BET) {
    setMessage('Out of credits. Press RESET to play again.');
    return;
  }

  isSpinning = true;
  document.getElementById('spin-btn').disabled = true;
  balance -= BET;
  spinCount++;
  setMessage('Spinning...');
  document.getElementById('win-display').textContent = '$0.00';

  const stops = getThreeStops();
  const s = [REEL[stops[0]], REEL[stops[1]], REEL[stops[2]]];

  doSpinAnimation(() => {
    // Set final payline row
    setTile('r0-mid', s[0]);
    setTile('r1-mid', s[1]);
    setTile('r2-mid', s[2]);

    // Set top and bottom rows for visual context
    const t = getThreeStops();
    const b = getThreeStops();
    setTile('r0-top', REEL[t[0]]); setTile('r1-top', REEL[t[1]]); setTile('r2-top', REEL[t[2]]);
    setTile('r0-bot', REEL[b[0]]); setTile('r1-bot', REEL[b[1]]); setTile('r2-bot', REEL[b[2]]);

    const result = checkWin(s[0], s[1], s[2]);

    if (result.type === 'bonus') {
      balance += 0;
      updateStats(0);
      setMessage('THREE STRAW HATS! Treasure Hunt triggered!');
      flashWin(['r0-mid','r1-mid','r2-mid']);
      setTimeout(() => openBonus(), 900);

    } else if (result.type === 'win') {
      const win = result.mult * BET;
      balance += win;
      updateStats(win);

      const msgs = {
        '3M': `Three Meat! +$${win.toFixed(2)}`,
        '3W': `Three Wanted Posters! +$${win.toFixed(2)}`,
        '3C': `Three Treasure Chests! +$${win.toFixed(2)}`,
        '3D': `Devil Fruit! +$${win.toFixed(2)}`,
        '2M': `Two Meat! +$${win.toFixed(2)}`,
        '2W': `Two Wanted Posters! +$${win.toFixed(2)}`,
      };
      setMessage(msgs[result.key] || `Win! +$${win.toFixed(2)}`);
      flashWin(['r0-mid','r1-mid','r2-mid']);

    } else {
      updateStats(0);
      // Near miss: check if winning symbols appeared off-payline
      const offLine = [
        REEL[t[0]], REEL[t[1]], REEL[t[2]],
        REEL[b[0]], REEL[b[1]], REEL[b[2]]
      ];
      const nearMissSymbols = ['M','W','C','D','S'];
      const hasNearMiss = nearMissSymbols.some(sym =>
        offLine.filter(x => x === sym).length >= 2
      );
      if (hasNearMiss) {
        setMessage('So close... try again.');
      } else {
        const lossMessages = [
          'The sea is quiet...',
          'No treasure this time.',
          'Press on, crew.',
          'The Grand Line gives nothing freely.',
          'Keep sailing.',
        ];
        setMessage(lossMessages[spinCount % lossMessages.length]);
      }
    }

    if (balance <= 0) {
      setMessage('Bankroll depleted. Press RESET to play again.');
    }

    isSpinning = false;
    document.getElementById('spin-btn').disabled = false;
    document.getElementById('balance').textContent = '$' + balance.toFixed(2);
  });
}

function openBonus() {
  picksRemaining = 3;
  bonusPicks = [];

  // Shuffle chest pool
  chestValues = [...CHEST_POOL].sort(() => Math.random() - 0.5);

  const grid = document.getElementById('chest-grid');
  grid.innerHTML = '';
  chestValues.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.className = 'chest-btn';
    btn.textContent = '💰';
    btn.dataset.index = i;
    btn.dataset.value = val;
    btn.onclick = () => pickChest(btn, val, i);
    grid.appendChild(btn);
  });

  document.getElementById('bonus-instruction').textContent =
    'Three Straw Hats! Pick 3 chests to reveal your treasure.';
  document.getElementById('bonus-total').classList.add('hidden');
  document.getElementById('bonus-close').classList.add('hidden');
  document.getElementById('bonus-overlay').classList.remove('hidden');
}

function pickChest(btn, val, idx) {
  if (picksRemaining <= 0) return;
  picksRemaining--;
  bonusPicks.push(val);

  btn.disabled = true;
  btn.textContent = val + 'x';
  btn.classList.remove('chest-btn');
  btn.classList.add('chest-btn', `revealed-${val}`);

  const remaining = 3 - picksRemaining;
  document.getElementById('bonus-instruction').textContent =
    picksRemaining > 0
      ? `Nice! Pick ${picksRemaining} more chest${picksRemaining > 1 ? 's' : ''}.`
      : 'All picks made! Revealing the rest...';

  if (picksRemaining === 0) {
    setTimeout(() => revealAllChests(), 400);
  }
}

function revealAllChests() {
  const buttons = document.querySelectorAll('.chest-btn');
  buttons.forEach(btn => {
    if (!btn.disabled) {
      const val = parseInt(btn.dataset.value);
      btn.disabled = true;
      btn.textContent = val + 'x';
      btn.classList.add(`revealed-${val}`, 'unselected');
    }
  });

  const total = bonusPicks.reduce((a, b) => a + b, 0);
  const payout = total * BET;
  balance += payout;

  document.getElementById('balance').textContent = '$' + balance.toFixed(2);
  document.getElementById('bonus-total').textContent =
    `Total: ${total}x multiplier = +$${payout.toFixed(2)}`;
  document.getElementById('bonus-total').classList.remove('hidden');
  document.getElementById('bonus-close').classList.remove('hidden');
  document.getElementById('bonus-instruction').textContent =
    `You found $${payout.toFixed(2)} in treasure!`;
}

function closeBonus() {
  document.getElementById('bonus-overlay').classList.add('hidden');
  setMessage('Treasure secured. Back to the Grand Line.');
  updateStats(bonusPicks.reduce((a,b) => a+b, 0) * BET);
}

function maxBet() {
  setMessage('Single bet only on this voyage. $0.01 per spin.');
}

function resetGame() {
  balance = 5.00;
  spinCount = 0;
  isSpinning = false;
  updateStats(0);
  setMessage('New voyage started. Press SPIN to set sail.');
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id => {
    const el = document.getElementById(id);
    el.className = 'symbol-tile' + (id.includes('mid') ? ' payline' : '');
    el.innerHTML = '';
  });
}

// Initialize display
window.onload = () => {
  updateStats(0);
  ['r0-top','r0-mid','r0-bot','r1-top','r1-mid','r1-bot','r2-top','r2-mid','r2-bot'].forEach(id => {
    setTile(id, 'B');
  });
};