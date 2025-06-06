export interface AIProvider {
    name: string;
    isConfigured(): boolean;
    setApiKey(apiKey: string): void;
    generateCompletion(prompt: string, context: CompletionContext): Promise<string>;
    generateChat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
    getSupportedModels(): string[];
    getCurrentModel(): string;
    setModel(model: string): void;
}

export interface CompletionContext {
    language: string;
    filename: string;
    beforeCursor: string;
    afterCursor: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatOptions {
    temperature?: number;
    maxTokens?: number;
    model?: string;
}

export abstract class BaseAIProvider implements AIProvider {
    protected apiKey: string = '';
    protected currentModel: string = '';
    
    abstract name: string;
    abstract getSupportedModels(): string[];
    
    constructor() {
        const models = this.getSupportedModels() || [];
        if (models.length > 0) {
            this.currentModel = models[0];
        }
    }

    isConfigured(): boolean {
        return this.apiKey !== '';
    }

    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    getCurrentModel(): string {
        return this.currentModel;
    }

    setModel(model: string): void {
        if (this.getSupportedModels().includes(model)) {
            this.currentModel = model;
        }
    }

    abstract generateCompletion(prompt: string, context: CompletionContext): Promise<string>;
    abstract generateChat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
