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
var COLORS = ['#fef08a','#bae6fd','#fecdd3','#ddd6fe','#bbf7d0','#fed7aa','#fbcfe8','#e0e7ff'];
var bubbles = [];
var particles = [];
var lastTime = performance.now();
var COUNT = 12;
var DRAGON = '🐲';
var MOUSE = '🐭';
function emojiFor(t) {
  if (t === 'dragon') return DRAGON;
  if (t === 'mouse') return MOUSE;
  return '';
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
  var o = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  o.type = 'sine';
  var base = big ? rand(500, 700) : rand(700, 1100);
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 1.8, t + 0.08);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.2);
}
function spawnBubble(fromCenter) {
  var r = rand(28, 62);
  var roll = Math.random();
  var type = 'normal';
  if (roll > 0.9) type = 'dragon';
  else if (roll > 0.7) type = 'mouse';
  var x, y, alpha;
  if (fromCenter) {
    // Replenish: pop in at the center with fade-in, then float up.
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
  bubbles.push({
    x: x,
    y: y,
    r: r, vy: -(rand(25, 55) + (60 - r) * 0.6),
    ph: rand(0, 6.28), sp: rand(1.2, 2.8), amp: rand(8, 26),
    type: type, color: pick(COLORS), alpha: alpha
  });
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
      burst(b.x, b.y, b.color, b.type === 'normal' ? 12 : 22);
      popSound(b.type === 'dragon');
      if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) {} }
      spawnBubble(true);
      return true;
    }
  }
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
  var g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, b.color);
  g.addColorStop(1, shade(b.color));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, 6.2832);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.42, b.r * 0.22, b.r * 0.13, -0.5, 0, 6.2832);
  ctx.fill();
  var face = emojiFor(b.type);
  if (face !== '') {
    var pulse = 1 + Math.sin(now / 300 + b.ph) * 0.08;
    ctx.font = Math.floor(b.r * 1.05 * pulse) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, b.x, b.y + b.r * 0.08);
    if (b.type === 'dragon') {
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
  if (bubbles.length < COUNT && Math.random() < 0.08) spawnBubble(true);
  for (var i = bubbles.length - 1; i >= 0; i--) {
    var b = bubbles[i];
    if (b.alpha < 1) b.alpha = Math.min(1, b.alpha + dt * 2);
    b.ph += b.sp * dt;
    b.y += b.vy * dt;
    b.x += Math.sin(b.ph) * b.amp * dt;
    if (b.x < b.r) b.x = b.r;
    if (b.x > W - b.r) b.x = W - b.r;
    if (b.y < -b.r - 20) { bubbles.splice(i, 1); spawnBubble(true); continue; }
    drawBubble(b, now);
  }
  for (var k = particles.length - 1; k >= 0; k--) {
    var p = particles[k];
    p.life += dt;
    if (p.life >= p.max) { particles.splice(k, 1); continue; }
    p.vy += 420 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    var f = 1 - p.life / p.max;
    ctx.globalAlpha = f;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sz * f + 0.5, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
for (var s = 0; s < COUNT; s++) spawnBubble(false);
requestAnimationFrame(frame);
