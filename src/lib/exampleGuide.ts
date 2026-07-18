/**
 * Guia-exemplo embutido no prompt de material.
 *
 * Este é o padrão de qualidade: um tópico-modelo ("Event loop e libuv") escrito
 * por inteiro no estilo escolhido — espinha socrática (cada seção abre com uma
 * pergunta) sobre profundidade técnica de referência. Vai junto de TODO prompt de
 * material para a IA replicar a estrutura, o tom e a profundidade.
 *
 * É deliberadamente um exemplo real e completo, não uma lista de regras abstratas:
 * a IA imita muito melhor um bom exemplo do que segue uma especificação.
 */
export const EXAMPLE_GUIDE = `# Material de estudo — Event loop e libuv

> **Tópico:** Event loop e libuv (exemplo do módulo Node.js Profundo)
> **Como ler:** cada seção abre com uma pergunta. O aluno tenta responder de cabeça antes de seguir; a explicação vem depois, com a profundidade que a entrevista cobra.

## 1. Como um servidor de uma thread só atende milhares de conexões ao mesmo tempo?

**Pare e pense antes de ler.** Se o JavaScript roda numa thread única, como um servidor atende 5 mil clientes simultâneos?

A pegadinha está em "atender": é quase toda *espera* (banco, cache, outro serviço). Se a thread larga uma requisição enquanto ela espera e vai cuidar de outra, uma thread só dá conta de milhares. O event loop não roda mil coisas ao mesmo tempo — ele nunca para de trocar de tarefa enquanto as outras esperam.

**Aprofundando (o que a entrevista cobra):** o modelo alternativo, uma thread por conexão, gasta memória e context-switch lineares com o número de clientes. Como o tempo dominante é espera por I/O, uma thread que nunca fica ociosa durante a espera atende a mesma carga com uma fração dos recursos. Quem cuida da espera é o \\\`libuv\\\` (C), que fala com o SO (epoll/kqueue) e mantém o loop.

## 2. Em que ordem, exatamente, o Node executa as coisas?

**Tente prever a saída:**

\\\`\\\`\\\`js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
process.nextTick(() => console.log('D'));
console.log('E');
// → A E D C B
\\\`\\\`\\\`

Síncrono roda até o fim (A, E). Antes de qualquer fase, as microtasks drenam: \\\`nextTick\\\` (D) e depois Promises (C). Só então o loop entra nas fases e roda o timer (B). Modelo mental: **síncrono → nextTick → promises → resto**.

## 3. Por que \\\`setImmediate\\\` e \\\`setTimeout(fn, 0)\\\` às vezes trocam de ordem?

**Antes de ler:** por que "timeout zero" nem sempre é o mais rápido? Porque a ordem depende de *onde* o código foi agendado. No top-level é uma corrida; dentro de um callback de I/O, \\\`setImmediate\\\` sempre vence (fase check vem logo após a fase poll).

## 4. Se é uma thread só, quem roda \\\`fs.readFile\\\` e \\\`crypto\\\`?

**Pense na contradição:** ler arquivo não tem forma assíncrona universal no SO. Resposta: o libuv tem um **thread pool** de 4 threads (\\\`UV_THREADPOOL_SIZE\\\`) para arquivo, DNS (\\\`dns.lookup\\\`) e crypto pesada. Consequência: 5 \\\`pbkdf2\\\` simultâneos com pool de 4 → a quinta serializa. É por isso que "o Node é single-threaded" tem resposta *não no I/O*.

## 5. Qual é o pior jeito de quebrar um servidor Node?

**Pense:** uma tarefa que não espera — só calcula — trava tudo. Um loop síncrono pesado segura a thread; o event loop não avança e nenhuma requisição é atendida. A correção é mover para \\\`worker_threads\\\`; mas o passo que separa pleno de júnior é *medir* o event loop lag para saber que o gargalo era CPU na thread, não I/O.

## Teste-se antes do portão
5 perguntas de auto-verificação com "porquê", forçando o recall.

## Onde o entrevistador vai cutucar
3–4 armadilhas específicas com a resposta curta (ex.: recursão de \\\`nextTick\\\` famintando o loop).`;
