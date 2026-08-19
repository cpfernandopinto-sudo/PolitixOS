import { describe, it, expect } from 'vitest';
import { normalizePesquisaRow } from './normalizer';

/**
 * Linha REAL (campos de texto longo truncados/redigidos por brevidade, mas
 * valores estruturados idênticos aos verificados por download real do
 * `pesquisa_eleitoral_2026.zip` em 2026-08-19 — ver
 * docs/relatorios/CLAUDE_PESQUISAS_01A_CORE_TSE.md, registro MG068972026).
 */
function realishRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    DT_GERACAO: '19/08/2026',
    HH_GERACAO: '05:46:35',
    AA_ELEICAO: '2026',
    CD_ELEICAO: '81',
    NM_ELEICAO: 'Eleições Gerais 2026',
    SG_UF: 'MG',
    SG_UE: 'MG',
    NM_UE: 'MINAS GERAIS',
    NR_PROTOCOLO_REGISTRO: 'MG068972026',
    DT_REGISTRO: '2026-03-13 15:43:49',
    ST_PESQUISA_PROPRIA: 'N',
    NR_CNPJ_EMPRESA: '42532542000155',
    NM_EMPRESA: 'DATA TEMPO LIMITADA',
    NM_EMPRESA_FANTASIA: '#NULO#',
    DS_CARGO: 'Governador, Senador',
    DT_INICIO_PESQUISA: '2026-03-14 00:00:00',
    DT_FIM_PESQUISA: '2026-03-18 00:00:00',
    DT_DIVULGACAO: '2026-03-19 00:00:00',
    QT_ENTREVISTADO: '2000',
    CD_CONRE: '10230',
    NM_ESTATISTICO_RESP: 'Bruno Augusto Silva Andrade',
    VR_PESQUISA: '170000,00',
    DS_METODOLOGIA_PESQUISA: 'Survey quantitativo, entrevistas pessoais em domicílio.',
    DS_PLANO_AMOSTRAL: 'Amostra de 2.000 entrevistas, erro amostral de 2,19%, confiança de 95%.',
    DS_SISTEMA_CONTROLE: 'Supervisão de campo, 20% dos questionários checados.',
    DS_DADO_MUNICIPIO: '#NULO#',
    ...overrides,
  };
}

describe('normalizePesquisaRow — mapeamento verificado contra schema real do TSE', () => {
  it('mapeia identidade oficial, ficha técnica e datas corretamente', () => {
    const poll = normalizePesquisaRow(realishRow());
    expect(poll).not.toBeNull();
    expect(poll?.tseRegistrationNumber).toBe('MG068972026');
    expect(poll?.electionYear).toBe(2026);
    expect(poll?.uf).toBe('MG');
    expect(poll?.cargo).toBe('Governador, Senador'); // multi-valor bruto, fonte não separa
    expect(poll?.instituto).toBe('DATA TEMPO LIMITADA');
    expect(poll?.dataRegistro).toBe('2026-03-13');
    expect(poll?.campoInicio).toBe('2026-03-14');
    expect(poll?.campoFim).toBe('2026-03-18');
    expect(poll?.amostra).toBe(2000);
  });

  it('converte VR_PESQUISA do formato decimal brasileiro (vírgula) para número', () => {
    const poll = normalizePesquisaRow(realishRow({ VR_PESQUISA: '5.000,50' }));
    expect(poll?.valor).toBe(5000.5);
  });

  it('"#NULO#" vira null em qualquer campo, não a string literal', () => {
    const poll = normalizePesquisaRow(realishRow({ NM_EMPRESA_FANTASIA: '#NULO#', DS_DADO_MUNICIPIO: '#NULO#' }));
    expect(poll?.rawSourceRow?.NM_EMPRESA_FANTASIA).toBe('#NULO#'); // preservado na linha bruta
    // mas os campos normalizados nunca devem propagar o placeholder como se fosse dado real
    expect(poll?.instituto).not.toBe('#NULO#');
  });

  it('linha sem NR_PROTOCOLO_REGISTRO (identidade oficial) é descartada — nunca ingere sem identidade (PARTE 11)', () => {
    expect(normalizePesquisaRow(realishRow({ NR_PROTOCOLO_REGISTRO: '#NULO#' }))).toBeNull();
    expect(normalizePesquisaRow(realishRow({ NR_PROTOCOLO_REGISTRO: '' }))).toBeNull();
  });

  it('linha sem AA_ELEICAO válido é descartada', () => {
    expect(normalizePesquisaRow(realishRow({ AA_ELEICAO: '' }))).toBeNull();
  });

  it('NÃO popula margem de erro, nível de confiança, contratante, pagante — não existem como coluna estruturada nesta fonte', () => {
    const poll = normalizePesquisaRow(realishRow());
    expect(poll?.margemErro).toBeNull();
    expect(poll?.nivelConfianca).toBeNull();
    expect(poll?.contratante).toBeNull();
    expect(poll?.pagante).toBeNull();
  });

  it('município fica null — SG_UE/NM_UE é a unidade eleitoral de registro, não confirmação de escopo geográfico real', () => {
    const poll = normalizePesquisaRow(realishRow());
    expect(poll?.municipio).toBeNull();
    expect(poll?.abrangencia).toBe('MINAS GERAIS'); // NM_UE armazenado, mas com essa ressalva semântica
  });

  it('preserva a linha bruta inteira em rawSourceRow — nada é perdido mesmo quando não mapeado', () => {
    const row = realishRow();
    const poll = normalizePesquisaRow(row);
    expect(poll?.rawSourceRow).toEqual(row);
  });
});
