# Viscosidade de Óleo Parafínico — Iniciação Científica

Site interativo desenvolvido para apresentar os resultados de uma pesquisa de Iniciação Científica sobre o comportamento de petróleos parafínicos: como a presença de água e diferentes inibidores químicos alteram a viscosidade e a deposição de parafina durante a produção e o transporte de óleo.

**🔗 Acesse o site:** https://projeto-gbdiiajoh-pd-s-projects2.vercel.app

## Sobre a pesquisa

Durante a produção e o transporte de petróleos parafínicos, a queda de temperatura favorece a formação e deposição de cristais de parafina, dificultando o escoamento do óleo. Este projeto investiga:

- Como a fase aquosa (o Óleo A hidratado, com ~30% de água) se compara ao óleo desidratado;
- O efeito de quatro inibidores diferentes (Éster C14, Éster C12, Polímero R1, Polímero R2) na viscosidade do óleo;
- Em quais condições a deposição de parafina é reduzida.

**Resultado em destaque:** o Éster C12 apresentou efeito de inibição no óleo desidratado.

Pesquisa conduzida por Pedro Barbosa (Engenharia de Controle e Automação, CEFET/RJ), sob orientação da Prof.ª Denise Gentili.

## Funcionalidades do site

- **Gráfico interativo** de viscosidade × temperatura, com filtro por condição (hidratado/desidratado), alternância entre escala linear e logarítmica, e seleção de amostras na legenda — construído do zero em Canvas API, sem bibliotecas de gráficos.
- **Comparação entre amostras**, calculando diferença absoluta e variação percentual entre uma amostra de referência e as demais, apenas nas temperaturas em comum.
- **Tabela de dados completa**, com busca, ordenação por coluna, filtros por amostra/condição e exportação para CSV.
- **Indicadores gerais (KPIs)** calculados dinamicamente a partir dos dados experimentais (nº de amostras, medições, faixa de temperatura, inibidores avaliados).
- Design editorial responsivo, com navegação por scroll spy e animações de entrada discretas.

## Tecnologias

HTML5 · CSS3 · JavaScript (vanilla, sem frameworks) · Canvas API

## Como rodar localmente

Não há build nem dependências — é um site estático.

```bash
git clone https://github.com/pd0107/projeto-IC.git
cd projeto-IC
# abra o index.html no navegador, ou sirva a pasta com um servidor local, por exemplo:
python3 -m http.server 8000
```

## Autor

**Pedro Barbosa** — Estudante de Engenharia de Controle e Automação, CEFET/RJ
[LinkedIn](https://www.linkedin.com/in/pedrobarbosarodrigues) · pedro010706@gmail.com

