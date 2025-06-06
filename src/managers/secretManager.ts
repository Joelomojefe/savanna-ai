import * as vscode from 'vscode';

export class SecretManager {
    constructor(private context: vscode.ExtensionContext) {}

    async storeApiKey(provider: string, apiKey: string): Promise<void> {
        const key = this.getSecretKey(provider);
        await this.context.secrets.store(key, apiKey);
    }

    async getApiKey(provider: string): Promise<string | undefined> {
        const key = this.getSecretKey(provider);
        return await this.context.secrets.get(key);
    }

    async deleteApiKey(provider: string): Promise<void> {
        const key = this.getSecretKey(provider);
        await this.context.secrets.delete(key);
    }

    async hasApiKey(provider: string): Promise<boolean> {
        const apiKey = await this.getApiKey(provider);
        return apiKey !== undefined && apiKey !== '';
    }

    async getAllStoredProviders(): Promise<string[]> {
        const providers = ['openai', 'gemini', 'claude', 'cohere'];
        const stored: string[] = [];

        for (const provider of providers) {
            if (await this.hasApiKey(provider)) {
                stored.push(provider);
            }
        }

        return stored;
    }

    async clearAllApiKeys(): Promise<void> {
        const providers = ['openai', 'gemini', 'claude', 'cohere'];
        
        for (const provider of providers) {
            await this.deleteApiKey(provider);
        }
    }

    private getSecretKey(provider: string): string {
        return `savanna.apiKey.${provider}`;
    }

    // Listen for secret storage changes
    onDidChange(callback: (e: vscode.SecretStorageChangeEvent) => void): vscode.Disposable {
        return this.context.secrets.onDidChange((e) => {
            if (e.key.startsWith('savanna.apiKey.')) {
                callback(e);
            }
        });
    }
}
