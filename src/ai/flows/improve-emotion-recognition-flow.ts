'use server';
/**
 * @fileOverview A flow to improve emotion recognition by incorporating user feedback.
 *
 * - improveEmotionRecognition - A function that handles the process of improving emotion recognition based on user feedback.
 * - ImproveEmotionRecognitionInput - The input type for the improveEmotionRecognition function.
 * - ImproveEmotionRecognitionOutput - The return type for the improveEmotionRecognition function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveEmotionRecognitionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a face, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  detectedEmotion: z.string().describe('The emotion initially detected by the AI.'),
  userFeedback: z.string().describe('The user-provided feedback on the detected emotion.'),
});
export type ImproveEmotionRecognitionInput = z.infer<typeof ImproveEmotionRecognitionInputSchema>;

const ImproveEmotionRecognitionOutputSchema = z.object({
  updatedModelNotes: z.string().describe('Notes on how the model can be updated based on feedback.'),
});
export type ImproveEmotionRecognitionOutput = z.infer<typeof ImproveEmotionRecognitionOutputSchema>;

export async function improveEmotionRecognition(input: ImproveEmotionRecognitionInput): Promise<ImproveEmotionRecognitionOutput> {
  return improveEmotionRecognitionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveEmotionRecognitionPrompt',
  input: {schema: ImproveEmotionRecognitionInputSchema},
  output: {schema: ImproveEmotionRecognitionOutputSchema},
  prompt: `You are an AI model improvement specialist.

You are provided with a photo of a face, the emotion initially detected by the AI, and user feedback on the detected emotion.

Your task is to analyze the feedback and provide notes on how the AI model can be improved to better recognize emotions in the future.

Photo: {{media url=photoDataUri}}
Detected Emotion: {{{detectedEmotion}}}
User Feedback: {{{userFeedback}}}

Based on the user feedback, provide specific notes on how the model can be improved. Focus on adjusting weights, incorporating new features, or refining the training data to address the identified inaccuracies.
`,
});

const improveEmotionRecognitionFlow = ai.defineFlow(
  {
    name: 'improveEmotionRecognitionFlow',
    inputSchema: ImproveEmotionRecognitionInputSchema,
    outputSchema: ImproveEmotionRecognitionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
