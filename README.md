# Site Selection · Escritórios

Plataforma para montar estudos de Site Selection de edifícios de escritório (SP e RJ) e gerar a apresentação em PPTX ou PDF.

- **Site:** https://site-selection-officebrasil.vercel.app
- **Banco:** Supabase, projeto `site-selection` (região São Paulo)
- **Hospedagem:** Vercel, projeto `site-selection`. Cada envio para a branch `main` publica sozinho.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Telas e estilos |
| `app.js` | Conexão com o Supabase, passos do estudo, busca, lâminas, fotos e importação da planilha |
| `slides.js` | Geração do PPTX e do PDF |
| `supabase/schema.sql` | Estrutura do banco (referência) |

Não há etapa de build: é um site estático. As bibliotecas (supabase-js, Leaflet, jsPDF, PptxGenJS, SheetJS) vêm do jsDelivr.

## Atualizar a base

Na tela **Base de edifícios**, envie a planilha exportada (.xls ou .xlsx). Os prédios são atualizados pelo ID; estudos, fotos e edições de lâmina são mantidos.

## Observação

O site não tem login: quem tiver o link consegue ver e alterar os dados. A chave do Supabase em `app.js` é a chave pública (anon), feita para ficar no navegador.
