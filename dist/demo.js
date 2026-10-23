// Dados fictícios para o modo exemplo. Nada aqui é salvo.
import { blank } from './core.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const pad = n => String(n).padStart(2, '0');
const daysIn = m => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();

export function demoMonth(month, untilDay) {
  const seed = Number(month.replace('-', ''));
  const r = rng(seed);
  const last = Math.min(daysIn(month), untilDay || 31);
  const d = blank();
  d.income = 640000;
  d.remaining = untilDay && untilDay < daysIn(month) ? 85000 : 0;
  d.accounts = [
    { id: 'demo-nubank', name: 'Nubank', balance: 182000, details: 'Conta principal' },
    { id: 'demo-picpay', name: 'PicPay', balance: 41000, details: 'Dia a dia' },
    { id: 'demo-carteira', name: 'Carteira', balance: 40000, details: 'Dinheiro em espécie' },
  ];
  const next = month.slice(0, 5) + pad(Number(month.slice(5)));
  d.cards = [
    { id: 'demo-nucard', name: 'Nubank crédito', opening: 0, dueDate: next + '-10' },
    { id: 'demo-mpcard', name: 'Mercado Pago crédito', opening: 24000, dueDate: next + '-' + pad(Math.min(25, daysIn(month))) },
  ];
  const grow = 1 + (Number(month.slice(5)) % 6) * 0.004;
  d.investments = [
    { id: 'demo-selic', name: 'Tesouro Selic', principal: Math.round(820000 * grow), yield: Math.round(7600 * grow) },
    { id: 'demo-cdb', name: 'CDB 110% do CDI', principal: Math.round(450000 * grow), yield: Math.round(4300 * grow) },
    { id: 'demo-caixinha', name: 'Caixinha reserva', principal: Math.round(260000 * grow), yield: Math.round(2100 * grow) },
  ];
  let n = 0;
  const tx = (day, type, description, category, amount, method, ref, extra = {}) => {
    if (day > last) return;
    const credit = method === 'Crédito';
    d.transactions.push({ id: 'demo-t' + (++n), type, description, category, amount: Math.round(amount), date: `${month}-${pad(day)}`, method, accountId: credit ? '' : ref, cardId: credit ? ref : '', creditKind: credit ? (extra.creditKind || 'card') : '' });
  };
  const v = (base, spread = 0.25) => base * (1 + (r() - 0.5) * spread);
  tx(5, 'income', 'Salário', 'Salário', 540000, 'Pix', 'demo-nubank');
  tx(12, 'income', 'Freela de landing page', 'Salário', v(95000, 0.6), 'Pix', 'demo-picpay');
  tx(1, 'yield', 'Rendimento da conta', 'Rendimentos', v(1800), 'Pix', 'demo-nubank');
  tx(6, 'expense', 'Aluguel', 'Moradia', 165000, 'Pix', 'demo-nubank');
  tx(8, 'expense', 'Conta de luz', 'Moradia', v(16000), 'Débito', 'demo-nubank');
  tx(9, 'expense', 'Internet fibra', 'Moradia', 11990, 'Débito', 'demo-nubank');
  tx(3, 'expense', 'Netflix', 'Assinaturas', 4490, 'Crédito', 'demo-nucard');
  tx(3, 'expense', 'Spotify', 'Assinaturas', 2190, 'Crédito', 'demo-nucard');
  tx(10, 'expense', 'Academia', 'Saúde', 11900, 'Crédito', 'demo-mpcard');
  tx(7, 'transfer_out', 'Aporte na reserva', 'Transferências', 50000, 'Pix', 'demo-nubank');
  const markets = ['Supermercado', 'Hortifruti', 'Padaria', 'Açougue'];
  const food = ['iFood', 'Almoço no centro', 'Pizzaria', 'Café com amigas'];
  const fun = ['Cinema', 'Show', 'Livraria', 'Barzinho'];
  for (let day = 1; day <= last; day++) {
    const x = r();
    if (day % 4 === 0) tx(day, 'expense', markets[day % 4 === 0 ? (day / 4) % 4 : 0], 'Alimentação', v(14000, 0.7), x > 0.5 ? 'Crédito' : 'Débito', x > 0.5 ? 'demo-nucard' : 'demo-nubank');
    if (x > 0.62) tx(day, 'expense', food[day % 4], 'Alimentação', v(4800, 0.8), 'Crédito', 'demo-nucard');
    if (x < 0.22) tx(day, 'expense', day % 2 ? 'Uber' : '99 App', 'Uber e 99', v(2300, 0.8), 'Pix', 'demo-picpay');
    if (day % 9 === 2) tx(day, 'expense', fun[day % 4], 'Lazer', v(7500, 0.8), 'Crédito', 'demo-mpcard');
    if (day % 11 === 5) tx(day, 'expense', 'Farmácia', 'Saúde', v(6400, 0.8), 'Pix', 'demo-picpay');
    if (day % 13 === 7) tx(day, 'expense', 'Roupas', 'Compras', v(18900, 0.6), 'Crédito', 'demo-mpcard', { creditKind: 'pix-credit' });
    if (day % 7 === 1) tx(day, 'expense', 'Feira', 'Alimentação', v(3800, 0.5), 'Dinheiro', 'demo-carteira');
    if (day % 10 === 4) tx(day, 'expense', 'Curso de UX', 'Educação', v(9700, 0.2), 'Crédito', 'demo-nucard');
  }
  d.budgets = { 'Alimentação': 120000, 'Moradia': 200000, 'Lazer': 30000, 'Uber e 99': 25000, 'Assinaturas': 8000, 'Compras': 30000 };
  return d;
}

export function demoMonths(current, count = 6) {
  const out = [];
  let [y, m] = current.split('-').map(Number);
  for (let i = 0; i < count; i++) {
    out.push({ month: `${y}-${pad(m)}`, updated_at: new Date().toISOString() });
    m--; if (!m) { m = 12; y--; }
  }
  return out;
}
