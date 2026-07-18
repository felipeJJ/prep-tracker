import type { Program } from '@/lib/types';

/**
 * Dados do programa, derivados do Plano rev.2 e do Cronograma até jan/2027.
 * Cada âncora vem do dossiê de engenharia — evidência real do ERP financeiro.
 */
export const PROGRAM: Program = {
  meta: {
    target: 'Software Engineer mid-level internacional (contractor)',
    startDate: '2026-07-21',
    applyDate: '2027-01-01',
    hoursPerWeek: 10,
    bufferWeeks: 3,
  },
  modules: [
    {
      id: 'm1',
      order: 1,
      name: 'Mentalidade de Engenharia',
      priority: 'base',
      plannedWeeks: 1,
      anchor:
        'A decisão de NÃO otimizar o fluxo de caixa por risco de domínio (história B do dossiê).',
      topics: [
        'Trade-offs como vocabulário central',
        'Custo x manutenção x performance',
        'Decisão sob incerteza',
        'Quando não otimizar',
        'Pensamento sistêmico',
      ],
    },
    {
      id: 'm2',
      order: 2,
      name: 'HTTP e Redes',
      priority: 'base',
      plannedWeeks: 1,
      anchor:
        'O bug do primeiro acesso do dia — Caddy anunciando HTTP/3 sem a porta UDP 443 publicada.',
      topics: ['TLS e handshake', 'HTTP/1.1 vs 2 vs 3', 'QUIC', 'DNS', 'Conexões e keep-alive'],
    },
    {
      id: 'm3',
      order: 3,
      name: 'APIs',
      priority: 'base',
      plannedWeeks: 1,
      anchor:
        'Seus 152 endpoints e a redução de ~50 requests/página para 1 via endpoint em lote.',
      topics: [
        'REST maduro',
        'Idempotência',
        'Versionamento',
        'Paginação',
        'REST vs gRPC vs GraphQL',
      ],
    },
    {
      id: 'm4',
      order: 4,
      name: 'Node.js Profundo',
      priority: 'prioridade',
      plannedWeeks: 2,
      englishFrom: true,
      anchor: 'Seu runtime real em produção — onde o event loop ajudou ou atrapalhou.',
      topics: ['Event loop e libuv', 'Streams e backpressure', 'Worker threads', 'Gestão de memória'],
    },
    {
      id: 'm5',
      order: 5,
      name: 'PostgreSQL',
      priority: 'consolidar',
      plannedWeeks: 1,
      anchor:
        'Proficiência de outros projetos. Ancore "produção longa" no Mongo (20 meses); fale de Postgres como competência real sem inflar.',
      topics: ['Índices', 'EXPLAIN e planos', 'MVCC', 'Isolamento e transações', 'Locking'],
    },
    {
      id: 'm6',
      order: 6,
      name: 'Redis',
      priority: 'prioridade',
      plannedWeeks: 1,
      anchor: 'Seu cache de permissões em Redis, invalidado por alteração de cargo.',
      topics: [
        'Estruturas de dados',
        'Estratégias de cache',
        'Invalidação',
        'TTL',
        'Pub/sub',
        'Persistência',
      ],
    },
    {
      id: 'm7',
      order: 7,
      name: 'Segurança',
      priority: 'base',
      plannedWeeks: 1,
      anchor:
        'O vazamento entre filiais corrigido em 9 pontos de escrita, e as 77 permissões em dois níveis.',
      topics: [
        'AuthN vs AuthZ',
        'Controle de acesso',
        'OWASP',
        'Isolamento de tenant',
        'Gestão de segredos',
      ],
    },
    {
      id: 'm8',
      order: 8,
      name: 'Mensageria',
      priority: 'prioridade',
      plannedWeeks: 2,
      anchor:
        'Onde no ERP um processamento assíncrono (relatório, cálculo em lote) se beneficiaria de fila.',
      topics: [
        'Filas vs streams',
        'Garantias de entrega',
        'Idempotência de consumidor',
        'DLQ',
        'Ordenação',
      ],
    },
    {
      id: 'm9',
      order: 9,
      name: 'Docker',
      priority: 'consolidar',
      plannedWeeks: 1,
      anchor: 'Seu Compose com Mongo em loopback e backend non-root, Caddy com TLS.',
      topics: ['Imagens e camadas', 'Networking', 'Compose', 'Multi-stage', 'Non-root'],
    },
    {
      id: 'm10',
      order: 10,
      name: 'Observabilidade',
      priority: 'prioridade',
      plannedWeeks: 1,
      anchor:
        'Seu health check + auto-rollback é o embrião disso. O que falta para observabilidade de verdade?',
      topics: [
        'Logs estruturados',
        'Métricas',
        'Tracing distribuído',
        'Quatro sinais de ouro',
        'Alertas',
      ],
    },
    {
      id: 'm11',
      order: 11,
      name: 'AWS',
      priority: 'lacuna nº1',
      plannedWeeks: 3,
      anchor:
        'Reprojete seu deploy de VPS "como seria na AWS" — qual serviço para cada peça, e por quê / por que não.',
      topics: ['EC2', 'VPC', 'IAM', 'S3', 'RDS', 'SQS', 'CloudWatch', 'Lambda'],
    },
    {
      id: 'm12',
      order: 12,
      name: 'Colaboração & Comunicação Técnica',
      priority: 'lacuna crítica',
      plannedWeeks: 2,
      anchor:
        'A resposta pronta do dossiê: você não depende de estrutura externa para ter rigor, você a cria; e a lacuna solo é o que você busca na vaga. Em inglês, sem pedir desculpa.',
      topics: [
        'Code review (dar e receber)',
        'Design docs e RFC',
        'Comunicação assíncrona',
        'Navegar desacordo técnico',
        'Herdar código alheio',
      ],
    },
    {
      id: 'm13',
      order: 13,
      name: 'IA como Ferramenta de Engenharia',
      priority: 'diferencial',
      plannedWeeks: 1,
      anchor:
        'O hook que bloqueia código de produção antes do teste existir; os 6 falsos-positivos que você mandou refazer. Você governa a IA.',
      topics: [
        'Orquestração de agentes',
        'Guard-rails que a IA não burla',
        'Onde a IA acelera vs arrisca',
        'Como isso escala num time',
      ],
    },
  ],
};
