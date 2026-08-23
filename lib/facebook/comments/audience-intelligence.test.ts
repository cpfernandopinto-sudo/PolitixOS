import { describe, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { analyzeFacebookAudience, buildFacebookAudiencePrompt } from './audience-intelligence';
import type { FacebookAnalyticsPost } from '../analytics-contract';
import type { FacebookNormalizedComment } from './types';

const post = { id:'p',clientId:'c',targetId:'t',platform:'facebook',contentOrigin:'OWNED',contentType:'IMAGE',text:'Mensagem positiva',publishedAt:null,url:null,mediaUrl:null,mediaType:null,thumbnailUrl:null,engagement:{likes:null,reactionsTotal:10,reactionsBreakdown:{like:5,love:1,care:0,haha:3,wow:0,sad:0,angry:1},comments:{count:1,textAvailable:false},shares:0} } as FacebookAnalyticsPost;
const comment = { externalCommentId:'c1',legacyCommentId:null,externalPostId:'ep',parentCommentExternalId:null,depth:0,text:'Discordo completamente',publishedAt:null,authorId:null,authorName:null,authorProfileUrl:null,authorProfileImage:null,reactionsCount:2,repliesCount:0,contentType:'TEXTUAL',rawJson:{} } as FacebookNormalizedComment;
const output = { postSentiment:'POSITIVE',audienceSentiment:'NEGATIVE',audienceSentimentScore:-0.8,positiveComments:0,neutralComments:0,negativeComments:1,mixedComments:0,supportLevel:'baixo',rejectionLevel:'alto',polarizationLevel:'medio',dominantAudienceThemes:['rejeição'],reputationalRisk:'alto',crisisSignals:[],politicalOpportunity:'responder',messageAudienceDivergence:'alta',executiveSummary:'divergência',strategicReading:'audiência rejeita',recommendedAction:'monitorar',confidence:0.9 };

describe('Facebook audience intelligence', () => {
  it('declara comentários disponíveis e permite post positivo/audiência negativa', () => {
    const prompt = buildFacebookAudiencePrompt(post, [comment], 1);
    expect(prompt.system).toContain('COMMENTS_AVAILABLE=true'); expect(prompt.system).toContain('COMMENTS_ANALYZED=1');
  });
  it('usa Gemini structured output', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: JSON.stringify(output), candidates:[{finishReason:'STOP'}] });
    const result = await analyzeFacebookAudience({ post, comments:[comment], totalComments:1, geminiClient:{models:{generateContent}} as unknown as GoogleGenAI });
    expect(result).toMatchObject({ postSentiment:'POSITIVE',audienceSentiment:'NEGATIVE' });
    expect(generateContent.mock.calls[0][0]).toMatchObject({ model:'gemini-2.5-flash', config:{responseMimeType:'application/json'} });
  });
});
