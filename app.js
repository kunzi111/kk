'use strict';
// 共享行为：粒子画面 + Agent 演示对话。主题固定为深色，不再做切换。
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('.orbit-canvas').forEach(canvas => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.replaceWith(Object.assign(document.createElement('p'), { textContent: '当前浏览器不支持交互画面。' }));
    return;
  }
  const staticScene = canvas.dataset.static === 'true';
  let width = 1, height = 1, frame = 0, last = 0;
  let turn = .28, paused = reduced.matches, visible = true, shape = 'torus';
  let pointerX = 0, pointerY = 0;
  const shapes = ['torus', 'sphere', 'wave'];
  const names = { torus: '环面', sphere: '星球', wave: '波浪' };
  const samples = [];
  for (let i = 0; i < 108; i++) for (let j = 0; j < 46; j++) samples.push([i / 108 * Math.PI * 2, j / 46 * Math.PI * 2]);

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width * .235, height * .285);
    const tilt = .8 + pointerY;
    const rot = turn + pointerX;
    const projected = [];
    for (const [a, b] of samples) {
      let x, y, z;
      if (shape === 'sphere') { x = Math.cos(a) * Math.sin(b) * 1.65; y = Math.cos(b) * 1.65; z = Math.sin(a) * Math.sin(b) * 1.65; }
      else if (shape === 'wave') { x = (a / Math.PI - 1) * 2; z = (b / Math.PI - 1) * 1.6; y = Math.sin(x * 2 + turn * 2) * .36 + Math.cos(z * 2 + turn) * .28; }
      else { x = (1.22 + .58 * Math.cos(b)) * Math.cos(a); y = .58 * Math.sin(b); z = (1.22 + .58 * Math.cos(b)) * Math.sin(a); }
      const rx = x * Math.cos(rot) - z * Math.sin(rot), rz = x * Math.sin(rot) + z * Math.cos(rot);
      const ry = y * Math.cos(tilt) - rz * Math.sin(tilt), depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
      const zoom = 5.8 / (5.8 + depth), angle = -.48;
      projected.push({
        x: width / 2 + (rx * Math.cos(angle) - ry * Math.sin(angle)) * scale * zoom,
        y: height * .48 + (rx * Math.sin(angle) + ry * Math.cos(angle)) * scale * zoom,
        z: depth, r: zoom, b
      });
    }
    projected.sort((a, b) => b.z - a.z);
    for (const p of projected) {
      const alpha = Math.max(.13, Math.min(1, .65 - p.z * .24));
      const shine = Math.round(190 + 50 * Math.cos(p.b));
      ctx.fillStyle = `rgba(${shine - 50},${shine - 15},255,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(.55, 1.22 * p.r), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    width = r.width; height = r.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function tick(now) {
    frame = 0;
    if (paused || reduced.matches || staticScene || !visible || document.hidden) return;
    turn += Math.min(now - (last || now), 40) * .00016;
    last = now;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (!paused && !reduced.matches && !staticScene && visible && !document.hidden) frame = requestAnimationFrame(tick);
    document.querySelectorAll('.pause').forEach(b => {
      b.textContent = reduced.matches ? '静态模式' : paused ? '播放' : '暂停';
      b.disabled = reduced.matches;
      b.setAttribute('aria-pressed', String(paused || reduced.matches));
    });
  }

  function select(next) {
    shape = next;
    document.querySelectorAll('[data-shape]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shape === shape)));
    canvas.setAttribute('aria-label', `蓝色粒子${names[shape]}雕塑`);
    draw();
  }

  if (!staticScene) {
    document.querySelectorAll('.pause').forEach(b => b.addEventListener('click', () => { paused = !paused; sync(); }));
    document.querySelectorAll('[data-shape]').forEach(b => b.addEventListener('click', () => select(b.dataset.shape)));
    document.querySelector('.shape-cycle')?.addEventListener('click',
      () => select(shapes[(shapes.indexOf(shape) + 1) % shapes.length]));
    canvas.addEventListener('pointermove', e => {
      if (paused || reduced.matches || e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      pointerX = (e.clientX - r.left - r.width / 2) / r.width * .5;
      pointerY = (e.clientY - r.top - r.height / 2) / r.height * .35;
    });
    canvas.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
    reduced.addEventListener('change', e => { paused = e.matches; pointerX = pointerY = 0; draw(); sync(); });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(canvas);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  sync();
});

// 把这里换成你自己的服务端接口即可。模型密钥与工具执行永远留在服务端。
const demoAgent = {
  async reply(text) {
    if (/网站|主页|介绍/.test(text)) return '这是 Kunzi 的个人空间。作品页可以体验 Orbit 形态实验，关于页可以认识站主。这里的 Agent 目前只是交互演示。';
    if (/未来|能做|计划|agent|智能体/i.test(text)) return '未来计划接入 Kunzi 自己的 Agent，逐步连接个人知识与工具。具体能力还未确定，现在不会执行任务或调用 AI。';
    if (/你好|hello|嗨/i.test(text)) return '你好！你可以试试问我「介绍这个网站」或「未来你能做什么？」。现在的回复是本地预设。';
    return '收到。目前是预设回复演示，还不能回答实际问题。接入自己的 Agent 后，就可以在这里真正对话了。';
  }
};

const form = document.querySelector('#chat-form');
if (form) {
  const input = document.querySelector('#message-input');
  const messages = document.querySelector('#messages');
  const welcome = document.querySelector('#chat-welcome');
  const send = document.querySelector('.send');
  let busy = false, version = 0;

  function add(text, role) {
    welcome.hidden = true;
    messages.hidden = false;
    const item = document.createElement('div');
    item.className = `message ${role}`;
    if (role === 'assistant') {
      const label = document.createElement('span');
      label.className = 'message-label';
      label.textContent = 'Kunzi 的 Agent';
      item.append(label);
    }
    const p = document.createElement('p');
    p.textContent = text;
    item.append(p);
    messages.append(item);
    while (messages.children.length > 40) messages.firstElementChild.remove();
    messages.scrollTop = messages.scrollHeight;
  }

  async function submit(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true;
    const current = version;
    add(text.slice(0, 1000), 'user');
    input.value = '';
    input.style.height = '';
    try {
      const answer = await demoAgent.reply(text);
      if (current === version) add(answer, 'assistant');
    } catch {
      if (current === version) add('暂时没有得到回复，请再试一次。', 'assistant');
    } finally {
      busy = false; send.disabled = false;
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); submit(input.value); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(input.value); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  });
  document.querySelectorAll('[data-prompt]').forEach(b => b.addEventListener('click', () => submit(b.dataset.prompt)));
  document.querySelector('#reset-chat')?.addEventListener('click', () => {
    version++;
    messages.replaceChildren();
    messages.hidden = true;
    welcome.hidden = false;
    input.value = '';
    input.style.height = '';
    input.focus();
  });
}

// 滚动进入
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (reduced.matches) { items.forEach(i => i.classList.add('in')); return; }
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: .12 });
  items.forEach(i => io.observe(i));
})();
