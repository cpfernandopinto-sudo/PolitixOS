import type { ElectoralPoll, ExtractedPollMetadata, SampleProfileItem, ExtractedValue } from './types';

function parseNumberBr(val: string): number | null {
  const clean = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num : null;
}

function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed === '' || trimmed === '#NULO#') return null;
  return trimmed;
}

export function extractMarginOfError(poll: ElectoralPoll): ExtractedValue<number> | null {
  if (poll.margemErro !== null && poll.margemErro !== undefined && poll.margemErro > 0) {
    return {
      value: poll.margemErro,
      isExtracted: false,
      confidence: 'high',
      sourceField: 'STRUCTURED_TSE',
    };
  }

  const rawPlano = cleanText(poll.rawSourceRow?.DS_PLANO_AMOSTRAL) ?? cleanText(poll.metodologia);
  if (!rawPlano) return null;

  // Patterns for margin of error
  const patterns = [
    /(?:margem de erro|erro amostral)(?: máxima| estimada| estimado| máximo)?\s*(?:de|é de|em|de até)?\s*(?:mais ou menos|\+\/\-|±)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i,
    /(?:mais ou menos|\+\/\-|±)\s*([0-9]+(?:[.,][0-9]+)?)\s*%\s*(?:para mais|de margem|de erro)/i,
    /erro de\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*pontos percentuais/i,
  ];

  for (const pattern of patterns) {
    const match = rawPlano.match(pattern);
    if (match && match[1]) {
      const val = parseNumberBr(match[1]);
      if (val !== null && val > 0 && val <= 15) {
        return {
          value: val,
          isExtracted: true,
          confidence: 'high',
          sourceField: 'DS_PLANO_AMOSTRAL',
          rawSnippet: match[0],
        };
      }
    }
  }

  return null;
}

export function extractConfidenceLevel(poll: ElectoralPoll): ExtractedValue<number> | null {
  if (poll.nivelConfianca !== null && poll.nivelConfianca !== undefined && poll.nivelConfianca > 0) {
    return {
      value: poll.nivelConfianca,
      isExtracted: false,
      confidence: 'high',
      sourceField: 'STRUCTURED_TSE',
    };
  }

  const rawPlano = cleanText(poll.rawSourceRow?.DS_PLANO_AMOSTRAL) ?? cleanText(poll.metodologia);
  if (!rawPlano) return null;

  const patterns = [
    /(?:nível|intervalo|grau) de confiança\s*(?:de|é de|em)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i,
    /confiança\s*(?:de|é de|em)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = rawPlano.match(pattern);
    if (match && match[1]) {
      const val = parseNumberBr(match[1]);
      if (val !== null && val >= 80 && val <= 99.9) {
        return {
          value: val,
          isExtracted: true,
          confidence: 'high',
          sourceField: 'DS_PLANO_AMOSTRAL',
          rawSnippet: match[0],
        };
      }
    }
  }

  return null;
}

export function extractGenderDistribution(rawPlano: string | null): ExtractedValue<SampleProfileItem[]> | null {
  if (!rawPlano) return null;

  const genderRegexes = [
    /(?:sexo|gênero|genero)[:\s]*([^\n.;]+)/i,
    /(masculino[^\n.;]+feminino[^\n.;]+)/i,
    /(feminino[^\n.;]+masculino[^\n.;]+)/i,
    /(homens[^\n.;]+mulheres[^\n.;]+)/i,
  ];

  for (const regex of genderRegexes) {
    const match = rawPlano.match(regex);
    if (match) {
      const text = match[0];

      const mascMatch = text.match(/(?:masculino|homens)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i) ||
                        rawPlano.match(/(?:masculino|homens)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i);
      const femMatch = text.match(/(?:feminino|mulheres)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i) ||
                       rawPlano.match(/(?:feminino|mulheres)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i);

      if (mascMatch?.[1] && femMatch?.[1]) {
        const masc = parseNumberBr(mascMatch[1]);
        const fem = parseNumberBr(femMatch[1]);
        if (masc !== null && fem !== null && masc + fem >= 90 && masc + fem <= 110) {
          const items: SampleProfileItem[] = [
            { label: 'Masculino', percentage: masc },
            { label: 'Feminino', percentage: fem },
          ];
          return {
            value: items,
            isExtracted: true,
            confidence: 'high',
            sourceField: 'DS_PLANO_AMOSTRAL',
            rawSnippet: `${mascMatch[0]}, ${femMatch[0]}`,
          };
        }
      }
    }
  }

  return null;
}

export function extractAgeDistribution(rawPlano: string | null): ExtractedValue<SampleProfileItem[]> | null {
  if (!rawPlano) return null;

  const agePattern = /(?:(\d{2}\s*(?:a|-)\s*\d{2}|\d{2}\s*anos\s*ou\s*mais|\d{2}\+|\d{2}\s*anos\s*a\s*mais)(?:\s*anos)?)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/gi;
  
  const items: SampleProfileItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = agePattern.exec(rawPlano)) !== null) {
    let label = match[1].trim().replace(/\s+/g, ' ');
    if (!label.toLowerCase().includes('anos') && !label.includes('+')) {
      label = `${label} anos`;
    }
    const pct = parseNumberBr(match[2]);
    if (pct !== null && pct > 0 && pct < 100) {
      items.push({ label, percentage: pct });
    }
  }

  if (items.length >= 3) {
    const total = items.reduce((sum, item) => sum + item.percentage, 0);
    if (total >= 80 && total <= 115) {
      return {
        value: items,
        isExtracted: true,
        confidence: 'high',
        sourceField: 'DS_PLANO_AMOSTRAL',
      };
    }
  }

  return null;
}

export function extractEducationDistribution(rawPlano: string | null): ExtractedValue<SampleProfileItem[]> | null {
  if (!rawPlano) return null;

  const items: SampleProfileItem[] = [];
  const tiers = [
    { name: 'Fundamental (ou menos)', regex: /(?:analfabeto|fundamental|lê e escreve|até 9º ano)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i },
    { name: 'Médio', regex: /(?:médio|secundário|colegial)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i },
    { name: 'Superior', regex: /(?:superior|faculdade|terciário)\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i },
  ];

  for (const tier of tiers) {
    const match = rawPlano.match(tier.regex);
    if (match && match[1]) {
      const pct = parseNumberBr(match[1]);
      if (pct !== null) items.push({ label: tier.name, percentage: pct });
    }
  }

  if (items.length >= 2) {
    return {
      value: items,
      isExtracted: true,
      confidence: 'medium',
      sourceField: 'DS_PLANO_AMOSTRAL',
    };
  }

  return null;
}

export function extractIncomeDistribution(rawPlano: string | null): ExtractedValue<SampleProfileItem[]> | null {
  if (!rawPlano) return null;

  const incomePattern = /((?:até\s*\d+|\d+\s*a\s*\d+|\d+\s*ou\s*mais|\+\s*\d+)\s*(?:SM|salários|salário|salarios))\s*(?::|\(|-|=)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/gi;
  const items: SampleProfileItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = incomePattern.exec(rawPlano)) !== null) {
    const label = match[1].trim();
    const pct = parseNumberBr(match[2]);
    if (pct !== null) items.push({ label, percentage: pct });
  }

  if (items.length >= 2) {
    return {
      value: items,
      isExtracted: true,
      confidence: 'medium',
      sourceField: 'DS_PLANO_AMOSTRAL',
    };
  }

  return null;
}

export function extractCollectionType(rawMetodologia: string | null): ExtractedValue<string> | null {
  if (!rawMetodologia) return null;
  const lower = rawMetodologia.toLowerCase();

  let type: string | null = null;
  if (lower.includes('telefôni') || lower.includes('telefone') || /\bcati\b/i.test(rawMetodologia) || /\bativa\b/i.test(rawMetodologia)) {
    type = 'Telefônica (CATI)';
  } else if (lower.includes('domicili') || lower.includes('domiciliar') || lower.includes('pessoais em domicílio')) {
    type = 'Presencial (Domiciliar)';
  } else if (lower.includes('ponto de fluxo') || lower.includes('locais públicos')) {
    type = 'Presencial (Ponto de fluxo)';
  } else if (lower.includes('presencial') || lower.includes('pessoal') || lower.includes('pessoais')) {
    type = 'Presencial';
  } else if (lower.includes('digital') || lower.includes('web') || lower.includes('online') || lower.includes('painel')) {
    type = 'Digital / Online';
  }

  if (type) {
    return {
      value: type,
      isExtracted: true,
      confidence: 'high',
      sourceField: 'DS_METODOLOGIA_PESQUISA',
    };
  }

  return null;
}

export function extractSamplingMethod(rawMetodologia: string | null, rawPlano: string | null): ExtractedValue<string> | null {
  const combined = `${rawMetodologia ?? ''} ${rawPlano ?? ''}`.toLowerCase();
  if (!combined.trim()) return null;

  let method: string | null = null;
  if (combined.includes('ppt') || combined.includes('probabilidade proporcional ao tamanho')) {
    method = 'Probabilidade Proporcional ao Tamanho (PPT)';
  } else if (combined.includes('quota') || combined.includes('cotas')) {
    method = 'Amostragem por Quotas';
  } else if (combined.includes('conglomerado')) {
    method = 'Amostragem por Conglomerados';
  } else if (combined.includes('estratificad')) {
    method = 'Amostragem Estratificada';
  } else if (combined.includes('probabilístic')) {
    method = 'Amostragem Probabilística';
  }

  if (method) {
    return {
      value: method,
      isExtracted: true,
      confidence: 'high',
      sourceField: rawMetodologia ? 'DS_METODOLOGIA_PESQUISA' : 'DS_PLANO_AMOSTRAL',
    };
  }

  return null;
}

export function extractWeightingInfo(rawMetodologia: string | null, rawPlano: string | null): ExtractedValue<{ used: boolean; variables: string[] }> | null {
  const combined = `${rawMetodologia ?? ''} ${rawPlano ?? ''}`;
  if (!combined.trim()) return null;

  const lower = combined.toLowerCase();
  const mentionsWeighting = lower.includes('pondera') || lower.includes('pesagem') || lower.includes('pesos');

  if (!mentionsWeighting) {
    return {
      value: { used: false, variables: [] },
      isExtracted: true,
      confidence: 'medium',
      sourceField: 'DS_METODOLOGIA_PESQUISA',
    };
  }

  const variables: string[] = [];
  if (lower.includes('sexo') || lower.includes('gênero')) variables.push('Sexo/Gênero');
  if (lower.includes('idade') || lower.includes('faixa etária')) variables.push('Faixa Etária');
  if (lower.includes('escolaridade') || lower.includes('instrução')) variables.push('Escolaridade');
  if (lower.includes('renda')) variables.push('Nível Econômico / Renda');
  if (lower.includes('região') || lower.includes('setor') || lower.includes('geogr')) variables.push('Região / Geografia');

  return {
    value: { used: true, variables },
    isExtracted: true,
    confidence: 'high',
    sourceField: 'DS_METODOLOGIA_PESQUISA',
  };
}

export function extractQualityControl(rawControle: string | null): ExtractedValue<{ checkpoints: string[]; auditPercentage: number | null }> | null {
  const clean = cleanText(rawControle);
  if (!clean) return null;

  const checkpoints: string[] = [];
  const lower = clean.toLowerCase();

  if (lower.includes('treinad') || lower.includes('supervis') || lower.includes('instruíd')) {
    checkpoints.push('Entrevistadores treinados e supervisionados');
  }

  if (lower.includes('eletrônic') || lower.includes('tablet') || lower.includes('capi') || lower.includes('smartphone')) {
    checkpoints.push('Questionário eletrônico com validação lógica');
  }

  let auditPercentage: number | null = null;
  const auditMatch = clean.match(/(?:checagem|fiscalização|supervisão|auditoria)\s*(?:de)?\s*([0-9]+(?:[.,][0-9]+)?)\s*%/i) ||
                     clean.match(/([0-9]+(?:[.,][0-9]+)?)\s*%\s*(?:d[ao]s|de)?\s*(?:questionários|entrevistas|amostras?|material)?\s*(?:fiscalizadas?|checadas?|auditadas?|verificadas?|supervisionadas?)/i);

  if (auditMatch?.[1]) {
    auditPercentage = parseNumberBr(auditMatch[1]);
    if (auditPercentage !== null) {
      checkpoints.push(`Checagem e auditoria de ${auditPercentage}% das entrevistas`);
    }
  } else if (lower.includes('checagem') || lower.includes('fiscaliza') || lower.includes('auditoria')) {
    checkpoints.push('Checagem e auditoria amostral realizada');
  }

  if (lower.includes('consistência') || lower.includes('revisão') || lower.includes('validação')) {
    checkpoints.push('Revisão e controle de consistência dos dados');
  }

  if (checkpoints.length === 0) {
    checkpoints.push('Procedimento de controle de campo descrito no registro');
  }

  return {
    value: { checkpoints, auditPercentage },
    isExtracted: true,
    confidence: 'high',
    sourceField: 'DS_SISTEMA_CONTROLE',
  };
}

export function extractTerritorialCoverage(rawMunicipio: string | null): ExtractedValue<{ status: 'structured' | 'pending' | 'none'; details: string[] | null }> | null {
  const clean = cleanText(rawMunicipio);
  if (!clean) {
    return {
      value: { status: 'none', details: null },
      isExtracted: false,
      confidence: 'high',
      sourceField: 'DS_DADO_MUNICIPIO',
    };
  }

  const lower = clean.toLowerCase();
  const isPendingLegalDisclaimer = lower.includes('resolução') ||
                                   lower.includes('art. 2') ||
                                   lower.includes('artigo 2') ||
                                   lower.includes('anexa') ||
                                   lower.includes('posteriormente') ||
                                   lower.includes('complementação') ||
                                   lower.includes('prazo legal') ||
                                   lower.includes('prazo de até');

  if (isPendingLegalDisclaimer) {
    return {
      value: {
        status: 'pending',
        details: null,
      },
      isExtracted: true,
      confidence: 'high',
      sourceField: 'DS_DADO_MUNICIPIO',
    };
  }

  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    return {
      value: {
        status: 'structured',
        details: lines,
      },
      isExtracted: true,
      confidence: 'medium',
      sourceField: 'DS_DADO_MUNICIPIO',
    };
  }

  return {
    value: { status: 'none', details: null },
    isExtracted: false,
    confidence: 'medium',
    sourceField: 'DS_DADO_MUNICIPIO',
  };
}

export function parsePollMetadata(poll: ElectoralPoll): ExtractedPollMetadata {
  const rawPlano = cleanText(poll.rawSourceRow?.DS_PLANO_AMOSTRAL);
  const rawMetodologia = cleanText(poll.metodologia ?? poll.rawSourceRow?.DS_METODOLOGIA_PESQUISA);
  const rawControle = cleanText(poll.rawSourceRow?.DS_SISTEMA_CONTROLE);
  const rawMunicipio = cleanText(poll.rawSourceRow?.DS_DADO_MUNICIPIO);

  const sampling = extractSamplingMethod(rawMetodologia, rawPlano);

  return {
    marginError: extractMarginOfError(poll),
    confidenceLevel: extractConfidenceLevel(poll),
    genderDistribution: extractGenderDistribution(rawPlano),
    ageDistribution: extractAgeDistribution(rawPlano),
    educationDistribution: extractEducationDistribution(rawPlano),
    incomeDistribution: extractIncomeDistribution(rawPlano),
    collectionType: extractCollectionType(rawMetodologia),
    samplingMethod: sampling,
    targetPublic: sampling ? { value: 'Eleitores com 16 anos ou mais', isExtracted: true, confidence: 'high', sourceField: 'DS_PLANO_AMOSTRAL' } : null,
    weightingInfo: extractWeightingInfo(rawMetodologia, rawPlano),
    qualityControl: extractQualityControl(rawControle),
    territorialCoverage: extractTerritorialCoverage(rawMunicipio),
  };
}
