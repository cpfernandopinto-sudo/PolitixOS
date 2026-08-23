# PolitixOS — Facebook — Diagnóstico final do provider RapidAPI

Data: 2026-08-22 (America/Sao_Paulo)  
Branch: `codex/facebook-bloco1`  
Commit de observabilidade: `8f25ab7`  
Deployment de Produção: `dpl_DrVnAzPWaAFqTmizvr2o6uW8TbyM`

## 1. Resultado executivo

O erro atual não é causado pelo contrato HTTP do PolitixOS. A chamada chegou ao gateway RapidAPI no host e path homologados, usando a chave carregada em Produção, e recebeu:

- provider status: `403`;
- provider code: ausente;
- provider message sanitizada: `You are not subscribed to this API.`;
- host: `facebook-scraper3.p.rapidapi.com`;
- path: `/page/posts`.

Classificação obrigatória:

`ROOT_CAUSE = RAPIDAPI_SUBSCRIPTION_MISSING`

## 2. Configuração e chamada reproduzida

A variável `FACEBOOK_SCRAPER_RAPIDAPI_KEY` foi confirmada no projeto Vercel `politix-os`, com escopo Preview e Production e tipo `Sensitive`. O valor nunca foi lido, impresso, salvo ou retornado.

Contrato executado pelo backend:

- método: `GET`;
- URL base: `https://facebook-scraper3.p.rapidapi.com/page/posts`;
- query: `page_id=100064348075846`, `start_date` e `end_date` no formato `YYYY-MM-DD`; cursor somente quando houver próxima página;
- headers: `X-RapidAPI-Key` e `X-RapidAPI-Host: facebook-scraper3.p.rapidapi.com`;
- timeout: 15 segundos por tentativa;
- retries: até 2 para `429` e `5xx`.

A execução controlada ocorreu fora de qualquer schedule, por disparo manual do workflow já autenticado, e chamou o backend de Produção. O fluxo completo terminou em menos de 12 segundos na observação da interface. O runtime não forneceu duração isolada do upstream, portanto não foi inventada uma precisão inexistente.

## 3. Evidência e validade do contrato

O runtime de Produção registrou o erro sanitizado às 21:55:26, sem chave, cookie, token ou header sensível. O backend devolveu seu contrato público seguro `HTTP 502 / FACEBOOK_PROVIDER_HTTP_ERROR`, enquanto o log interno preservou o status original `403` e a mensagem de assinatura ausente.

Host e endpoint são considerados válidos porque:

1. a requisição foi roteada pelo gateway RapidAPI e devolveu uma negativa específica de assinatura, não erro de host;
2. o mesmo contrato `GET /page/posts?page_id=100064348075846` consta na prova runtime anterior do Bloco 1B com `HTTP 200`, resultados reais e cursor;
3. os testes automatizados confirmam host, path, parâmetros e headers atuais.

A assinatura atual é inválida para esta API. O erro ocorre antes de qualquer validação funcional de conteúdo pelo provider.

## 4. Alteração mínima realizada

Foi adicionada observabilidade segura em `lib/facebook/provider.ts`. Em falhas HTTP finais, o backend registra somente:

- `provider_status`;
- `provider_code`;
- `provider_message_sanitized`;
- `provider_host`;
- `provider_path`.

A chave é explicitamente redigida se aparecer no texto; quebras de linha são removidas; mensagens são limitadas a 500 caracteres. A resposta pública permanece genérica e backward-compatible. Nenhum contrato, banco, workflow, credencial, schema, analytics, Instagram, X ou UI foi alterado.

## 5. Ação obrigatória do usuário no RapidAPI

1. Entrar no painel RapidAPI usando a mesma conta/aplicação à qual pertence a chave cadastrada na Vercel.
2. Abrir a API cujo host é `facebook-scraper3.p.rapidapi.com` (`facebook-scraper3`).
3. Selecionar **Pricing** e assinar um plano que habilite chamadas a essa API.
4. No console da própria API, testar `GET /page/posts` com `page_id=100064348075846` e confirmar que não retorna `403` nem `You are not subscribed to this API.`.
5. Se a assinatura gerar/usar outra application key, substituir `FACEBOOK_SCRAPER_RAPIDAPI_KEY` nos ambientes **Production e Preview** da Vercel, sem compartilhar o valor, e executar um novo deployment de Produção. Se a mesma chave passar a estar assinada, não é necessário trocá-la.
6. Informar ao Codex quando o teste do console estiver autorizado para que seja executada uma única coleta final atual.

Não foi criado fallback, troca de provider, endpoint alternativo ou bypass de assinatura.

## 6. Prova final de coleta

A coleta atual executada após o deployment continuou bloqueada antes da normalização/persistência:

- provider status: `403`;
- backend status: `502`;
- posts recebidos: `0`;
- posts únicos: `0`;
- posts persistidos: `0`;
- duplicações: `0`;
- `collectionComplete`: `false`;
- termination: falha de provider / assinatura ausente.

Uma nova tentativa não foi feita porque repetiria consumo inútil e não pode vencer um bloqueio de assinatura. A prova final com provider válido fica condicionada à ação do item 5.

## 7. Validações

- teste específico do provider: `5/5 PASS`;
- suíte completa: `154 arquivos PASS`, `1.343 testes PASS`, `5 arquivos/5 testes SKIP` já previstos;
- TypeScript: `PASS`;
- lint dos arquivos alterados: `PASS`;
- build local Next.js 16.2.6: `PASS`;
- build Vercel de Produção: `PASS`;
- lint global: `FAIL` por débito preexistente fora do escopo (`83 errors`, `139 warnings`); nenhum achado pertence aos dois arquivos alterados;
- regressão Instagram coberta pela suíte: `PASS`;
- regressão X coberta pela suíte: `PASS`;
- workflow n8n: nenhuma edição; estado ativo/inativo preservado;
- schedule Facebook: continua desativado.

## 8. Declarações finais

`FACEBOOK_RAPIDAPI_KEY_LOADED = YES`  
`FACEBOOK_RAPIDAPI_HOST = VALID`  
`FACEBOOK_RAPIDAPI_ENDPOINT = VALID`  
`FACEBOOK_RAPIDAPI_SUBSCRIPTION = INVALID`  
`FACEBOOK_PROVIDER_DIRECT_TEST = FAIL`  
`FACEBOOK_COLLECTION_BACKEND = FAIL`  
`FACEBOOK_PROVIDER_RUNTIME_CURRENT = FAIL`  
`ROOT_CAUSE = RAPIDAPI_SUBSCRIPTION_MISSING`  
`INSTAGRAM_REGRESSION = PASS`  
`X_REGRESSION = PASS`  
`FACEBOOK_READY_FOR_FINAL_CLOSE = NO`

## 9. Veredito

`VEREDITO = ACTION_REQUIRED`

Não iniciar Bloco 6. Não ativar scheduler. Reexecutar uma única coleta final somente depois de a assinatura RapidAPI estar válida.
