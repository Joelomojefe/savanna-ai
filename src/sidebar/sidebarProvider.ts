import * as vscode from 'vscode';
import { ProviderManager } from '../managers/providerManager';
import { ConfigManager } from '../managers/configManager';
import { Logger } from '../utils/logger';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'savanna.chatView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private providerManager: ProviderManager,
        private configManager: ConfigManager,
        private logger: Logger
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this.handleChatMessage(data.content);
                    break;
                case 'newChat':
                    this.clearChat();
                    this.sendMessage('newChatStarted', {});
                    break;
                case 'clearChat':
                    this.clearChat();
                    break;
                case 'explainCode':
                    await this.explainSelectedCode();
                    break;
                case 'switchProvider':
                    if (data.provider) {
                        await this.providerManager.setCurrentProvider(data.provider);
                    } else {
                        await this.providerManager.switchProvider();
                    }
                    this.updateProviderInfo();
                    break;
                case 'getProviders':
                    this.sendProviderInfo();
                    break;
            }
        });

        this.updateProviderInfo();
        
        // Send initial provider info
        setTimeout(() => {
            this.sendProviderInfo();
        }, 100);
    }

    private async handleChatMessage(content: string) {
        if (!content.trim()) return;

        try {
            this.sendMessage('addMessage', { role: 'user', content });
            this.sendMessage('setWaiting', true);

            const provider = this.providerManager.getCurrentProvider();
            if (!provider) {
                throw new Error('No AI provider configured. Please set up an API key.');
            }

            const response = await provider.generateChat([
                { role: 'user', content }
            ], {
                temperature: this.configManager.getTemperature(),
                maxTokens: this.configManager.getMaxTokens()
            });

            this.sendMessage('addMessage', { role: 'assistant', content: response });
            this.logger.info('Chat response generated', { provider: provider.name });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.sendMessage('showError', errorMessage);
            this.logger.error('Chat error', error);
        } finally {
            this.sendMessage('setWaiting', false);
        }
    }

    private async explainSelectedCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showWarningMessage('Please select some code to explain.');
            return;
        }

        const selectedText = editor.document.getText(editor.selection);
        const language = editor.document.languageId;
        
        const prompt = `Please explain this ${language} code:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        await this.handleChatMessage(prompt);
    }

    private clearChat() {
        this.sendMessage('clearMessages', {});
    }

    private updateProviderInfo() {
        const currentProvider = this.providerManager.getCurrentProviderName();
        const availableProviders = this.providerManager.getAvailableProviders();
        const configuredProviders = this.providerManager.getConfiguredProviders();

        this.sendMessage('updateProviderInfo', {
            current: currentProvider,
            available: availableProviders,
            configured: configuredProviders
        });
    }

    private sendProviderInfo() {
        const providers = this.providerManager.getAvailableProviders();
        const currentProvider = this.providerManager.getCurrentProviderName();
        const currentModel = this.providerManager.getCurrentProvider()?.getCurrentModel() || '';
        
        this.sendMessage('providersInfo', {
            providers,
            currentProvider,
            currentModel
        });
    }

    private sendMessage(type: string, data: any) {
        if (this._view) {
            this._view.webview.postMessage({ type, data });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'sidebar.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'sidebar.css'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>Savanna AI</title>
            </head>
            <body>
                <div class="sidebar-container">
                    <div class="header">
                        <div class="provider-status">
                            <div class="provider-info">
                                <select id="provider-select">
                                    <option value="">Select Provider...</option>
                                </select>
                                <span id="current-model"></span>
                            </div>
                            <div class="header-actions">
                                <button class="icon-button" id="new-chat" title="Start a new chat">
                                    <span class="codicon codicon-comment-discussion"></span>
                                </button>
                                <button class="icon-button" id="clear-chat" title="Clear chat history">
                                    <span class="codicon codicon-clear-all"></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="chat-section">
                        <div class="chat-messages" id="chatMessages">
                            <div class="welcome-message">
                                <div class="welcome-icon">🤖</div>
                                <h3>Welcome to Savanna AI</h3>
                                <p>Ask me anything about your code, or select code and click "Explain" to get started.</p>
                                <div class="quick-actions">
                                    <button class="action-button" id="explainCode">
                                        <span class="codicon codicon-question"></span>
                                        Explain Selected Code
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-input-container">
                            <div class="input-wrapper">
                                <textarea id="chatInput" placeholder="Ask Savanna AI..." rows="1"></textarea>
                                <button id="sendButton" class="send-button">
                                    <span class="codicon codicon-send"></span>
                                </button>
                            </div>
                            <div class="input-actions">
                                <button class="text-button" id="clearChat">Clear</button>
                            </div>
                        </div>
                    </div>

                    <div class="loading-indicator" id="loadingIndicator" style="display: none;">
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span>AI is thinking...</span>
                    </div>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

export class ProvidersTreeProvider implements vscode.TreeDataProvider<ProviderItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProviderItem | undefined | null | void> = new vscode.EventEmitter<ProviderItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProviderItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private providerManager: ProviderManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProviderItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProviderItem): Thenable<ProviderItem[]> {
        if (!element) {
            const providers = this.providerManager.getProviderInfo();
            return Promise.resolve(providers.map(p => new ProviderItem(
                p.name,
                p.configured ? 'configured' : 'not-configured',
                p.currentModel,
                p.configured
            )));
        }
        return Promise.resolve([]);
    }
}

class ProviderItem extends vscode.TreeItem {
    constructor(
        public override readonly label: string,
        public readonly status: string,
        public readonly model: string,
        public readonly configured: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = configured 
            ? `${label} - Model: ${model}` 
            : `${label} - Not configured`;
        
        this.description = configured ? model : 'Not configured';
        
        this.iconPath = new vscode.ThemeIcon(
            configured ? 'check' : 'warning',
            configured ? new vscode.ThemeColor('testing.iconPassed') : new vscode.ThemeColor('testing.iconFailed')
        );

        this.contextValue = 'provider';
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}