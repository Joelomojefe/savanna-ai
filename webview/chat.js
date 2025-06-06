// VSCode API
const vscode = acquireVsCodeApi();

// DOM elements
const providerSelect = document.getElementById('provider-select');
const currentModelSpan = document.getElementById('current-model');
const newChatBtn = document.getElementById('new-chat');
const clearChatBtn = document.getElementById('clear-chat');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const charCounter = document.getElementById('char-counter');
const typingIndicator = document.getElementById('typing-indicator');

// State
let isWaitingForResponse = false;
let currentProvider = '';
let providers = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateUI();
});

function setupEventListeners() {
    // Send message
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // Character counter
    chatInput.addEventListener('input', function() {
        const length = chatInput.value.length;
        charCounter.textContent = `${length}/4000`;
        
        if (length > 3800) {
            charCounter.style.color = 'var(--vscode-errorForeground)';
        } else if (length > 3500) {
            charCounter.style.color = 'var(--vscode-charts-yellow)';
        } else {
            charCounter.style.color = 'var(--vscode-descriptionForeground)';
        }
    });

    // Provider selection
    providerSelect.addEventListener('change', function() {
        if (providerSelect.value) {
            vscode.postMessage({
                type: 'switchProvider',
                provider: providerSelect.value
            });
        }
    });

    // New chat
    newChatBtn.addEventListener('click', function() {
        if (confirm('Start a new chat? This will clear the current conversation.')) {
            vscode.postMessage({ type: 'newChat' });
            clearMessages();
            addMessage('system', 'New chat started. How can I help you?');
        }
    });

    // Clear chat
    clearChatBtn.addEventListener('click', function() {
        if (confirm('Clear chat history?')) {
            vscode.postMessage({ type: 'clear' });
            clearMessages();
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isWaitingForResponse) return;

    // Add user message to UI
    addMessage('user', message);
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = '60px';
    charCounter.textContent = '0/4000';
    charCounter.style.color = 'var(--vscode-descriptionForeground)';

    // Show typing indicator
    setWaitingState(true);

    // Send to extension
    vscode.postMessage({
        type: 'chat',
        content: message
    });
}

function addMessage(role, content, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Process content for code blocks and markdown
    contentDiv.innerHTML = processMessageContent(content);

    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'message-timestamp';
    timestampDiv.textContent = timestamp || new Date().toLocaleTimeString();

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampDiv);

    // Remove welcome message if it exists
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function processMessageContent(content) {
    // Basic markdown processing
    let processed = content
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');

    return processed;
}

function clearMessages() {
    chatMessages.innerHTML = '';
    
    // Add welcome message back
    const welcomeDiv = document.createElement('div');
    welcomeDiv.id = 'welcome-message';
    welcomeDiv.className = 'message system-message';
    welcomeDiv.innerHTML = `
        <div class="message-content">
            <h3>Welcome to Savanna AI Chat!</h3>
            <p>Ask questions about your code, request explanations, or get help with programming tasks.</p>
            <p>Tips:</p>
            <ul>
                <li>Select code in your editor and click "Explain Selected Code"</li>
                <li>Ask for code examples or debugging help</li>
                <li>Request documentation or code reviews</li>
            </ul>
        </div>
    `;
    chatMessages.appendChild(welcomeDiv);
}

function setWaitingState(waiting) {
    isWaitingForResponse = waiting;
    sendButton.disabled = waiting;
    explainCodeBtn.disabled = waiting;
    
    if (waiting) {
        typingIndicator.style.display = 'block';
        sendButton.innerHTML = '<div class="loading"></div>';
    } else {
        typingIndicator.style.display = 'none';
        sendButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22,2 15,22 11,13 2,9 22,2"/>
            </svg>
        `;
    }
}

function updateProviderSelect() {
    providerSelect.innerHTML = '<option value="">Select Provider...</option>';
    
    providers.forEach(provider => {
        if (provider.configured) {
            const option = document.createElement('option');
            option.value = provider.name.toLowerCase();
            option.textContent = provider.name;
            if (provider.name.toLowerCase() === currentProvider) {
                option.selected = true;
            }
            providerSelect.appendChild(option);
        }
    });
}

function updateCurrentModel() {
    const provider = providers.find(p => p.name.toLowerCase() === currentProvider);
    if (provider) {
        currentModelSpan.textContent = `Model: ${provider.currentModel}`;
    } else {
        currentModelSpan.textContent = '';
    }
}

function updateUI() {
    updateProviderSelect();
    updateCurrentModel();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message system-message';
    errorDiv.innerHTML = `
        <div class="message-content error">
            <strong>Error:</strong> ${message}
        </div>
    `;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

// Handle messages from extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'init':
            providers = message.providers || [];
            currentProvider = message.currentProvider || '';
            updateUI();
            
            // Load chat history
            if (message.history && message.history.length > 0) {
                clearMessages();
                message.history.forEach(msg => {
                    addMessage(msg.role, msg.content);
                });
            }
            break;
            
        case 'userMessage':
            // Message already added by sendMessage function
            break;
            
        case 'assistantMessage':
            setWaitingState(false);
            addMessage('assistant', message.message.content);
            break;
            
        case 'error':
            setWaitingState(false);
            showError(message.message);
            break;
            
        case 'providerChanged':
            currentProvider = message.provider;
            updateUI();
            break;
            
        case 'historyCleared':
            clearMessages();
            break;
            
        case 'providersInfo':
            providers = message.providers.map(name => ({
                name: name,
                configured: true,
                currentModel: name === message.currentProvider ? message.currentModel : ''
            }));
            currentProvider = message.currentProvider;
            updateUI();
            break;
            
        case 'newChatStarted':
            clearMessages();
            break;
    }
});

// Request provider info on load
vscode.postMessage({ type: 'getProviders' });

// Auto-focus input on load
chatInput.focus();
