# Straddle | Evento Eleitoral 2026

Painel interativo da Jacarandá Investimentos para simulação de estruturas compradas de volatilidade em opções da B3 no contexto do 1º turno de 2026.

## Conteúdo

- BBAS3, B3SA3, PETR4 e CEAB3
- comparação 100% / 102% / 103%
- payoff no vencimento
- simulação de desmontagem em 05/10
- IV crush configurável
- matriz de cenários
- break-even e retorno sobre o prêmio
- comparação de convexidade

## Publicação

O site é servido pelo arquivo `index.html` na branch `main`.

Uso interno. Simulação ilustrativa; não constitui recomendação de investimento ou posição eleitoral.


## Duas camadas

- `index.html`: simulador base, preservado.
- `simulador-mercado.html`: versão beta pré-operacional com tentativa de captura automática do spot via Yahoo Finance, strikes reais/editáveis, Ask manual das opções, fee, custos, custo all-in, metas de retorno e range elástico.

A camada Mercado Beta usa dados indicativos e pode sofrer atraso ou indisponibilidade. Os preços das opções devem ser confirmados no book antes de qualquer execução.
