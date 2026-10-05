# Project State - Simulador de Estruturadas

Atualizado: 2026-10-04 BRT  
Repositorio: `montecchio-jaca/jacaranda-straddle-evento-eleitoral-2026`

## Papel

Simulador web de estruturas com payoff, comparacao, normalizacao por Spot e geracao de factsheet.

## Baseline

`main` e a baseline publicada e canonica.

## Estado atual

- modo Book / Spot = 100% foi implementado e publicado anteriormente;
- a issue #6 concentra o problema atual de Strangle customizado e salvamento JPG no Safari/iPhone;
- nao havia PR aberta no checkpoint anterior a esta governanca.

## Gate atual

A issue #6 concluiu que a assimetria observada e compativel com razao 10:1 e nao demonstra, por si so, erro do motor matematico.

Patch proposto:
- UX deve distinguir Razao de Lotes;
- strategy customizada deve ser identificada;
- fluxo JPG deve ser compativel com Safari/iPhone;
- regressao E2E publicada e obrigatoria.

## Invariantes

1. Nao alterar motor matematico sem evidencia e teste.
2. Tela, grafico, matriz e factsheet devem permanecer coerentes.
3. Preferencia Spot/Book e conversoes bidirecionais devem preservar dados da estrutura.
4. Mudanca publicada precisa de validacao E2E quando o bug depende do navegador.
5. Decisao permanente volta para GitHub; chat nao e fonte exclusiva.

## Proximo passo

Executar #6 em branch curta, abrir PR, validar desktop + Safari/iPhone e registrar aceite/regressao na Issue.
