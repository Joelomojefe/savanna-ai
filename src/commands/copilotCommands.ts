import * as vscode from 'vscode';
import { ProviderManager } from '../managers/providerManager';
import { ConfigManager } from '../managers/configManager';
import { SecretManager } from '../managers/secretManager';
import { ChatProvider } from '../chat/chatProvider';
import { SettingsPanelProvider } from '../webview/settingsPanel';
import { Logger } from '../utils/logger';

export function registerCopilotCommands(
    context: vscode.ExtensionContext,
    providerManager: ProviderManager,
    configManager: ConfigManager,
    secretManager: SecretManager,
    chatProvider: ChatProvider,
    logger: Logger
): vscode.Disposable[] {
    
    const disposables: vscode.Disposable[] = [];

    // Implementation functions
    const explainCode = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const language = editor.document.languageId;
        const prompt = `Explain this ${language} code:\n\n\`\`\`${language}\n${text}\n\`\`\``;
        await chatProvider.handleChatMessage(prompt);
    };

    const fixCode = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri) || [];
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        let prompt = `Fix the following code:\n\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``;
        if (diagnostics.length > 0) {
            const errorMessages = diagnostics.map(d => `- ${d.message} (line ${d.range.start.line + 1})`).join('\n');
            prompt += `\n\nErrors to fix:\n${errorMessages}`;
        }
        await chatProvider.handleChatMessage(prompt);
    };

    const generateCode = async () => {
        const prompt = await vscode.window.showInputBox({
            prompt: 'What code would you like to generate?',
            placeHolder: 'e.g., Create a function that validates email addresses'
        });
        if (prompt) {
            await chatProvider.handleChatMessage(`Generate code: ${prompt}`);
        }
    };

    const generateDocumentation = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const language = editor.document.languageId;
        const prompt = `Generate comprehensive documentation for this ${language} code:\n\n\`\`\`${language}\n${text}\n\`\`\``;
        await chatProvider.handleChatMessage(prompt);
    };

    const generateTests = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const language = editor.document.languageId;
        const prompt = `Generate comprehensive unit tests for this ${language} code:\n\n\`\`\`${language}\n${text}\n\`\`\``;
        await chatProvider.handleChatMessage(prompt);
    };

    const reviewCode = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        const text = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
        const language = editor.document.languageId;
        const prompt = `Review this ${language} code for best practices, potential issues, and improvements:\n\n\`\`\`${language}\n${text}\n\`\`\``;
        await chatProvider.handleChatMessage(prompt);
    };

    const attachFileToChat = async () => {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: false,
            canSelectFiles: true,
            canSelectFolders: false
        });
        if (files && files.length > 0) {
            const file = files[0];
            const content = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(content).toString('utf8');
            const prompt = `File: ${file.fsPath}\n\n\`\`\`\n${text}\n\`\`\`\n\nPlease analyze this file.`;
            await chatProvider.handleChatMessage(prompt);
        }
    };

    const attachFolderToChat = async () => {
        const folders = await vscode.window.showOpenDialog({
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true
        });
        if (folders && folders.length > 0) {
            const folder = folders[0];
            const files = await vscode.workspace.fs.readDirectory(folder);
            const fileList = files.map(([name, type]) => `${type === vscode.FileType.Directory ? '📁' : '📄'} ${name}`).join('\n');
            const prompt = `Folder: ${folder.fsPath}\n\nContents:\n${fileList}\n\nPlease analyze this folder structure.`;
            await chatProvider.handleChatMessage(prompt);
        }
    };

    const attachSelectionToChat = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showWarningMessage('No selection found');
            return;
        }
        const text = editor.document.getText(editor.selection);
        const language = editor.document.languageId;
        const prompt = `Selected code:\n\n\`\`\`${language}\n${text}\n\`\`\`\n\nPlease analyze this selection.`;
        await chatProvider.handleChatMessage(prompt);
    };

    const generateDebugConfiguration = async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }
        const prompt = `Generate a debug configuration for this project. Workspace: ${workspaceFolder.name}`;
        await chatProvider.handleChatMessage(prompt);
    };

    const collectDiagnostics = async () => {
        const diagnostics = vscode.languages.getDiagnostics();
        const diagnosticInfo = [];
        for (const [uri, diags] of diagnostics) {
            for (const diag of diags) {
                diagnosticInfo.push({
                    file: uri.fsPath,
                    line: diag.range.start.line + 1,
                    message: diag.message,
                    severity: diag.severity
                });
            }
        }
        logger.info('Collected diagnostics', { count: diagnosticInfo.length, diagnostics: diagnosticInfo });
        vscode.window.showInformationMessage(`Collected ${diagnosticInfo.length} diagnostics`);
    };

    const logWorkbenchState = async () => {
        const state = {
            activeEditor: vscode.window.activeTextEditor?.document.fileName,
            openEditors: vscode.window.visibleTextEditors.map(e => e.document.fileName),
            workspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath),
            extensions: vscode.extensions.all.filter(e => e.isActive).map(e => e.id)
        };
        logger.info('Workbench state', state);
        vscode.window.showInformationMessage('Workbench state logged to output');
    };

    const explainTerminalCommand = async () => {
        const command = await vscode.window.showInputBox({
            prompt: 'Enter the terminal command to explain',
            placeHolder: 'e.g., npm install'
        });
        if (command) {
            const prompt = `Explain this terminal command: \`${command}\``;
            await chatProvider.handleChatMessage(prompt);
        }
    };

    const explainTerminalSelection = async () => {
        const selection = await vscode.window.showInputBox({
            prompt: 'Enter the terminal selection to explain',
            placeHolder: 'Paste the terminal output or command'
        });
        if (selection) {
            const prompt = `Explain this terminal output/command:\n\n\`\`\`bash\n${selection}\n\`\`\``;
            await chatProvider.handleChatMessage(prompt);
        }
    };

    const attachTerminalSelectionToChat = async () => {
        const selection = await vscode.window.showInputBox({
            prompt: 'Enter the terminal selection to attach',
            placeHolder: 'Paste the terminal output or command'
        });
        if (selection) {
            const prompt = `Terminal selection:\n\n\`\`\`bash\n${selection}\n\`\`\`\n\nPlease analyze this terminal output.`;
            await chatProvider.handleChatMessage(prompt);
        }
    };

    const generateCommitMessage = async () => {
        const prompt = 'Generate a commit message based on the current changes in the repository';
        await chatProvider.handleChatMessage(prompt);
    };

    const fixTestFailure = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const prompt = `Fix the test failure in this file: ${editor.document.fileName}`;
        await chatProvider.handleChatMessage(prompt);
    };

    const setupTests = async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }
        const prompt = `Set up testing framework and configuration for this project: ${workspaceFolder.name}`;
        await chatProvider.handleChatMessage(prompt);
    };

    const buildLocalWorkspaceIndex = async () => {
        vscode.window.showInformationMessage('Building local workspace index...');
        logger.info('Local workspace index build started');
    };

    const buildRemoteWorkspaceIndex = async () => {
        vscode.window.showInformationMessage('Building remote workspace index...');
        logger.info('Remote workspace index build started');
    };

    const markFeedbackHelpful = async () => {
        logger.info('Feedback marked as helpful');
        vscode.window.showInformationMessage('Thank you for your feedback!');
    };

    const markFeedbackUnhelpful = async () => {
        logger.info('Feedback marked as unhelpful');
        vscode.window.showInformationMessage('Thank you for your feedback. We will improve.');
    };

    const startInlineChat = async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        const prompt = await vscode.window.showInputBox({
            prompt: 'What would you like to do with this code?',
            placeHolder: 'e.g., refactor this function, add error handling'
        });
        if (prompt) {
            await chatProvider.handleChatMessage(prompt);
        }
    };

    // Register all commands
    disposables.push(
        // Core Commands
        vscode.commands.registerCommand('savanna.openSettings', () => SettingsPanelProvider.createOrShow(context.extensionUri, providerManager, secretManager, configManager)),
        vscode.commands.registerCommand('savanna.openChat', () => chatProvider.openChat()),
        vscode.commands.registerCommand('savanna.switchProvider', () => providerManager.switchProvider()),

        // Chat Commands - GitHub Copilot Style
        vscode.commands.registerCommand('savanna.buildLocalWorkspaceIndex', buildLocalWorkspaceIndex),
        vscode.commands.registerCommand('savanna.buildRemoteWorkspaceIndex', buildRemoteWorkspaceIndex),
        vscode.commands.registerCommand('savanna.chat.attachFile', attachFileToChat),
        vscode.commands.registerCommand('savanna.chat.attachFolder', attachFolderToChat),
        vscode.commands.registerCommand('savanna.chat.attachSelection', attachSelectionToChat),
        vscode.commands.registerCommand('savanna.chat.clearTemporalContext', () => logger.info('Temporal context cleared')),
        vscode.commands.registerCommand('savanna.chat.explain', explainCode),
        vscode.commands.registerCommand('savanna.chat.fix', fixCode),
        vscode.commands.registerCommand('savanna.chat.generate', generateCode),
        vscode.commands.registerCommand('savanna.chat.generateDocs', generateDocumentation),
        vscode.commands.registerCommand('savanna.chat.generateTests', generateTests),
        vscode.commands.registerCommand('savanna.chat.review', reviewCode),

        // Debug Commands
        vscode.commands.registerCommand('savanna.debug.collectDiagnostics', collectDiagnostics),
        vscode.commands.registerCommand('savanna.debug.generateConfiguration', generateDebugConfiguration),
        vscode.commands.registerCommand('savanna.debug.workbenchState', logWorkbenchState),

        // Terminal Commands
        vscode.commands.registerCommand('savanna.terminal.attachTerminalSelection', attachTerminalSelectionToChat),
        vscode.commands.registerCommand('savanna.terminal.explainTerminalLastCommand', explainTerminalCommand),
        vscode.commands.registerCommand('savanna.terminal.explainTerminalSelection', explainTerminalSelection),

        // Git Commands
        vscode.commands.registerCommand('savanna.git.generateCommitMessage', generateCommitMessage),

        // Test Commands
        vscode.commands.registerCommand('savanna.tests.fixTestFailure', fixTestFailure),
        vscode.commands.registerCommand('savanna.tests.setupTests', setupTests),

        // Feedback Commands
        vscode.commands.registerCommand('savanna.feedback.helpful', markFeedbackHelpful),
        vscode.commands.registerCommand('savanna.feedback.unhelpful', markFeedbackUnhelpful),

        // Inline Chat
        vscode.commands.registerCommand('savanna.inlineChat.start', startInlineChat),

        // Legacy Commands
        vscode.commands.registerCommand('savanna.explainCode', explainCode),
        vscode.commands.registerCommand('savanna.generateDocs', generateDocumentation),
        vscode.commands.registerCommand('savanna.toggleLogging', () => {
            const enabled = configManager.isLoggingEnabled();
            configManager.setLoggingEnabled(!enabled);
            vscode.window.showInformationMessage(`Logging ${!enabled ? 'enabled' : 'disabled'}`);
        }),
        vscode.commands.registerCommand('savanna.addApiKey', async () => {
            const provider = await vscode.window.showQuickPick(['openai', 'claude', 'gemini', 'cohere'], {
                placeHolder: 'Select AI provider'
            });
            if (provider) {
                const apiKey = await vscode.window.showInputBox({
                    prompt: `Enter API key for ${provider}`,
                    password: true
                });
                if (apiKey) {
                    await secretManager.storeApiKey(provider, apiKey);
                    vscode.window.showInformationMessage(`API key for ${provider} saved`);
                }
            }
        }),
        vscode.commands.registerCommand('savanna.removeApiKey', async () => {
            const providers = await secretManager.getAllStoredProviders() || [];
            if (providers.length === 0) {
                vscode.window.showInformationMessage('No API keys stored');
                return;
            }
            const provider = await vscode.window.showQuickPick(providers, {
                placeHolder: 'Select provider to remove'
            });
            if (provider) {
                await secretManager.deleteApiKey(provider);
                vscode.window.showInformationMessage(`API key for ${provider} removed`);
            }
        })
    );

    return disposables;
}