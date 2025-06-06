import * as vscode from 'vscode';
import { AIProvider } from '../providers/aiProvider';
import { OpenAIProvider } from '../providers/openaiProvider';
import { GeminiProvider } from '../providers/geminiProvider';
import { ClaudeProvider } from '../providers/claudeProvider';
import { CohereProvider } from '../providers/cohereProvider';
import { SecretManager } from './secretManager';
import { ConfigManager } from './configManager';

export class ProviderManager {
    private providers: Map<string, AIProvider> = new Map();
    private currentProvider: string = 'openai';

    constructor(
        private secretManager: SecretManager,
        private configManager: ConfigManager
    ) {
        this.initializeProviders();
    }

    private initializeProviders(): void {
        this.providers.set('openai', new OpenAIProvider());
        this.providers.set('gemini', new GeminiProvider());
        this.providers.set('claude', new ClaudeProvider());
        this.providers.set('cohere', new CohereProvider());
    }

    async initialize(): Promise<void> {
        // Load current provider from config
        this.currentProvider = this.configManager.getDefaultProvider();

        // Load API keys for all providers
        for (const [name, provider] of this.providers) {
            const apiKey = await this.secretManager.getApiKey(name);
            if (apiKey) {
                provider.setApiKey(apiKey);
            }
        }
    }

    getProvider(name?: string): AIProvider | undefined {
        const providerName = name || this.currentProvider;
        return this.providers.get(providerName);
    }

    getCurrentProvider(): AIProvider | undefined {
        return this.providers.get(this.currentProvider);
    }

    getCurrentProviderName(): string {
        return this.currentProvider;
    }

    async setCurrentProvider(name: string): Promise<void> {
        if (this.providers.has(name)) {
            this.currentProvider = name;
            await this.configManager.setDefaultProvider(name);
        }
    }

    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    getConfiguredProviders(): string[] {
        return Array.from(this.providers.entries())
            .filter(([_, provider]) => provider.isConfigured())
            .map(([name, _]) => name);
    }

    async setApiKey(providerName: string, apiKey: string): Promise<void> {
        const provider = this.providers.get(providerName);
        if (provider) {
            provider.setApiKey(apiKey);
            await this.secretManager.storeApiKey(providerName, apiKey);
        }
    }

    async removeApiKey(providerName: string): Promise<void> {
        const provider = this.providers.get(providerName);
        if (provider) {
            provider.setApiKey('');
            await this.secretManager.deleteApiKey(providerName);
        }
    }

    getProviderInfo(): Array<{name: string, configured: boolean, models: string[], currentModel: string}> {
        return Array.from(this.providers.entries()).map(([_name, provider]) => ({
            name: provider.name,
            configured: provider.isConfigured(),
            models: provider.getSupportedModels(),
            currentModel: provider.getCurrentModel()
        }));
    }

    async setProviderModel(providerName: string, model: string): Promise<void> {
        const provider = this.providers.get(providerName);
        if (provider) {
            provider.setModel(model);
        }
    }

    async switchProvider(): Promise<void> {
        const configuredProviders = this.getConfiguredProviders() || [];
        
        if (configuredProviders.length === 0) {
            vscode.window.showWarningMessage('No AI providers are configured. Please add API keys first.');
            return;
        }

        const items = configuredProviders.map(name => {
            const provider = this.providers.get(name)!;
            return {
                label: provider.name,
                description: name === this.currentProvider ? '(current)' : '',
                detail: `Model: ${provider.getCurrentModel()}`,
                providerName: name
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select AI provider'
        });

        if (selected && selected.providerName !== this.currentProvider) {
            await this.setCurrentProvider(selected.providerName);
            vscode.window.showInformationMessage(`Switched to ${selected.label}`);
        }
    }
}
