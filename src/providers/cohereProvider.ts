import { CohereClient } from 'cohere-ai';
import { BaseAIProvider, CompletionContext, ChatMessage, ChatOptions } from './aiProvider';

export class CohereProvider extends BaseAIProvider {
    name = 'Cohere';
    private client: CohereClient | null = null;
    private supportedModels = ['command', 'command-light', 'command-nightly'];

    getSupportedModels(): string[] {
        return this.supportedModels;
    }

    override setApiKey(apiKey: string): void {
        super.setApiKey(apiKey);
        this.client = new CohereClient({
            token: apiKey
        });
    }

    async generateCompletion(prompt: string, context: CompletionContext): Promise<string> {
        if (!this.client) {
            throw new Error('Cohere API key not configured');
        }

        try {
            const fullPrompt = this.buildCompletionPrompt(prompt, context);

            const response = await this.client.generate({
                model: this.currentModel,
                prompt: fullPrompt,
                maxTokens: context.maxTokens || 150,
                temperature: context.temperature || 0.7,
                stopSequences: ['\n\n', '```'],
                returnLikelihoods: 'NONE'
            });

            return response.generations[0]?.text || '';
        } catch (error) {
            console.error('Cohere completion error:', error);
            throw new Error(`Cohere completion failed: ${error}`);
        }
    }

    async generateChat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
        if (!this.client) {
            throw new Error('Cohere API key not configured');
        }

        try {
            // Cohere's chat API expects a different format
            const chatHistory = messages.slice(0, -1).map(msg => ({
                role: msg.role === 'assistant' ? 'CHATBOT' as const : 'USER' as const,
                message: msg.content
            }));

            console.log("CHECK 222");
            
            const lastMessage = messages[messages.length - 1];

            const response = await this.client.chat({
                model: options?.model || this.currentModel,
                message: lastMessage.content,
                chatHistory: chatHistory as any,
                temperature: options?.temperature || 0.7,
                maxTokens: options?.maxTokens || 1000
            });

            return response.text || '';
        } catch (error) {
            console.error('Cohere chat error:', error);
            throw new Error(`Cohere chat failed: ${error}`);
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

Code completion:`;
    }
}
