# formatador-abnt

Formatação automática de trabalhos acadêmicos nas normas ABNT. Entra texto
estruturado, saem três coisas: um `.docx` editável, um `.pdf` e um **relatório
de conformidade** que aponta o que está fora da norma e cita qual norma é.

Formatação ABNT é regra determinística, não adivinhação. Este projeto trata
assim: as regras vivem em um arquivo de dados, o resultado é sempre o mesmo
para a mesma entrada, e tudo que ele corrige ou reclama tem uma cláusula de
norma atrás.

## Instalação

Precisa de Node 18 ou mais novo.

```bash
git clone https://github.com/rsbarroco/formatador-abnt.git
cd formatador-abnt
npm install
```

Opcionalmente, [LibreOffice](https://www.libreoffice.org/) — veja
[Geração do PDF](#geração-do-pdf).

## Uso

```bash
node src/cli.js meu-trabalho.md --out out/meu-trabalho
```

Produz `out/meu-trabalho.docx`, `out/meu-trabalho.pdf` e
`out/meu-trabalho.report.json`, e imprime o relatório no terminal.

| Flag | Efeito |
| --- | --- |
| `--out <caminho>` | Caminho de saída sem extensão. Padrão: o mesmo do arquivo de entrada. |
| `--no-pdf` | Gera só o `.docx` e o relatório. Bem mais rápido. |
| `--json` | Imprime o resultado como JSON em vez do relatório legível. |

O processo sai com código **1** quando encontra erro de norma e **0** quando
não encontra, então dá para usar em CI ou numa fila de jobs sem parsear a
saída:

```bash
node src/cli.js trabalho.md --out out/trabalho --no-pdf || echo "tem erro de norma"
```

Experimente com os exemplos inclusos:

```bash
npm run exemplo
npm run exemplo:erros
```

## Formato de entrada

Markdown reduzido com um bloco de metadados no topo, entre `---`. Os metadados
preenchem a capa e a folha de rosto; o corpo vira o documento.

```markdown
---
instituicao: Universidade Federal do Estado Exemplo
unidade: Centro de Ciencias Exatas e Tecnologia
curso: Engenharia de Software
autor: Maria Silva
titulo: Titulo do trabalho
subtitulo: subtitulo opcional
tipo: Trabalho de Conclusao de Curso
objetivo: parcial para a obtencao do grau de Bacharel
orientador: Prof. Dr. Nome do Orientador
local: Sao Paulo
ano: 2026
---

# Resumo

Um parágrafo único, como a NBR 6028 exige.

Palavras-chave: primeira; segunda; terceira.

# Introducao

Texto corrido. Fica justificado, com entrelinha 1,5 e recuo de 1,25 cm na
primeira linha, sem você precisar fazer nada.

> Citações entram com `>`. Se passarem de três linhas, viram citação longa
> automaticamente: recuo de 4 cm, corpo 10, espaçamento simples e sem aspas,
> como manda a NBR 10520 (SOBRENOME, 2023, p. 88).

## Secao secundaria

Use `##` e `###` para descer de nível. A numeração progressiva — 1, 1.1,
1.1.1 — é calculada sozinha.

# Consideracoes finais

Fechamento.

# Referencias

SOBRENOME, Nome. **Titulo da obra**. Local: Editora, 2023.
```

Resumindo a sintaxe:

| Escrita | Vira |
| --- | --- |
| `# Titulo` até `##### Titulo` | Seção de nível 1 a 5, numerada automaticamente |
| texto solto | Parágrafo justificado, 1,5, recuo 1,25 cm |
| `> texto` | Citação; longa ou curta decidido pelo tamanho |
| `**negrito**` e `*itálico*` | Negrito e itálico |
| `Palavras-chave: a; b; c.` | Bloco de palavras-chave do resumo |
| linhas após `# Referencias` | Uma referência por bloco, formatadas pela NBR 6023 |

Seções como **Resumo**, **Sumário**, **Referências**, **Anexo** e **Apêndice**
são reconhecidas pelo nome e ficam sem indicativo numérico, centralizadas,
como a NBR 6024 determina. As demais recebem numeração.

## O que ele aplica

| Regra | Norma |
| --- | --- |
| A4, margens 3 cm (esquerda e superior) e 2 cm (direita e inferior) | NBR 14724 5.2 |
| Arial 12, entrelinha 1,5, recuo de 1,25 cm na primeira linha | NBR 14724 5.2 |
| Citação longa: recuo 4 cm, corpo 10, espaço simples, sem aspas | NBR 10520 |
| Paginação no canto superior direito, a 2 cm da borda | NBR 14724 5.3 |
| Contagem começa na folha de rosto; número aparece só na introdução | NBR 14724 5.3 |
| Numeração progressiva das seções, sem ponto final | NBR 6024 |
| Capa e folha de rosto com natureza do trabalho recuada | NBR 14724 4.1 |
| Resumo em parágrafo único, seguido de palavras-chave | NBR 6028 |
| Referências à esquerda, espaço simples, ordem alfabética | NBR 6023 |
| Sumário como campo nativo do Word, atualizável | NBR 6027 |

A regra da paginação merece nota, porque é onde quase toda macro de Word erra:
a contagem de folhas começa na folha de rosto, mas o número só pode *aparecer*
a partir da primeira folha textual. O gerador resolve isso partindo o documento
em três seções — capa fora da contagem, pré-textuais contando com o número
oculto, textual continuando a contagem com o número visível.

## Relatório de conformidade

É a parte que separa isto de uma macro: além de formatar, ele diz o que está
errado. Rodando sobre `samples/trabalho-com-erros.md`:

```
Relatório de conformidade ABNT
------------------------------
seções: 4   citações: 1   referências: 2   citações longas: 1
erros: 8   avisos: 4   observações: 0

  [ERRO ] NBR 14724 4.1.2 — Folha de rosto sem instituição.
  [ERRO ] NBR 14724 4.2   — Falta a seção "Conclusão ou Considerações finais".
  [ERRO ] NBR 6028 4.1    — Resumo em 2 parágrafos; a norma pede parágrafo único.
  [ERRO ] NBR 6028 4.3    — Resumo sem palavras-chave.
  [ERRO ] NBR 6024 4.2    — Seção "..." pula do nível 1 para 3.
  [ERRO ] NBR 10520 5.1   — Citação longa sem indicação de autor, ano e página.
  [ERRO ] NBR 10520/6023  — Citação "MACHADO, 2019" não tem referência correspondente.
  [ERRO ] NBR 6023 4.1    — Lista de referências fora da ordem alfabética.
  [AVISO] NBR 6023 4.1    — Referência "SILVA, 2020" não é citada no texto.
```

O cruzamento **citação ↔ referência nos dois sentidos** é o mais útil: encontra
tanto a citação órfã (citou no texto, esqueceu de referenciar) quanto a
referência morta (listou na bibliografia, nunca citou). As duas custam nota, e
as duas passam despercebidas numa revisão manual de 80 páginas.

A severidade separa o que é verificável do que depende da instituição:

- **erro** — descumpre a norma de forma objetiva
- **aviso** — provável problema, mas o regulamento da sua faculdade pode diferir
- **info** — observação que vale conferir

O mesmo conteúdo sai estruturado em `<saida>.report.json`, para consumir em
outro programa.

## Como está organizado

```
src/rules.js      as regras da norma como dados — uma fonte só
src/parse.js      markdown + metadados -> blocos tipados
src/docx.js       blocos -> .docx (três seções, por causa da paginação)
src/html.js       blocos -> HTML paginado, usado para o PDF
src/pdf.js        LibreOffice se existir, senão Chrome headless
src/validate.js   relatório de conformidade
src/cli.js        linha de comando
```

`rules.js` é deliberadamente dados e não código. Trocar Arial por Times New
Roman, mudar a margem ou ajustar o limite de palavras do resumo é editar um
valor, não mexer no gerador:

```js
font: {
  family: 'Arial',
  bodyHalfPt: 24,    // 12 pt — a lib docx usa meio-pontos
  smallHalfPt: 20,   // 10 pt para citação longa, notas e paginação
},
```

Isso existe porque cada universidade publica o próprio manual de
normalização, com desvios da ABNT pura. A intenção é que um perfil por
instituição seja um objeto de configuração, não um fork.

## Geração do PDF

O gerador tenta duas estratégias, nesta ordem:

1. **LibreOffice** (`soffice`), convertendo o `.docx` já formatado. É a boa:
   preserva a paginação das três seções e o campo de sumário.
2. **Chrome headless**, imprimindo o HTML. Funciona em qualquer máquina com
   Chrome ou Edge, mas o Chrome não implementa as *margin boxes* de `@page`,
   então **esse PDF sai sem o número de folha**.

O `.docx` está correto nos dois casos. Se o PDF importa, instale o LibreOffice.

## Limitações conhecidas

- **Sumário no PDF** sai com os títulos e indicativos, sem o número da folha,
  pelo motivo acima. No `.docx` é campo nativo do Word e vem completo — abra e
  aceite a atualização de campos.
- **Citação longa** é decidida por estimativa de linhas: a contagem exata só
  existiria depois do layout. `charsPerLine()` deriva a estimativa da largura
  da mancha gráfica, o que erra em texto com palavras muito longas.
- **Entrada** é o markdown descrito acima. Ler `.docx` ou `.pdf` do usuário e
  converter para esse formato ainda não está implementado.
- **Faltam** folha de aprovação, errata, dedicatória, epígrafe, listas de
  ilustrações e anexos. A estrutura em `docx.js` já comporta — são funções de
  construção no mesmo molde de `buildCover` e `buildTitlePage`.
- O validador cobre as regras listadas acima. Documento sem achado é documento
  que passou **nessas** verificações, não um certificado de conformidade total.

## Licença

MIT. Veja [LICENSE](LICENSE).
