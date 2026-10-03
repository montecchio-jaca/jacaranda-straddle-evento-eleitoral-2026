# Estruturadas Jacarandá | Laboratório de Opções

Projeto estático da Jacarandá Investimentos para estudo, comparação e pré-precificação de estruturas com opções da B3.

## Camadas

- `index.html` — **Laboratório**: comparação de estruturas, payoff, break-even, convexidade, IV e cenários. Mantém o snapshot histórico que originou o projeto como estudo de caso.
- `simulador-mercado.html` — **Precificador Beta**: spot indicativo via snapshot automatizado, busca no universo B3, strikes reais/editáveis, Ask manual por perna, fee/custos, custo all-in, metas de retorno, IV calibrada por estrutura/perna, range elástico e geração de factsheet JPG.

## Universo B3

O workflow `.github/workflows/update-universe.yml` reconstrói diariamente `data/universe-b3.json`.

Escopo atual:
- ações e units classificadas como `stock`;
- mercado padrão, sufixos 3–8 e 11;
- exclusão do mercado fracionário, direitos/recibos, fundos e BDRs.

A fonte de descoberta do universo é `brapi.dev /api/quote/list?type=stock`.

## Cotações indicativas

O navegador não consulta Yahoo Finance diretamente. Isso evita o bloqueio/CORS observado no GitHub Pages.

O workflow `.github/workflows/update-quotes.yml` atualiza `data/quotes.json` server-side em dias úteis, a cada 30 minutos na janela configurada. Para cada ativo:
1. Yahoo Finance é a fonte primária do spot;
2. o preço do snapshot diário do universo é usado como fallback quando necessário;
3. o frontend lê o JSON no mesmo domínio do GitHub Pages.

Os dados são indicativos e podem ter atraso. O horário de mercado do snapshot é exibido na interface.

## Prêmios e volatilidade implícita

Nesta fase, os preços das opções permanecem manuais:
- Ask Call;
- Ask Put;
- códigos e strikes reais.

Quando os Asks são informados, o painel calcula IV Call e IV Put separadamente. A IV total da estrutura também pode ser calibrada pelo modelo Black-Scholes-Merton.

Essas IVs são **estimativas do modelo a partir dos prêmios informados**. Não representam uma superfície oficial de volatilidade capturada do mercado.

Para os quatro ativos do estudo inicial, a ferramenta ainda pode usar a tabela histórica de prêmio como fallback ilustrativo quando os Asks estiverem vazios.

## Factsheet

O Precificador Beta possui **Gerar Factsheet JPG**, com:
- ativo e estrutura;
- spot e fonte;
- strikes e prêmios;
- custo all-in e quantidade;
- break-evens;
- IV calibrada;
- matriz de cenários;
- payoff.

## Publicação

GitHub Pages publica a branch `main`.

Uso interno. Simulação ilustrativa; não constitui recomendação de investimento. Antes de qualquer execução, preços, liquidez, séries e condições efetivas devem ser confirmados no book da corretora.
