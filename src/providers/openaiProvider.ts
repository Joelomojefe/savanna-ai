import { OpenAI } from 'openai';
import { BaseAIProvider, CompletionContext, ChatMessage, ChatOptions } from './aiProvider';

export class OpenAIProvider extends BaseAIProvider {
    name = 'OpenAI';
    private client: OpenAI | null = null;
    private supportedModels = ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'];

    getSupportedModels(): string[] {
        return this.supportedModels;
    }

    override setApiKey(apiKey: string): void {
        super.setApiKey(apiKey);
        this.client = new OpenAI({
            apiKey: apiKey
        });
    }

    async generateCompletion(prompt: string, context: CompletionContext): Promise<string> {
        if (!this.client) {
            throw new Error('OpenAI API key not configured');
        }

        try {
            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = this.buildCompletionPrompt(prompt, context);

            const response = await this.client.chat.completions.create({
                model: this.currentModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: context.maxTokens || 150,
                temperature: context.temperature || 0.7,
                stop: ['\n\n', '```']
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('OpenAI completion error:', error);
            throw new Error(`OpenAI completion failed: ${error}`);
        }
    }

    async generateChat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
        if (!this.client) {
            throw new Error('OpenAI API key not configured');
        }

        try {
            const response = await this.client.chat.completions.create({
                model: options?.model || this.currentModel,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                max_tokens: options?.maxTokens || 1000,
                temperature: options?.temperature || 0.7
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('OpenAI chat error:', error);
            throw new Error(`OpenAI chat failed: ${error}`);
        }
    }

    private buildSystemPrompt(context: CompletionContext): string {
        return `You are an AI coding assistant. Provide helpful code completions for ${context.language} files.
        - Only return the code completion, no explanations
        - Match the existing code style and indentation
        - Keep completions concise and relevant
        - Don't repeat code that's already written`;
    }

    private buildCompletionPrompt(_prompt: string, context: CompletionContext): string {
        return `File: ${context.filename}
Language: ${context.language}

Code before cursor:
\`\`\`${context.language}
${context.beforeCursor}
\`\`\`

Code after cursor:
\`\`\`${context.language}
${context.afterCursor}
\`\`\`

Please complete the code at the cursor position. Only return the completion:`;
    }
}
