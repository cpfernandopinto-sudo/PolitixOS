import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  let candidate = specifier;
  if (specifier.startsWith('@/')) candidate = pathToFileURL(path.join(process.cwd(), specifier.slice(2))).href;
  try {
    return await nextResolve(candidate, context);
  } catch (error) {
    if (candidate.startsWith('file:') || candidate.startsWith('.') || candidate.startsWith('/')) {
      const url = candidate.startsWith('file:') ? candidate : new URL(candidate, context.parentURL).href;
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        const withSuffix = `${url}${suffix}`;
        try {
          await access(new URL(withSuffix));
          return { url: withSuffix, shortCircuit: true };
        } catch { /* tenta o próximo sufixo */ }
      }
    }
    throw error;
  }
}

