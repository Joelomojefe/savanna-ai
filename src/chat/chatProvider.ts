import * as vscode from 'vscode';
import { ProviderManager } from '../managers/providerManager';
import { Logger } from '../utils/logger';
import { ChatMessage } from '../providers/aiProvider';

export class ChatProvider {
    private chatPanel: vscode.WebviewPanel | undefined;
    private chatHistory: ChatMessage[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private providerManager: ProviderManager,
        private logger: Logger
    ) {}

    async openChat(): Promise<void> {
        if (this.chatPanel) {
            this.chatPanel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        this.chatPanel = vscode.window.createWebviewPanel(
            'savannaChat',
            'Savanna AI Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'webview')
                ]
            }
        );

        this.chatPanel.webview.html = this.getChatWebviewContent();
        this.setupChatMessageHandler();

        this.chatPanel.onDidDispose(() => {
            this.chatPanel = undefined;
        });

        // Send initial state
        this.sendMessage('init', {
            providers: this.providerManager.getProviderInfo(),
            currentProvider: this.providerManager.getCurrentProviderName(),
            history: this.chatHistory
        });
    }

    private setupChatMessageHandler(): void {
        if (!this.chatPanel) return;

        this.chatPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'chat':
                    await this.handleChatMessage(message.content);
                    break;
                case 'clear':
                    this.clearChatHistory();
                    break;
                case 'switchProvider':
                    await this.providerManager.setCurrentProvider(message.provider);
                    this.sendMessage('providerChanged', {
                        provider: message.provider
                    });
                    break;
                case 'explainCode':
                    await this.explainSelectedCode();
                    break;
            }
        });
    }

    public async handleChatMessage(content: string): Promise<void> {
        const provider = this.providerManager.getCurrentProvider();
        if (!provider || !provider.isConfigured()) {
            this.sendMessage('error', { message: 'No AI provider configured' });
            return;
        }

        // Add user message to history
        const userMessage: ChatMessage = { role: 'user', content };
        this.chatHistory.push(userMessage);

        // Send user message to webview
        this.sendMessage('userMessage', { message: userMessage });

        try {
            this.logger.log('chat-request', {
                provider: this.providerManager.getCurrentProviderName(),
                message: content.substring(0, 100) + '...'
            });

            // Get AI response
            const response = await provider.generateChat([...this.chatHistory]);

            if (response) {
                const assistantMessage: ChatMessage = { role: 'assistant', content: response };
                this.chatHistory.push(assistantMessage);

                this.sendMessage('assistantMessage', { message: assistantMessage });

                this.logger.log('chat-response', {
                    provider: this.providerManager.getCurrentProviderName(),
                    response: response.substring(0, 100) + '...'
                });
            }
        } catch (error) {
            this.logger.error('Chat error', error);
            this.sendMessage('error', { message: `Chat error: ${error}` });
        }
    }

    private async explainSelectedCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showWarningMessage('Please select code to explain');
            return;
        }

        const selectedText = editor.document.getText(editor.selection);
        const language = editor.document.languageId;
        
        const prompt = `Please explain the following ${language} code:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        
        // Add to chat and get explanation
        await this.handleChatMessage(prompt);
    }

    private clearChatHistory(): void {
        this.chatHistory = [];
        this.sendMessage('historyCleared', {});
    }

    private sendMessage(type: string, data: any): void {
        if (this.chatPanel) {
            this.chatPanel.webview.postMessage({ type, ...data });
        }
    }

    private getChatWebviewContent(): string {
        const webviewUri = (filename: string) => {
            return this.chatPanel!.webview.asWebviewUri(
                vscode.Uri.joinPath(this.context.extensionUri, 'webview', filename)
            );
        };

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Savanna AI Chat</title>
            <link rel="stylesheet" href="${webviewUri('chat.css')}">
        </head>
        <body>
            <div id="chat-container">
                <div id="chat-header">
                    <h2>Savanna AI Chat</h2>
                    <div id="provider-selector">
                        <select id="provider-select">
                            <option value="">Select Provider...</option>
                        </select>
                    </div>
                    <button id="clear-chat">Clear</button>
                </div>
                <div id="chat-messages"></div>
                <div id="chat-input-container">
                    <textarea id="chat-input" placeholder="Ask about your code..."></textarea>
                    <button id="send-button">Send</button>
                    <button id="explain-code">Explain Selected Code</button>
                </div>
            </div>
            <script src="${webviewUri('chat.js')}"></script>
        </body>
        </html>`;
    }
}
