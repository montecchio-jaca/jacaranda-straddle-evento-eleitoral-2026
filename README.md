# Estruturadas Jacarandá

Ferramenta interna para montagem, pré-precificação e comparação de estratégias com opções da B3.

## Fluxo canônico

**Estratégias → Adicionar ao Comparador → Comparador**

### 1. Estratégias — `index.html`

Página inicial e motor canônico do produto.

Serve para:
- selecionar ativo do universo B3;
- escolher a estratégia pelo nome;
- montar até quatro pernas de opções e, quando aplicável, uma perna no ativo;
- informar/ajustar strikes e prêmios por perna;
- incorporar fee e custos;
- calcular fluxo inicial, ganho/perda máxima, break-even(s), IV por perna, payoff e MTM;
- gerar factsheet JPG;
- adicionar a montagem ao Comparador.

### 2. Comparador — `comparador.html`

Workspace analítico para comparar de duas a quatro montagens criadas em Estratégias.

Serve para:
- comparar resumo de risco de cada alternativa;
- sobrepor payoffs no vencimento;
- aplicar o mesmo choque percentual às estruturas;
- visualizar matriz comum de cenários;
- carregar casos arquivados.

O Comparador não remonta operações: ele consome montagens produzidas pela página Estratégias.

## Motor compartilhado

`js/options-engine.js` é a fonte comum para:
- payoff no vencimento;
- ganho/perda máxima;
- break-even(s);
- Black-Scholes-Merton;
- IV calibrada por perna;
- MTM por cenário;
- range automático.

Isso evita manter dois motores matemáticos independentes entre Estratégias e Comparador.

## Catálogo

`data/strategies.json` contém o catálogo canônico das estruturas implementadas, incluindo:
- calls e puts compradas/vendidas;
- covered call / financiamento;
- protective put;
- collar e fence;
- travas de alta/baixa;
- straddle e strangle;
- borboletas e condor;
- sintéticas;
- backspreads e ratios;
- box spread.

Calendar e Diagonal permanecem em backlog porque exigem múltiplos vencimentos por perna.

## Universo e market data

- `data/universe-b3.json`: universo diário de ações/units B3.
- `data/quotes.json`: snapshot indicativo de spot.
- `.github/workflows/update-universe.yml`: atualiza o universo.
- `.github/workflows/update-quotes.yml`: atualiza cotações delayed server-side.

Yahoo Finance é a fonte primária do spot e o snapshot do universo atua como fallback.

## Estudos arquivados

`data/studies.json` registra estudos históricos reutilizáveis no Comparador.

O primeiro caso preservado é **Volatilidade Eleitoral · 02/10/2026**, que originou o protótipo inicial de Straddle/Strangle.

A interface antiga completa foi preservada apenas como arquivo histórico em:

`archive/laboratorio-eleitoral-2026.html`

Ela não faz mais parte do fluxo principal.

## Compatibilidade

`simulador-mercado.html` permanece apenas como redirecionamento para `index.html`, preservando links antigos.

## Limitações atuais

- preços das opções ainda são informados manualmente;
- spot é delayed/indicativo;
- não calcula margem B3/corretora;
- MTM usa Black-Scholes-Merton como aproximação europeia;
- não modela exercício antecipado;
- Calendar/Diagonal ainda não estão implementados.

Uso interno. Simulação ilustrativa; não constitui recomendação de investimento. Antes de execução, validar séries, Bid/Ask, liquidez, lote, margem e condições efetivas na corretora.
