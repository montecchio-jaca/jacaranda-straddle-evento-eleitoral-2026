# Estruturadas Jacarandá | Laboratório de Opções

Projeto estático da Jacarandá Investimentos para estudo, comparação e pré-precificação de estruturas com opções da B3.

## Camadas

- `index.html` — **Laboratório**: comparação histórica, payoff, break-even, convexidade, IV e cenários.
- `simulador-mercado.html` — **Estratégias**: motor multi-pernas com catálogo por nome, universo B3, spot delayed, prêmios manuais por perna, fee, risco, payoff, MTM e factsheet JPG.
- `data/strategies.json` — catálogo canônico de estruturas e suas pernas.

## Catálogo implementado

### Essenciais
- Compra de Call
- Venda de Call
- Compra de Put
- Venda de Put (cash-secured)
- Financiamento / Covered Call
- Protective Put
- Collar
- Trava de Alta com Calls
- Trava de Baixa com Puts
- Straddle Comprado
- Strangle Comprado

### Comuns
- Fence / Collar Financiado
- Trava de Alta com Puts (crédito)
- Trava de Baixa com Calls (crédito)
- Borboleta de Calls
- Iron Butterfly
- Iron Condor
- Long Sintético

### Avançadas
- Straddle Vendido
- Strangle Vendido
- Condor Comprado de Calls
- Short Sintético
- Call Backspread 1x2
- Put Backspread 1x2
- Ratio Call Spread 1x2 vendido
- Box Spread

Calendar Spread e Diagonal Spread estão registrados como backlog porque exigem múltiplos vencimentos e uma camada adicional de marcação a mercado por perna.

> Liquidez é uma característica das séries utilizadas em cada perna, não da estratégia em abstrato. Antes de executar, validar Bid/Ask, spread, volume, open interest quando disponível, lote, estilo de exercício e vencimento.

## Motor de cálculo

Cada estrutura é formada por:
- zero ou uma perna no ativo;
- uma a quatro pernas de opções;
- lado de compra/venda;
- Call/Put;
- quantidade relativa;
- strike;
- preço de entrada;
- código opcional da série.

O motor calcula:
- fluxo inicial de opções;
- fee/custos;
- notional da perna no ativo;
- P/L no vencimento;
- ganho/perda máxima quando determináveis;
- perda ilimitada na alta quando a inclinação terminal é negativa;
- break-even(s);
- IV calibrada por perna pelo Black-Scholes-Merton;
- MTM em uma data de cenário;
- gráfico de payoff e matriz de movimentos.

A ferramenta **não calcula margem B3/corretora**.

## Universo B3

O workflow `.github/workflows/update-universe.yml` reconstrói diariamente `data/universe-b3.json`.

Escopo:
- ações e units classificadas como `stock`;
- mercado padrão, sufixos 3–8 e 11;
- exclusão do mercado fracionário, direitos/recibos, fundos e BDRs.

A fonte de descoberta do universo é `brapi.dev /api/quote/list?type=stock`.

## Cotações indicativas

O navegador não consulta Yahoo Finance diretamente.

O workflow `.github/workflows/update-quotes.yml` atualiza `data/quotes.json` server-side em dias úteis. Para cada ativo:
1. Yahoo Finance é a fonte primária do spot;
2. o snapshot diário do universo é fallback;
3. o frontend lê o JSON no mesmo domínio do GitHub Pages.

Os dados são indicativos e podem ter atraso.

## Prêmios e volatilidade implícita

Nesta fase, os preços das opções permanecem manuais por perna:
- para compra, usar preferencialmente Ask;
- para venda, usar preferencialmente Bid.

A IV de cada perna é calibrada pelo modelo a partir do prêmio informado, strike, spot, prazo e premissas de taxa/dividend yield.

Essas IVs são **estimativas do modelo**, não uma superfície oficial de volatilidade capturada do mercado.

## Factsheet

A aba Estratégias possui **Gerar Factsheet JPG**, com:
- ativo e estratégia;
- pernas;
- spot;
- prêmios;
- fluxo inicial;
- fee/custos;
- ganho/perda máxima;
- break-evens;
- IV por perna;
- payoff.

## Publicação

GitHub Pages publica a branch `main`.

Uso interno. Simulação ilustrativa; não constitui recomendação de investimento. Antes de qualquer execução, preços, liquidez, séries, margem e condições efetivas devem ser confirmados no book e na corretora.
