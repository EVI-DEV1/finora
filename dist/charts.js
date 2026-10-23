// Gráficos em SVG puro, sem dependências.
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const clear = node => { while (node.firstChild) node.firstChild.remove(); };
const tip = () => document.getElementById('tip');

export function showTip(html, x, y) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  let left = x + 14, top = y - r.height - 10;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top < 8) top = y + 16;
  t.style.left = left + 'px';
  t.style.top = top + 'px';
}
export function hideTip() { tip().hidden = true; }

/**
 * Fluxo (Sankey de duas colunas): entradas à esquerda, destinos à direita.
 * sources/targets: [{label, value, color}] com somas iguais.
 */
export function flow(host, sources, targets, fmt) {
  clear(host);
  const total = sources.reduce((s, x) => s + x.value, 0);
  if (!total) {
    host.innerHTML = '<div class="flow-empty"><p>Lance uma entrada e alguns gastos para ver o caminho do seu dinheiro.</p></div>';
    return;
  }
  const W = Math.max(host.clientWidth, 300), H = Math.max(host.clientHeight, 200);
  const narrow = W < 560;
  const nodeW = 12, gap = 10;
  const labelW = narrow ? 0 : Math.min(190, W * 0.2);
  const x0 = labelW, x1 = W - labelW - nodeW;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Fluxo do dinheiro no mês' }, host);
  const defs = el('defs', {}, svg);
  const layout = (nodes) => {
    const usable = H - gap * (nodes.length - 1);
    let y = 0;
    return nodes.map(n => { const h = Math.max(2, n.value / total * usable); const r = { ...n, y, h }; y += h + gap; return r; });
  };
  const L = layout(sources), R = layout(targets);
  // Liga os dois empilhamentos na ordem: cada trecho de entrada alimenta o próximo destino disponível.
  let li = 0, ri = 0, lUsed = 0, rUsed = 0, k = 0;
  const links = [];
  while (li < L.length && ri < R.length) {
    const a = L[li], b = R[ri];
    const take = Math.min(a.value - lUsed, b.value - rUsed);
    if (take > 0) {
      links.push({ a, b, ay: a.y + lUsed / a.value * a.h, by: b.y + rUsed / b.value * b.h, ah: take / a.value * a.h, bh: take / b.value * b.h, value: take });
    }
    lUsed += take; rUsed += take;
    if (lUsed >= a.value - 0.5) { li++; lUsed = 0; }
    if (rUsed >= b.value - 0.5) { ri++; rUsed = 0; }
    if (++k > 500) break;
  }
  const g = el('g', {}, svg);
  links.forEach((l, i) => {
    const id = 'fg' + i + Math.random().toString(36).slice(2, 6);
    const lg = el('linearGradient', { id, x1: '0', x2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': l.a.color, 'stop-opacity': '.55' }, lg);
    el('stop', { offset: '1', 'stop-color': l.b.color, 'stop-opacity': '.75' }, lg);
    const sx = x0 + nodeW, ex = x1, mx = (sx + ex) / 2;
    const d = `M${sx},${l.ay} C${mx},${l.ay} ${mx},${l.by} ${ex},${l.by} L${ex},${l.by + l.bh} C${mx},${l.by + l.bh} ${mx},${l.ay + l.ah} ${sx},${l.ay + l.ah} Z`;
    const p = el('path', { d, fill: `url(#${id})`, class: 'ribbon' }, g);
    p.addEventListener('pointermove', e => showTip(`<b>${esc(l.a.label)} → ${esc(l.b.label)}</b>${fmt(l.value)}`, e.clientX, e.clientY));
    p.addEventListener('pointerleave', hideTip);
  });
  const nodes = el('g', {}, svg);
  const drawNode = (n, x, side) => {
    el('rect', { x, y: n.y, width: nodeW, height: n.h, rx: 4, fill: n.color }, nodes);
    if (narrow) {
      if (n.h < 26) return;
      const tx = side === 'l' ? x + nodeW + 8 : x - 8;
      const t = el('text', { x: tx, y: n.y + n.h / 2 - 2, 'text-anchor': side === 'l' ? 'start' : 'end' }, nodes);
      t.textContent = n.label;
      const v = el('text', { x: tx, y: n.y + n.h / 2 + 13, 'text-anchor': side === 'l' ? 'start' : 'end', class: 'val' }, nodes);
      v.textContent = fmt(n.value);
      return;
    }
    if (n.h < 7) return;
    const tx = side === 'l' ? x - 10 : x + nodeW + 10;
    const anchor = side === 'l' ? 'end' : 'start';
    const cy = n.y + n.h / 2;
    const t = el('text', { x: tx, y: n.h > 30 ? cy - 3 : cy + 4, 'text-anchor': anchor }, nodes);
    t.textContent = n.label;
    if (n.h > 30) { const v = el('text', { x: tx, y: cy + 13, 'text-anchor': anchor, class: 'val' }, nodes); v.textContent = fmt(n.value); }
  };
  L.forEach(n => drawNode(n, x0, 'l'));
  R.forEach(n => drawNode(n, x1, 'r'));
}

/** Barras diárias (entradas e saídas) com linha do saldo acumulado. */
export function daily(host, days, mode, fmt, { onHover, onPick, picked, until = days.length } = {}) {
  clear(host);
  const W = Math.max(host.clientWidth, 280), H = Math.max(host.clientHeight, 180);
  const padL = 8, padR = 8, padT = 10, padB = 24;
  const n = days.length;
  const showIn = mode !== 'expense', showOut = mode !== 'income';
  const max = Math.max(1, ...days.map(d => Math.max(showIn ? d.in : 0, showOut ? d.out : 0)));
  const cum = []; let acc = 0; days.forEach(d => { acc += d.in - d.out; cum.push(acc); });
  const cmin = Math.min(0, ...cum), cmax = Math.max(1, ...cum);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Movimento diário do mês' }, host);
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'cumfill', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': 'var(--accent)', 'stop-opacity': '.28' }, lg);
  el('stop', { offset: '1', 'stop-color': 'var(--accent)', 'stop-opacity': '0' }, lg);
  const iw = (W - padL - padR) / n, ih = H - padT - padB;
  const bw = Math.max(2, Math.min(14, iw * (showIn && showOut ? 0.34 : 0.6)));
  el('line', { x1: padL, x2: W - padR, y1: padT + ih, y2: padT + ih, class: 'axis' }, svg);
  // linha acumulada
  if (mode === 'both') {
    const yc = v => padT + ih - (v - cmin) / (cmax - cmin) * ih * 0.92;
    const pts = cum.slice(0, Math.max(1, until)).map((v, i) => [padL + iw * i + iw / 2, yc(v)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    el('path', { d: line + ` L${pts[pts.length - 1][0]},${padT + ih} L${pts[0][0]},${padT + ih} Z`, class: 'area' }, svg);
    el('path', { d: line, class: 'line', fill: 'none' }, svg);
  }
  days.forEach((d, i) => {
    const cx = padL + iw * i + iw / 2;
    if (showOut && d.out) { const h = d.out / max * ih * (mode === 'both' ? 0.75 : 0.95); el('rect', { x: showIn ? cx - bw - 1 : cx - bw / 2, y: padT + ih - h, width: bw, height: h, rx: Math.min(4, bw / 2), class: 'bar-out' }, svg); }
    if (showIn && d.in) { const h = d.in / max * ih * (mode === 'both' ? 0.75 : 0.95); el('rect', { x: showOut ? cx + 1 : cx - bw / 2, y: padT + ih - h, width: bw, height: h, rx: Math.min(4, bw / 2), class: 'bar-in' }, svg); }
    if (i === 0 || (i + 1) % 5 === 0 || i === n - 1) { const t = el('text', { x: cx, y: H - 6, 'text-anchor': 'middle' }, svg); t.textContent = i + 1; }
    const hit = el('rect', { x: padL + iw * i, y: padT, width: iw, height: ih, class: 'hit' + (picked === i + 1 ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': `Dia ${i + 1}: entradas ${fmt(d.in)}, saídas ${fmt(d.out)}` }, svg);
    const show = e => { onHover?.(i + 1, d, cum[i]); if (e?.clientX) showTip(`<b>Dia ${i + 1}</b>Entradas ${fmt(d.in)}<br>Saídas ${fmt(d.out)}<br>Acumulado ${fmt(cum[i])}`, e.clientX, e.clientY); };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('focus', () => onHover?.(i + 1, d, cum[i]));
    hit.addEventListener('pointerleave', hideTip);
    hit.addEventListener('click', () => onPick?.(i + 1));
    hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(i + 1); } });
  });
}

/** Rosca com rótulo central. */
export function donut(host, items, center, sub) {
  clear(host);
  const size = 220, r = 84, sw = 26, c = size / 2;
  const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': 'Gastos por categoria' }, host);
  const total = items.reduce((s, x) => s + x.value, 0);
  el('circle', { cx: c, cy: c, r, fill: 'none', stroke: 'var(--surface-2)', 'stroke-width': sw }, svg);
  if (total) {
    const circ = 2 * Math.PI * r; let off = 0;
    items.forEach(it => {
      const len = it.value / total * circ;
      const s = el('circle', { cx: c, cy: c, r, fill: 'none', stroke: it.color, 'stroke-width': sw, 'stroke-dasharray': `${Math.max(0, len - 2)} ${circ}`, 'stroke-dashoffset': -off, transform: `rotate(-90 ${c} ${c})` }, svg);
      s.addEventListener('pointermove', e => showTip(`<b>${esc(it.label)}</b>${it.fmt}`, e.clientX, e.clientY));
      s.addEventListener('pointerleave', hideTip);
      off += len;
    });
  }
  const t = el('text', { x: c, y: c + 2, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700 }, svg); t.textContent = center;
  const s = el('text', { x: c, y: c + 22, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)', style: 'font-family:var(--ui)' }, svg); s.textContent = sub;
}

/** Meio-anel: quanto da receita esperada já está comprometido. */
export function gauge(host, ratio, center, sub) {
  clear(host);
  const W = 260, H = 150, c = W / 2, cy = 132, r = 104, sw = 18;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sub + ': ' + center }, host);
  const arc = (from, to) => { const a0 = Math.PI * (1 - from), a1 = Math.PI * (1 - to); return `M${c + r * Math.cos(a0)},${cy - r * Math.sin(a0)} A${r},${r} 0 0 1 ${c + r * Math.cos(a1)},${cy - r * Math.sin(a1)}`; };
  el('path', { d: arc(0, 1), stroke: 'var(--surface-2)', 'stroke-width': sw, fill: 'none', 'stroke-linecap': 'round' }, svg);
  const v = Math.max(0, Math.min(1, ratio));
  if (v > 0.001) el('path', { d: arc(0, v), stroke: ratio > 1 ? 'var(--out)' : ratio > 0.85 ? 'var(--warn)' : 'var(--accent)', 'stroke-width': sw, fill: 'none', 'stroke-linecap': 'round' }, svg);
  const t = el('text', { x: c, y: cy - 22, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700 }, svg); t.textContent = center;
  const s = el('text', { x: c, y: cy, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)', style: 'font-family:var(--ui)' }, svg); s.textContent = sub;
}

/** Barras agrupadas por mês: entradas, saídas e o que sobrou. */
export function evolution(host, rows, fmt, onHover) {
  clear(host);
  if (!rows.length) { host.innerHTML = '<div class="flow-empty"><p>Os meses aparecem aqui depois do primeiro lançamento salvo.</p></div>'; return; }
  const W = Math.max(host.clientWidth, 280), H = Math.max(host.clientHeight, 180);
  const padT = 12, padB = 26, ih = H - padT - padB;
  const max = Math.max(1, ...rows.flatMap(r => [r.in, r.out]));
  const minS = Math.min(0, ...rows.map(r => r.saved));
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Evolução mensal' }, svg0(host));
  function svg0(h) { return h; }
  const iw = W / rows.length, bw = Math.min(26, iw * 0.26);
  el('line', { x1: 0, x2: W, y1: padT + ih, y2: padT + ih, class: 'axis' }, svg);
  const pts = [];
  rows.forEach((r, i) => {
    const cx = iw * i + iw / 2;
    const hi = r.in / max * ih, ho = r.out / max * ih;
    el('rect', { x: cx - bw - 2, y: padT + ih - hi, width: bw, height: hi, rx: 5, class: 'bar-in' }, svg);
    el('rect', { x: cx + 2, y: padT + ih - ho, width: bw, height: ho, rx: 5, class: 'bar-out' }, svg);
    pts.push([cx, padT + ih - (r.saved - minS) / (max - minS) * ih]);
    const t = el('text', { x: cx, y: H - 8, 'text-anchor': 'middle' }, svg); t.textContent = r.label;
    const hit = el('rect', { x: iw * i, y: padT, width: iw, height: ih, class: 'hit' }, svg);
    hit.addEventListener('pointermove', e => { onHover?.(r); showTip(`<b>${esc(r.full)}</b>Entradas ${fmt(r.in)}<br>Saídas ${fmt(r.out)}<br>Sobrou ${fmt(r.saved)}`, e.clientX, e.clientY); });
    hit.addEventListener('pointerleave', hideTip);
  });
  if (pts.length > 1) el('path', { d: pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' '), class: 'line', fill: 'none' }, svg);
  pts.forEach(p => el('circle', { cx: p[0], cy: p[1], r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', 'stroke-width': 2 }, svg));
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
