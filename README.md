# Dashboard SGF/PPR automático

Dashboard estático para analisar cotações históricas dos fundos SGF/PPR.

## O que faz

- Descarrega diariamente o ficheiro Excel da Golden SGF:
  `https://goldensgf.pt/wp-content/uploads/2024/08/HISTORICO-DE-COTACOES.xlsx`
- Converte o Excel em `data/cotacoes.json`.
- Publica automaticamente o site em GitHub Pages usando GitHub Actions.
- Inclui gráficos, filtros, tabela dinâmica, exportação CSV e calculadora de investimento.

## Estrutura

```text
.
├── index.html
├── assets/
│   ├── app.js
│   └── styles.css
├── data/
│   └── cotacoes.json
├── scripts/
│   └── update_data.py
├── requirements.txt
└── .github/
    └── workflows/
        └── update-dashboard.yml
```

## Como instalar no GitHub

1. Cria um repositório novo no GitHub.
2. Faz upload de todos os ficheiros deste pacote para o repositório.
3. Vai a **Settings → Pages**.
4. Em **Build and deployment**, escolhe **Source: GitHub Actions**.
5. Vai a **Actions → Atualizar dashboard SGF/PPR**.
6. Clica em **Run workflow** para forçar a primeira publicação.
7. Depois disso, o workflow corre todos os dias às 08:30 UTC.

## Testar localmente

Como o dashboard lê `data/cotacoes.json` via `fetch`, pode não funcionar se abrires `index.html` diretamente com `file://`.
Usa um servidor local:

```bash
python -m http.server 8000
```

Depois abre:

```text
http://localhost:8000
```

## Atualização manual local

```bash
pip install -r requirements.txt
python scripts/update_data.py
python -m http.server 8000
```

## Notas

- O horário de `schedule` no GitHub Actions é em UTC.
- O ficheiro `data/historico_cotacoes.xlsx` é descarregado pelo script, mas não precisa de ser versionado.
- Se a Golden SGF alterar a estrutura do Excel, o script tem uma rotina defensiva para tentar normalizar o ficheiro.


## Melhorias visuais incluídas

- Layout mais limpo e responsivo para PC e telemóvel.
- Cartão de estado da atualização com semáforo:
  - Verde: última cotação até 3 dias.
  - Amarelo: última cotação entre 4 e 7 dias.
  - Vermelho: última cotação com mais de 7 dias ou sem dados.
- Atalhos de período: 1M, 3M, YTD, 1A, 5A e Tudo.
- Tooltip no gráfico com data, fundo, valor no gráfico e cotação original.
- Cartões e tabelas com melhor leitura em ecrãs pequenos.


## Substituição da secção "Dados filtrados"

A secção final passou a chamar-se **Análise do período selecionado** e inclui:

- Ranking do período por fundo.
- Retornos por horizonte: 1M, 3M, YTD, 1A, 3A, 5A e Total.
- Alertas de qualidade dos dados.
- Dados brutos escondidos num bloco expansível para debug/exportação.


## Correção v4

- Corrigida a tabela dinâmica/resumo para mostrar datas, cotações, retorno, anualizado, volatilidade e drawdown.
- Ajustado o visual da calculadora para evitar valores cortados com reticências.
