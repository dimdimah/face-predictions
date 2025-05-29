'use server';

/**
 * @fileOverview Summarizes the user's emotional state over a given period.
 *
 * - summarizeEmotions - A function that summarizes the user's emotional state.
 * - EmotionSummaryInput - The input type for the summarizeEmotions function.
 * - EmotionSummaryOutput - The return type for the summarizeEmotions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EmotionSummaryInputSchema = z.object({
  emotionData: z.array(
    z.object({
      emotion: z.string(),
      timestamp: z.string().datetime(),
    })
  ).describe('An array of emotion data points with emotion and timestamp.'),
  period: z.enum(['daily', 'weekly', 'monthly']).describe('The period over which to summarize the emotions.'),
});

export type EmotionSummaryInput = z.infer<typeof EmotionSummaryInputSchema>;

const EmotionSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the user\s emotional state over the given period.'),
});

export type EmotionSummaryOutput = z.infer<typeof EmotionSummaryOutputSchema>;

export async function summarizeEmotions(input: EmotionSummaryInput): Promise<EmotionSummaryOutput> {
  return emotionSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'emotionSummaryPrompt',
  input: {schema: EmotionSummaryInputSchema},
  output: {schema: EmotionSummaryOutputSchema},
  prompt: `You are an AI assistant specializing in summarizing emotional data.

  You will receive an array of emotion data points, each with an emotion and a timestamp.
  Your task is to summarize the user's overall emotional state over the given period ({{{period}}}).

  Here is the emotion data:
  {{#each emotionData}}
  - Emotion: {{{emotion}}}, Timestamp: {{{timestamp}}}
  {{/each}}

  Provide a concise and informative summary of the user's emotional state, highlighting any trends or patterns.
  `,
});

const emotionSummaryFlow = ai.defineFlow(
  {
    name: 'emotionSummaryFlow',
    inputSchema: EmotionSummaryInputSchema,
    outputSchema: EmotionSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
