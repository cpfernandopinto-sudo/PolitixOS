// Mock data to simulate Supabase queries until DB is ready

export interface KPI {
  title: string;
  value: string | number;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

export async function getKPIs(): Promise<KPI[]> {
  return [
    { title: 'Total de Notícias (24h)', value: 1245 },
    { title: 'Sobre o Candidato', value: 432 },
    { title: 'Fontes Monitoradas', value: 18 },
    { title: 'Relevância Média', value: '7.8/10', status: 'success' },
    { title: 'Alertas Ativos', value: 3, status: 'danger' },
  ];
}

export async function getGaugeScore() {
  return {
    score: 65,
    statusText: 'Atenção',
    level: 'warning' // 'success' | 'warning' | 'danger'
  };
}

export async function getNoticiasPorTempo() {
  return {
    dates: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    values: [12, 18, 45, 30, 25, 50, 35]
  };
}

export async function getSentimento() {
  return [
    { name: 'Positivo', value: 45, itemStyle: { color: '#22C55E' } },
    { name: 'Neutro', value: 35, itemStyle: { color: '#2563EB' } },
    { name: 'Negativo', value: 20, itemStyle: { color: '#FF3B3B' } }
  ];
}

export async function getFontes() {
  return {
    categories: ['Jornal O Globo', 'Folha', 'Estadão', 'G1', 'UOL'],
    values: [120, 95, 80, 150, 110]
  };
}

export async function getRiscosPorFonte() {
  return {
    categories: ['Jornal O Globo', 'Folha', 'Estadão', 'G1', 'UOL'],
    values: [5, 12, 3, 18, 8] // Risk mentions
  };
}

export async function getTemas() {
  return {
    categories: ['Economia', 'Saúde', 'Segurança', 'Educação', 'Infraestrutura'],
    values: [320, 210, 180, 150, 90]
  };
}

export async function getEntidades() {
  return {
    categories: ['Prefeitura', 'Câmara', 'STF', 'Governo Federal', 'Sindicatos'],
    values: [410, 290, 150, 220, 80]
  };
}

export async function getRiscos() {
  return {
    categories: ['Corrupção', 'Greve', 'Deslizamento', 'Protesto', 'CPI'],
    values: [85, 60, 45, 40, 30]
  };
}

export async function getRiscoTempo() {
  return {
    dates: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    baixo: [120, 130, 110, 140, 150, 90, 80],
    medio: [40, 50, 45, 60, 55, 30, 20],
    alto: [10, 15, 8, 25, 12, 5, 2]
  };
}

export interface Noticia {
  id: string;
  data: string;
  fonte: string;
  titulo: string;
  resumo: string;
  link: string;
  sentimento: 'positivo' | 'neutro' | 'negativo';
  risco: 'baixo' | 'médio' | 'alto';
  crise: boolean;
  relevancia: number;
}

export async function getFeedNoticias(): Promise<Noticia[]> {
  return [
    {
      id: '1',
      data: '2026-05-08 14:30',
      fonte: 'G1',
      titulo: 'Candidato anuncia novo plano de obras para a zona norte',
      resumo: 'Plano inclui revitalização de vias e construção de 3 novos hospitais.',
      link: '#',
      sentimento: 'positivo',
      risco: 'baixo',
      crise: false,
      relevancia: 8.5
    },
    {
      id: '2',
      data: '2026-05-08 13:15',
      fonte: 'Folha',
      titulo: 'Ministério Público investiga contratos da gestão anterior',
      resumo: 'Investigação foca em possíveis irregularidades em licitações de transporte.',
      link: '#',
      sentimento: 'negativo',
      risco: 'alto',
      crise: true,
      relevancia: 9.2
    },
    {
      id: '3',
      data: '2026-05-08 11:00',
      fonte: 'UOL',
      titulo: 'Pesquisa eleitoral mostra empate técnico',
      resumo: 'Novo levantamento aponta cenário indefinido para o segundo turno.',
      link: '#',
      sentimento: 'neutro',
      risco: 'médio',
      crise: false,
      relevancia: 7.0
    },
    {
      id: '4',
      data: '2026-05-08 09:45',
      fonte: 'Estadão',
      titulo: 'Sindicato dos professores ameaça greve geral',
      resumo: 'Categoria pede reajuste salarial de 15% e melhores condições de trabalho.',
      link: '#',
      sentimento: 'negativo',
      risco: 'alto',
      crise: true,
      relevancia: 8.8
    },
    {
      id: '5',
      data: '2026-05-08 08:20',
      fonte: 'Jornal O Globo',
      titulo: 'Inauguração de parque atrai milhares de pessoas',
      resumo: 'Evento ocorreu sem incidentes e contou com a presença do prefeito.',
      link: '#',
      sentimento: 'positivo',
      risco: 'baixo',
      crise: false,
      relevancia: 6.5
    }
  ];
}
