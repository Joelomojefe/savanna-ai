import * as vscode from 'vscode';

export class SettingsPanelProvider {
    public static currentPanel: SettingsPanelProvider | undefined;
    public static readonly viewType = 'savannaSettings';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
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

        SettingsPanelProvider.currentPanel = new SettingsPanelProvider(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

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
            message => {
                switch (message.command) {
                    case 'saveApiKey':
                        this.saveApiKey(message.provider, message.apiKey);
                        return;
                    case 'removeApiKey':
                        this.removeApiKey(message.provider);
                        return;
                    case 'testConnection':
                        this.testConnection(message.provider);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async saveApiKey(provider: string, _apiKey: string) {
        // This would connect to the provider manager
        vscode.window.showInformationMessage(`API key saved for ${provider}`);
        this._update();
    }

    private async removeApiKey(provider: string) {
        vscode.window.showInformationMessage(`API key removed for ${provider}`);
        this._update();
    }

    private async testConnection(provider: string) {
        vscode.window.showInformationMessage(`Testing connection for ${provider}...`);
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
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'settings.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'settings.js')
        );

        const nonce = this._getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>Savanna Settings</title>
            </head>
            <body>
                <div class="settings-container">
                    <h1>Savanna AI Settings</h1>
                    <div class="provider-section">
                        <h2>API Keys</h2>
                        <div class="provider-config" data-provider="openai">
                            <h3>OpenAI</h3>
                            <input type="password" placeholder="Enter OpenAI API Key" class="api-key-input">
                            <button class="save-key">Save</button>
                            <button class="test-key">Test</button>
                            <button class="remove-key">Remove</button>
                        </div>
                        <div class="provider-config" data-provider="gemini">
                            <h3>Google Gemini</h3>
                            <input type="password" placeholder="Enter Gemini API Key" class="api-key-input">
                            <button class="save-key">Save</button>
                            <button class="test-key">Test</button>
                            <button class="remove-key">Remove</button>
                        </div>
                        <div class="provider-config" data-provider="claude">
                            <h3>Anthropic Claude</h3>
                            <input type="password" placeholder="Enter Claude API Key" class="api-key-input">
                            <button class="save-key">Save</button>
                            <button class="test-key">Test</button>
                            <button class="remove-key">Remove</button>
                        </div>
                        <div class="provider-config" data-provider="cohere">
                            <h3>Cohere</h3>
                            <input type="password" placeholder="Enter Cohere API Key" class="api-key-input">
                            <button class="save-key">Save</button>
                            <button class="test-key">Test</button>
                            <button class="remove-key">Remove</button>
                        </div>
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
