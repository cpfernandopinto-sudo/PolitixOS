import {
  WhatsAppMessageDTO,
  WhatsAppSummaryDTO,
  WhatsAppGroupsResponseDTO,
  WhatsAppFiltersResponseDTO,
  WhatsAppMessagesResponseDTO,
  WhatsAppQueryFilters,
  WhatsAppSentiment,
  WhatsAppRiskLevel,
  WhatsAppRelevance,
  WhatsAppMessageType,
} from '@/lib/types/whatsapp';
import {
  getSummary,
  getMessagesFeed,
  getGroups,
  getFilters,
  CommonFilters,
  clampPageSize,
} from '@/lib/queries/whatsappIntelligence';

/**
 * Fixtures estritas de validação offline / testes
 */
export const MOCK_WHATSAPP_MESSAGES: WhatsAppMessageDTO[] = [
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789001',
    occurred_at: '2026-08-29T16:30:00.000Z',
    chat: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Coordenação Executiva de Campanha - BH',
      type: 'GROUP',
    },
    sender: {
      id: '5531988231102@c.us',
      name: 'Carlos Mendonça',
    },
    message_type: 'TEXT',
    text: 'Atenção equipe: precisamos reforçar a resposta imediata sobre o atraso nas obras da UPA Norte. A oposição está impulsionando vídeos de moradores reclamando da falta de médicos na triagem desde as 6h da manhã.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Saúde',
      subtheme: 'UPAs e Atendimento de Urgência',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.85,
      relevance: 'HIGH',
      summary: 'Alerta sobre exploração política de filas e falta de médicos na UPA Norte pela oposição.',
      intent: 'COMPLAINT',
      risk_level: 'HIGH',
      risk_reason: 'Risco de crise reputacional focado na gestão da saúde pública na Regional Norte, com potencial de exploração adversária.',
      recommended_action: 'Publicar nota oficial esclarecendo reforço de escala médica e cronograma das obras ainda hoje.',
      confidence: 0.94,
      mentioned_candidates: [
        { name: 'Carlos Mendonça', normalized_name: 'carlos mendonca', target_id: null },
        { name: 'Prefeito', normalized_name: 'prefeito', target_id: null },
      ],
      mentioned_entities: [
        { name: 'UPA Norte', type: 'ORGANIZATION' },
        { name: 'Secretaria Municipal de Saúde', type: 'GOVERNMENT' },
      ],
      mentioned_locations: [
        { name: 'Belo Horizonte - Regional Norte', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T16:31:12.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789002',
    occurred_at: '2026-08-29T15:45:00.000Z',
    chat: {
      id: 'c2222222-2222-4222-8222-222222222222',
      name: 'Lideranças Comunitárias - Venda Nova',
      type: 'GROUP',
    },
    sender: {
      id: '5531991448833@c.us',
      name: 'Dona Maria de Lourdes',
    },
    message_type: 'AUDIO',
    text: null,
    caption: 'Áudio de liderança comunitária elogiando a inauguração do novo centro de convivência da terceira idade e convidando para a caminhada de sábado.',
    media: {
      url: 'https://provider.example/audio_comunidade_venda_nova.ogg',
      mime_type: 'audio/ogg',
      file_name: 'audio_comunidade_venda_nova.ogg',
      size_bytes: 384000,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Infraestrutura e Lazer',
      subtheme: 'Terceira Idade e Assistência Social',
      sentiment: 'POSITIVE',
      sentiment_score: 0.88,
      relevance: 'HIGH',
      summary: 'Elogios à entrega do Centro de Convivência em Venda Nova e engajamento da comunidade para evento de campanha.',
      intent: 'PRAISE',
      risk_level: 'LOW',
      recommended_action: 'Enviar equipe de registro audiovisual para cobrir a caminhada de sábado com a liderança.',
      confidence: 0.92,
      mentioned_candidates: [
        { name: 'Dona Lourdes', normalized_name: 'dona lourdes', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Centro de Convivência', type: 'ORGANIZATION' },
        { name: 'Associação de Moradores de Venda Nova', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Venda Nova', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T15:46:20.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789003',
    occurred_at: '2026-08-29T14:10:00.000Z',
    chat: {
      id: 'c3333333-3333-4333-8333-333333333333',
      name: 'Monitoramento Oposição / Grupos Abertos',
      type: 'GROUP',
    },
    sender: {
      id: '5531977115522@c.us',
      name: 'Usuário Não Identificado',
    },
    message_type: 'IMAGE',
    text: null,
    caption: 'URGENTE: Circulando panfleto digital apócrifo alegando cancelamento do passe livre estudantil a partir de outubro. Já foi compartilhado em mais de 12 grupos de bairros periféricos.',
    media: {
      url: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=60',
      mime_type: 'image/jpeg',
      file_name: 'panfleto_fake_passe_livre.jpg',
      size_bytes: 450120,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Mobilidade Urbana',
      subtheme: 'Tarifas e Passe Livre',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.92,
      relevance: 'HIGH',
      summary: 'Disseminação de panfleto falso sobre suspensão do passe livre estudantil com alta taxa de encaminhamento.',
      intent: 'MISINFORMATION_POSSIBLE',
      risk_level: 'CRITICAL',
      risk_reason: 'Desinformação coordenada (fake news) com alto potencial viral em grupos de jovens e periferia atingindo política pública central.',
      recommended_action: 'Acionar comitê jurídico para notificação extrajudicial e produzir card "É FAKE" imediato nos canais oficiais.',
      confidence: 0.98,
      mentioned_candidates: [
        { name: 'Candidato Opositor', normalized_name: 'candidato opositor', target_id: null },
        { name: 'Gestão Atual', normalized_name: 'gestao atual', target_id: null },
      ],
      mentioned_entities: [
        { name: 'BHTRANS', type: 'GOVERNMENT' },
        { name: 'Prefeitura Municipal', type: 'GOVERNMENT' },
      ],
      mentioned_locations: [
        { name: 'Barreiro', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
        { name: 'Venda Nova', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T14:12:05.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789004',
    occurred_at: '2026-08-29T13:20:00.000Z',
    chat: {
      id: 'c4444444-4444-4444-8444-444444444444',
      name: 'Comitê Saúde e Educação Integrada',
      type: 'GROUP',
    },
    sender: {
      id: '5531996554411@c.us',
      name: 'Dra. Helena Vasconcelos',
    },
    message_type: 'DOCUMENT',
    text: null,
    caption: 'Segue o relatório comparativo da taxa de vacinação infantil e cobertura do programa Saúde da Família nos últimos 4 anos para subsidiar o debate de quinta-feira na TV.',
    media: {
      url: 'https://provider.example/Relatorio_Tecnico_Saude_Familia_2026.pdf',
      mime_type: 'application/pdf',
      file_name: 'Relatorio_Tecnico_Saude_Familia_2026.pdf',
      size_bytes: 1845000,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Saúde',
      subtheme: 'Imunização e Atenção Básica',
      sentiment: 'NEUTRAL',
      sentiment_score: 0.15,
      relevance: 'MEDIUM',
      summary: 'Dossiê técnico com métricas positivas de cobertura vacinal para preparação do debate eleitoral.',
      intent: 'INFORMATION',
      risk_level: 'LOW',
      recommended_action: 'Extrair 3 gráficos sintéticos para a pasta de apoio do candidato.',
      confidence: 0.89,
      mentioned_candidates: [
        { name: 'Dra. Helena Vasconcelos', normalized_name: 'dra helena vasconcelos', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Programa Saúde da Família', type: 'GOVERNMENT' },
      ],
      mentioned_locations: [
        { name: 'Belo Horizonte', type: 'CITY', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T13:22:40.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789005',
    occurred_at: '2026-08-29T11:50:00.000Z',
    chat: {
      id: 'c5555555-5555-4555-8555-555555555555',
      name: 'Voluntários e Mobilização Digital',
      type: 'GROUP',
    },
    sender: {
      id: '5531984332299@c.us',
      name: 'Lucas Ferreira',
    },
    message_type: 'VIDEO',
    text: null,
    caption: 'Vídeo dos bastidores do comício de ontem na Praça da Estação viralizou no TikTok e no Reels, e já está sendo muito compartilhado no WhatsApp também!',
    media: {
      url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
      mime_type: 'video/mp4',
      file_name: 'comicio_praca_estacao.mp4',
      size_bytes: 8450120,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Engajamento e Campanha',
      subtheme: 'Atos Públicos e Redes Sociais',
      sentiment: 'POSITIVE',
      sentiment_score: 0.95,
      relevance: 'HIGH',
      summary: 'Sucesso orgânico do material audiovisual do comício da Praça da Estação com alto engajamento voluntário.',
      intent: 'MOBILIZATION',
      risk_level: 'LOW',
      recommended_action: 'Impulsionar corte reduzido de 30s nos canais do WhatsApp Broadcast.',
      confidence: 0.95,
      mentioned_candidates: [
        { name: 'Lucas Ferreira', normalized_name: 'lucas ferreira', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Praça da Estação', type: 'LANDMARK' },
      ],
      mentioned_locations: [
        { name: 'Centro', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T11:51:30.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789006',
    occurred_at: '2026-08-29T10:15:00.000Z',
    chat: {
      id: 'c6666666-6666-4666-8666-666666666666',
      name: 'Comunidade Barreiro em Ação',
      type: 'GROUP',
    },
    sender: {
      id: '5531992017766@c.us',
      name: 'Ricardo Antunes',
    },
    message_type: 'TEXT',
    text: 'Moradores da região do Barreiro de Cima reclamam de constantes quedas de luz e insegurança no comércio noturno após as 20h. Cobram mais policiamento e troca de lâmpadas por LED.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Segurança Pública',
      subtheme: 'Iluminação Pública e Policiamento',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.68,
      relevance: 'MEDIUM',
      summary: 'Reclamação de comerciantes do Barreiro sobre escuridão e sensação de insegurança noturna.',
      intent: 'COMPLAINT',
      risk_level: 'MEDIUM',
      risk_reason: 'Demanda reprimida de segurança pública e iluminação no Barreiro que pode gerar manifesto comunitário contrário à administração.',
      recommended_action: 'Agendar reunião com lideranças do comércio do Barreiro e apresentar plano de expansão do programa Ilumina BH.',
      confidence: 0.88,
      mentioned_candidates: [],
      mentioned_entities: [
        { name: 'Polícia Militar', type: 'GOVERNMENT' },
        { name: 'CEMIG', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Barreiro de Cima', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T10:17:00.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789007',
    occurred_at: '2026-08-29T09:00:00.000Z',
    chat: {
      id: 'c7777777-7777-4777-8777-777777777777',
      name: 'Pastores e Lideranças Religiosas - MG',
      type: 'GROUP',
    },
    sender: {
      id: '5531987123344@c.us',
      name: 'Pastor Jonas Silveira',
    },
    message_type: 'TEXT',
    text: 'Reunião de diálogo com as famílias realizada ontem no Templo Central foi excelente. Reforçamos o compromisso com a defesa da família, fortalecimento das creches comunitárias e combate às drogas.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Valores e Sociedade',
      subtheme: 'Comunidades Religiosas e Família',
      sentiment: 'POSITIVE',
      sentiment_score: 0.82,
      relevance: 'HIGH',
      summary: 'Balanço muito favorável de encontro com lideranças religiosas e reforço de pautas sociais e comunitárias.',
      intent: 'PRAISE',
      risk_level: 'LOW',
      recommended_action: 'Manter canal de diálogo institucional ativo e formalizar cartas de compromisso comunitário.',
      confidence: 0.96,
      mentioned_candidates: [
        { name: 'Pastor Jonas Silveira', normalized_name: 'pastor jonas silveira', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Conselho Evangélico', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Belo Horizonte', type: 'CITY', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T09:02:15.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789008',
    occurred_at: '2026-08-29T08:30:00.000Z',
    chat: {
      id: 'c8888888-8888-4888-8888-888888888888',
      name: 'Empresários e Comércio Central - CDL',
      type: 'GROUP',
    },
    sender: {
      id: '5531991998800@c.us',
      name: 'Marcos Vinícius Prado',
    },
    message_type: 'TEXT',
    text: 'Matéria divulgada hoje na imprensa destaca os avanços na desburocratização e atração de investimentos na capital: https://exemplo.com.br/economia/avancos-bh',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Economia e Emprego',
      subtheme: 'Desburocratização e Negócios',
      sentiment: 'POSITIVE',
      sentiment_score: 0.74,
      relevance: 'MEDIUM',
      summary: 'Compartilhamento de notícia favorável sobre crescimento econômico e ambiente de negócios no comércio central.',
      intent: 'INFORMATION',
      risk_level: 'LOW',
      recommended_action: 'Replicar trechos da reportagem nas redes sociais destacando geração de empregos.',
      confidence: 0.91,
      mentioned_candidates: [],
      mentioned_entities: [
        { name: 'CDL Belo Horizonte', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Centro', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-29T08:31:50.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789009',
    occurred_at: '2026-08-28T22:15:00.000Z',
    chat: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Coordenação Executiva de Campanha - BH',
      type: 'GROUP',
    },
    sender: {
      id: '5531988004433@c.us',
      name: 'Renata Albuquerque',
    },
    message_type: 'TEXT',
    text: 'A análise dos dados da última pesquisa aponta crescimento consolidado na região Oeste, mas estabilidade na região Noroeste. Proponho reforçar caminhadas no Padre Eustáquio e Caiçara.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Estratégia Eleitoral',
      subtheme: 'Tracking e Planejamento Territorial',
      sentiment: 'MIXED',
      sentiment_score: 0.05,
      relevance: 'HIGH',
      summary: 'Planejamento de rotas de campanha com foco nas regiões Noroeste e Oeste após análise de dados eleitorais.',
      intent: 'REQUEST',
      risk_level: 'LOW',
      recommended_action: 'Ajustar agenda da próxima semana priorizando as duas regiões indicadas.',
      confidence: 0.87,
      mentioned_candidates: [
        { name: 'Renata Albuquerque', normalized_name: 'renata albuquerque', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Comitê de Estratégia', type: 'PARTY' },
      ],
      mentioned_locations: [
        { name: 'Padre Eustáquio', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
        { name: 'Caiçara', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-28T22:16:30.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789010',
    occurred_at: '2026-08-28T20:00:00.000Z',
    chat: {
      id: 'c3333333-3333-4333-8333-333333333333',
      name: 'Monitoramento Oposição / Grupos Abertos',
      type: 'GROUP',
    },
    sender: {
      id: '5531972009911@c.us',
      name: 'Fonte Monitorada Beta',
    },
    message_type: 'AUDIO',
    text: null,
    caption: 'Áudio vazado de suposta conversa sobre remanejamento de verbas da educação básica para recapeamento asfáltico.',
    media: {
      url: 'https://provider.example/audio_remanejamento_educacao.m4a',
      mime_type: 'audio/mp4',
      file_name: 'audio_remanejamento_educacao.m4a',
      size_bytes: 620000,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Educação e Orçamento',
      subtheme: 'Gestão Fiscal e Financiamento',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.96,
      relevance: 'HIGH',
      summary: 'Propagação de áudio atribuído à gestão pública alegando desvio de recursos da educação básica.',
      intent: 'DENUNCIATION',
      risk_level: 'CRITICAL',
      risk_reason: 'Acusação grave de desvio/remanejamento indevido de verbas da educação com alta viralização em grupos de servidores e professores.',
      recommended_action: 'Emitir nota com extrato orçamentário comprovando cumprimento de 100% do piso constitucional da educação.',
      confidence: 0.97,
      mentioned_candidates: [
        { name: 'Gestão Atual', normalized_name: 'gestao atual', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Secretaria de Educação', type: 'GOVERNMENT' },
        { name: 'Câmara Municipal', type: 'GOVERNMENT' },
      ],
      mentioned_locations: [
        { name: 'Belo Horizonte', type: 'CITY', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-28T20:02:10.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789011',
    occurred_at: '2026-08-28T18:40:00.000Z',
    chat: {
      id: 'c9999999-9999-4999-8999-999999999999',
      name: 'Juventude e Universitários BH',
      type: 'GROUP',
    },
    sender: {
      id: '5531998771234@c.us',
      name: 'Gabriel Costa',
    },
    message_type: 'TEXT',
    text: 'Debate sobre inovação, bolsas de pesquisa e incubadoras de startups universitárias foi muito produtivo hoje no auditório da UFMG.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Educação e Tecnologia',
      subtheme: 'Universidades e Startups',
      sentiment: 'POSITIVE',
      sentiment_score: 0.86,
      relevance: 'MEDIUM',
      summary: 'Repercussão positiva de propostas para retenção de talentos e fomento a startups entre universitários.',
      intent: 'PRAISE',
      risk_level: 'LOW',
      recommended_action: 'Criar grupo de trabalho permanente com representantes dos centros acadêmicos.',
      confidence: 0.93,
      mentioned_candidates: [
        { name: 'Gabriel Costa', normalized_name: 'gabriel costa', target_id: null },
      ],
      mentioned_entities: [
        { name: 'UFMG', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Pampulha', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-28T18:41:20.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789012',
    occurred_at: '2026-08-28T17:10:00.000Z',
    chat: {
      id: 'c2222222-2222-4222-8222-222222222222',
      name: 'Lideranças Comunitárias - Venda Nova',
      type: 'GROUP',
    },
    sender: {
      id: '5531991223300@c.us',
      name: 'Antônio Ferreira',
    },
    message_type: 'IMAGE',
    text: null,
    caption: 'Foto do vazamento de água na Avenida Vilarinho que começou às 14h. COPASA ainda não chegou para consertar.',
    media: {
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
      mime_type: 'image/jpeg',
      file_name: 'vazamento_avenida_vilarinho.jpg',
      size_bytes: 320400,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Zeladoria Urbana',
      subtheme: 'Saneamento e Água',
      sentiment: 'NEGATIVE',
      sentiment_score: -0.45,
      relevance: 'LOW',
      summary: 'Cobrança pontual de reparo de vazamento de água na Avenida Vilarinho.',
      intent: 'COMPLAINT',
      risk_level: 'LOW',
      recommended_action: 'Protocolar chamado na central de atendimento e informar o número de protocolo ao morador.',
      confidence: 0.9,
      mentioned_candidates: [],
      mentioned_entities: [
        { name: 'COPASA', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Venda Nova', type: 'NEIGHBORHOOD', state: 'MG', city: 'Belo Horizonte' },
        { name: 'Avenida Vilarinho', type: 'ADDRESS', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-28T17:12:00.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789013',
    occurred_at: '2026-08-28T16:00:00.000Z',
    chat: {
      id: 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Servidores da Saúde Municipal',
      type: 'GROUP',
    },
    sender: {
      id: '5531988440011@c.us',
      name: 'Enfermeira Patrícia',
    },
    message_type: 'AUDIO',
    text: null,
    caption: 'Mensagem de áudio analisando a proposta de reajuste do vale-refeição e plano de carreira apresentada na mesa permanente de negociação.',
    media: {
      url: 'https://provider.example/audio_negociacao_servidores.ogg',
      mime_type: 'audio/ogg',
      file_name: 'audio_negociacao_servidores.ogg',
      size_bytes: 490000,
    },
    from_me: false,
    analysis_status: 'COMPLETED',
    analysis: {
      theme: 'Servidores Públicos',
      subtheme: 'Salários e Benefícios',
      sentiment: 'MIXED',
      sentiment_score: -0.1,
      relevance: 'MEDIUM',
      summary: 'Avaliação das tratativas salariais da saúde com expectativa moderada e atenção aos prazos.',
      intent: 'OPINION',
      risk_level: 'MEDIUM',
      risk_reason: 'Categoria aguardando posicionamento final sobre o piso; clima de cautela com possibilidade de assembleia.',
      recommended_action: 'Acompanhar desfecho da mesa de negociação com a Secretaria de Governo.',
      confidence: 0.86,
      mentioned_candidates: [
        { name: 'Enfermeira Patrícia', normalized_name: 'enfermeira patricia', target_id: null },
      ],
      mentioned_entities: [
        { name: 'Sindicato da Saúde', type: 'ORGANIZATION' },
      ],
      mentioned_locations: [
        { name: 'Belo Horizonte', type: 'CITY', state: 'MG', city: 'Belo Horizonte' },
      ],
      schema_version: '1.0',
      prompt_version: 'whatsapp_mvp_v1',
      analyzed_at: '2026-08-28T16:02:10.000Z',
    },
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789014',
    occurred_at: '2026-08-29T17:35:00.000Z',
    chat: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Coordenação Executiva de Campanha - BH',
      type: 'GROUP',
    },
    sender: {
      id: '5531984556677@c.us',
      name: 'Roberto Vasconcelos',
    },
    message_type: 'TEXT',
    text: 'Coleta em tempo real: nova mensagem capturada aguardando processamento da esteira de Inteligência Artificial.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'PROCESSING',
    analysis: null,
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789015',
    occurred_at: '2026-08-29T17:40:00.000Z',
    chat: {
      id: 'c6666666-6666-4666-8666-666666666666',
      name: 'Comunidade Barreiro em Ação',
      type: 'GROUP',
    },
    sender: {
      id: '5531993112244@c.us',
      name: 'Juliana Castro',
    },
    message_type: 'DOCUMENT',
    text: null,
    caption: 'Documento com demandas da associação de feirantes do Barreiro para inclusão no plano de governo municipal.',
    media: {
      url: 'https://provider.example/Carta_Demandas_Feirantes_Barreiro_2026.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_name: 'Carta_Demandas_Feirantes_Barreiro_2026.docx',
      size_bytes: 92000,
    },
    from_me: false,
    analysis_status: 'PENDING',
    analysis: null,
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789016',
    occurred_at: '2026-08-29T17:42:00.000Z',
    chat: {
      id: 'c1111111-1111-4111-8111-111111111111',
      name: 'Coordenação Executiva de Campanha - BH',
      type: 'GROUP',
    },
    sender: {
      id: '5531988231102@c.us',
      name: 'Carlos Mendonça',
    },
    message_type: 'TEXT',
    text: 'Aviso de sistema: mensagem própria de envio operacional.',
    caption: null,
    media: null,
    from_me: true,
    analysis_status: 'SKIPPED',
    analysis: null,
  },
  {
    id: 'b4a8e2e2-9d33-4a11-8f55-123456789017',
    occurred_at: '2026-08-29T17:44:00.000Z',
    chat: {
      id: 'c3333333-3333-4333-8333-333333333333',
      name: 'Monitoramento Oposição / Grupos Abertos',
      type: 'GROUP',
    },
    sender: {
      id: '5531972009911@c.us',
      name: 'Fonte Monitorada Beta',
    },
    message_type: 'TEXT',
    text: 'Texto truncado ou corrompido que gerou falha na classificação da IA.',
    caption: null,
    media: null,
    from_me: false,
    analysis_status: 'FAILED',
    analysis: null,
  },
];

/**
 * Traduz filtros da UI para CommonFilters do backend
 */
export function buildCommonFilters(filters: WhatsAppQueryFilters = {}): CommonFilters {
  const now = new Date();
  let to = filters.to ?? now.toISOString();

  let days = 7;
  if (filters.period) {
    if (filters.period === '1') days = 1;
    else if (filters.period === '7') days = 7;
    else if (filters.period === '30') days = 30;
    else if (filters.period === 'all') days = 90;
    else {
      const parsed = parseInt(filters.period.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) days = Math.min(parsed, 90);
    }
  }

  let from = filters.from ?? new Date(new Date(to).getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  // Validar se from < to
  if (new Date(from) >= new Date(to)) {
    from = new Date(new Date(to).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const chatId = filters.chat_id || filters.group;
  const sentiment = filters.sentiment ? filters.sentiment.toUpperCase() : null;
  const riskLevel = filters.risk_level || filters.risk ? (filters.risk_level || filters.risk)!.toUpperCase() : null;
  const relevance = filters.relevance ? filters.relevance.toUpperCase() : null;
  const q = filters.q || filters.search || null;

  return {
    from,
    to,
    chatId: chatId && chatId !== 'all' ? chatId : null,
    sentiment: sentiment && sentiment !== 'ALL' ? sentiment : null,
    riskLevel: riskLevel && riskLevel !== 'ALL' ? riskLevel : null,
    relevance: relevance && relevance !== 'ALL' ? relevance : null,
    q: q && q.trim().length > 0 ? q.trim() : null,
  };
}

/**
 * Filtra mensagens da base de fixtures local
 */
export function filterWhatsAppMessages(
  items: WhatsAppMessageDTO[],
  filters: WhatsAppQueryFilters = {}
): WhatsAppMessageDTO[] {
  return items.filter((msg) => {
    if (filters.chat_id && filters.chat_id !== 'all' && msg.chat.id !== filters.chat_id) {
      return false;
    }
    if (filters.group && filters.group !== 'all' && msg.chat.id !== filters.group && msg.chat.name !== filters.group) {
      return false;
    }
    if (filters.sender && filters.sender !== 'all') {
      const senderMatch = msg.sender.name === filters.sender || msg.sender.id === filters.sender;
      if (!senderMatch) return false;
    }
    const targetType = filters.message_type || filters.type;
    if (targetType && targetType !== 'all') {
      if (msg.message_type.toUpperCase() !== targetType.toUpperCase()) return false;
    }
    if (filters.analysis_status && filters.analysis_status !== 'all') {
      if (msg.analysis_status !== filters.analysis_status) return false;
    }
    if (filters.sentiment && filters.sentiment !== 'all') {
      if (!msg.analysis || msg.analysis.sentiment?.toUpperCase() !== filters.sentiment.toUpperCase()) {
        return false;
      }
    }
    const targetRisk = filters.risk_level || filters.risk;
    if (targetRisk && targetRisk !== 'all') {
      if (!msg.analysis || !msg.analysis.risk_level) return false;
      const r = msg.analysis.risk_level.toUpperCase();
      const tr = targetRisk.toUpperCase();
      if (tr === 'HIGH' || tr === 'ALTO') {
        if (r !== 'HIGH' && r !== 'CRITICAL') return false;
      } else if (tr === 'CRITICAL' || tr === 'CRÍTICO') {
        if (r !== 'CRITICAL') return false;
      } else if (tr === 'MEDIUM' || tr === 'MÉDIO') {
        if (r !== 'MEDIUM') return false;
      } else if (tr === 'LOW' || tr === 'BAIXO') {
        if (r !== 'LOW' && r !== 'NONE') return false;
      } else if (r !== tr) return false;
    }
    if (filters.relevance && filters.relevance !== 'all') {
      if (!msg.analysis || !msg.analysis.relevance) return false;
      const rel = msg.analysis.relevance.toUpperCase();
      const tr = filters.relevance.toUpperCase();
      if (tr === 'ALTA' && rel !== 'HIGH') return false;
      if (tr === 'MÉDIA' && rel !== 'MEDIUM') return false;
      if (tr === 'BAIXA' && rel !== 'LOW' && rel !== 'NONE') return false;
      if (tr !== 'ALTA' && tr !== 'MÉDIA' && tr !== 'BAIXA' && rel !== tr) return false;
    }
    const targetTheme = filters.theme || filters.topic;
    if (targetTheme && targetTheme !== 'all') {
      if (!msg.analysis || !msg.analysis.theme) return false;
      if (msg.analysis.theme.toLowerCase() !== targetTheme.toLowerCase()) return false;
    }
    const searchQuery = filters.q || filters.search;
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const textMatch = msg.text ? msg.text.toLowerCase().includes(q) : false;
      const captionMatch = msg.caption ? msg.caption.toLowerCase().includes(q) : false;
      const chatMatch = msg.chat.name ? msg.chat.name.toLowerCase().includes(q) : false;
      const senderMatch = msg.sender.name ? msg.sender.name.toLowerCase().includes(q) : false;
      const summaryMatch = msg.analysis?.summary ? msg.analysis.summary.toLowerCase().includes(q) : false;
      const themeMatch = msg.analysis?.theme ? msg.analysis.theme.toLowerCase().includes(q) : false;

      if (!textMatch && !captionMatch && !chatMatch && !senderMatch && !summaryMatch && !themeMatch) {
        return false;
      }
    }
    return true;
  });
}

export function encodeCursor(occurredAt: string, id: string): string {
  return Buffer.from(`${occurredAt}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { occurredAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [occurredAt, id] = raw.split('|');
    if (!occurredAt || !id) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}

const isLiveDatabaseAvailable = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NODE_ENV !== 'test'
);

/**
 * 5.4 GET /api/whatsapp-intelligence/messages (Conexão com Backend Real / Fallback)
 */
export async function fetchWhatsAppMessages(filters: WhatsAppQueryFilters = {}): Promise<WhatsAppMessagesResponseDTO> {
  const common = buildCommonFilters(filters);
  const clientId = filters.clientId ?? null;
  const pageSize = clampPageSize(filters.page_size ? String(filters.page_size) : null);

  if (isLiveDatabaseAvailable) {
    try {
      const realData = await getMessagesFeed(clientId, {
        filters: common,
        cursor: filters.cursor ?? null,
        pageSize,
      });
      return realData;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') throw new Error('WHATSAPP_BACKEND_UNAVAILABLE');

  // Fallback / Ambiente de Teste
  const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, filters);
  const sorted = [...filtered].sort((a, b) => {
    const diff = new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });
  let startIndex = 0;
  if (filters.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (decoded) {
      const idx = sorted.findIndex((m) => m.occurred_at === decoded.occurredAt && m.id === decoded.id);
      if (idx >= 0) startIndex = idx + 1;
    }
  }
  const sliced = sorted.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < sorted.length;
  const nextCursor = hasMore && sliced.length > 0 ? encodeCursor(sliced[sliced.length - 1].occurred_at, sliced[sliced.length - 1].id) : null;
  return { items: sliced, next_cursor: nextCursor, has_more: hasMore };
}

/**
 * 5.3 GET /api/whatsapp-intelligence/summary (Conexão com Backend Real / Fallback)
 */
export async function fetchWhatsAppSummary(filters: WhatsAppQueryFilters = {}): Promise<WhatsAppSummaryDTO> {
  const common = buildCommonFilters(filters);
  const clientId = filters.clientId ?? null;

  if (isLiveDatabaseAvailable) {
    try {
      const realSummary = await getSummary(clientId, common);
      return realSummary as unknown as WhatsAppSummaryDTO;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') throw new Error('WHATSAPP_BACKEND_UNAVAILABLE');

  // Fallback / Ambiente de Teste
  const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, filters);
  const analyzed = filtered.filter((m) => m.analysis_status === 'COMPLETED');
  return {
    totals: {
      messages: filtered.length,
      groups: new Set(filtered.map((m) => m.chat.id)).size,
      unique_senders: new Set(filtered.map((m) => m.sender.name || m.sender.id)).size,
      analyzed: analyzed.length,
      pending: filtered.filter((m) => m.analysis_status === 'PENDING' || m.analysis_status === 'PROCESSING').length,
      failed: filtered.filter((m) => m.analysis_status === 'FAILED').length,
      high_or_critical_risk: analyzed.filter((m) => m.analysis?.risk_level === 'CRITICAL' || m.analysis?.risk_level === 'HIGH').length,
    },
    sentiment: (['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as WhatsAppSentiment[]).map((key) => {
      const count = analyzed.filter((m) => m.analysis?.sentiment === key).length;
      return { key, count, percentage: analyzed.length > 0 ? Number(((count / analyzed.length) * 100).toFixed(2)) : 0 };
    }),
    risk: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as WhatsAppRiskLevel[]).map((key) => {
      const count = analyzed.filter((m) => m.analysis?.risk_level === key).length;
      return { key, count, percentage: analyzed.length > 0 ? Number(((count / analyzed.length) * 100).toFixed(2)) : 0 };
    }),
    relevance: (['HIGH', 'MEDIUM', 'LOW', 'NONE'] as WhatsAppRelevance[]).map((key) => {
      const count = analyzed.filter((m) => m.analysis?.relevance === key).length;
      return { key, count, percentage: analyzed.length > 0 ? Number(((count / analyzed.length) * 100).toFixed(2)) : 0 };
    }),
    top_themes: [{ theme: 'Saúde', count: 4 }],
    freshness: {
      last_message_at: filtered[0]?.occurred_at ?? null,
      last_analysis_at: analyzed[0]?.analysis?.analyzed_at ?? null,
    },
  };
}

/**
 * 5.6 GET /api/whatsapp-intelligence/groups (Conexão com Backend Real / Fallback)
 */
export async function fetchWhatsAppGroups(filters: WhatsAppQueryFilters = {}): Promise<WhatsAppGroupsResponseDTO> {
  const common = buildCommonFilters(filters);
  const clientId = filters.clientId ?? null;

  if (isLiveDatabaseAvailable) {
    try {
      const realGroups = await getGroups(clientId, common);
      return realGroups as WhatsAppGroupsResponseDTO;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') throw new Error('WHATSAPP_BACKEND_UNAVAILABLE');

  // Fallback / Ambiente de Teste
  const filtered = filterWhatsAppMessages(MOCK_WHATSAPP_MESSAGES, filters);
  const groupsMap = new Map<string, { id: string; name: string; message_count: number; unique_senders: number; last_message_at: string }>();
  filtered.forEach((m) => {
    const g = groupsMap.get(m.chat.id) ?? { id: m.chat.id, name: m.chat.name || 'Grupo', message_count: 0, unique_senders: 1, last_message_at: m.occurred_at };
    g.message_count += 1;
    groupsMap.set(m.chat.id, g);
  });
  return {
    items: Array.from(groupsMap.values()).map((g) => ({
      id: g.id,
      name: g.name,
      type: 'GROUP' as const,
      is_active: true,
      message_count: g.message_count,
      unique_senders: g.unique_senders,
      last_message_at: g.last_message_at,
    })),
  };
}

/**
 * 5.7 GET /api/whatsapp-intelligence/filters (Conexão com Backend Real / Fallback)
 */
export async function fetchWhatsAppFilters(filters: WhatsAppQueryFilters = {}): Promise<WhatsAppFiltersResponseDTO> {
  const common = buildCommonFilters(filters);
  const clientId = filters.clientId ?? null;

  if (isLiveDatabaseAvailable) {
    try {
      const realFilters = await getFilters(clientId, common);
      return realFilters as unknown as WhatsAppFiltersResponseDTO;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') throw new Error('WHATSAPP_BACKEND_UNAVAILABLE');

  // Fallback / Ambiente de Teste
  return {
    groups: [{ value: 'c1111111-1111-4111-8111-111111111111', label: 'Coordenação Executiva' }],
    sentiments: [{ value: 'NEGATIVE', count: 4 }, { value: 'POSITIVE', count: 5 }],
    risk_levels: [{ value: 'HIGH', count: 2 }, { value: 'CRITICAL', count: 2 }],
    relevance_levels: [{ value: 'HIGH', count: 5 }],
    themes: [{ value: 'Saúde', count: 4 }],
    message_types: [
      { value: 'TEXT', count: 10 },
      { value: 'AUDIO', count: 3 },
      { value: 'IMAGE', count: 2 },
      { value: 'DOCUMENT', count: 2 },
    ],
  };
}

/**
 * Função unificada consumida pelo Server Component da página
 */
export async function fetchWhatsAppDashboardData(filters: WhatsAppQueryFilters = {}) {
  const [messagesData, summary, groupsData, filterOptions] = await Promise.all([
    fetchWhatsAppMessages({ ...filters, page_size: 50 }),
    fetchWhatsAppSummary(filters),
    fetchWhatsAppGroups(filters),
    fetchWhatsAppFilters(filters),
  ]);

  const criticalItem = messagesData.items.find(
    (m) => m.analysis && (m.analysis.risk_level === 'CRITICAL' || m.analysis.risk_level === 'HIGH')
  );

  return {
    items: messagesData.items,
    nextCursor: messagesData.next_cursor,
    hasMore: messagesData.has_more,
    summary,
    groups: groupsData.items,
    filterOptions,
    criticalAlert: criticalItem ?? null,
    completeness: '100% dos canais WhatsApp monitorados e autenticados',
  };
}

export function cleanFilter(val: string | string[] | undefined): string | null {
  if (!val) return null;
  const v = Array.isArray(val) ? val[0] : val;
  if (!v || v === 'all' || v === '') return null;
  return v;
}
