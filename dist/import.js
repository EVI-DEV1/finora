// Importação e exportação de dados do mês.
const fingerprint = t => [t.date, String(t.description).trim().toLowerCase(), t.amount, t.type, t.method].join('|');
const sameName = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

/** Junta um arquivo exportado ao mês atual sem duplicar lançamentos. */
export function mergeImport(existing, parsed, month) {
  const incoming = parsed?.data && Array.isArray(parsed.data.transactions) ? parsed.data : parsed;
  if (!incoming || !Array.isArray(incoming.transactions)) throw new Error('o arquivo não parece ser um mês do Finora.');
  const next = structuredClone(existing);
  const maps = {};
  for (const key of ['accounts', 'cards', 'investments']) {
    maps[key] = {};
    for (const item of incoming[key] || []) {
      const found = next[key].find(x => x.id === item.id || sameName(x.name, item.name));
      if (found) maps[key][item.id] = found.id;
      else { const id = next[key].some(x => x.id === item.id) ? newId() : item.id; const copy = { ...item, id }; if (key === 'investments' && copy.asOfDate && copy.asOfDate.slice(0, 7) !== month) delete copy.asOfDate; next[key].push(copy); maps[key][item.id] = id; }
    }
  }
  const seen = new Set(next.transactions.map(t => fingerprint(t) + '|' + (t.accountId || t.cardId)));
  let added = 0, skipped = 0;
  for (const t of incoming.transactions) {
    if (!t?.date || t.date.slice(0, 7) !== month) { skipped++; continue; }
    const copy = { ...t, id: next.transactions.some(x => x.id === t.id) ? newId() : t.id };
    if (copy.accountId) copy.accountId = maps.accounts[copy.accountId] || copy.accountId;
    if (copy.cardId) copy.cardId = maps.cards[copy.cardId] || copy.cardId;
    const key = fingerprint(copy) + '|' + (copy.accountId || copy.cardId);
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key); next.transactions.push(copy); added++;
  }
  if (incoming.budgets && !next.budgets) next.budgets = { ...incoming.budgets };
  return { next, added, skipped };
}

export function toCSV(d, typeLabels) {
  const names = Object.fromEntries([...d.accounts, ...d.cards].map(x => [x.id, x.name]));
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Forma de pagamento', 'Conta ou cartão', 'Valor (R$)']];
  [...d.transactions].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    const out = !['income', 'yield', 'transfer_in', 'card_payment'].includes(t.type);
    rows.push([t.date.split('-').reverse().join('/'), t.description, t.category, typeLabels[t.type] || t.type, t.method, names[t.accountId || t.cardId] || '', ((out ? -1 : 1) * t.amount / 100).toFixed(2).replace('.', ',')]);
  });
  return '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
}

export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
