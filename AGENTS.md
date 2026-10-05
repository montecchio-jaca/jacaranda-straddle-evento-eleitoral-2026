# AGENTS.md - contexto obrigatorio

Antes de alterar este repositorio:

1. confirmar branch/base e HEAD no GitHub;
2. ler `docs/ai/PROJECT_STATE.md`;
3. ler `docs/ai/BRANCH_MAP.md`;
4. identificar a Issue e PR da tarefa;
5. definir criterio de aceite e validacao E2E;
6. pesquisar implementacao existente antes de duplicar logica.

## Regras

- GitHub e fonte de verdade tecnica; chats sao camada de trabalho.
- Uma Issue representa uma unidade de trabalho encerravel.
- Padrao de branch: `main -> feature/fix/docs -> PR -> validacao -> merge`.
- Nao criar pilha de branches sem necessidade.
- Nao alterar motor de payoff sem teste correspondente.
- Mudanca visual/publicada exige verificacao no navegador alvo quando relevante.
- Ao encerrar, registrar evidencias e proximo gate na Issue/PR.

Decisoes duraveis podem ser registradas em `docs/decisions/` quando realmente necessario.
