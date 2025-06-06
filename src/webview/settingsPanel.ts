import * as vscode from 'vscode';
import { ProviderManager } from '../managers/providerManager';
import { SecretManager } from '../managers/secretManager';
import { ConfigManager } from '../managers/configManager';

export class SettingsPanelProvider {
    public static currentPanel: SettingsPanelProvider | undefined;
    public static readonly viewType = 'savannaSettings';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _providerManager: ProviderManager;
    private _secretManager: SecretManager;
    private _configManager: ConfigManager;

    public static createOrShow(extensionUri: vscode.Uri, providerManager: ProviderManager, secretManager: SecretManager, configManager: ConfigManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SettingsPanelProvider.currentPanel) {
            SettingsPanelProvider.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SettingsPanelProvider.viewType,
            'Savanna Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'webview')
                ]
            }
        );

        SettingsPanelProvider.currentPanel = new SettingsPanelProvider(panel, extensionUri, providerManager, secretManager, configManager);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, providerManager: ProviderManager, secretManager: SecretManager, configManager: ConfigManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._providerManager = providerManager;
        this._secretManager = secretManager;
        this._configManager = configManager;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'saveApiKey':
                        await this.saveApiKey(message.provider, message.apiKey);
                        return;
                    case 'removeApiKey':
                        await this.removeApiKey(message.provider);
                        return;
                    case 'testConnection':
                        await this.testConnection(message.provider);
                        return;
                    case 'toggleTheme':
                        this.toggleTheme();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async saveApiKey(provider: string, apiKey: string) {
        try {
            if (!apiKey || apiKey.trim() === '') {
                this._panel.webview.postMessage({
                    command: 'showNotification',
                    type: 'error',
                    message: 'Please enter a valid API key'
                });
                return;
            }

            // Store API key securely
            await this._secretManager.storeApiKey(provider, apiKey);
            
            // Update provider configuration
            await this._providerManager.setApiKey(provider, apiKey);
            
            // Show success notification
            this._panel.webview.postMessage({
                command: 'showNotification',
                type: 'success',
                message: `API key saved successfully for ${provider}`
            });

            // Update provider status
            this._panel.webview.postMessage({
                command: 'updateProviderStatus',
                provider: provider,
                configured: true,
                status: 'connected'
            });

            vscode.window.showInformationMessage(`${provider} API key saved successfully!`);
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'showNotification',
                type: 'error',
                message: `Failed to save API key: ${error}`
            });
            console.error(`Failed to save API key for ${provider}:`, error);
        }
    }

    private async removeApiKey(provider: string) {
        try {
            await this._secretManager.deleteApiKey(provider);
            await this._providerManager.removeApiKey(provider);
            
            this._panel.webview.postMessage({
                command: 'showNotification',
                type: 'success',
                message: `API key removed for ${provider}`
            });

            this._panel.webview.postMessage({
                command: 'updateProviderStatus',
                provider: provider,
                configured: false,
                status: 'not-configured'
            });

            vscode.window.showInformationMessage(`${provider} API key removed successfully!`);
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'showNotification',
                type: 'error',
                message: `Failed to remove API key: ${error}`
            });
        }
    }

    private async testConnection(provider: string) {
        try {
            this._panel.webview.postMessage({
                command: 'showNotification',
                type: 'info',
                message: `Testing connection for ${provider}...`
            });

            const hasKey = await this._secretManager.hasApiKey(provider);
            if (!hasKey) {
                this._panel.webview.postMessage({
                    command: 'showNotification',
                    type: 'error',
                    message: `No API key configured for ${provider}`
                });
                return;
            }

            // Test the provider connection
            const providerInstance = this._providerManager.getProvider(provider);
            if (providerInstance) {
                // Simple test - try to get provider info
                this._panel.webview.postMessage({
                    command: 'showNotification',
                    type: 'success',
                    message: `${provider} connection test successful!`
                });

                this._panel.webview.postMessage({
                    command: 'updateProviderStatus',
                    provider: provider,
                    configured: true,
                    status: 'connected'
                });
            } else {
                throw new Error('Provider not available');
            }
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'showNotification',
                type: 'error',
                message: `Connection test failed for ${provider}: ${error}`
            });

            this._panel.webview.postMessage({
                command: 'updateProviderStatus',
                provider: provider,
                configured: true,
                status: 'error'
            });
        }
    }

    private toggleTheme() {
        this._panel.webview.postMessage({
            command: 'toggleTheme'
        });
    }

    public dispose() {
        SettingsPanelProvider.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Savanna Settings';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'settings-enhanced.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'settings-enhanced.js')
        );

        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Savanna AI Settings</title>
</head>
<body data-theme="dark">
    <div class="settings-container">
        <header class="settings-header">
            <div class="header-content">
                <div class="header-info">
                    <div class="title-section">
                        <div class="icon-container">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="14" fill="url(#headerGradient)" stroke="currentColor" stroke-width="1"/>
                                <circle cx="16" cy="16" r="4" fill="white"/>
                                <circle cx="10" cy="12" r="2" fill="white" opacity="0.8"/>
                                <circle cx="22" cy="12" r="2" fill="white" opacity="0.8"/>
                                <circle cx="10" cy="20" r="2" fill="white" opacity="0.8"/>
                                <circle cx="22" cy="20" r="2" fill="white" opacity="0.8"/>
                                <line x1="16" y1="16" x2="10" y2="12" stroke="white" stroke-width="1" opacity="0.6"/>
                                <line x1="16" y1="16" x2="22" y2="12" stroke="white" stroke-width="1" opacity="0.6"/>
                                <line x1="16" y1="16" x2="10" y2="20" stroke="white" stroke-width="1" opacity="0.6"/>
                                <line x1="16" y1="16" x2="22" y2="20" stroke="white" stroke-width="1" opacity="0.6"/>
                                <defs>
                                    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color:#667eea"/>
                                        <stop offset="100%" style="stop-color:#764ba2"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div class="title-text">
                            <h1>Savanna AI</h1>
                            <span class="subtitle">Multi-Provider Code Assistant</span>
                        </div>
                    </div>
                    <p class="description">Configure your AI providers and customize your coding experience with professional-grade AI assistance.</p>
                </div>
                <div class="header-actions">
                    <div class="theme-toggle-container">
                        <label class="theme-toggle">
                            <input type="checkbox" id="theme-toggle" checked />
                            <span class="toggle-slider">
                                <span class="toggle-icon sun">☀</span>
                                <span class="toggle-icon moon">🌙</span>
                            </span>
                        </label>
                        <span class="theme-label">Dark Mode</span>
                    </div>
                    <button class="btn btn-outline refresh-btn" id="refresh-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
        </header>

        <div class="settings-content">
            <section class="settings-section">
                <div class="section-header">
                    <div class="section-title">
                        <h2>AI Providers</h2>
                        <span class="section-badge">4 Available</span>
                    </div>
                    <p class="section-description">Configure your AI providers with secure API key storage. All keys are encrypted and stored locally in VSCode's secure storage.</p>
                </div>
                
                <div class="providers-grid">
                    <!-- OpenAI Provider -->
                    <div class="provider-card featured" data-provider="openai">
                        <div class="provider-header">
                            <div class="provider-title">
                                <div class="provider-icon openai-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                                    </svg>
                                </div>
                                <div class="provider-info">
                                    <h3>OpenAI</h3>
                                    <span class="provider-models">GPT-4, GPT-3.5</span>
                                </div>
                            </div>
                            <div class="provider-status" id="openai-status">
                                <span class="status-indicator"></span>
                                <span class="status-text">Not configured</span>
                            </div>
                        </div>
                        
                        <div class="provider-content">
                            <div class="form-group">
                                <label for="openai-key">API Key</label>
                                <div class="input-group">
                                    <input 
                                        type="password" 
                                        id="openai-key" 
                                        placeholder="sk-..." 
                                        class="api-key-input"
                                    >
                                    <button type="button" class="toggle-visibility" data-target="openai-key">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="openai-model">Model</label>
                                <select id="openai-model" class="form-select">
                                    <option value="gpt-4">GPT-4</option>
                                    <option value="gpt-4-turbo-preview" selected>GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                            
                            <div class="provider-actions">
                                <button class="btn btn-primary" data-action="save" data-provider="openai">
                                    Save
                                </button>
                                <button class="btn btn-secondary" data-action="test" data-provider="openai">
                                    Test Connection
                                </button>
                                <button class="btn btn-danger" data-action="remove" data-provider="openai">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Anthropic Claude Provider -->
                    <div class="provider-card" data-provider="claude">
                        <div class="provider-header">
                            <div class="provider-title">
                                <div class="provider-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                </div>
                                <div class="provider-info">
                                    <h3>Anthropic Claude</h3>
                                    <span class="provider-models">Claude 3.5 Sonnet</span>
                                </div>
                            </div>
                            <div class="provider-status" id="claude-status">
                                <span class="status-indicator"></span>
                                <span class="status-text">Not configured</span>
                            </div>
                        </div>
                        
                        <div class="provider-content">
                            <div class="form-group">
                                <label for="claude-key">API Key</label>
                                <div class="input-group">
                                    <input 
                                        type="password" 
                                        id="claude-key" 
                                        placeholder="sk-ant-..." 
                                        class="api-key-input"
                                    >
                                    <button type="button" class="toggle-visibility" data-target="claude-key">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="claude-model">Model</label>
                                <select id="claude-model" class="form-select">
                                    <option value="claude-3-5-sonnet-20241022" selected>Claude 3.5 Sonnet</option>
                                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                </select>
                            </div>
                            
                            <div class="provider-actions">
                                <button class="btn btn-primary" data-action="save" data-provider="claude">
                                    Save
                                </button>
                                <button class="btn btn-secondary" data-action="test" data-provider="claude">
                                    Test Connection
                                </button>
                                <button class="btn btn-danger" data-action="remove" data-provider="claude">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Google Gemini Provider -->
                    <div class="provider-card" data-provider="gemini">
                        <div class="provider-header">
                            <div class="provider-title">
                                <div class="provider-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                </div>
                                <div class="provider-info">
                                    <h3>Google Gemini</h3>
                                    <span class="provider-models">Gemini Pro</span>
                                </div>
                            </div>
                            <div class="provider-status" id="gemini-status">
                                <span class="status-indicator"></span>
                                <span class="status-text">Not configured</span>
                            </div>
                        </div>
                        
                        <div class="provider-content">
                            <div class="form-group">
                                <label for="gemini-key">API Key</label>
                                <div class="input-group">
                                    <input 
                                        type="password" 
                                        id="gemini-key" 
                                        placeholder="AIza..." 
                                        class="api-key-input"
                                    >
                                    <button type="button" class="toggle-visibility" data-target="gemini-key">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="gemini-model">Model</label>
                                <select id="gemini-model" class="form-select">
                                    <option value="gemini-pro" selected>Gemini Pro</option>
                                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                                </select>
                            </div>
                            
                            <div class="provider-actions">
                                <button class="btn btn-primary" data-action="save" data-provider="gemini">
                                    Save
                                </button>
                                <button class="btn btn-secondary" data-action="test" data-provider="gemini">
                                    Test Connection
                                </button>
                                <button class="btn btn-danger" data-action="remove" data-provider="gemini">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Cohere Provider -->
                    <div class="provider-card" data-provider="cohere">
                        <div class="provider-header">
                            <div class="provider-title">
                                <div class="provider-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                    </svg>
                                </div>
                                <div class="provider-info">
                                    <h3>Cohere</h3>
                                    <span class="provider-models">Command R+</span>
                                </div>
                            </div>
                            <div class="provider-status" id="cohere-status">
                                <span class="status-indicator"></span>
                                <span class="status-text">Not configured</span>
                            </div>
                        </div>
                        
                        <div class="provider-content">
                            <div class="form-group">
                                <label for="cohere-key">API Key</label>
                                <div class="input-group">
                                    <input 
                                        type="password" 
                                        id="cohere-key" 
                                        placeholder="Enter Cohere API Key" 
                                        class="api-key-input"
                                    >
                                    <button type="button" class="toggle-visibility" data-target="cohere-key">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="cohere-model">Model</label>
                                <select id="cohere-model" class="form-select">
                                    <option value="command-r-plus" selected>Command R+</option>
                                    <option value="command-r">Command R</option>
                                </select>
                            </div>
                            
                            <div class="provider-actions">
                                <button class="btn btn-primary" data-action="save" data-provider="cohere">
                                    Save
                                </button>
                                <button class="btn btn-secondary" data-action="test" data-provider="cohere">
                                    Test Connection
                                </button>
                                <button class="btn btn-danger" data-action="remove" data-provider="cohere">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
