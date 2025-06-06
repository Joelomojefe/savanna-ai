import * as vscode from 'vscode';
import { ConfigManager } from '../managers/configManager';

export interface LogEntry {
    timestamp: Date;
    type: 'info' | 'warning' | 'error' | 'completion-request' | 'completion-response' | 'chat-request' | 'chat-response';
    message: string;
    data?: any;
}

export class Logger {
    private logs: LogEntry[] = [];
    private outputChannel: vscode.OutputChannel;

    constructor(private configManager: ConfigManager) {
        this.outputChannel = vscode.window.createOutputChannel('Savanna');
    }

    log(type: LogEntry['type'], message: string | any, data?: any): void {
        if (!this.configManager.isLoggingEnabled() && !['error'].includes(type)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date(),
            type,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            data: typeof message === 'string' ? data : message
        };

        this.logs.push(entry);
        this.writeToOutput(entry);

        // Keep only last 1000 entries
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
    }

    info(message: string, data?: any): void {
        this.log('info', message, data);
    }

    warning(message: string, data?: any): void {
        this.log('warning', message, data);
    }

    error(message: string, error?: any): void {
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error;

        this.log('error', message, errorData);
        
        // Always show errors to user
        if (this.configManager.isLoggingEnabled()) {
            this.outputChannel.show();
        }
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
        this.outputChannel.clear();
    }

    exportLogs(): string {
        return this.logs.map(entry => {
            const timestamp = entry.timestamp.toISOString();
            const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
            return `[${timestamp}] ${entry.type.toUpperCase()}: ${entry.message}${dataStr}`;
        }).join('\n');
    }

    private writeToOutput(entry: LogEntry): void {
        const timestamp = entry.timestamp.toLocaleTimeString();
        const typeStr = entry.type.toUpperCase().padEnd(12);
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data, null, 2)}` : '';
        
        this.outputChannel.appendLine(`[${timestamp}] ${typeStr}: ${entry.message}${dataStr}`);
    }

    showOutput(): void {
        this.outputChannel.show();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}
