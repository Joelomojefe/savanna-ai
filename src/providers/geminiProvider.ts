import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider, CompletionContext, ChatMessage, ChatOptions } from './aiProvider';

export class GeminiProvider extends BaseAIProvider {
    name = 'Google Gemini';
    private client: GoogleGenerativeAI | null = null;
    private supportedModels = ['gemini-pro', 'gemini-pro-vision'];

    getSupportedModels(): string[] {
        return this.supportedModels;
    }

    override setApiKey(apiKey: string): void {
        super.setApiKey(apiKey);
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async generateCompletion(prompt: string, context: CompletionContext): Promise<string> {
        if (!this.client) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const model = this.client.getGenerativeModel({ model: this.currentModel });
            const fullPrompt = this.buildCompletionPrompt(prompt, context);

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: context.temperature || 0.7,
                    maxOutputTokens: context.maxTokens || 150,
                    stopSequences: ['\n\n', '```']
                }
            });

            return result.response.text() || '';
        } catch (error) {
            console.error('Gemini completion error:', error);
            throw new Error(`Gemini completion failed: ${error}`);
        }
    }

    async generateChat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
        if (!this.client) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const model = this.client.getGenerativeModel({ 
                model: options?.model || this.currentModel 
            });

            // Convert messages to Gemini format
            const contents = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            const result = await model.generateContent({
                contents,
                generationConfig: {
                    temperature: options?.temperature || 0.7,
                    maxOutputTokens: options?.maxTokens || 1000
                }
            });

            return result.response.text() || '';
        } catch (error) {
            console.error('Gemini chat error:', error);
            throw new Error(`Gemini chat failed: ${error}`);
        }
    }

    private buildCompletionPrompt(_prompt: string, context: CompletionContext): string {
        return `You are an AI coding assistant. Complete the following ${context.language} code.

File: ${context.filename}

Code before cursor:
\`\`\`${context.language}
${context.beforeCursor}
\`\`\`

Code after cursor:
\`\`\`${context.language}
${context.afterCursor}
\`\`\`

Instructions:
- Only return the code completion
- Match existing style and indentation
- Keep it concise and relevant
- Don't repeat existing code

Complete the code:`;
    }
}
