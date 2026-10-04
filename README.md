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

## Precificação em R$ e % do spot

A página **Estratégias** oferece dois modos sincronizados:

### R$ / Book
- strike em R$ e Bid/Ask em R$ são os campos principais;
- strike e prêmio em % do spot aparecem como leitura derivada.

### % do Spot · Spot = 100%
- o spot corrente é tratado como **100,00%**;
- cada perna mantém:
  - strike em % do spot;
  - strike real em R$;
  - código da série;
  - prêmio em % do spot;
  - prêmio em R$;
  - compra/venda, Call/Put, quantidade e IV;
- editar o strike percentual converte para o strike real usando o passo de strike configurado;
- editar o prêmio percentual converte para R$;
- alterar o spot não desloca automaticamente uma série já escolhida: o strike real permanece canônico e o percentual é recalculado.

O resumo econômico mostra também o prêmio líquido e bruto em % do spot. No modo percentual, gráficos, matriz de cenários e factsheet usam o eixo normalizado com **Spot = 100%**, mantendo os valores em R$ em paralelo.

## Modo de apresentação ao cliente

A montagem continua podendo ser feita em **% do spot (Spot = 100%)**, mas o **Factsheet JPG é sempre nominal em R$**, independentemente do modo usado na tela.

A camada `buildPresentationModel()` traduz a montagem técnica para apresentação comercial e centraliza:
- preço atual em R$;
- strikes reais em R$;
- prêmios em R$;
- break-even(s) em R$;
- P/L no vencimento em R$;
- P/L MTM em R$;
- referência percentual apenas como informação secundária.

O range do factsheet é calculado por `OptionEngine.presentationRange()`:
- estruturas limitadas: piso de aproximadamente ±20%;
- exposição relevante nas caudas: piso de aproximadamente ±30%;
- strikes e break-even(s) expandem a faixa automaticamente com folga;
- limite visual de até cerca de 60% por lado.

O gráfico do cliente usa:
- eixo X: **preço nominal do ativo (R$)**;
- eixo Y: **P/L total (R$)**;
- linha sólida: vencimento;
- linha pontilhada: MTM do cenário, quando a precificação estiver completa.

A matriz do factsheet usa:
- movimento percentual como contexto;
- ativo em R$;
- P/L vencimento em R$;
- P/L MTM em R$;
- retorno sobre risco quando aplicável;
- inserção automática de strikes, break-even(s), spot e cenário selecionado.

O canvas do factsheet é **1920×1080** e o JPG é gerado com qualidade **0,95**.

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
