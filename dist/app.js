import { blank, calculate, cardSpending, total, validate, isIn, typeLabels } from './core.js';
import { todayInBrazil } from './calendar.js';
import { flow, daily, donut, gauge, evolution, hideTip } from './charts.js';
import { demoMonth, demoMonths } from './demo.js';
import { mergeImport, toCSV, download } from './import.js';

/* ---------------- utilidades ---------------- */
const $ = id => document.getElementById(id);
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = c => fmtBRL.format((c || 0) / 100);
const moneyShort = c => { const v = (c || 0) / 100; return Math.abs(v) >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : money(c); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => todayInBrazil();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthName = m => cap(new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
const monthShort = m => new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const monthOnly = m => new Date(m + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'long' });
const dateLabel = s => s.split('-').reverse().join('/');
const daysIn = m => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
const shiftMonth = (m, n) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 15); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const parseMoney = raw => {
  let s = String(raw || '').trim().replace(/[^\d,.-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  return Math.round(Number(s) * 100);
};
const centsToInput = c => c ? (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

const PALETTE = ['#a98bff', '#ff7c98', '#ffc56b', '#4fe0b0', '#6fb6ff', '#f59ad8', '#c7f06a', '#ff9f6e', '#8a93ff', '#5fd3e6'];
const CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Uber e 99', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Assinaturas', 'Salário', 'Rendimentos', 'Transferências', 'Pagamento de fatura', 'Empréstimos', 'Taxas', 'Outros'];
const BANKS = [
  [/nu ?bank|^nu\b/i, ['#9b3cf0', '#5a0fb0']], [/picpay/i, ['#2bd46b', '#0f8f45']], [/mercado ?pago/i, ['#25b7f0', '#0a6fb8']],
  [/inter\b/i, ['#ff8a2a', '#e0560b']], [/ita[uú]/i, ['#ff7a1a', '#1b3d8f']], [/bradesco/i, ['#e8264b', '#9c0f2c']],
  [/santander/i, ['#f0312b', '#a30d12']], [/caixa/i, ['#1d6fd6', '#0b3f8a']], [/brasil|\bbb\b/i, ['#f6d33c', '#2a55b8']],
  [/c6/i, ['#3a3a44', '#0d0d12']], [/neon/i, ['#1fd6ff', '#0b70d8']], [/will/i, ['#ffd84a', '#c9a100']],
];
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const bankColors = name => (BANKS.find(([re]) => re.test(name)) || [0, [PALETTE[hash(name) % PALETTE.length], '#3b2a6b']])[1];
const catColor = (cat, order) => order?.has(cat) ? PALETTE[order.get(cat) % PALETTE.length] : PALETTE[hash(cat) % PALETTE.length];
const initials = s => String(s).trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const GUESS = [
  [/uber|99 ?app|99 ?tecnologia|99pop/i, 'Uber e 99'], [/ifood|rappi|restaurante|lanche|pizza|padaria|mercado|supermercado|hortifruti|a[çc]ougue|feira/i, 'Alimentação'],
  [/aluguel|condom[ií]nio|luz|energia|[áa]gua|internet|g[áa]s/i, 'Moradia'], [/netflix|spotify|prime|disney|youtube|max\b|globoplay|icloud/i, 'Assinaturas'],
  [/farm[áa]cia|drogaria|m[ée]dico|consulta|academia|plano de sa[úu]de/i, 'Saúde'], [/curso|faculdade|livro|escola|udemy|alura|dio/i, 'Educação'],
  [/sal[áa]rio|freela|pagamento recebido/i, 'Salário'], [/rendimento/i, 'Rendimentos'], [/[ôo]nibus|metr[ôo]|combust[íi]vel|gasolina|estacionamento/i, 'Transporte'],
  [/cinema|show|bar\b|barzinho|viagem|passeio/i, 'Lazer'], [/roupa|loja|shopping|amazon|shopee|mercado livre|magalu/i, 'Compras'], [/fatura/i, 'Pagamento de fatura'],
];
const ICONS = {
  'Alimentação': '<path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v5M17 3c-2 2-3 4-3 7h3v11"/>',
  'Moradia': '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
  'Transporte': '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 12h14M8 21l1-4M16 21l-1-4"/>',
  'Uber e 99': '<path d="M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4z"/>',
  'Saúde': '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  'Educação': '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
  'Lazer': '<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M8.5 14.5c2 2 5 2 7 0"/>',
  'Compras': '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  'Assinaturas': '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M10 9l5 2-5 2z"/>',
  'Salário': '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  'Rendimentos': '<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
  'Transferências': '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  'Pagamento de fatura': '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/>',
};
const catIcon = t => ICONS[t.category] ? `<svg viewBox="0 0 24 24">${ICONS[t.category]}</svg>` : `<b>${esc(initials(t.description))}</b>`;
const OUT_TYPES = ['expense', 'transfer_out', 'settlement'];
const isRide = t => t.type === 'expense' && /uber|99\s*app|99\s*tecnologia|99pop/i.test(t.description) && !/99\s*food/i.test(t.description);

/* ---------------- estado ---------------- */
let calendarDay = today();
let month = calendarDay.slice(0, 7);
let data = blank(), revision = 0, loaded = false, busy = false, lastSyncAt = 0, requestId = 0;
let prevData = null, prevFor = '';
let demo = false; const demoStore = {};
let page = 'overview', series = 'expense', group = 'day';
let fType = 'all', fCat = '', fSearch = '', fDay = 0;
let editing = null, preset = null;
let monthsCache = null; const historyCache = {};

/* ---------------- API ---------------- */
async function api(path, options) {
  const r = await fetch(path, options);
  let result;
  try { result = await r.json(); } catch { throw new Error('Não foi possível carregar os dados. Verifique a conexão e tente de novo.'); }
  if (!r.ok) { const e = new Error(result.error || 'Não foi possível concluir.'); e.status = r.status; throw e; }
  return result;
}
async function fetchMonth(m) {
  if (demo) return { data: demoStore[m] || (demoStore[m] = demoMonth(m, m === calendarDay.slice(0, 7) ? Number(calendarDay.slice(8)) : 31)), revision: 1 };
  return api('/api/month?month=' + encodeURIComponent(m), { cache: 'no-store' });
}
async function fetchMonths() {
  if (demo) return demoMonths(calendarDay.slice(0, 7), 6);
  if (monthsCache) return monthsCache;
  const r = await api('/api/months');
  monthsCache = r.months;
  return monthsCache;
}

function setSync(state, text) { const s = $('sync'); s.className = 'sync ' + state; $('sync-text').textContent = text; }
function setBusy(v) {
  busy = v;
  document.querySelectorAll('[data-edit],#new-transaction,#tab-add,#reload,#prev-month,#next-month,#submit,#delete').forEach(e => e.disabled = v);
}
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200); }

async function load(target, { quiet } = {}) {
  if (busy) return;
  const seq = ++requestId;
  setBusy(true);
  if (!quiet) setSync('busy', 'Carregando…');
  $('notice').hidden = true;
  try {
    const r = await fetchMonth(target);
    if (seq !== requestId) return;
    month = target;
    data = r.data;
    for (const k of ['accounts', 'cards', 'investments', 'transactions']) data[k] ||= [];
    for (const card of data.cards) if (card.invoiceTotal > 0 && card.invoiceBase === undefined) card.invoiceBase = cardSpending(data, card.id);
    revision = r.revision;
    loaded = true;
    lastSyncAt = Date.now();
    fDay = 0;
    setSync(demo ? 'ok' : revision ? 'ok' : '', demo ? 'Dados de exemplo' : revision ? 'Salvo na nuvem' : 'Mês sem registros');
    render();
    loadPrev();
  } catch (e) {
    $('notice').textContent = e.message;
    $('notice').hidden = false;
    setSync('err', 'Falha ao carregar');
  } finally { setBusy(false); syncMonthInput(); }
}
async function loadPrev() {
  const p = shiftMonth(month, -1);
  if (prevFor === p) return;
  try { const r = await fetchMonth(p); prevData = r.data; prevFor = p; } catch { prevData = null; prevFor = ''; }
  if (loaded) { renderHero(); renderInsights(); renderWelcome(); }
}

async function persist(next) {
  if (busy) return false;
  if (!validate(next, month)) { $('form-error').textContent = 'Confira os valores, a data e se uma conta ou cartão foi escolhido.'; return false; }
  if (demo) { demoStore[month] = next; data = next; render(); return true; }
  setBusy(true);
  $('form-error').textContent = '';
  setSync('busy', 'Salvando…');
  try {
    const r = await api('/api/month?month=' + month, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, data: next }) });
    data = next; revision = r.revision; lastSyncAt = Date.now();
    monthsCache = null; delete historyCache[month];
    setSync('ok', 'Salvo na nuvem');
    render();
    return true;
  } catch (e) {
    $('form-error').textContent = e.status === 409 ? 'Este mês foi alterado em outra aba ou aparelho. Feche, use Recarregar e lance de novo.' : e.message;
    setSync('err', 'Alteração não salva');
    return false;
  } finally { setBusy(false); }
}

/* ---------------- números do mês ---------------- */
function numbers(d) {
  const c = calculate(d);
  const cashYields = total(d.transactions.filter(t => t.type === 'yield'), t => t.amount);
  const inflow = c.received + cashYields;
  const outflow = c.expenses;
  return { ...c, cashYields, inflow, outflow, result: inflow - outflow };
}
function byCategory(d) {
  const cats = {};
  d.transactions.filter(t => t.type === 'expense').forEach(t => cats[t.category] = (cats[t.category] || 0) + t.amount);
  const opening = total(d.cards, x => x.opening);
  if (opening) cats['Faturas anteriores'] = (cats['Faturas anteriores'] || 0) + opening;
  return Object.entries(cats).sort((a, b) => b[1] - a[1]);
}
let catOrder = new Map();

/* ---------------- render ---------------- */
function render() {
  catOrder = new Map(byCategory(data).map(([k], i) => [k, i]));
  renderWelcome();
  renderHero();
  renderDaily();
  renderDonut();
  renderPlan();
  renderInsights();
  renderBudgetMini();
  renderRecent();
  renderTransactions();
  renderBudgets();
  renderAccounts();
  renderInvestments();
  if (page === 'history') renderHistory();
  const notes = data.importNotes || [];
  $('import-notes').textContent = notes.join('\n\n');
  $('import-notes').hidden = !notes.length;
}

function renderWelcome() {
  const empty = !(data.accounts.length || data.cards.length || data.transactions.length);
  $('welcome').hidden = !empty || demo;
  $('hero').hidden = empty && !demo;
  const canCopy = prevData && (prevData.accounts.length || prevData.cards.length);
  $('copy-prev').hidden = !canCopy;
}

function renderHero() {
  const n = numbers(data);
  const hero = $('hero');
  const deficit = n.result < 0;
  hero.classList.toggle('deficit', deficit);
  $('hero-verb').textContent = deficit ? 'Faltaram' : 'Sobraram';
  $('hero-amount').textContent = money(Math.abs(n.result));
  $('hero-tail').textContent = 'em ' + monthOnly(month);
  const rate = n.inflow ? Math.round(n.result / n.inflow * 100) : 0;
  $('hero-sub').textContent = n.inflow
    ? (deficit ? `As saídas passaram as entradas em ${pct(-n.result, n.inflow)}%. O saldo das contas cobriu a diferença.` : `Você guardou ${rate}% do que entrou. Conta só o que já foi lançado; a previsão do mês fica no Plano do mês.`)
    : 'Lance a primeira entrada do mês para ver quanto sobra.';
  $('k-in').textContent = money(n.inflow);
  $('k-out').textContent = money(n.outflow);
  $('k-accounts').textContent = money(n.accounts);
  $('k-cards').textContent = money(n.cards);
  const delta = (cur, prev, goodUp) => {
    if (!prevData || !prev) return '';
    const p = Math.round((cur - prev) / prev * 100);
    if (!p) return 'igual a ' + monthShort(prevFor);
    const good = goodUp ? p > 0 : p < 0;
    return `<span class="${good ? 'up' : 'down'}">${p > 0 ? '+' : ''}${p}%</span> vs ${monthShort(prevFor)}`;
  };
  const pn = prevData ? numbers(prevData) : null;
  $('k-in-delta').innerHTML = pn ? delta(n.inflow, pn.inflow, true) : '';
  $('k-out-delta').innerHTML = pn ? delta(n.outflow, pn.outflow, false) : '';
  const due = nextDue();
  $('k-cards-due').textContent = due ? `${due.card.name} vence ${due.days === 0 ? 'hoje' : due.days === 1 ? 'amanhã' : due.days > 0 ? 'em ' + due.days + ' dias' : 'dia ' + dateLabel(due.card.dueDate).slice(0, 5)}` : (data.cards.length ? 'sem vencimento informado' : 'nenhum cartão');
  // fluxo
  const incomeCats = {};
  data.transactions.filter(t => t.type === 'income' || t.type === 'yield').forEach(t => { const k = t.type === 'yield' ? 'Rendimentos' : t.category; incomeCats[k] = (incomeCats[k] || 0) + t.amount; });
  const inGreens = ['#4fe0b0', '#38c99a', '#7deec7', '#2fb488', '#9af3d3'];
  const sources = Object.entries(incomeCats).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: inGreens[i % inGreens.length] }));
  const cats = byCategory(data);
  const top = cats.slice(0, 6), rest = cats.slice(6);
  const targets = top.map(([label, value]) => ({ label, value, color: catColor(label, catOrder) }));
  if (rest.length) targets.push({ label: 'Outras', value: total(rest, x => x[1]), color: '#8b84a3' });
  const sIn = total(sources, x => x.value), sOut = total(targets, x => x.value);
  if (sIn > sOut) targets.push({ label: 'Sobrou', value: sIn - sOut, color: 'var(--accent)' });
  if (sOut > sIn) sources.push({ label: 'Saldo das contas', value: sOut - sIn, color: '#8b84a3' });
  flow($('flow'), sources, targets, money);
}

function nextDue() {
  const t = today();
  const cards = data.cards.filter(c => c.dueDate);
  if (!cards.length) return null;
  const withDays = cards.map(c => ({ card: c, days: Math.round((new Date(c.dueDate + 'T12:00:00') - new Date(t + 'T12:00:00')) / 864e5) }));
  const upcoming = withDays.filter(x => x.days >= 0).sort((a, b) => a.days - b.days);
  return upcoming[0] || withDays.sort((a, b) => b.days - a.days)[0];
}

function dailySeries(d, m) {
  const days = Array.from({ length: daysIn(m) }, () => ({ in: 0, out: 0 }));
  d.transactions.forEach(t => {
    const i = Number(t.date.slice(8)) - 1;
    if (!days[i]) return;
    if (t.type === 'income' || t.type === 'yield') days[i].in += t.amount;
    else if (t.type === 'expense') days[i].out += t.amount;
  });
  return days;
}
function renderDaily() {
  const days = dailySeries(data, month);
  const until = month === calendarDay.slice(0, 7) ? Number(calendarDay.slice(8)) : month > calendarDay.slice(0, 7) ? 0 : days.length;
  daily($('daily'), days, series, money, {
    until,
    picked: fDay,
    onHover: (day, d, cum) => { $('daily-detail').textContent = `Dia ${day}: entradas ${money(d.in)}, saídas ${money(d.out)}. Saldo acumulado no mês: ${money(cum)}. Clique para ver os lançamentos do dia.`; },
    onPick: day => { fDay = day; location.hash = '#transactions'; },
  });
  const busiest = days.reduce((b, d, i) => d.out > b.v ? { v: d.out, i } : b, { v: 0, i: -1 });
  $('daily-detail').textContent = busiest.i >= 0 ? `Dia de maior gasto: ${busiest.i + 1}, com ${money(busiest.v)}. Clique em um dia para ver os lançamentos.` : 'Seus lançamentos vão dar forma a este gráfico.';
}

function renderDonut() {
  const cats = byCategory(data);
  const sum = total(cats, x => x[1]);
  const top = cats.slice(0, 5), rest = cats.slice(5);
  const items = top.map(([label, value]) => ({ label, value, color: catColor(label, catOrder), fmt: money(value) }));
  if (rest.length) items.push({ label: 'Outras', value: total(rest, x => x[1]), color: '#8b84a3', fmt: money(total(rest, x => x[1])) });
  donut($('donut'), items, sum ? moneyShort(sum) : 'R$ 0', sum ? 'gastos no mês' : 'sem gastos ainda');
  $('cat-legend').innerHTML = items.length ? items.map(it => `<li><i style="background:${it.color}"></i><span>${esc(it.label)}</span><b>${money(it.value)}</b><small>${pct(it.value, sum)}%</small></li>`).join('') : '<li class="muted" style="display:block">As categorias aparecem quando houver gastos.</li>';
}

function renderPlan() {
  const n = numbers(data);
  const expected = Math.max(data.income, n.received);
  const committed = n.expenses + data.remaining;
  gauge($('gauge'), expected ? committed / expected : 0, money(n.savings), n.savings < 0 ? 'faltando no fim do mês' : 'previsto para sobrar');
  $('p-income').textContent = money(expected);
  $('p-spent').textContent = money(n.expenses);
  $('p-remaining').textContent = money(data.remaining);
}

function renderInsights() {
  const n = numbers(data);
  const out = [];
  const icon = { up: '<svg viewBox="0 0 24 24"><path d="M4 16l6-6 4 4 6-6M15 8h5v5"/></svg>', down: '<svg viewBox="0 0 24 24"><path d="M4 8l6 6 4-4 6 6M15 16h5v-5"/></svg>', cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>', pie: '<svg viewBox="0 0 24 24"><path d="M12 3v9h9A9 9 0 1 1 12 3Z"/></svg>', alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>', car: '<svg viewBox="0 0 24 24"><path d="M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4z"/></svg>', leaf: '<svg viewBox="0 0 24 24"><path d="M5 19c8 0 14-6 14-14C11 5 5 11 5 19Zm0 0 8-8"/></svg>' };
  if (n.inflow) {
    const rate = Math.round(n.result / n.inflow * 100);
    out.push({ k: rate >= 20 ? 'good' : rate >= 0 ? 'info' : 'bad', i: rate >= 0 ? icon.up : icon.down, b: rate >= 0 ? `Você guardou ${rate}% das entradas` : `Gastou ${-rate}% a mais do que entrou`, s: rate >= 20 ? 'Acima dos 20% que costumam ser recomendados.' : 'Guardar ao menos 20% ajuda a formar uma reserva.' });
  }
  const cats = byCategory(data), spent = total(cats, x => x[1]);
  if (cats.length) out.push({ k: 'info', i: icon.pie, b: `${cats[0][0]} leva ${pct(cats[0][1], spent)}% dos gastos`, s: `${money(cats[0][1])} no mês.` });
  if (prevData) {
    const p = numbers(prevData);
    if (p.outflow && n.outflow) {
      const diff = Math.round((n.outflow - p.outflow) / p.outflow * 100);
      out.push({ k: diff > 5 ? 'warn' : 'good', i: diff > 0 ? icon.up : icon.down, b: diff === 0 ? `Gastos iguais a ${monthOnly(prevFor)}` : `Gastos ${diff > 0 ? diff + '% maiores' : -diff + '% menores'} que em ${monthOnly(prevFor)}`, s: `${money(p.outflow)} no mês anterior.` });
    }
  }
  const due = nextDue();
  if (due && due.days >= 0 && due.days <= 10) out.push({ k: 'warn', i: icon.cal, b: `Fatura ${due.card.name} vence ${due.days === 0 ? 'hoje' : due.days === 1 ? 'amanhã' : 'em ' + due.days + ' dias'}`, s: `${money(n.cardTotals[due.card.id])} até agora.` });
  const over = budgetRows().filter(r => r.spent > r.limit);
  if (over.length) out.push({ k: 'bad', i: icon.alert, b: over.length === 1 ? `Orçamento de ${over[0].cat} estourado` : `${over.length} orçamentos estourados`, s: over.map(r => `${r.cat}: ${money(r.spent - r.limit)} acima`).join('; ') + '.' });
  const rides = data.transactions.filter(isRide);
  if (rides.length) out.push({ k: 'info', i: icon.car, b: `${money(total(rides, t => t.amount))} em Uber e 99`, s: `${rides.length} corrida${rides.length > 1 ? 's' : ''} no mês, 99 Food fora da conta.` });
  if (data.transactions.length) {
    const last = month === calendarDay.slice(0, 7) ? Number(calendarDay.slice(8)) : daysIn(month);
    const spentDays = new Set(data.transactions.filter(t => t.type === 'expense').map(t => t.date));
    const free = Math.max(0, last - [...spentDays].filter(d => Number(d.slice(8)) <= last).length);
    if (free) out.push({ k: 'good', i: icon.leaf, b: `${free} dia${free > 1 ? 's' : ''} sem gastos`, s: 'Dias sem nenhuma despesa lançada.' });
  }
  $('insights').innerHTML = out.length ? out.slice(0, 5).map(x => `<li><span class="ic ${x.k}">${x.i}</span><div><b>${esc(x.b)}</b><span>${esc(x.s)}</span></div></li>`).join('') : '<li style="display:block" class="muted">As leituras aparecem conforme você lança entradas e gastos.</li>';
}

function budgetRows() {
  const b = data.budgets || {};
  const spentBy = Object.fromEntries(byCategory(data));
  return Object.entries(b).map(([cat, limit]) => ({ cat, limit, spent: spentBy[cat] || 0 })).sort((a, b) => b.spent / b.limit - a.spent / a.limit);
}
const level = r => r.spent > r.limit ? 'over' : r.spent / r.limit >= 0.85 ? 'near' : '';
function renderBudgetMini() {
  const rows = budgetRows().slice(0, 4);
  $('budget-mini').innerHTML = rows.length ? rows.map(r => `<div class="row"><div><b>${esc(r.cat)}</b><span>${money(r.spent)} de ${money(r.limit)}</span></div><div class="track"><i class="${level(r)}" style="width:${Math.min(100, pct(r.spent, r.limit))}%"></i></div></div>`).join('') : '<p class="muted">Defina limites por categoria para acompanhar aqui. <button type="button" class="link" data-edit="limit">Definir limite</button></p>';
}
function renderBudgets() {
  const rows = budgetRows();
  $('budget-grid').innerHTML = rows.length ? rows.map(r => {
    const p = pct(r.spent, r.limit), lv = level(r);
    return `<button type="button" class="budget" data-edit="limit" data-id="${esc(r.cat)}"><header><h3>${esc(r.cat)}</h3><span class="pct ${lv}">${p}%</span></header><div class="track"><i class="${lv}" style="width:${Math.min(100, p)}%"></i></div><p><span>Gasto <b>${money(r.spent)}</b></span><span>${r.spent > r.limit ? 'Passou ' + money(r.spent - r.limit) : 'Resta ' + money(r.limit - r.spent)}</span></p></button>`;
  }).join('') : '<div class="empty" style="grid-column:1/-1">Nenhum limite definido. Comece pelas categorias em que você mais gasta, como alimentação e lazer.</div>';
  const n = numbers(data);
  const expected = Math.max(data.income, n.received);
  $('forecast').innerHTML = `<div><span>Receita esperada</span><b>${money(expected)}</b></div><div><span>Já saiu</span><b>${money(n.expenses)}</b></div><div><span>Ainda vai sair</span><b>${money(data.remaining)}</b></div><div><span>Previsto para sobrar</span><b class="${n.savings < 0 ? 'down' : 'up'}">${money(n.savings)}</b></div>`;
}

/* ---------- lançamentos ---------- */
const refOf = t => (t.method === 'Crédito' ? data.cards.find(c => c.id === t.cardId) : data.accounts.find(a => a.id === t.accountId));
const sign = t => (isIn(t) || t.type === 'card_payment') ? 1 : -1;
function txRow(t) {
  const ref = refOf(t);
  const inc = sign(t) > 0;
  const color = inc ? 'var(--in)' : catColor(t.category, catOrder);
  const methodTag = t.method === 'Crédito' ? `<span class="tag credit">${t.creditKind === 'pix-credit' ? 'Pix no crédito' : 'Crédito'}</span>` : `<span class="tag">${esc(t.method)}</span>`;
  return `<button type="button" class="tx" data-edit="transaction" data-id="${t.id}"><span class="av" style="--c:${color}">${catIcon(t)}</span><span class="main"><b>${esc(t.description)}</b><small>${esc(t.category)}${ref ? ', ' + esc(ref.name) : ''}${t.type !== 'expense' && t.type !== 'income' ? ', ' + esc(typeLabels[t.type]) : ''}</small></span>${methodTag}<span class="amt ${inc ? 'in' : ''}">${inc ? '+' : '−'}${money(t.amount)}</span></button>`;
}
function filtered() {
  const q = fSearch.toLowerCase();
  return data.transactions.filter(t => {
    if (fType === 'out' && sign(t) > 0) return false;
    if (fType === 'in' && sign(t) < 0) return false;
    if (fType === 'credit' && t.method !== 'Crédito') return false;
    if (fCat && t.category !== fCat) return false;
    if (fDay && Number(t.date.slice(8)) !== fDay) return false;
    if (q && !(t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (refOf(t)?.name || '').toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}
function renderTransactions() {
  const cats = [...new Set(data.transactions.map(t => t.category))].sort((a, b) => a.localeCompare(b));
  $('tx-cat').innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option ${c === fCat ? 'selected' : ''}>${esc(c)}</option>`).join('');
  const rows = filtered();
  const tin = total(rows.filter(t => sign(t) > 0), t => t.amount), tout = total(rows.filter(t => sign(t) < 0), t => t.amount);
  $('tx-summary').textContent = fDay ? `Mostrando o dia ${fDay} de ${monthOnly(month)}.` : `Tudo o que entrou e saiu em ${monthOnly(month)}.`;
  $('clear-day').hidden = !fDay;
  $('tx-totals').innerHTML = `<span>${rows.length} lançamento${rows.length === 1 ? '' : 's'}</span><span>Entradas<b class="up">${money(tin)}</b></span><span>Saídas<b>${money(tout)}</b></span>`;
  const host = $('tx-list');
  if (!data.transactions.length) host.innerHTML = '<div class="empty">Nenhum lançamento neste mês. Use <b>Novo lançamento</b> ou a tecla N.</div>';
  else if (!rows.length) host.innerHTML = '<div class="empty">Nada encontrado com esses filtros.</div>';
  else if (group === 'day') {
    const byDay = new Map();
    rows.forEach(t => { if (!byDay.has(t.date)) byDay.set(t.date, []); byDay.get(t.date).push(t); });
    host.innerHTML = [...byDay].map(([d, list]) => {
      const net = total(list, t => sign(t) * t.amount);
      const label = cap(new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace('-feira', ''));
      return `<section class="day-group"><div class="day-head"><strong>${esc(label)}</strong><span class="${net >= 0 ? 'up' : ''}">${net >= 0 ? '+' : '−'}${money(Math.abs(net))}</span></div><div class="tx-rows">${list.map(txRow).join('')}</div></section>`;
    }).join('');
  } else {
    const groups = [...data.accounts.map(a => ({ id: a.id, name: a.name, kind: 'Conta' })), ...data.cards.map(c => ({ id: c.id, name: c.name, kind: 'Cartão' }))];
    host.innerHTML = '<div class="source-grid">' + groups.map(g => {
      const list = rows.filter(t => t.accountId === g.id || t.cardId === g.id);
      if (!list.length) return '';
      const sum = total(list, t => sign(t) * t.amount);
      return `<section class="source-col"><h3>${esc(g.name)} <small>${g.kind}, ${sum >= 0 ? '+' : '−'}${money(Math.abs(sum))}</small></h3><div class="tx-rows">${list.map(txRow).join('')}</div></section>`;
    }).join('') + '</div>';
  }
  const rides = data.transactions.filter(isRide);
  const rp = $('rides');
  if (!rides.length) { rp.hidden = true; return; }
  rp.hidden = false;
  const uber = total(rides.filter(t => /uber/i.test(t.description)), t => t.amount), all = total(rides, t => t.amount);
  rp.innerHTML = `<header class="panel-head"><div><h2>Transporte por aplicativo</h2><p>Corridas de Uber e 99 em ${monthOnly(month)}. 99 Food fica fora deste total.</p></div><b class="amt">${money(all)}</b></header><div class="rides-bars"><div class="row"><div style="display:flex;justify-content:space-between"><span>Uber</span><b>${money(uber)}</b></div><div class="track"><i style="width:${pct(uber, all)}%;background:var(--text)"></i></div></div><div class="row"><div style="display:flex;justify-content:space-between"><span>99</span><b>${money(all - uber)}</b></div><div class="track"><i style="width:${pct(all - uber, all)}%;background:var(--warn)"></i></div></div></div>`;
}
function renderRecent() {
  const rows = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || 0).slice(0, 6);
  $('recent').innerHTML = rows.length ? `<div class="tx-rows">${rows.map(txRow).join('')}</div>` : '<div class="empty">Nenhum lançamento ainda. Que tal começar pelo salário ou pelo mercado da semana?</div>';
}

/* ---------- contas, cartões, investimentos ---------- */
function renderAccounts() {
  const c = calculate(data);
  $('acc-total').textContent = money(c.accounts);
  $('card-total').textContent = data.cards.length ? money(c.cards) + ' em faturas' : '';
  $('account-list').innerHTML = data.accounts.length ? data.accounts.map(a => {
    const [c1] = bankColors(a.name);
    const bal = c.balances[a.id];
    const moves = data.transactions.filter(t => t.accountId === a.id).length;
    return `<button type="button" class="acct" data-edit="account" data-id="${a.id}"><header><span class="av" style="background:${c1};color:#fff">${esc(initials(a.name))}</span><div><h3>${esc(a.name)}</h3><small>${esc(a.details || 'Conta')}</small></div></header><span class="bal ${bal < 0 ? 'neg' : ''}">${money(bal)}</span><footer><span>Início ${money(a.balance)}</span><span>${moves} lançamento${moves === 1 ? '' : 's'}</span></footer></button>`;
  }).join('') : '<div class="empty" style="grid-column:1/-1">Adicione sua conta bancária, a carteira de dinheiro ou a reserva.</div>';
  $('card-list').innerHTML = data.cards.length ? data.cards.map(card => {
    const [c1, c2] = bankColors(card.name);
    const fatura = c.cardTotals[card.id];
    const due = card.dueDate ? Math.round((new Date(card.dueDate + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5) : null;
    const dueText = card.dueDate ? `${dateLabel(card.dueDate)}${due !== null && due >= 0 && due <= 7 ? ` (${due === 0 ? 'hoje' : due + 'd'})` : ''}` : 'Não informado';
    const pixCredit = total(data.transactions.filter(t => t.cardId === card.id && t.creditKind === 'pix-credit'), t => t.amount);
    return `<button type="button" class="ccard" data-edit="card" data-id="${card.id}"><div class="plastic" style="background:linear-gradient(135deg,${c1},${c2})"><div class="row"><h3>${esc(card.name)}</h3><span class="chipico"></span></div><div class="row"><div><small>Fatura atual</small><b>${money(fatura)}</b></div><small>${card.invoiceMonth ? 'Fatura de ' + esc(monthOnly(card.invoiceMonth)) : ''}</small></div></div><div class="meta"><div><span>Vencimento</span><b class="${due !== null && due >= 0 && due <= 7 ? 'due-soon' : ''}">${dueText}</b></div><div><span>${card.invoiceCarry ? 'Pendente anterior' : 'Pix no crédito'}</span><b>${money(card.invoiceCarry || pixCredit)}</b></div></div></button>`;
  }).join('') : '<div class="empty" style="grid-column:1/-1">Cadastre seus cartões para acompanhar faturas e vencimentos.</div>';
}
function renderInvestments() {
  const c = calculate(data);
  const principal = total(data.investments, i => i.principal), y = total(data.investments, i => i.yield);
  $('inv-total').textContent = money(c.invested);
  $('inv-yield').textContent = money(y);
  $('inv-rate').textContent = principal ? (y / principal * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%' : '0%';
  const items = [...data.investments].sort((a, b) => (b.principal + b.yield) - (a.principal + a.yield));
  $('alloc').innerHTML = items.length ? `<div class="bar">${items.map((i, k) => `<i style="width:${(i.principal + i.yield) / c.invested * 100}%;background:${PALETTE[k % PALETTE.length]}" title="${esc(i.name)}"></i>`).join('')}</div>` : '';
  $('investment-list').innerHTML = items.length ? items.map((i, k) => `<button type="button" class="inv" data-edit="investment" data-id="${i.id}"><i style="background:${PALETTE[k % PALETTE.length]}"></i><div><b>${esc(i.name)}</b><small>Capital ${money(i.principal)}${i.asOfDate ? ', saldo em ' + dateLabel(i.asOfDate) : ''}, ${pct(i.principal + i.yield, c.invested)}% da carteira</small></div><span class="y ${i.yield >= 0 ? 'up' : 'down'}">${i.yield >= 0 ? '+' : '−'}${money(Math.abs(i.yield))}</span><b class="amt">${money(i.principal + i.yield)}</b></button>`).join('') : '<div class="empty">Adicione suas aplicações e o rendimento de cada mês.</div>';
}

/* ---------- histórico ---------- */
async function renderHistory() {
  let months;
  try { months = await fetchMonths(); } catch { $('month-list').innerHTML = '<div class="empty">Histórico indisponível agora. Use Recarregar para tentar de novo.</div>'; return; }
  const list = months.slice(0, 12);
  $('month-list').innerHTML = list.length ? list.map(x => `<button type="button" class="month-card ${x.month === month ? 'on' : ''}" data-month="${x.month}"><b>${esc(monthName(x.month))}</b><small>Salvo em ${new Date(x.updated_at).toLocaleDateString('pt-BR')}</small><div class="mres" id="mres-${x.month}"><span class="muted">Calculando…</span></div></button>`).join('') : '<div class="empty" style="grid-column:1/-1">Os meses aparecem aqui depois do primeiro registro salvo.</div>';
  const rows = [];
  for (const x of [...list].reverse()) {
    try {
      if (!historyCache[x.month]) historyCache[x.month] = x.month === month ? data : (await fetchMonth(x.month)).data;
      const n = numbers(historyCache[x.month]);
      rows.push({ label: monthShort(x.month), full: monthName(x.month), in: n.inflow, out: n.outflow, saved: n.result });
      const cell = document.getElementById('mres-' + x.month);
      if (cell) cell.innerHTML = `<span>${n.result >= 0 ? 'Sobrou' : 'Faltou'}</span><b class="${n.result >= 0 ? 'up' : 'down'}">${money(Math.abs(n.result))}</b>`;
    } catch {}
  }
  evolution($('evolution'), rows, money, r => { $('evo-detail').textContent = `${r.full}: entraram ${money(r.in)}, saíram ${money(r.out)}.`; });
  if (rows.length) { const best = rows.reduce((a, b) => b.saved > a.saved ? b : a); $('evo-detail').textContent = `Melhor mês: ${best.full}, com ${money(best.saved)} de sobra.`; }
}

/* ---------------- editor ---------------- */
const keyMap = { account: 'accounts', card: 'cards', investment: 'investments', transaction: 'transactions' };
const titles = { account: 'conta', card: 'cartão', investment: 'investimento', transaction: 'lançamento', budget: 'previsão do mês', limit: 'limite de categoria' };
const field = (name, label, value = '', type = 'text', extra = '', cls = '') => `<label class="${cls}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const moneyField = (name, label, cents, { signed, big, cls = '' } = {}) => `<label class="${cls}">${label}<input name="${name}" class="${big ? 'money-in' : ''}" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(centsToInput(cents))}" data-money ${signed ? 'data-signed' : ''}></label>`;
const selectField = (name, label, options, value, cls = '') => `<label class="${cls}">${label}<select name="${name}">${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></label>`;

function openEditor(kind, id) {
  refreshCalendar();
  if (busy || !loaded) return;
  if (!(kind in titles)) return;
  const stored = id && keyMap[kind] ? data[keyMap[kind]].find(x => x.id === id) : null;
  if (id && keyMap[kind] && !stored) return;
  const value = kind === 'transaction' && !id ? { ...(preset || {}) } : (stored || {});
  preset = null;
  editing = { kind, id };
  const fresh = { account: 'Nova conta', card: 'Novo cartão', investment: 'Novo investimento', transaction: 'Novo lançamento', budget: 'Ajustar previsão do mês', limit: 'Novo limite de categoria' };
  $('editor-title').textContent = id ? 'Editar ' + titles[kind] : fresh[kind];
  $('editor-month').textContent = monthName(month) + (demo ? ', modo exemplo' : '');
  const del = $('delete');
  del.hidden = !id; del.textContent = 'Excluir'; delete del.dataset.confirm;
  $('form-error').textContent = '';
  const lastDay = daysIn(month);
  const defaultDate = today().startsWith(month) ? today() : month + '-01';
  let html = '', help = '';
  if (kind === 'account') {
    html = field('name', 'Nome da conta ou carteira', value.name || '', 'text', 'maxlength="120" required placeholder="Ex.: Nubank, Carteira"', 'full')
      + field('details', 'Para que serve (opcional)', value.details || '', 'text', 'maxlength="180" placeholder="Ex.: Reserva de emergência"', 'full')
      + moneyField('balance', 'Saldo no início do mês (R$)', value.balance || 0, { signed: true, cls: 'full' });
    help = 'O saldo atual é calculado com os lançamentos. Não guarde senhas ou números de cartão aqui.';
  }
  if (kind === 'card') {
    html = field('name', 'Nome do cartão', value.name || '', 'text', 'maxlength="120" required placeholder="Ex.: Nubank crédito"', 'full')
      + field('dueDate', 'Vencimento da fatura', value.dueDate || '', 'date')
      + moneyField('opening', 'Gastos de antes já na fatura (R$)', value.opening || 0)
      + field('invoiceMonth', 'Mês da fatura informada (opcional)', value.invoiceMonth || '', 'month')
      + moneyField('invoiceTotal', 'Valor total da fatura informada (R$)', id && value.invoiceTotal > 0 ? calculate(data).cardTotals[id] : value.invoiceTotal || 0)
      + moneyField('invoiceCarry', 'Pendente do mês anterior (R$)', value.invoiceCarry || 0, { cls: 'full' });
    help = 'Se informar o total da fatura, novos gastos no cartão somam a partir dele, sem repetir o que já estava lançado.';
  }
  if (kind === 'investment') {
    html = field('name', 'Banco ou aplicação', value.name || '', 'text', 'maxlength="120" required placeholder="Ex.: Tesouro Selic"', 'full')
      + moneyField('principal', 'Capital sem o rendimento do mês (R$)', value.principal || 0)
      + moneyField('yield', 'Rendimento do mês (R$)', value.yield || 0, { signed: true })
      + field('asOfDate', 'Data do saldo', value.asOfDate || defaultDate, 'date', `min="${month}-01" max="${month}-${lastDay}"`, 'full');
    help = 'Use valor negativo no rendimento para registrar perda.';
  }
  if (kind === 'budget') {
    html = moneyField('income', 'Receita total esperada no mês (R$)', data.income, { cls: 'full', big: true })
      + moneyField('remaining', 'Gastos que ainda vão acontecer (R$)', data.remaining, { cls: 'full' });
    help = 'Não repita despesas já lançadas. Diminua os gastos previstos conforme for lançando.';
  }
  if (kind === 'limit') {
    const limits = data.budgets || {};
    const cats = [...new Set([...byCategory(data).map(x => x[0]), ...CATEGORIES.filter(c => !['Salário', 'Rendimentos', 'Transferências', 'Pagamento de fatura'].includes(c))])];
    html = `<label class="full">Categoria<input name="cat" list="cat-list" maxlength="120" required value="${esc(id || '')}" ${id ? 'readonly' : ''} placeholder="Ex.: Alimentação"></label><datalist id="cat-list">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`
      + moneyField('limit', 'Limite no mês (R$)', id ? limits[id] : 0, { cls: 'full', big: true });
    help = 'O limite vale para este mês. Ao copiar contas do mês anterior, os limites vão junto.';
    del.hidden = !id;
  }
  if (kind === 'transaction') {
    const t = value;
    const typ = t.type || 'expense';
    const group = typ === 'expense' ? 'out' : typ === 'income' ? 'in' : 'other';
    html = `<div class="type-pick" role="group" aria-label="Tipo"><button type="button" data-kind="out" class="${group === 'out' ? 'on' : ''}">Saída</button><button type="button" data-kind="in" class="${group === 'in' ? 'on' : ''}">Entrada</button><button type="button" data-kind="other" class="${group === 'other' ? 'on' : ''}">Outro</button></div>`
      + `<input type="hidden" name="type" value="${esc(typ)}">`
      + `<div id="other-type" class="full" ${group === 'other' ? '' : 'hidden'}>${selectField('otherType', 'Tipo de movimento', [['transfer_out', typeLabels.transfer_out], ['transfer_in', typeLabels.transfer_in], ['yield', typeLabels.yield], ['settlement', typeLabels.settlement], ['card_payment', typeLabels.card_payment]], group === 'other' ? typ : 'transfer_out')}</div>`
      + moneyField('amount', 'Valor (R$)', t.amount || 0, { big: true, cls: 'full' })
      + field('description', 'Descrição', t.description || '', 'text', 'maxlength="120" required placeholder="Ex.: Mercado, Uber, salário"', 'full')
      + `<label>Categoria<input name="category" list="tx-cats" maxlength="120" required value="${esc(t.category || '')}" placeholder="Escolha ou digite"></label><datalist id="tx-cats">${[...new Set([...CATEGORIES, ...data.transactions.map(x => x.category)])].map(c => `<option value="${esc(c)}">`).join('')}</datalist>`
      + field('date', 'Data', t.date || defaultDate, 'date', `min="${month}-01" max="${month}-${lastDay}" required`)
      + selectField('method', 'Forma de pagamento', ['Pix', 'Débito', 'Dinheiro', 'Crédito', 'Não informado'], t.method || 'Pix')
      + `<div id="credit-kind" class="${''}" hidden>${selectField('creditKind', 'Tipo de crédito', [['card', 'Compra no cartão'], ['pix-credit', 'Pix no crédito']], t.creditKind || 'card')}</div>`
      + `<div id="reference-field" class="full"></div>`;
    help = 'Gastos no crédito entram na fatura do cartão; Pix, débito e dinheiro saem da conta escolhida.';
  }
  $('fields').innerHTML = html;
  $('form-help').textContent = help;
  if (kind === 'transaction') wireTransaction(value);
  $('editor').showModal();
  const first = $('fields').querySelector(kind === 'transaction' ? '[name=amount]' : 'input:not([type=hidden]):not([readonly])');
  first?.focus();
}

function wireTransaction(value) {
  const form = $('form');
  const typeInput = form.elements.type;
  const pick = form.querySelector('.type-pick');
  const effectiveType = () => typeInput.value;
  pick.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    pick.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('other-type').hidden = b.dataset.kind !== 'other';
    typeInput.value = b.dataset.kind === 'out' ? 'expense' : b.dataset.kind === 'in' ? 'income' : form.elements.otherType.value;
    if (b.dataset.kind === 'in' && !form.elements.category.value) form.elements.category.value = 'Salário';
    refresh();
  };
  form.elements.otherType.onchange = () => { typeInput.value = form.elements.otherType.value; refresh(); };
  form.elements.description.addEventListener('input', () => {
    const d = form.elements.description.value;
    if (form.elements.category.dataset.touched) return;
    const g = GUESS.find(([re]) => re.test(d));
    if (g) form.elements.category.value = g[1];
  });
  form.elements.category.addEventListener('input', () => form.elements.category.dataset.touched = '1');
  if (value.category) form.elements.category.dataset.touched = '1';
  function refresh() {
    const ty = effectiveType();
    const incoming = ['income', 'yield', 'transfer_in', 'settlement'].includes(ty);
    const m = form.elements.method;
    if (ty === 'card_payment') m.value = 'Crédito';
    [...m.options].forEach(o => { o.disabled = (o.value === 'Crédito' && incoming) || (ty === 'card_payment' && o.value !== 'Crédito'); });
    if (incoming && m.value === 'Crédito') m.value = 'Pix';
    const credit = m.value === 'Crédito';
    $('credit-kind').hidden = !credit || ty !== 'expense';
    const current = form.elements.reference?.value;
    const list = credit ? data.cards : data.accounts;
    const pref = current || (credit ? value.cardId : value.accountId) || (list.length === 1 ? list[0].id : '') || '';
    if (list.length) {
      $('reference-field').innerHTML = selectField('reference', credit ? 'Cartão' : 'Conta ou carteira', [['', 'Escolha…'], ...list.map(a => [a.id, a.name]), ['__new', credit ? '＋ Cadastrar novo cartão' : '＋ Cadastrar nova conta']], pref);
      form.elements.reference.onchange = () => { if (form.elements.reference.value === '__new') showNewRef(credit); };
    } else showNewRef(credit);
  }
  function showNewRef(credit) {
    $('reference-field').innerHTML = `<label>${credit ? 'Nome do novo cartão' : 'Nome da nova conta'}<input name="newRef" maxlength="120" placeholder="${credit ? 'Ex.: Nubank crédito' : 'Ex.: Nubank'}" required></label><input type="hidden" name="reference" value="__new">`;
  }
  form.elements.method.onchange = refresh;
  refresh();
}

function readMoney(form, name) {
  const inp = form.elements[name];
  if (!inp) return 0;
  if (!inp.value.trim()) return 0;
  const v = parseMoney(inp.value);
  const label = inp.closest('label').firstChild.textContent.replace(' (R$)', '');
  if (Number.isNaN(v)) throw new Error('Valor inválido em: ' + label + '.');
  if (v < 0 && !inp.hasAttribute('data-signed')) throw new Error(label + ' não pode ser negativo.');
  return v;
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!editing || busy) return;
  const form = e.currentTarget;
  const val = k => String(form.elements[k]?.value || '').trim();
  const { kind, id } = editing;
  const next = structuredClone(data);
  try {
    if (kind === 'budget') { next.income = readMoney(form, 'income'); next.remaining = readMoney(form, 'remaining'); }
    else if (kind === 'limit') {
      const cat = val('cat'); const lim = readMoney(form, 'limit');
      if (!cat) throw new Error('Escolha a categoria.');
      if (lim <= 0) throw new Error('Informe um limite maior que zero.');
      next.budgets = { ...(next.budgets || {}), [cat]: lim };
    } else {
      let item = { ...(id ? data[keyMap[kind]].find(x => x.id === id) : {}), id: id || uid() };
      if (kind === 'account') Object.assign(item, { name: val('name'), details: val('details'), balance: readMoney(form, 'balance') });
      if (kind === 'card') Object.assign(item, { name: val('name'), opening: readMoney(form, 'opening'), dueDate: val('dueDate'), invoiceMonth: val('invoiceMonth'), invoiceTotal: readMoney(form, 'invoiceTotal'), invoiceCarry: readMoney(form, 'invoiceCarry'), invoiceBase: cardSpending(next, item.id) });
      if (kind === 'investment') Object.assign(item, { name: val('name'), principal: readMoney(form, 'principal'), yield: readMoney(form, 'yield'), asOfDate: val('asOfDate') });
      if (kind === 'transaction') {
        const method = val('method'), credit = method === 'Crédito', type = val('type');
        let reference = val('reference');
        if (reference === '__new') {
          const name = val('newRef');
          if (!name) throw new Error(credit ? 'Dê um nome ao novo cartão.' : 'Dê um nome à nova conta.');
          reference = uid();
          if (credit) next.cards.push({ id: reference, name, opening: 0, dueDate: '' });
          else next.accounts.push({ id: reference, name, balance: 0, details: '' });
        }
        if (!reference) throw new Error(credit ? 'Escolha o cartão.' : 'Escolha a conta ou carteira.');
        const amount = readMoney(form, 'amount');
        if (amount <= 0) throw new Error('Informe um valor maior que zero.');
        Object.assign(item, { type, description: val('description'), category: val('category') || 'Outros', amount, date: val('date'), method, accountId: credit ? '' : reference, cardId: credit ? reference : '', creditKind: credit ? (type === 'expense' ? val('creditKind') || 'card' : 'card') : '' });
        if (!item.description) throw new Error('Escreva uma descrição.');
      }
      const list = next[keyMap[kind]], index = list.findIndex(x => x.id === id);
      if (index >= 0) list[index] = item; else list.push(item);
    }
  } catch (err) { $('form-error').textContent = err.message; return; }
  if (await persist(next)) { $('editor').close(); toast(demo ? 'Atualizado no exemplo (não é salvo)' : kind === 'transaction' ? 'Lançamento salvo' : 'Alterações salvas'); }
});

$('delete').onclick = async () => {
  if (busy || !editing?.id) return;
  const { kind, id } = editing;
  if ((kind === 'account' || kind === 'card') && data.transactions.some(t => t.accountId === id || t.cardId === id)) { $('form-error').textContent = 'Há lançamentos nesta conta ou cartão. Mova ou exclua esses lançamentos antes.'; return; }
  const del = $('delete');
  if (!del.dataset.confirm) { del.dataset.confirm = 'yes'; del.textContent = 'Confirmar exclusão'; return; }
  const next = structuredClone(data);
  if (kind === 'limit') { next.budgets = { ...(next.budgets || {}) }; delete next.budgets[id]; }
  else next[keyMap[kind]] = next[keyMap[kind]].filter(x => x.id !== id);
  if (await persist(next)) { $('editor').close(); toast('Excluído'); }
};
$('close').onclick = () => $('editor').close();
document.querySelector('[data-close-editor]').onclick = () => $('editor').close();
$('editor').addEventListener('cancel', e => { if (busy) e.preventDefault(); });
// formata valores ao sair do campo
document.addEventListener('focusout', e => {
  const t = e.target;
  if (t.matches?.('[data-money]') && t.value.trim()) { const v = parseMoney(t.value); if (!Number.isNaN(v)) t.value = (v < 0 ? '-' : '') + centsToInput(Math.abs(v)); }
});

/* ---------------- copiar mês anterior ---------------- */
async function copyPrevious() {
  if (busy) return;
  const p = shiftMonth(month, -1);
  let prev = prevFor === p ? prevData : null;
  try { if (!prev) prev = (await fetchMonth(p)).data; } catch (e) { toast(e.message); return; }
  if (!prev.accounts.length && !prev.cards.length) { toast('O mês anterior não tem contas nem cartões.'); return; }
  const c = calculate(prev);
  const next = structuredClone(data);
  const has = (list, name) => list.some(x => x.name.trim().toLowerCase() === name.trim().toLowerCase());
  let added = 0;
  prev.accounts.forEach(a => { if (!has(next.accounts, a.name)) { next.accounts.push({ id: uid(), name: a.name, details: a.details || '', balance: c.balances[a.id] ?? a.balance }); added++; } });
  prev.cards.forEach(cd => {
    if (has(next.cards, cd.name)) return;
    let due = '';
    if (cd.dueDate) { const day = Math.min(Number(cd.dueDate.slice(8)), daysIn(month)); due = month + '-' + String(day).padStart(2, '0'); }
    next.cards.push({ id: uid(), name: cd.name, opening: 0, dueDate: due }); added++;
  });
  prev.investments.forEach(i => { if (!has(next.investments, i.name)) { next.investments.push({ id: uid(), name: i.name, principal: Math.max(0, i.principal + i.yield), yield: 0 }); added++; } });
  if (prev.budgets && !next.budgets) next.budgets = { ...prev.budgets };
  if (!added && !prev.budgets) { toast('Tudo do mês anterior já está aqui.'); return; }
  if (await persist(next)) toast(`${added} item${added === 1 ? '' : 's'} copiado${added === 1 ? '' : 's'} de ${monthOnly(p)}`);
}
$('copy-prev').onclick = copyPrevious;
$('copy-prev-2').onclick = () => { $('settings').close(); copyPrevious(); };

/* ---------------- importar / exportar ---------------- */
$('export-csv').onclick = () => download(`finora-${month}.csv`, toCSV(data, typeLabels), 'text/csv;charset=utf-8');
$('export-json').onclick = () => download(`finora-${month}.json`, JSON.stringify({ app: 'finora', month, data }, null, 2), 'application/json');
$('import-file').onchange = async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const { next, added, skipped } = mergeImport(data, parsed, month);
    if (!added) { $('import-result').textContent = `Nada novo para importar (${skipped} repetido${skipped === 1 ? '' : 's'}).`; return; }
    if (await persist(next)) { $('import-result').textContent = `${added} lançamento${added === 1 ? '' : 's'} importado${added === 1 ? '' : 's'}, ${skipped} repetido${skipped === 1 ? '' : 's'} ignorado${skipped === 1 ? '' : 's'}.`; toast('Importação concluída'); }
    else $('import-result').textContent = 'O arquivo tem dados que não batem com este mês. Confira as datas e as contas.';
  } catch (err) { $('import-result').textContent = 'Não foi possível ler o arquivo: ' + err.message; }
};

/* ---------------- modo exemplo ---------------- */
let realMonth = null;
$('start-demo').onclick = () => { demo = true; realMonth = month; prevFor = ''; monthsCache = null; document.body.classList.add('is-demo'); $('demo-bar').hidden = false; load(calendarDay.slice(0, 7)); };
$('exit-demo').onclick = () => { demo = false; prevFor = ''; monthsCache = null; for (const k in historyCache) delete historyCache[k]; $('demo-bar').hidden = true; load(realMonth || calendarDay.slice(0, 7)); };

/* ---------------- navegação ---------------- */
const PAGES = ['overview', 'transactions', 'budgets', 'accounts', 'investments', 'history'];
const TITLES = { overview: 'Visão geral', transactions: 'Lançamentos', budgets: 'Orçamentos', accounts: 'Contas e cartões', investments: 'Investimentos', history: 'Histórico' };
function route() {
  const key = location.hash.slice(1);
  page = PAGES.includes(key) ? key : 'overview';
  document.querySelectorAll('.page').forEach(p => p.hidden = p.dataset.page !== page);
  document.querySelectorAll('[data-nav]').forEach(a => { a.classList.toggle('active', a.dataset.nav === page); if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = TITLES[page] + ' · Finora';
  hideTip();
  if ($('more-sheet').open) $('more-sheet').close();
  if (page === 'history' && loaded) renderHistory();
  if (page === 'transactions' && loaded) renderTransactions();
  if (page === 'overview' && loaded) { renderHero(); renderDaily(); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

function syncMonthInput() { $('month').value = month; $('month-title').textContent = monthName(month); }
$('month').onchange = () => { if ($('month').value) load($('month').value); };
$('prev-month').onclick = () => load(shiftMonth(month, -1));
$('next-month').onclick = () => load(shiftMonth(month, 1));
$('reload').onclick = () => { monthsCache = null; prevFor = ''; for (const k in historyCache) delete historyCache[k]; load(month); };

document.addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]');
  if (ed) { openEditor(ed.dataset.edit, ed.dataset.id); return; }
  const m = e.target.closest('[data-month]');
  if (m && !busy) { load(m.dataset.month); location.hash = '#overview'; }
});
document.querySelectorAll('[data-series]').forEach(b => b.onclick = () => { series = b.dataset.series; document.querySelectorAll('[data-series]').forEach(x => x.setAttribute('aria-selected', x === b)); renderDaily(); });
document.querySelectorAll('[data-group]').forEach(b => b.onclick = () => { group = b.dataset.group; document.querySelectorAll('[data-group]').forEach(x => x.setAttribute('aria-selected', x === b)); renderTransactions(); });
document.querySelectorAll('[data-ftype]').forEach(b => b.onclick = () => { fType = b.dataset.ftype; document.querySelectorAll('[data-ftype]').forEach(x => x.classList.toggle('on', x === b)); renderTransactions(); });
$('tx-cat').onchange = () => { fCat = $('tx-cat').value; renderTransactions(); };
$('tx-search').oninput = () => { fSearch = $('tx-search').value; renderTransactions(); };
$('clear-day').onclick = () => { fDay = 0; renderTransactions(); };
const newTx = () => openEditor('transaction');
$('new-transaction').onclick = newTx;
$('tab-add').onclick = newTx;
$('tab-more').onclick = () => $('more-sheet').showModal();
$('more-settings').onclick = () => { $('more-sheet').close(); openSettings(); };
document.querySelectorAll('dialog [data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d && !busy) d.close(); }));

/* ---------------- tema ---------------- */
const ACCENTS = ['#a98bff', '#6fb6ff', '#4fe0b0', '#ff8fb1', '#ffb35c'];
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('finora-theme', t); } catch {} document.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('on', b.dataset.themeSet === t)); document.querySelector('meta[name=theme-color]').content = t === 'light' ? '#f4f1fa' : '#120e1c'; if (loaded) render(); }
function setAccent(c) { document.documentElement.style.setProperty('--accent', c); try { localStorage.setItem('finora-accent', JSON.stringify(c)); } catch {} document.querySelectorAll('#swatches button').forEach(b => b.classList.toggle('on', b.dataset.c === c)); if (loaded) render(); }
$('swatches').innerHTML = ACCENTS.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Usar cor ${c}"></button>`).join('');
$('swatches').onclick = e => { const b = e.target.closest('button'); if (b) setAccent(b.dataset.c); };
document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => setTheme(b.dataset.themeSet));
$('toggle-theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
function openSettings() {
  const t = document.documentElement.dataset.theme || 'dark';
  document.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('on', b.dataset.themeSet === t));
  const cur = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  document.querySelectorAll('#swatches button').forEach(b => b.classList.toggle('on', b.dataset.c === cur));
  $('import-result').textContent = '';
  $('settings').showModal();
}
$('open-settings').onclick = openSettings;

/* ---------------- teclado, foco e calendário ---------------- */
document.addEventListener('keydown', e => {
  if (e.target.closest('input,select,textarea') || document.querySelector('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newTx(); }
  else if (e.key === 'ArrowLeft') load(shiftMonth(month, -1));
  else if (e.key === 'ArrowRight') load(shiftMonth(month, 1));
  else if (e.key === '/') { e.preventDefault(); location.hash = '#transactions'; setTimeout(() => $('tx-search').focus(), 50); }
});
function refreshCalendar() {
  const cur = today();
  if (cur !== calendarDay) { const prevMonth = calendarDay.slice(0, 7); calendarDay = cur; if (cur.slice(0, 7) !== prevMonth && month === prevMonth && !document.querySelector('dialog[open]')) load(cur.slice(0, 7)); }
}
setInterval(refreshCalendar, 30000);
function syncAfterReturn() { refreshCalendar(); if (loaded && !busy && !demo && !document.querySelector('dialog[open]') && Date.now() - lastSyncAt > 5000) load(month, { quiet: true }); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAfterReturn(); });
window.addEventListener('focus', syncAfterReturn);
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (loaded) { renderHero(); renderDaily(); if (page === 'history') renderHistory(); } }, 150); });

route();
syncMonthInput();
if (new URLSearchParams(location.search).has('exemplo')) $('start-demo').click(); else load(month);
