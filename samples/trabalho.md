---
instituicao: Universidade Federal do Estado Exemplo
unidade: Centro de Ciencias Exatas e Tecnologia
curso: Engenharia de Software
autor: Rodrigo Barroco
titulo: Deteccao automatica de conteudo gerado por modelos de linguagem
subtitulo: uma abordagem estatistica sem dependencia de servicos externos
tipo: Trabalho de Conclusao de Curso
objetivo: parcial para a obtencao do grau de Bacharel em Engenharia de Software
orientador: Prof. Dr. Nome do Orientador
local: Sao Paulo
ano: 2026
---

# Resumo

Este trabalho investiga metodos estatisticos para distinguir texto escrito por pessoas de texto gerado por modelos de linguagem de grande porte, com foco em tecnicas que dispensem o acesso a servicos proprietarios de deteccao. Parte-se da hipotese de que a previsibilidade local do texto, medida por perplexidade e por sua variacao ao longo das sentencas, carrega sinal suficiente para a classificacao em portugues brasileiro. Foram implementados tres estimadores: perplexidade media sob um modelo de linguagem aberto, variacao da perplexidade entre sentencas vizinhas e razao entre tipos e ocorrencias lexicais. Os estimadores foram combinados por regressao logistica e avaliados sobre um corpus balanceado de redacoes academicas e textos sinteticos produzidos por quatro modelos distintos. Os resultados indicam que a variacao da perplexidade e o preditor isolado mais informativo, e que a combinacao dos tres supera cada um deles em area sob a curva. Discute-se o impacto da edicao humana posterior sobre a deteccao e os limites eticos do uso desses sistemas em avaliacao escolar.

Palavras-chave: deteccao de texto sintetico; perplexidade; modelos de linguagem; processamento de linguagem natural.

# Introducao

A disseminacao de modelos de linguagem de grande porte alterou de forma rapida o modo como textos academicos sao produzidos. Instituicoes de ensino passaram a demandar instrumentos capazes de estimar a origem de um texto submetido, e um mercado de servicos de deteccao se formou em resposta a essa demanda. Segundo Ferreira (2024), a maior parte desses servicos opera como caixa preta, sem publicar metrica de erro nem corpus de validacao.

Essa opacidade cria um problema pratico para quem precisa auditar a decisao. A literatura registra taxas elevadas de falso positivo em textos de autores nao nativos, o que transfere o custo do erro justamente para o grupo mais vulneravel.

> A adocao de detectores automaticos em contextos de avaliacao exige que a instituicao assuma responsabilidade pelo erro do instrumento, e nao apenas pelo seu acerto. Enquanto a taxa de falso positivo permanecer desconhecida para o avaliador, a decisao administrativa apoiada nesse instrumento carece de base defensavel, porque nao ha como estimar quantos estudantes foram incorretamente acusados (SANTOS, 2023, p. 88).

Este trabalho propoe um caminho alternativo, baseado em estimadores estatisticos auditaveis.

## Objetivo geral

Avaliar se estimadores estatisticos de previsibilidade textual, calculados sobre modelos de linguagem abertos, sao suficientes para classificar a origem de textos academicos em portugues brasileiro.

## Objetivos especificos

Implementar os estimadores de perplexidade media, variacao de perplexidade e diversidade lexical; construir um corpus balanceado de textos humanos e sinteticos; e comparar o desempenho dos estimadores isolados e combinados.

# Fundamentacao teorica

A perplexidade mede o quanto um modelo de linguagem se surpreende com uma sequencia. Textos gerados por amostragem de baixa temperatura tendem a apresentar perplexidade baixa e uniforme, porque o gerador escolhe continuacoes de alta probabilidade a cada passo.

## Perplexidade e variacao

Oliveira (2022) observa que a media isolada discrimina mal, porque autores humanos experientes tambem produzem texto previsivel. A variacao entre sentencas vizinhas captura algo distinto: a escrita humana alterna trechos densos e trechos simples, enquanto a geracao automatica mantem um registro mais constante.

## Limites conhecidos

A edicao humana posterior degrada rapidamente o sinal. Reescrever uma sentenca em cada paragrafo e suficiente para elevar a variacao a faixa tipicamente humana, como demonstram Costa e Lima (2023).

# Metodologia

O corpus reune mil e duzentos textos, metade humanos e metade sinteticos, com extensao entre trezentas e mil e duzentas palavras. Os textos humanos vem de repositorios institucionais publicos anteriores a 2021; os sinteticos foram gerados por quatro modelos, com temperatura sorteada no intervalo usual de uso.

Cada texto foi tokenizado e submetido ao calculo dos tres estimadores. A combinacao se deu por regressao logistica com validacao cruzada em cinco particoes estratificadas.

# Resultados

A variacao da perplexidade alcancou area sob a curva de 0,87 isoladamente. A perplexidade media ficou em 0,79 e a diversidade lexical em 0,71. O modelo combinado atingiu 0,91.

O desempenho cai para 0,74 quando os textos sinteticos passam por edicao humana leve, confirmando a fragilidade apontada na fundamentacao.

# Consideracoes finais

Os estimadores avaliados sustentam um classificador util como sinal de triagem, mas insuficiente como prova isolada. Recomenda-se que qualquer uso institucional publique a taxa de falso positivo medida sobre o proprio publico da instituicao, e que a decisao final permaneca humana.

Trabalhos futuros devem investigar estimadores robustos a edicao posterior e a calibracao por perfil de autor.

# Referencias

COSTA, Ana Paula; LIMA, Bruno. **Robustez de detectores de texto sintetico sob edicao humana**. Revista Brasileira de Computacao, Campinas, v. 15, n. 2, p. 44-61, 2023.

FERREIRA, Marcos. **Auditoria de sistemas opacos de deteccao**. 2. ed. Rio de Janeiro: Editora Exemplo, 2024.

OLIVEIRA, Clara. Perplexidade como preditor de autoria automatica. **Cadernos de Linguistica Computacional**, Sao Paulo, v. 9, n. 1, p. 12-30, 2022.

SANTOS, Helena. **Avaliacao escolar e instrumentos automaticos**. Belo Horizonte: Editora Universitaria, 2023.
