import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { classifyGeminiError } from '@/lib/territorios/intelligence/interpretation/provider-errors';
import type { FacebookAnalyticsPost } from '../analytics-contract';
import type { FacebookNormalizedComment } from './types';

export const FACEBOOK_AUDIENCE_PROMPT_VERSION = 'facebook-audience-intelligence-v1';
export const FacebookAudienceIntelligenceSchema = z.object({
  postSentiment: z.enum(['POSITIVE','NEGATIVE','NEUTRAL','MIXED']), audienceSentiment: z.enum(['POSITIVE','NEGATIVE','NEUTRAL','MIXED']),
  audienceSentimentScore: z.number().min(-1).max(1), positiveComments: z.number().int().min(0), neutralComments: z.number().int().min(0),
  negativeComments: z.number().int().min(0), mixedComments: z.number().int().min(0), supportLevel: z.string().min(1), rejectionLevel: z.string().min(1),
  polarizationLevel: z.string().min(1), dominantAudienceThemes: z.array(z.string()), reputationalRisk: z.string().min(1), crisisSignals: z.array(z.string()),
  politicalOpportunity: z.string().min(1), messageAudienceDivergence: z.string().min(1), executiveSummary: z.string().min(1), strategicReading: z.string().min(1),
  recommendedAction: z.string().min(1), confidence: z.number().min(0).max(1),
});
export type FacebookAudienceIntelligence = z.infer<typeof FacebookAudienceIntelligenceSchema>;

export function buildFacebookAudiencePrompt(post: FacebookAnalyticsPost, comments: FacebookNormalizedComment[], totalComments: number) {
  const sample = comments.map((comment, index) => ({ index: index + 1, text: comment.text, reactionsCount: comment.reactionsCount, publishedAt: comment.publishedAt, contentType: comment.contentType }));
  const system = `Você é um analista político sênior. Diferencie rigorosamente sentimento do POST e sentimento da AUDIÊNCIA. Reações são sinais auxiliares ambíguos: nunca converta Haha/Angry/Love diretamente em sentimento. Use somente comentários reais fornecidos. COMMENTS_AVAILABLE=${comments.length > 0}; COMMENTS_ANALYZED=${comments.length}. Se COMMENTS_ANALYZED > 0, é proibido alegar ausência de acesso aos comentários. Responda apenas JSON conforme o schema.`;
  const user = JSON.stringify({ platform: 'facebook', originalPost: { text: post.text, publishedAt: post.publishedAt, contentType: post.contentType }, postMetrics: post.engagement, totalComments, commentsAnalyzed: comments.length, realCommentsSample: sample });
  return { system, user };
}

export async function analyzeFacebookAudience(input: { post: FacebookAnalyticsPost; comments: FacebookNormalizedComment[]; totalComments: number; apiKey?: string; geminiClient?: GoogleGenAI }) {
  if (!input.comments.length) throw new Error('FACEBOOK_AUDIENCE_COMMENTS_REQUIRED');
  const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY;
  const client = input.geminiClient ?? (apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: 60_000 } }) : null);
  if (!client) throw new Error('FACEBOOK_AUDIENCE_GEMINI_KEY_MISSING');
  const { system, user } = buildFacebookAudiencePrompt(input.post, input.comments, input.totalComments);
  try {
    const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: user, config: { systemInstruction: system, responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(FacebookAudienceIntelligenceSchema) as Record<string, unknown>, maxOutputTokens: 3072, thinkingConfig: { thinkingBudget: 0 } } });
    if (!response.text) throw new Error('FACEBOOK_AUDIENCE_GEMINI_EMPTY');
    return FacebookAudienceIntelligenceSchema.parse(JSON.parse(response.text));
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('FACEBOOK_'))) throw error;
    throw classifyGeminiError(error);
  }
}
