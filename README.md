# Savanna AI - Multi-Provider VSCode Extension

A comprehensive GitHub Copilot-style VSCode extension with multi-provider AI support, featuring professional interface design and all GitHub Copilot commands.

## Features

### Multi-Provider AI Support
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus
- **Google**: Gemini Pro, Gemini Pro Vision
- **Cohere**: Command R+, Command R

### GitHub Copilot-Style Commands
- Code completion and suggestions
- Explain selected code
- Generate documentation
- Create unit tests
- Debug and fix code
- Code reviews and optimization
- Terminal integration
- Git workflow assistance

### Professional Interface
- GitHub Copilot-style sidebar chat interface
- Professional settings panel with dark/light mode
- Secure API key management
- Real-time provider status indicators
- Modern card-based layout with animations

## Installation for Local Testing

### Prerequisites
- Node.js 18+ and npm
- VSCode 1.74.0 or higher
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/savanna-ai-extension
   cd savanna-ai-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Open in VSCode**
   ```bash
   code .
   ```

5. **Launch Extension Development Host**
   - Press `F5` or go to Run > Start Debugging
   - Select "VS Code Extension Development"
   - A new VSCode window will open with the extension loaded

6. **Test the extension**
   - Open the Command Palette (`Ctrl+Shift+P`)
   - Search for "Savanna" to see available commands
   - Look for the Savanna chat icon in the sidebar
   - Configure AI providers in settings

## Configuration

### API Keys Setup
1. Open the Savanna settings panel
2. Add your API keys for desired providers:
   - OpenAI: Get from https://platform.openai.com/api-keys
   - Anthropic: Get from https://console.anthropic.com/
   - Google: Get from https://aistudio.google.com/app/apikey
   - Cohere: Get from https://dashboard.cohere.ai/

### Extension Settings
- Default AI provider selection
- Temperature and max tokens configuration
- Enable/disable inline completions
- Logging preferences

## File Structure

```
savanna-ai-extension/
├── src/                          # TypeScript source files
│   ├── extension.ts              # Main extension entry point
│   ├── managers/                 # Core managers
│   │   ├── providerManager.ts    # AI provider management
│   │   ├── configManager.ts      # Configuration handling
│   │   └── secretManager.ts      # Secure API key storage
│   ├── providers/                # AI provider implementations
│   │   ├── openaiProvider.ts     # OpenAI integration
│   │   ├── claudeProvider.ts     # Anthropic Claude integration
│   │   ├── geminiProvider.ts     # Google Gemini integration
│   │   └── cohereProvider.ts     # Cohere integration
│   ├── commands/                 # Command implementations
│   │   └── copilotCommands.ts    # GitHub Copilot-style commands
│   ├── chat/                     # Chat functionality
│   │   └── chatProvider.ts       # Chat interface handling
│   ├── completion/               # Code completion
│   │   └── completionProvider.ts # Inline completion provider
│   ├── sidebar/                  # Sidebar interface
│   │   └── sidebarProvider.ts    # Sidebar webview provider
│   └── utils/                    # Utilities
│       └── logger.ts             # Logging system
├── webview/                      # Frontend interface files
│   ├── settings-enhanced.html    # Professional settings interface
│   ├── settings-enhanced.css     # Settings styling
│   ├── settings-enhanced.js      # Settings functionality
│   ├── sidebar.html             # Chat sidebar interface
│   ├── sidebar.css              # Sidebar styling
│   └── sidebar.js               # Sidebar functionality
├── out/                         # Compiled JavaScript (generated)
├── package.json                 # Extension manifest and dependencies
├── tsconfig.json               # TypeScript configuration
└── INSTALLATION.md             # Detailed installation guide
```

## Development

### Building
```bash
npm run compile
```

### Watch mode for development
```bash
npm run watch
```

### Testing
1. Press `F5` to launch Extension Development Host
2. Test commands in the Command Palette
3. Verify sidebar functionality
4. Test settings interface

## Publishing

### Package the extension
```bash
npm install -g vsce
vsce package
```

### Publish to VS Code Marketplace
```bash
vsce publish
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub Issues page.