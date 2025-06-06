// VSCode API
const vscode = acquireVsCodeApi();

// DOM elements
const providerCards = document.querySelectorAll('.provider-card');
const saveButtons = document.querySelectorAll('.save-key');
const testButtons = document.querySelectorAll('.test-key');
const removeButtons = document.querySelectorAll('.remove-key');
const toggleVisibilityButtons = document.querySelectorAll('.toggle-visibility');
const defaultProviderSelect = document.getElementById('default-provider');
const temperatureRange = document.getElementById('temperature');
const maxTokensRange = document.getElementById('max-tokens');
const enableLoggingCheckbox = document.getElementById('enable-logging');
const enableCompletionCheckbox = document.getElementById('enable-completion');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

// State
let currentSettings = {};
let providerStatuses = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    requestInitialData();
});

function setupEventListeners() {
    // API Key management
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.dataset.provider;
            saveApiKey(provider);
        });
    });

    testButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.dataset.provider;
            testConnection(provider);
        });
    });

    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.dataset.provider;
            removeApiKey(provider);
        });
    });

    // Password visibility toggles
    toggleVisibilityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            const isPassword = input.type === 'password';
            
            input.type = isPassword ? 'text' : 'password';
            
            // Update icon
            const icon = this.querySelector('svg');
            if (isPassword) {
                // Show "eye-off" icon
                icon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                `;
            } else {
                // Show "eye" icon
                icon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                `;
            }
        });
    });

    // Range inputs with value display
    temperatureRange.addEventListener('input', function() {
        const valueSpan = this.parentNode.querySelector('.range-value');
        valueSpan.textContent = this.value;
    });

    maxTokensRange.addEventListener('input', function() {
        const valueSpan = this.parentNode.querySelector('.range-value');
        valueSpan.textContent = this.value;
    });

    // Settings buttons
    saveSettingsBtn.addEventListener('click', saveAllSettings);
    resetSettingsBtn.addEventListener('click', resetToDefaults);

    // Model selection changes
    document.querySelectorAll('select[id$="-model"]').forEach(select => {
        select.addEventListener('change', function() {
            const provider = this.id.replace('-model', '');
            updateProviderModel(provider, this.value);
        });
    });

    // Enter key support for API key inputs
    document.querySelectorAll('.api-key-input').forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const provider = this.closest('.provider-card').dataset.provider;
                saveApiKey(provider);
            }
        });
    });
}

function requestInitialData() {
    vscode.postMessage({
        command: 'getSettings'
    });
}

function saveApiKey(provider) {
    const card = document.querySelector(`[data-provider="${provider}"]`);
    const input = card.querySelector('.api-key-input');
    const apiKey = input.value.trim();

    if (!apiKey) {
        showNotification('Please enter an API key', 'error');
        return;
    }

    setCardLoading(provider, true);

    vscode.postMessage({
        command: 'saveApiKey',
        provider: provider,
        apiKey: apiKey
    });
}

function removeApiKey(provider) {
    if (!confirm(`Remove API key for ${provider}? This action cannot be undone.`)) {
        return;
    }

    setCardLoading(provider, true);

    vscode.postMessage({
        command: 'removeApiKey',
        provider: provider
    });
}

function testConnection(provider) {
    const card = document.querySelector(`[data-provider="${provider}"]`);
    const input = card.querySelector('.api-key-input');
    const apiKey = input.value.trim();

    if (!apiKey) {
        showNotification('Please enter an API key to test', 'warning');
        return;
    }

    setCardLoading(provider, true);

    vscode.postMessage({
        command: 'testConnection',
        provider: provider,
        apiKey: apiKey
    });
}

function updateProviderModel(provider, model) {
    vscode.postMessage({
        command: 'updateModel',
        provider: provider,
        model: model
    });
}

function saveAllSettings() {
    const settings = {
        defaultProvider: defaultProviderSelect.value,
        temperature: parseFloat(temperatureRange.value),
        maxTokens: parseInt(maxTokensRange.value),
        enableLogging: enableLoggingCheckbox.checked,
        enableInlineCompletion: enableCompletionCheckbox.checked
    };

    setGlobalLoading(true);

    vscode.postMessage({
        command: 'saveSettings',
        settings: settings
    });
}

function resetToDefaults() {
    if (!confirm('Reset all settings to defaults? This will not affect your API keys.')) {
        return;
    }

    vscode.postMessage({
        command: 'resetSettings'
    });
}

function updateProviderStatus(provider, configured, model = null) {
    const card = document.querySelector(`[data-provider="${provider}"]`);
    const statusIndicator = card.querySelector('.status-indicator');
    const statusText = card.querySelector('.status-text');
    const input = card.querySelector('.api-key-input');
    const modelSelect = card.querySelector(`#${provider}-model`);

    if (configured) {
        statusIndicator.classList.add('configured');
        statusText.textContent = 'Configured';
        input.placeholder = '••••••••••••••••';
        
        if (model && modelSelect) {
            modelSelect.value = model;
        }
    } else {
        statusIndicator.classList.remove('configured');
        statusText.textContent = 'Not configured';
        input.value = '';
        input.placeholder = getPlaceholderForProvider(provider);
    }

    providerStatuses[provider] = configured;
    updateDefaultProviderOptions();
}

function getPlaceholderForProvider(provider) {
    const placeholders = {
        'openai': 'sk-...',
        'gemini': 'AIza...',
        'claude': 'sk-ant-...',
        'cohere': 'Enter Cohere API key'
    };
    return placeholders[provider] || 'Enter API key';
}

function updateDefaultProviderOptions() {
    const currentValue = defaultProviderSelect.value;
    defaultProviderSelect.innerHTML = '';

    // Add all providers, but mark unconfigured ones
    Object.keys(providerStatuses).forEach(provider => {
        const option = document.createElement('option');
        option.value = provider;
        option.textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
        
        if (!providerStatuses[provider]) {
            option.textContent += ' (not configured)';
            option.disabled = true;
        }
        
        if (provider === currentValue) {
            option.selected = true;
        }
        
        defaultProviderSelect.appendChild(option);
    });
}

function updateSettings(settings) {
    currentSettings = settings;

    // Update form values
    if (settings.defaultProvider) {
        defaultProviderSelect.value = settings.defaultProvider;
    }

    if (settings.temperature !== undefined) {
        temperatureRange.value = settings.temperature;
        temperatureRange.parentNode.querySelector('.range-value').textContent = settings.temperature;
    }

    if (settings.maxTokens !== undefined) {
        maxTokensRange.value = settings.maxTokens;
        maxTokensRange.parentNode.querySelector('.range-value').textContent = settings.maxTokens;
    }

    if (settings.enableLogging !== undefined) {
        enableLoggingCheckbox.checked = settings.enableLogging;
    }

    if (settings.enableInlineCompletion !== undefined) {
        enableCompletionCheckbox.checked = settings.enableInlineCompletion;
    }
}

function setCardLoading(provider, loading) {
    const card = document.querySelector(`[data-provider="${provider}"]`);
    const buttons = card.querySelectorAll('button');
    
    if (loading) {
        card.classList.add('loading');
        buttons.forEach(btn => btn.disabled = true);
    } else {
        card.classList.remove('loading');
        buttons.forEach(btn => btn.disabled = false);
    }
}

function setGlobalLoading(loading) {
    const allButtons = document.querySelectorAll('button');
    const allInputs = document.querySelectorAll('input, select');
    
    if (loading) {
        document.body.classList.add('loading');
        allButtons.forEach(btn => btn.disabled = true);
        allInputs.forEach(input => input.disabled = true);
    } else {
        document.body.classList.remove('loading');
        allButtons.forEach(btn => btn.disabled = false);
        allInputs.forEach(input => input.disabled = false);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '4px',
        color: 'var(--vscode-foreground)',
        zIndex: '1000',
        maxWidth: '400px',
        wordWrap: 'break-word'
    });

    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = 'var(--vscode-charts-green)';
            notification.style.color = 'var(--vscode-editor-background)';
            break;
        case 'error':
            notification.style.backgroundColor = 'var(--vscode-errorForeground)';
            notification.style.color = 'var(--vscode-editor-background)';
            break;
        case 'warning':
            notification.style.backgroundColor = 'var(--vscode-charts-yellow)';
            notification.style.color = 'var(--vscode-editor-background)';
            break;
        default:
            notification.style.backgroundColor = 'var(--vscode-notifications-background)';
            notification.style.border = '1px solid var(--vscode-notifications-border)';
    }

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);

    // Allow manual removal by clicking
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

function handleApiKeyResult(provider, success, message) {
    setCardLoading(provider, false);
    
    if (success) {
        updateProviderStatus(provider, true);
        showNotification(`API key saved for ${provider}`, 'success');
        
        // Clear the input for security
        const card = document.querySelector(`[data-provider="${provider}"]`);
        const input = card.querySelector('.api-key-input');
        input.value = '';
    } else {
        showNotification(`Failed to save API key for ${provider}: ${message}`, 'error');
    }
}

function handleTestResult(provider, success, message) {
    setCardLoading(provider, false);
    
    if (success) {
        showNotification(`Connection test successful for ${provider}`, 'success');
    } else {
        showNotification(`Connection test failed for ${provider}: ${message}`, 'error');
    }
}

function handleRemoveResult(provider, success, message) {
    setCardLoading(provider, false);
    
    if (success) {
        updateProviderStatus(provider, false);
        showNotification(`API key removed for ${provider}`, 'success');
    } else {
        showNotification(`Failed to remove API key for ${provider}: ${message}`, 'error');
    }
}

// Handle messages from extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
        case 'settingsData':
            updateSettings(message.settings);
            
            // Update provider statuses
            if (message.providers) {
                message.providers.forEach(provider => {
                    updateProviderStatus(provider.name.toLowerCase(), provider.configured, provider.currentModel);
                });
            }
            break;
            
        case 'apiKeyResult':
            handleApiKeyResult(message.provider, message.success, message.message);
            break;
            
        case 'testResult':
            handleTestResult(message.provider, message.success, message.message);
            break;
            
        case 'removeResult':
            handleRemoveResult(message.provider, message.success, message.message);
            break;
            
        case 'settingsSaved':
            setGlobalLoading(false);
            if (message.success) {
                showNotification('Settings saved successfully', 'success');
            } else {
                showNotification(`Failed to save settings: ${message.message}`, 'error');
            }
            break;
            
        case 'settingsReset':
            if (message.success) {
                updateSettings(message.settings);
                showNotification('Settings reset to defaults', 'success');
            } else {
                showNotification(`Failed to reset settings: ${message.message}`, 'error');
            }
            break;
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                saveAllSettings();
                break;
            case 'r':
                e.preventDefault();
                resetToDefaults();
                break;
        }
    }
});
