var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var W = 0, H = 0;
function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
var COLORS = ['#fef08a','#bae6fd','#fecdd3','#ddd6fe','#bbf7d0','#fed7aa','#fbcfe8','#e0e7ff','#fde68a','#a5f3fc'];
var ANIMALS = ['🐭','🐰','🐸','🐥','🐱','🐼','🦁','🐷','🐶','🦄','🐨','🐵'];
var FUN_WORDS = ['Pop!','Yay!','Wow!','Boop!','Whee!','Fun!','Hello!','Again!','Yummy!','Hooray!'];
var bubbles = [];
var particles = [];
var floaters = [];
var rings = [];
var pops = 0;
var flash = 0;
var lastTime = performance.now();
var COUNT = 14;
var DRAGON = '🐲';
function emojiFor(t) {
  return t || '';
}

var audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
}
function popSound(big) {
  if (!audioCtx) return;
  var t = audioCtx.currentTime;
  // Cheerful two-note giggle: pitch jumps up, then sparkles.
  var notes = big ? [rand(450, 550), rand(750, 950)] : [rand(650, 900), rand(1100, 1500)];
  for (var n = 0; n < 2; n++) {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = n === 0 ? 'sine' : 'triangle';
    var base = notes[n];
    var st = t + n * 0.07;
    o.frequency.setValueAtTime(base, st);
    o.frequency.exponentialRampToValueAtTime(base * 1.6, st + 0.08);
    g.gain.setValueAtTime(0.3, st);
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.16);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(st); o.stop(st + 0.18);
  }
}
function spawnBubble(fromCenter) {
  var r = rand(26, 66);
  var roll = Math.random();
  var kind = 'normal';
  var face = '';
  var rainbow = false;
  var star = false;
  if (roll > 0.93) { kind = 'dragon'; face = DRAGON; }
  else if (roll > 0.88) { kind = 'star'; star = true; }
  else if (roll > 0.82) { kind = 'rainbow'; rainbow = true; }
  else if (roll > 0.62) { kind = 'animal'; face = pick(ANIMALS); }
  var x, y, alpha;
  if (fromCenter) {
    // Replenish: pop in at the center with fade-in, then drift in a random direction.
    x = W / 2 + rand(-W * 0.15, W * 0.15);
    y = H / 2 + rand(-H * 0.12, H * 0.12);
    alpha = 0;
  } else {
    // Initial load: scatter around the center band so screen starts full.
    x = rand(W * 0.12 + r, Math.max(W * 0.12 + r + 1, W * 0.88 - r));
    y = rand(H * 0.25, H * 0.75);
    alpha = 1;
  }
  x = Math.min(Math.max(x, r), Math.max(r, W - r));
  y = Math.min(Math.max(y, r), Math.max(r, H - r));
  // Drift in a random direction (not just upward), slower for bigger bubbles.
  var ang = rand(0, 6.2832);
  var speed = rand(20, 55) + (62 - r) * 0.5;
  if (kind === 'star') speed *= 1.5;
  bubbles.push({
    x: x,
    y: y,
    r: r,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    ph: rand(0, 6.28), sp: rand(1.2, 2.8), amp: rand(8, 26),
    kind: kind, face: face, rainbow: rainbow, star: star,
    color: pick(COLORS), alpha: alpha,
    spin: rand(-1.5, 1.5), hue: rand(0, 360)
  });
}
function starBurst(x, y, n) {
  var cols = ['#fef08a', '#fbbf24', '#ffffff', '#fde68a', '#f59e0b'];
  for (var i = 0; i < n; i++) {
    var a = rand(0, 6.283);
    var s = rand(120, 420);
    particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      life: 0, max: rand(0.6, 1.3), sz: rand(4, 10),
      c: pick(cols), star: Math.random() < 0.45, rot: rand(0, 6.28), vr: rand(-6, 6) });
  }
}
function confetti(x, y, n) {
  var cols = ['#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#c084fc','#f472b6'];
  for (var i = 0; i < n; i++) {
    var a = rand(-3.14, 0);
    var s = rand(150, 480);
    particles.push({ x: x, y: y, vx: Math.cos(a) * s + rand(-60, 60), vy: Math.sin(a) * s,
      life: 0, max: rand(0.8, 1.6), sz: rand(4, 9),
      c: pick(cols), conf: true, rot: rand(0, 6.28), vr: rand(-8, 8) });
  }
}
function burst(x, y, color, n) {
  for (var i = 0; i < n; i++) {
    var a = rand(0, 6.283);
    var s = rand(80, 320);
    particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0, max: rand(0.5, 1.1), sz: rand(3, 8), c: Math.random() < 0.25 ? '#ffffff' : color });
  }
}
function popAt(px, py) {
  for (var i = bubbles.length - 1; i >= 0; i--) {
    var b = bubbles[i];
    var dx = px - b.x, dy = py - b.y;
    var hr = b.r + 14;
    if (dx * dx + dy * dy <= hr * hr) {
      bubbles.splice(i, 1);
      pops++;
      var big = (b.kind === 'dragon' || b.kind === 'star' || b.kind === 'rainbow');
      if (b.star) starBurst(b.x, b.y, 26);
      else burst(b.x, b.y, b.color, big ? 22 : 12);
      if (big) confetti(b.x, b.y, 10);
      rings.push({ x: b.x, y: b.y, r: b.r * 0.4, max: b.r * 2.2, life: 0, dur: 0.45, c: b.rainbow ? '#ffffff' : b.color });
      floaters.push({ x: b.x + rand(-10, 10), y: b.y - b.r * 0.4, life: 0, max: rand(0.8, 1.2),
        txt: b.face !== '' ? b.face : pick(FUN_WORDS), sz: b.face !== '' ? b.r * 0.9 : rand(20, 30) });
      flash = Math.min(0.25, flash + 0.08);
      popSound(big);
      if (navigator.vibrate) { try { navigator.vibrate(big ? [30, 30, 30] : 25); } catch (e) {} }
      // Every 10 pops: rainbow celebration + bonus star bubble!
      if (pops % 10 === 0) {
        confetti(W / 2, H * 0.35, 60);
        floaters.push({ x: W / 2, y: H * 0.35, life: 0, max: 1.6, txt: '🎉 Yay! ' + pops + ' pops! 🎉', sz: 30 });
      }
      spawnBubble(true);
      return true;
    }
  }
  // Missed tap: tiny sparkle so every touch feels alive.
  burst(px, py, '#ffffff', 4);
  return false;
}
function onPoint(x, y) { ensureAudio(); popAt(x, y); }
canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); onPoint(e.clientX, e.clientY); }, { passive: false });
canvas.addEventListener('touchstart', function (e) { e.preventDefault(); for (var k = 0; k < e.changedTouches.length; k++) onPoint(e.changedTouches[k].clientX, e.changedTouches[k].clientY); }, { passive: false });
canvas.addEventListener('touchmove', function (e) { e.preventDefault(); for (var k = 0; k < e.changedTouches.length; k++) onPoint(e.changedTouches[k].clientX, e.changedTouches[k].clientY); }, { passive: false });
function shade(hex) {
  var c = parseInt(hex.slice(1), 16);
  var r = Math.max(0, Math.floor(((c >> 16) & 255) * 0.72));
  var g = Math.max(0, Math.floor(((c >> 8) & 255) * 0.72));
  var b2 = Math.max(0, Math.floor((c & 255) * 0.78));
  return 'rgb(' + r + ',' + g + ',' + b2 + ')';
}
function drawBubble(b, now) {
  ctx.save();
  ctx.globalAlpha = b.alpha * 0.92;
  var g;
  if (b.rainbow) {
    g = ctx.createLinearGradient(b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r);
    g.addColorStop(0, '#f87171'); g.addColorStop(0.2, '#fb923c'); g.addColorStop(0.4, '#facc15');
    g.addColorStop(0.6, '#4ade80'); g.addColorStop(0.8, '#60a5fa'); g.addColorStop(1, '#c084fc');
  } else if (b.star) {
    g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#fef08a'); g.addColorStop(1, '#f59e0b');
  } else {
    g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, b.color);
    g.addColorStop(1, shade(b.color));
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, 6.2832);
  ctx.fill();
  ctx.lineWidth = b.star ? 4 : 3;
  ctx.strokeStyle = b.star ? '#fef9c3' : 'rgba(255,255,255,.9)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.42, b.r * 0.22, b.r * 0.13, -0.5, 0, 6.2832);
  ctx.fill();
  if (b.star) {
    // Sparkling star bubble: rotating rays.
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(now / 900 + b.ph);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (var s = 0; s < 5; s++) {
      ctx.rotate(6.2832 / 5);
      ctx.beginPath();
      ctx.moveTo(0, -b.r * 0.75); ctx.lineTo(b.r * 0.16, -b.r * 0.16);
      ctx.lineTo(-b.r * 0.16, -b.r * 0.16); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.font = Math.floor(b.r * 0.55) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⭐', b.x, b.y + b.r * 0.1);
  }
  if (b.rainbow) {
    ctx.font = Math.floor(b.r * 0.7) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌈', b.x, b.y + b.r * 0.08);
  }
  var face = emojiFor(b.face);
  if (face !== '') {
    var pulse = 1 + Math.sin(now / 300 + b.ph) * 0.08;
    ctx.font = Math.floor(b.r * 1.05 * pulse) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, b.x, b.y + b.r * 0.08);
    if (b.kind === 'dragon') {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fde047';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 3, now / 600, now / 600 + 6.2832);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}
function frame(now) {
  var dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  ctx.clearRect(0, 0, W, H);
  if (flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + flash.toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    flash = Math.max(0, flash - dt * 1.2);
  }
  if (bubbles.length < COUNT && Math.random() < 0.08) spawnBubble(true);
  for (var i = bubbles.length - 1; i >= 0; i--) {
    var b = bubbles[i];
    if (b.alpha < 1) b.alpha = Math.min(1, b.alpha + dt * 2);
    b.ph += b.sp * dt;
    b.hue = (b.hue + dt * 40) % 360;
    b.x += (b.vx + Math.cos(b.ph) * b.amp) * dt;
    b.y += (b.vy + Math.sin(b.ph) * b.amp) * dt;
    // Soft-bounce off every edge so bubbles roam in all directions forever.
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
    if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
    drawBubble(b, now);
  }
  for (var k = particles.length - 1; k >= 0; k--) {
    var p = particles[k];
    p.life += dt;
    if (p.life >= p.max) { particles.splice(k, 1); continue; }
    if (p.conf) { p.vy += 700 * dt; p.vx *= (1 - 0.6 * dt); p.rot += p.vr * dt; }
    else if (p.star) { p.vy += 180 * dt; p.rot += p.vr * dt; }
    else { p.vy += 420 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    var f = 1 - p.life / p.max;
    ctx.save();
    ctx.globalAlpha = f;
    ctx.translate(p.x, p.y);
    if (p.conf) {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.sz * f / 2, -p.sz * f / 4, p.sz * f, p.sz * f / 2);
    } else if (p.star) {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      var sz = p.sz * f + 0.5;
      ctx.beginPath();
      for (var sp = 0; sp < 5; sp++) {
        var oa = sp * 6.2832 / 5 - 1.5708;
        var ia = oa + 3.1416 / 5;
        ctx.lineTo(Math.cos(oa) * sz, Math.sin(oa) * sz);
        ctx.lineTo(Math.cos(ia) * sz * 0.45, Math.sin(ia) * sz * 0.45);
      }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(0, 0, p.sz * f + 0.5, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }
  for (var ri = rings.length - 1; ri >= 0; ri--) {
    var rg = rings[ri];
    rg.life += dt;
    if (rg.life >= rg.dur) { rings.splice(ri, 1); continue; }
    var t = rg.life / rg.dur;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.strokeStyle = rg.c;
    ctx.beginPath();
    ctx.arc(rg.x, rg.y, rg.r + (rg.max - rg.r) * t, 0, 6.2832);
    ctx.stroke();
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (var fi = floaters.length - 1; fi >= 0; fi--) {
    var fl = floaters[fi];
    fl.life += dt;
    if (fl.life >= fl.max) { floaters.splice(fi, 1); continue; }
    var ft = fl.life / fl.max;
    ctx.save();
    ctx.globalAlpha = ft < 0.15 ? ft / 0.15 : 1 - (ft - 0.15) / 0.85;
    ctx.font = 'bold ' + Math.floor(fl.sz * (1 + ft * 0.3)) + 'px system-ui, serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(30,27,75,.85)';
    var fy = fl.y - ft * 60;
    ctx.strokeText(fl.txt, fl.x, fy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fl.txt, fl.x, fy);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
for (var s = 0; s < COUNT; s++) spawnBubble(false);
requestAnimationFrame(frame);
