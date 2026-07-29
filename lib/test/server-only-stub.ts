// Stub para o pacote `server-only` em ambiente de testes (Vitest/Node puro).
// No Next.js real, `server-only` lança em tempo de build se importado de um
// Client Component — essa checagem é feita pelo bundler do Next, não pelo
// pacote em si em runtime Node comum. Em testes, não há bundler client/server
// para diferenciar, então este stub apenas neutraliza o import.
export {};
