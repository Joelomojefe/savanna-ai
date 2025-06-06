# Savanna AI VSCode Extension - Installation Guide

## Method 1: Development Installation (Recommended for Testing)

### Prerequisites
- VSCode installed on your system
- Node.js (version 14 or higher)

### Step-by-Step Installation

1. **Download the Extension Files**
   - Download all the files from this Replit project
   - You can do this by clicking "Download as zip" or cloning the repository

2. **Open in VSCode**
   ```bash
   # Navigate to the downloaded folder
   cd savanna-extension
   
   # Open in VSCode
   code .
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Compile the Extension**
   ```bash
   npm run compile
   ```

5. **Test the Extension**
   - Press `F5` in VSCode to launch a new Extension Development Host window
   - This opens a new VSCode window with your extension loaded
   - Test all the features in this development environment

### Available Commands in the Extension Development Host

Once the extension is running, you can access these commands via Command Palette (`Ctrl+Shift+P`):

- `Savanna: Open Settings` - Configure AI providers and preferences
- `Savanna: Open Chat` - Open AI chat interface
- `Savanna: Switch Provider` - Change active AI provider
- `Savanna: Explain Code` - Explain selected code (select code first)
- `Savanna: Generate Documentation` - Generate docs for selected code

### Keyboard Shortcuts

- `Ctrl+Alt+C` (or `Cmd+Alt+C` on Mac) - Open Chat
- `Ctrl+Alt+E` (or `Cmd+Alt+E` on Mac) - Explain Selected Code

## Method 2: Package Installation (Advanced)

If you want to create a distributable VSIX package:

1. **Install VSCE**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Package the Extension**
   ```bash
   vsce package
   ```

3. **Install the VSIX**
   ```bash
   code --install-extension savanna-1.0.0.vsix
   ```

## Configuration

### Setting Up AI Providers

1. Open the extension settings (`Savanna: Open Settings`)
2. Add your API keys for the providers you want to use:
   - **OpenAI**: Get your API key from https://platform.openai.com/api-keys
   - **Anthropic Claude**: Get your API key from https://console.anthropic.com/
   - **Google Gemini**: Get your API key from https://makersuite.google.com/app/apikey
   - **Cohere**: Get your API key from https://dashboard.cohere.ai/api-keys

3. Test the connection for each provider
4. Set your preferred default provider

### Theme Configuration

The extension supports both dark and light themes that automatically sync with your VSCode theme. You can also manually toggle themes in the settings interface.

## Troubleshooting

### Extension Not Loading
- Ensure all dependencies are installed (`npm install`)
- Compile the extension (`npm run compile`)
- Check the VSCode Developer Console for errors (`Help > Toggle Developer Tools`)

### API Connection Issues
- Verify your API keys are correct
- Check your internet connection
- Ensure the API service is not experiencing outages

### Performance Issues
- Reduce the max tokens setting in preferences
- Disable inline completion if it's causing lag
- Check the logging output for errors

## Features Overview

### Professional Sidebar Interface
- GitHub Copilot-style design
- Real-time chat with AI assistants
- Provider status indicators
- Smooth animations and transitions

### Settings Interface
- Dark/light mode toggle
- Comprehensive provider configuration
- Real-time validation
- Auto-save functionality
- Temperature and token controls

### Code Integration
- Inline code completion
- Context-aware suggestions
- Code explanation
- Documentation generation
- Multi-language support

## File Structure

```
savanna-extension/
├── src/                    # TypeScript source files
│   ├── extension.ts        # Main extension entry point
│   ├── managers/          # Configuration and provider management
│   ├── providers/         # AI provider implementations
│   ├── chat/              # Chat functionality
│   ├── completion/        # Code completion logic
│   ├── sidebar/           # Sidebar interface
│   └── webview/           # WebView panels
├── webview/               # HTML/CSS/JS for UI
├── out/                   # Compiled JavaScript files
├── package.json           # Extension manifest
└── tsconfig.json          # TypeScript configuration
```

## Support

If you encounter any issues:
1. Check the VSCode Developer Console for error messages
2. Review the extension logs in the Output panel
3. Ensure all API keys are properly configured
4. Verify network connectivity for API calls

The extension provides comprehensive logging to help diagnose any issues during development and usage.