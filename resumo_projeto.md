# Resumo do projeto — pacote GitHub SGF/PPR

## Pedido
Preparar um pacote completo para publicar o dashboard SGF/PPR no GitHub Pages com atualização automática diária dos dados vindos de:

`https://goldensgf.pt/wp-content/uploads/2024/08/HISTORICO-DE-COTACOES.xlsx`

## O que foi criado

- `index.html` — página principal do dashboard.
- `assets/styles.css` — tema claro.
- `assets/app.js` — lógica do dashboard, gráficos, tooltip, filtros, tabela e calculadora.
- `data/cotacoes.json` — dados iniciais convertidos a partir do Excel disponível nesta conversa.
- `scripts/update_data.py` — descarrega o Excel da Golden SGF e gera `data/cotacoes.json`.
- `requirements.txt` — dependências Python.
- `.github/workflows/update-dashboard.yml` — GitHub Actions para atualizar dados e publicar no GitHub Pages.
- `README.md` — instruções de instalação e teste.

## Como funciona

1. O workflow corre em push, manualmente e todos os dias às 08:30 UTC.
2. O script Python descarrega o Excel.
3. O Excel é normalizado para JSON.
4. O GitHub Pages publica o site com os dados atualizados.

## Próximos passos

1. Criar repositório no GitHub.
2. Fazer upload do conteúdo do ZIP.
3. Ativar GitHub Pages com Source = GitHub Actions.
4. Correr manualmente o workflow uma primeira vez.
5. Abrir o URL do GitHub Pages.
