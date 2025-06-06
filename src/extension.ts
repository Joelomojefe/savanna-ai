import * as vscode from 'vscode';
import { ProviderManager } from './managers/providerManager';
import { ConfigManager } from './managers/configManager';
import { SecretManager } from './managers/secretManager';
import { CompletionProvider } from './completion/completionProvider';
import { ChatProvider } from './chat/chatProvider';
import { SidebarProvider, ProvidersTreeProvider } from './sidebar/sidebarProvider';
import { registerCopilotCommands } from './commands/copilotCommands';
import { Logger } from './utils/logger';

let providerManager: ProviderManager;
let configManager: ConfigManager;
let secretManager: SecretManager;
let completionProvider: CompletionProvider;
let chatProvider: ChatProvider;
let sidebarProvider: SidebarProvider;
let providersTreeProvider: ProvidersTreeProvider;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Savanna extension is now active!');

    // Initialize managers
    secretManager = new SecretManager(context);
    console.log('Savanna extension is now active! 0');

    configManager = new ConfigManager();
    console.log('Savanna extension is now active! 08');
    providerManager = new ProviderManager(secretManager, configManager);

    console.log('Savanna extension is now active! 98');

    logger = new Logger(configManager);

    console.log('Savanna extension is now active! 2');

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        vscode.window.showErrorMessage(`Savanna Extension Error: ${error.message}`);
    });

    console.log('Savanna extension is now active! 3');

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', reason);
        logger.error('Unhandled Rejection:', promise);
        vscode.window.showErrorMessage(`Savanna Extension Error: Unhandled Promise Rejection`);
    });

    console.log('Savanna extension is now active! 4');

    // Initialize providers
    completionProvider = new CompletionProvider(providerManager, logger);
    chatProvider = new ChatProvider(context, providerManager, logger);
    sidebarProvider = new SidebarProvider(context.extensionUri, providerManager, configManager, logger);
    providersTreeProvider = new ProvidersTreeProvider(providerManager);

    console.log('Savanna extension is now active! 5');

    // Register completion provider for all languages
    const completionDisposable = vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file' },
        completionProvider
    );

    console.log('Savanna extension is now active! 6');

    // Register sidebar webview provider
    const sidebarDisposable = vscode.window.registerWebviewViewProvider(
        SidebarProvider.viewType,
        sidebarProvider
    );

    console.log('Savanna extension is now active! 7');

    // Register providers tree view
    const providersViewDisposable = vscode.window.createTreeView('savanna.providersView', {
        treeDataProvider: providersTreeProvider
    });

    console.log('Savanna extension is now active! 8');

    // Register commands
    const commandDisposables = registerCopilotCommands(
        context,
        providerManager,
        configManager,
        secretManager,
        chatProvider,
        logger
    );

    console.log('Savanna extension is now active! 9');

    // Add all disposables to context
    context.subscriptions.push(
        completionDisposable,
        sidebarDisposable,
        providersViewDisposable,
        ...commandDisposables
    );

    console.log('Savanna extension is now active! 10');

    // Initialize providers with stored API keys
    await providerManager.initialize();

    // Show welcome message on first install
    const isFirstInstall = context.globalState.get('savanna.firstInstall', true);
    if (isFirstInstall) {
        const result = await vscode.window.showInformationMessage(
            'Welcome to Savanna! Configure your AI providers to get started.',
            'Open Settings',
            'Later'
        );
        
        if (result === 'Open Settings') {
            vscode.commands.executeCommand('savanna.openSettings');
        }
        
        context.globalState.update('savanna.firstInstall', false);
    }
}

export function deactivate() {
    console.log('Savanna extension is deactivated');
}

// Export for use in other modules
export {
    providerManager,
    configManager,
    secretManager,
    completionProvider,
    chatProvider,
    logger
};
