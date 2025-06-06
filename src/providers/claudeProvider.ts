import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, CompletionContext, ChatMessage, ChatOptions } from './aiProvider';

export class ClaudeProvider extends BaseAIProvider {
    name = 'Anthropic Claude';
    private client: Anthropic | null = null;
    private supportedModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];

    getSupportedModels(): string[] {
        return this.supportedModels;
    }

    override setApiKey(apiKey: string): void {
        super.setApiKey(apiKey);
        this.client = new Anthropic({
            apiKey: apiKey
        });
    }

    async generateCompletion(prompt: string, context: CompletionContext): Promise<string> {
        if (!this.client) {
            throw new Error('Claude API key not configured');
        }

        try {
            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = this.buildCompletionPrompt(prompt, context);

            const response = await this.client.messages.create({
                model: this.currentModel,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: context.maxTokens || 150,
                temperature: context.temperature || 0.7,
                stop_sequences: ['\n\n', '```']
            });

            const content = response.content[0];
            return content.type === 'text' ? content.text : '';
        } catch (error) {
            console.error('Claude completion error:', error);
            throw new Error(`Claude completion failed: ${error}`);
        }
    }

    async generateChat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
        if (!this.client) {
            throw new Error('Claude API key not configured');
        }

        try {
            // Separate system messages from user/assistant messages
            const systemMessages = messages.filter(msg => msg.role === 'system');
            const chatMessages = messages.filter(msg => msg.role !== 'system');

            const systemPrompt = systemMessages.map(msg => msg.content).join('\n');

            const response = await this.client.messages.create({
                model: options?.model || this.currentModel,
                system: systemPrompt || 'You are a helpful AI coding assistant.',
                messages: chatMessages.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content
                })),
                max_tokens: options?.maxTokens || 1000,
                temperature: options?.temperature || 0.7
            });

            const content = response.content[0];
            return content.type === 'text' ? content.text : '';
        } catch (error) {
            console.error('Claude chat error:', error);
            throw new Error(`Claude chat failed: ${error}`);
        }
    }

    private buildSystemPrompt(context: CompletionContext): string {
        return `You are Claude, an AI coding assistant. Provide helpful code completions for ${context.language} files.

Guidelines:
- Only return the code completion, no explanations
- Match the existing code style and indentation
- Keep completions concise and relevant
- Don't repeat code that's already written
- Focus on functionality and best practices`;
    }

    private buildCompletionPrompt(_prompt: string, context: CompletionContext): string {
        return `Complete the following ${context.language} code:

File: ${context.filename}

Code before cursor:
\`\`\`${context.language}
${context.beforeCursor}
\`\`\`

Code after cursor:
\`\`\`${context.language}
${context.afterCursor}
\`\`\`

Provide only the code completion:`;
    }
}
