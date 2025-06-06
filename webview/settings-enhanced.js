// Professional Settings Interface with Dark/Light Mode Toggle
(function() {
    'use strict';

    // State management
    let settings = {
        theme: 'dark',
        defaultProvider: 'openai',
        temperature: 0.7,
        maxTokens: 150,
        enableLogging: false,
        inlineCompletion: true,
        autoSave: true
    };

    let providers = {
        openai: { configured: true, model: 'gpt-4-turbo-preview' },
        claude: { configured: false, model: 'claude-3-sonnet-20240229' },
        gemini: { configured: false, model: 'gemini-pro' },
        cohere: { configured: false, model: 'command' }
    };

    // DOM elements
    let themeToggle, temperatureSlider, maxTokensSlider;
    let temperatureValue, maxTokensValue;

    // Initialize when DOM loads
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        setupEventListeners();
        loadSettings();
        updateUI();
    });

    function initializeElements() {
        themeToggle = document.getElementById('theme-toggle');
        temperatureSlider = document.getElementById('temperature');
        maxTokensSlider = document.getElementById('max-tokens');
        temperatureValue = document.getElementById('temperature-value');
        maxTokensValue = document.getElementById('max-tokens-value');
    }

    function setupEventListeners() {
        // Theme toggle
        themeToggle.addEventListener('change', toggleTheme);

        // Range sliders
        temperatureSlider.addEventListener('input', function() {
            const value = parseFloat(this.value);
            settings.temperature = value;
            temperatureValue.textContent = value.toFixed(1);
            if (settings.autoSave) saveSettings();
        });

        maxTokensSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            settings.maxTokens = value;
            maxTokensValue.textContent = value;
            if (settings.autoSave) saveSettings();
        });

        // Provider actions
        document.addEventListener('click', function(e) {
            const action = e.target.dataset.action;
            const provider = e.target.dataset.provider;

            if (action && provider) {
                handleProviderAction(action, provider, e.target);
            }
        });

        // Toggle password visibility
        document.querySelectorAll('.toggle-visibility').forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const input = document.getElementById(targetId);
                
                if (input.type === 'password') {
                    input.type = 'text';
                    this.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    `;
                } else {
                    input.type = 'password';
                    this.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    `;
                }
            });
        });

        // General settings toggles
        document.getElementById('enable-logging').addEventListener('change', function() {
            settings.enableLogging = this.checked;
            if (settings.autoSave) saveSettings();
        });

        document.getElementById('inline-completion').addEventListener('change', function() {
            settings.inlineCompletion = this.checked;
            if (settings.autoSave) saveSettings();
        });

        document.getElementById('auto-save').addEventListener('change', function() {
            settings.autoSave = this.checked;
            if (this.checked) saveSettings();
        });

        document.getElementById('default-provider').addEventListener('change', function() {
            settings.defaultProvider = this.value;
            if (settings.autoSave) saveSettings();
        });

        // Save all settings button
        document.getElementById('save-all-settings').addEventListener('click', saveAllSettings);

        // Reset settings button
        document.getElementById('reset-settings').addEventListener('click', resetSettings);
    }

    function toggleTheme() {
        const isDark = themeToggle.checked;
        settings.theme = isDark ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', settings.theme);
        
        // Update theme label
        const themeLabel = document.querySelector('.theme-label');
        themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
        
        if (settings.autoSave) saveSettings();
        
        showNotification(`Switched to ${settings.theme} mode`, 'success');
    }

    function handleProviderAction(action, provider, button) {
        const card = button.closest('.provider-card');
        
        switch (action) {
            case 'save':
                saveProviderConfig(provider, card);
                break;
            case 'test':
                testProviderConnection(provider, card);
                break;
            case 'remove':
                removeProviderConfig(provider, card);
                break;
        }
    }

    function saveProviderConfig(provider, card) {
        const keyInput = card.querySelector('.api-key-input');
        const modelSelect = card.querySelector('.form-select');
        
        if (!keyInput.value.trim()) {
            showNotification('Please enter an API key', 'error');
            return;
        }

        setCardLoading(card, true);

        // Simulate API key validation
        setTimeout(() => {
            providers[provider].configured = true;
            providers[provider].model = modelSelect.value;
            
            updateProviderStatus(provider, true);
            setCardLoading(card, false);
            
            showNotification(`${getProviderName(provider)} configured successfully`, 'success');
            
            if (settings.autoSave) saveSettings();
        }, 1500);
    }

    function testProviderConnection(provider, card) {
        const keyInput = card.querySelector('.api-key-input');
        
        if (!keyInput.value.trim()) {
            showNotification('Please enter an API key first', 'error');
            return;
        }

        setCardLoading(card, true);

        // Simulate connection test
        setTimeout(() => {
            const success = Math.random() > 0.3; // 70% success rate for demo
            
            setCardLoading(card, false);
            
            if (success) {
                showNotification(`${getProviderName(provider)} connection successful`, 'success');
            } else {
                showNotification(`${getProviderName(provider)} connection failed`, 'error');
            }
        }, 2000);
    }

    function removeProviderConfig(provider, card) {
        if (confirm(`Remove ${getProviderName(provider)} configuration?`)) {
            providers[provider].configured = false;
            
            const keyInput = card.querySelector('.api-key-input');
            keyInput.value = '';
            
            updateProviderStatus(provider, false);
            
            showNotification(`${getProviderName(provider)} removed`, 'warning');
            
            if (settings.autoSave) saveSettings();
        }
    }

    function updateProviderStatus(provider, configured) {
        const statusIndicator = document.querySelector(`#${provider}-status .status-indicator`);
        const statusText = document.querySelector(`#${provider}-status .status-text`);
        
        if (configured) {
            statusIndicator.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusIndicator.classList.remove('connected');
            statusText.textContent = 'Not configured';
        }
    }

    function setCardLoading(card, loading) {
        if (loading) {
            card.classList.add('loading');
        } else {
            card.classList.remove('loading');
        }
    }

    function getProviderName(provider) {
        const names = {
            openai: 'OpenAI',
            claude: 'Anthropic Claude',
            gemini: 'Google Gemini',
            cohere: 'Cohere'
        };
        return names[provider] || provider;
    }

    function loadSettings() {
        // In a real extension, this would load from VSCode settings
        const savedSettings = localStorage.getItem('savanna-settings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }

        const savedProviders = localStorage.getItem('savanna-providers');
        if (savedProviders) {
            providers = { ...providers, ...JSON.parse(savedProviders) };
        }
    }

    function saveSettings() {
        localStorage.setItem('savanna-settings', JSON.stringify(settings));
        localStorage.setItem('savanna-providers', JSON.stringify(providers));
    }

    function saveAllSettings() {
        saveSettings();
        showNotification('All settings saved successfully', 'success');
    }

    function resetSettings() {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
            settings = {
                theme: 'dark',
                defaultProvider: 'openai',
                temperature: 0.7,
                maxTokens: 150,
                enableLogging: false,
                inlineCompletion: true,
                autoSave: true
            };

            providers = {
                openai: { configured: false, model: 'gpt-4-turbo-preview' },
                claude: { configured: false, model: 'claude-3-sonnet-20240229' },
                gemini: { configured: false, model: 'gemini-pro' },
                cohere: { configured: false, model: 'command' }
            };

            updateUI();
            saveSettings();
            showNotification('Settings reset to defaults', 'success');
        }
    }

    function updateUI() {
        // Update theme
        document.body.setAttribute('data-theme', settings.theme);
        themeToggle.checked = settings.theme === 'dark';
        document.querySelector('.theme-label').textContent = settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode';

        // Update sliders
        temperatureSlider.value = settings.temperature;
        temperatureValue.textContent = settings.temperature.toFixed(1);
        maxTokensSlider.value = settings.maxTokens;
        maxTokensValue.textContent = settings.maxTokens;

        // Update toggles
        document.getElementById('enable-logging').checked = settings.enableLogging;
        document.getElementById('inline-completion').checked = settings.inlineCompletion;
        document.getElementById('auto-save').checked = settings.autoSave;

        // Update default provider
        document.getElementById('default-provider').value = settings.defaultProvider;

        // Update provider statuses
        Object.keys(providers).forEach(provider => {
            updateProviderStatus(provider, providers[provider].configured);
            
            // Update model selections
            const modelSelect = document.getElementById(`${provider}-model`);
            if (modelSelect) {
                modelSelect.value = providers[provider].model;
            }
        });
    }

    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Export functions for external use
    window.SavannaSettings = {
        getSettings: () => settings,
        getProviders: () => providers,
        updateProvider: updateProviderStatus,
        showNotification: showNotification
    };
})();