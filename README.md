# Finora

Controle financeiro pessoal, mês a mês: contas, cartões, lançamentos, orçamentos, investimentos e histórico em um só lugar.

**Ver online:** https://finora-painel-financeiro.vercel.app
**Explorar com dados fictícios:** https://finora-painel-financeiro.vercel.app/?exemplo

## O que ele faz

- **Mapa do dinheiro:** um gráfico de fluxo mostra as entradas se dividindo nas categorias de gasto e no que sobrou.
- **Ritmo do mês:** gastos e entradas por dia, com o saldo acumulado. Clicar em um dia abre os lançamentos dele.
- **Lançamentos** com busca, filtros por tipo, categoria e dia, agrupados por dia ou por conta e cartão. A categoria é sugerida pela descrição (Uber, iFood, aluguel…).
- **Orçamentos:** limite por categoria com alerta perto do limite e quando estoura, além da previsão de fim de mês.
- **Contas e cartões:** saldo atualizado a cada lançamento, faturas com vencimento, Pix no crédito separado.
- **Investimentos:** capital, rendimento do mês, rentabilidade e divisão da carteira.
- **Histórico:** evolução de entradas, saídas e sobra em cada mês salvo.
- **Leituras automáticas:** taxa de economia, maior categoria, comparação com o mês anterior, fatura vencendo, orçamento estourado, gastos com Uber e 99 e dias sem gastos.
- **Copiar contas e cartões do mês anterior**, já com o saldo final de cada conta.
- **Exportar** lançamentos em CSV e o mês completo em JSON; **importar** um JSON sem duplicar lançamentos.
- **Modo exemplo** com dados fictícios, tema claro e escuro, cor de destaque e atalhos de teclado (N, ← →, /).

## Como é feito

- Front-end em **HTML, CSS e JavaScript puro**, sem framework, em `dist/`. Gráficos desenhados em SVG (`dist/charts.js`).
- **API serverless na Vercel** (`api/month.js`, `api/months.js`) que salva cada mês no **Vercel Blob**. Cada navegador recebe um identificador próprio em cookie, então os dados ficam separados por pessoa.
- Regras de cálculo e validação compartilhadas entre front e API em `core.js` (cópia em `dist/core.js`).
- Valores guardados em centavos, para não haver erro de arredondamento.

## Rodar localmente

```bash
npm install
npx vercel dev
```

O Vercel Blob precisa da variável `BLOB_READ_WRITE_TOKEN`, criada automaticamente quando o projeto é ligado a um Blob store na Vercel.

---

Feito por **Eliane Vitoriano** · [portfólio](https://evi-dev.vercel.app)
