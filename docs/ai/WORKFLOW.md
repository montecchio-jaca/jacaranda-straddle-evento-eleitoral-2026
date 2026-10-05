# Workflow - Simulador de Estruturadas

## Fluxo

```text
Issue
 -> branch curta
 -> implementacao
 -> testes
 -> PR
 -> validacao no navegador alvo
 -> publicacao/deploy
 -> E2E da versao publicada
 -> aceite na Issue
 -> merge/encerramento
```

## Context Gate

Antes da primeira escrita:

- Issue canonica;
- baseline e HEAD;
- escopo;
- criterio de aceite;
- risco de regressao em payoff, persistencia, comparador e factsheet;
- navegadores/dispositivos necessarios para validar.

## Regressao minima

Para mudancas estruturais no simulador, considerar:

- estruturas de 1 a 4 pernas;
- ativo + opcoes quando aplicavel;
- edicao R$ <-> percentual;
- mudanca de Spot;
- Book <-> Spot 100%;
- grafico;
- matriz;
- Comparador;
- factsheet JPG.

O conjunto exato depende da Issue; nao executar testes irrelevantes apenas por rotina.

## Handoff

Registrar na Issue/PR:

- o que mudou;
- testes executados;
- navegadores/dispositivos realmente validados;
- pendencias;
- proximo gate.
