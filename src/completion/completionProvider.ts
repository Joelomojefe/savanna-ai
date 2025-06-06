import * as vscode from 'vscode';
import { ProviderManager } from '../managers/providerManager';
import { Logger } from '../utils/logger';
import { CompletionContext } from '../providers/aiProvider';

export class CompletionProvider implements vscode.InlineCompletionItemProvider {
    constructor(
        private providerManager: ProviderManager,
        private logger: Logger
    ) {}

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _context: vscode.InlineCompletionContext,
        _token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        
        // Check if inline completion is enabled
        const config = vscode.workspace.getConfiguration('savanna');
        if (!config.get('enableInlineCompletion', true)) {
            return null;
        }

        const provider = this.providerManager.getCurrentProvider();
        if (!provider || !provider.isConfigured()) {
            return null;
        }

        try {
            const completionContext = this.buildCompletionContext(document, position);
            const prompt = this.buildPrompt(document, position);

            this.logger.log('completion-request', {
                provider: this.providerManager.getCurrentProviderName(),
                language: completionContext.language,
                filename: completionContext.filename
            });

            const completion = await provider.generateCompletion(prompt, completionContext);

            if (completion && completion.trim()) {
                this.logger.log('completion-response', {
                    provider: this.providerManager.getCurrentProviderName(),
                    completion: completion.substring(0, 100) + '...'
                });

                return [
                    new vscode.InlineCompletionItem(
                        completion,
                        new vscode.Range(position, position)
                    )
                ];
            }

            return null;
        } catch (error) {
            this.logger.error('Completion error', error);
            return null;
        }
    }

    private buildCompletionContext(document: vscode.TextDocument, position: vscode.Position): CompletionContext {
        const beforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const afterCursor = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, 0)));
        
        // Get VSCode configuration
        const config = vscode.workspace.getConfiguration('savanna');
        
        return {
            language: document.languageId,
            filename: document.fileName,
            beforeCursor: beforeCursor,
            afterCursor: afterCursor,
            temperature: config.get('temperature', 0.7),
            maxTokens: config.get('maxTokens', 150)
        };
    }

    private buildPrompt(document: vscode.TextDocument, position: vscode.Position): string {
        // Get context around the cursor
        const lineText = document.lineAt(position).text;
        const beforeCursor = lineText.substring(0, position.character);
        
        // Simple prompt for now - can be enhanced based on context
        return beforeCursor;
    }


}
