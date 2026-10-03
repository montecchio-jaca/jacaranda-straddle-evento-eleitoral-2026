# Estruturadas Jacarandá | Laboratório de Opções

Projeto estático da Jacarandá Investimentos para estudo, comparação e pré-precificação de estruturas com opções da B3.

## Camadas

- `index.html` — **Laboratório**: comparação de estruturas, payoff, break-even, convexidade, IV e cenários. Mantém o snapshot histórico que originou o projeto como estudo de caso.
- `simulador-mercado.html` — **Precificador Beta**: spot indicativo via snapshot automatizado, strikes reais/editáveis, Ask manual por perna, fee/custos, custo all-in, metas de retorno e range elástico.

## Market data beta

O navegador não consulta mais Yahoo Finance diretamente, evitando o bloqueio/CORS observado no GitHub Pages.

O workflow `.github/workflows/update-quotes.yml` atualiza `data/quotes.json` server-side em dias úteis, com brapi.dev como fonte primária e Yahoo Finance como fallback. O frontend lê esse arquivo no mesmo domínio do GitHub Pages.

Os dados são indicativos e podem ter atraso. Preços de opções e condições de execução devem ser confirmados no book da corretora.

## Publicação

GitHub Pages publica a branch `main`.

Uso interno. Simulação ilustrativa; não constitui recomendação de investimento.
