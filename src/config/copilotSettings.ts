import * as vscode from 'vscode';

export interface CopilotSettings {
    // Agent Settings
    'savanna.chat.agent.autoFix': boolean;
    'savanna.chat.agent.runTasks': boolean;
    'savanna.chat.agent.thinkingTool': boolean;

    // BYOK Settings
    'savanna.chat.byok.ollamaEndpoint': string;

    // Code Generation
    'savanna.chat.codeGeneration.instructions': Array<{file?: string, text?: string}>;
    'savanna.chat.codeGeneration.useInstructionFiles': boolean;

    // Code Search
    'savanna.chat.codesearch.enabled': boolean;

    // Commit Message Generation
    'savanna.chat.commitMessageGeneration.instructions': Array<{file?: string, text?: string}>;

    // Context Settings
    'savanna.chat.completionContext.typescript.mode': 'off' | 'declarations' | 'references' | 'mixed';
    'savanna.chat.copilotDebugCommand.enabled': boolean;
    'savanna.chat.editor.temporalContext.enabled': boolean;

    // Edits Settings
    'savanna.chat.edits.codesearch.enabled': boolean;
    'savanna.chat.edits.newNotebook.enabled': boolean;
    'savanna.chat.edits.suggestRelatedFilesForTests': boolean;
    'savanna.chat.edits.suggestRelatedFilesFromGitHistory': boolean;
    'savanna.chat.edits.temporalContext.enabled': boolean;

    // Follow-ups
    'savanna.chat.followUps': 'always' | 'never' | 'onError';

    // Test Generation
    'savanna.chat.generateTests.codeLens': boolean;

    // Language Context
    'savanna.chat.languageContext.fix.typescript.enabled': boolean;
    'savanna.chat.languageContext.inline.typescript.enabled': boolean;
    'savanna.chat.languageContext.typescript.enabled': boolean;

    // Locale
    'savanna.chat.localeOverride': string;

    // Workspace Creation
    'savanna.chat.newWorkspaceCreation.enabled': boolean;

    // Pull Request Generation
    'savanna.chat.pullRequestDescriptionGeneration.instructions': Array<{file?: string, text?: string}>;

    // Review Selection
    'savanna.chat.reviewSelection.enabled': boolean;
    'savanna.chat.reviewSelection.instructions': Array<{file?: string, text?: string}>;

    // Scope Selection
    'savanna.chat.scopeSelection': boolean;

    // Search Settings
    'savanna.chat.search.keywordSuggestions': boolean;
    'savanna.chat.search.semanticTextResults': boolean;

    // Setup Tests
    'savanna.chat.setupTests.enabled': boolean;

    // Start Debugging
    'savanna.chat.startDebugging.enabled': boolean;

    // Conversation History
    'savanna.chat.summarizeAgentConversationHistory.enabled': boolean;

    // Terminal Chat
    'savanna.chat.terminalChatLocation': 'chatView' | 'quickChat' | 'editor';

    // Test Generation Instructions
    'savanna.chat.testGeneration.instructions': Array<{file?: string, text?: string}>;

    // Project Templates
    'savanna.chat.useProjectTemplates': boolean;

    // Editor Settings
    'savanna.editor.enableCodeActions': boolean;

    // Next Edit Suggestions
    'savanna.nextEditSuggestions.enabled': boolean;
    'savanna.nextEditSuggestions.fixes': boolean;

    // Rename Suggestions
    'savanna.renameSuggestions.triggerAutomatically': boolean;
}

export class CopilotConfigManager {
    private static readonly CONFIG_SECTION = 'savanna';

    static getDefaultSettings(): CopilotSettings {
        return {
            // Agent Settings
            'savanna.chat.agent.autoFix': true,
            'savanna.chat.agent.runTasks': true,
            'savanna.chat.agent.thinkingTool': false,

            // BYOK Settings
            'savanna.chat.byok.ollamaEndpoint': 'http://localhost:11434',

            // Code Generation
            'savanna.chat.codeGeneration.instructions': [],
            'savanna.chat.codeGeneration.useInstructionFiles': true,

            // Code Search
            'savanna.chat.codesearch.enabled': false,

            // Commit Message Generation
            'savanna.chat.commitMessageGeneration.instructions': [],

            // Context Settings
            'savanna.chat.completionContext.typescript.mode': 'off',
            'savanna.chat.copilotDebugCommand.enabled': true,
            'savanna.chat.editor.temporalContext.enabled': false,

            // Edits Settings
            'savanna.chat.edits.codesearch.enabled': false,
            'savanna.chat.edits.newNotebook.enabled': true,
            'savanna.chat.edits.suggestRelatedFilesForTests': true,
            'savanna.chat.edits.suggestRelatedFilesFromGitHistory': true,
            'savanna.chat.edits.temporalContext.enabled': false,

            // Follow-ups
            'savanna.chat.followUps': 'never',

            // Test Generation
            'savanna.chat.generateTests.codeLens': false,

            // Language Context
            'savanna.chat.languageContext.fix.typescript.enabled': false,
            'savanna.chat.languageContext.inline.typescript.enabled': false,
            'savanna.chat.languageContext.typescript.enabled': false,

            // Locale
            'savanna.chat.localeOverride': 'auto',

            // Workspace Creation
            'savanna.chat.newWorkspaceCreation.enabled': true,

            // Pull Request Generation
            'savanna.chat.pullRequestDescriptionGeneration.instructions': [],

            // Review Selection
            'savanna.chat.reviewSelection.enabled': true,
            'savanna.chat.reviewSelection.instructions': [],

            // Scope Selection
            'savanna.chat.scopeSelection': false,

            // Search Settings
            'savanna.chat.search.keywordSuggestions': false,
            'savanna.chat.search.semanticTextResults': true,

            // Setup Tests
            'savanna.chat.setupTests.enabled': true,

            // Start Debugging
            'savanna.chat.startDebugging.enabled': true,

            // Conversation History
            'savanna.chat.summarizeAgentConversationHistory.enabled': true,

            // Terminal Chat
            'savanna.chat.terminalChatLocation': 'chatView',

            // Test Generation Instructions
            'savanna.chat.testGeneration.instructions': [],

            // Project Templates
            'savanna.chat.useProjectTemplates': true,

            // Editor Settings
            'savanna.editor.enableCodeActions': true,

            // Next Edit Suggestions
            'savanna.nextEditSuggestions.enabled': false,
            'savanna.nextEditSuggestions.fixes': false,

            // Rename Suggestions
            'savanna.renameSuggestions.triggerAutomatically': true
        };
    }

    static getSetting<K extends keyof CopilotSettings>(key: K): CopilotSettings[K] {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const defaults = this.getDefaultSettings();
        return config.get(key.replace('savanna.', ''), defaults[key]);
    }

    static async setSetting<K extends keyof CopilotSettings>(key: K, value: CopilotSettings[K]): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(key.replace('savanna.', ''), value, vscode.ConfigurationTarget.Global);
    }

    static getAllSettings(): CopilotSettings {
        const defaults = this.getDefaultSettings();
        const result = {} as any;
        
        for (const key of Object.keys(defaults) as Array<keyof CopilotSettings>) {
            result[key] = this.getSetting(key);
        }
        
        return result as CopilotSettings;
    }

    static onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(callback);
    }

    // Runtime Status Methods
    static getActivationTime(): number {
        return Date.now();
    }

    static getChatRequestCount(): number {
        // This would track actual usage
        return Math.floor(Math.random() * 1000);
    }

    static getUsageData(): { date: string, requests: number }[] {
        // This would return actual usage data
        const dates = ['8 May', '15 May', '22 May', '29 May', '5 Jun'];
        return dates.map(date => ({
            date,
            requests: Math.floor(Math.random() * 200)
        }));
    }
}