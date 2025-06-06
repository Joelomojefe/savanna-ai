import * as vscode from 'vscode';

export class ConfigManager {
    private static readonly CONFIG_SECTION = 'savanna';

    getDefaultProvider(): string {
        return this.getConfig<string>('defaultProvider', 'openai');
    }

    async setDefaultProvider(provider: string): Promise<void> {
        await this.setConfig('defaultProvider', provider);
    }

    isLoggingEnabled(): boolean {
        return this.getConfig<boolean>('enableLogging', false);
    }

    async setLoggingEnabled(enabled: boolean): Promise<void> {
        await this.setConfig('enableLogging', enabled);
    }

    getTemperature(): number {
        return this.getConfig<number>('temperature', 0.7);
    }

    async setTemperature(temperature: number): Promise<void> {
        await this.setConfig('temperature', temperature);
    }

    getMaxTokens(): number {
        return this.getConfig<number>('maxTokens', 150);
    }

    async setMaxTokens(maxTokens: number): Promise<void> {
        await this.setConfig('maxTokens', maxTokens);
    }

    isInlineCompletionEnabled(): boolean {
        return this.getConfig<boolean>('enableInlineCompletion', true);
    }

    async setInlineCompletionEnabled(enabled: boolean): Promise<void> {
        await this.setConfig('enableInlineCompletion', enabled);
    }

    // Workspace-specific settings
    getWorkspaceDefaultProvider(): string | undefined {
        const workspaceConfig = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        return workspaceConfig.get<string>('defaultProvider');
    }

    async setWorkspaceDefaultProvider(provider: string): Promise<void> {
        const workspaceConfig = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        await workspaceConfig.update('defaultProvider', provider, vscode.ConfigurationTarget.Workspace);
    }

    private getConfig<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        return config.get<T>(key, defaultValue);
    }

    private async setConfig(key: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    // Get all current settings
    getAllSettings(): any {
        return {
            defaultProvider: this.getDefaultProvider(),
            enableLogging: this.isLoggingEnabled(),
            temperature: this.getTemperature(),
            maxTokens: this.getMaxTokens(),
            enableInlineCompletion: this.isInlineCompletionEnabled(),
            workspaceDefaultProvider: this.getWorkspaceDefaultProvider()
        };
    }

    // Listen for configuration changes
    onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ConfigManager.CONFIG_SECTION)) {
                callback(e);
            }
        });
    }
}
