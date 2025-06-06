// Sidebar functionality for Savanna AI extension
(function() {
    const vscode = acquireVsCodeApi();
    
    // DOM elements
    let chatInput;
    let sendButton;
    let chatMessages;
    let loadingIndicator;
    let providerSelect;
    let currentModelSpan;
    let newChatBtn;
    let clearChatBtn;
    let explainCodeBtn;
    
    // State
    let isWaiting = false;
    let currentProvider = null;
    
    // Initialize when DOM loads
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        setupEventListeners();
        requestInitialState();
    });
    
    function initializeElements() {
        chatInput = document.getElementById('chatInput');
        sendButton = document.getElementById('sendButton');
        chatMessages = document.getElementById('chatMessages');
        loadingIndicator = document.getElementById('loadingIndicator');
        statusDot = document.getElementById('statusDot');
        providerName = document.getElementById('providerName');
        switchProviderBtn = document.getElementById('switchProvider');
        explainCodeBtn = document.getElementById('explainCode');
        clearChatBtn = document.getElementById('clearChat');
    }
    
    function setupEventListeners() {
        // Send message on button click
        sendButton.addEventListener('click', sendMessage);
        
        // Send message on Enter, new line on Shift+Enter
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto-resize textarea
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            updateSendButtonState();
        });
        
        // Provider switching
        switchProviderBtn.addEventListener('click', function() {
            vscode.postMessage({ type: 'switchProvider' });
        });
        
        // Explain selected code
        explainCodeBtn.addEventListener('click', function() {
            vscode.postMessage({ type: 'explainCode' });
        });
        
        // Clear chat
        clearChatBtn.addEventListener('click', function() {
            if (confirm('Clear all chat messages?')) {
                vscode.postMessage({ type: 'clearChat' });
            }
        });
    }
    
    function requestInitialState() {
        vscode.postMessage({ type: 'getState' });
    }
    
    function sendMessage() {
        const content = chatInput.value.trim();
        if (!content || isWaiting) return;
        
        vscode.postMessage({
            type: 'sendMessage',
            content: content
        });
        
        chatInput.value = '';
        chatInput.style.height = 'auto';
        updateSendButtonState();
    }
    
    function addMessage(role, content, timestamp = null) {
        // Remove welcome message if present
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const time = timestamp || new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-role">${role}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${formatMessageContent(content)}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function formatMessageContent(content) {
        // Basic markdown-like formatting
        return content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
    
    function clearMessages() {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h3>Welcome to Savanna AI</h3>
                <p>Ask me anything about your code, or select code and click "Explain" to get started.</p>
                <div class="quick-actions">
                    <button class="action-button" id="explainCode">
                        <span class="codicon codicon-question"></span>
                        Explain Selected Code
                    </button>
                </div>
            </div>
        `;
        
        // Re-bind explain code button
        const newExplainBtn = document.getElementById('explainCode');
        if (newExplainBtn) {
            newExplainBtn.addEventListener('click', function() {
                vscode.postMessage({ type: 'explainCode' });
            });
        }
    }
    
    function setWaiting(waiting) {
        isWaiting = waiting;
        
        if (waiting) {
            loadingIndicator.style.display = 'flex';
            sendButton.disabled = true;
            chatInput.disabled = true;
        } else {
            loadingIndicator.style.display = 'none';
            sendButton.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
        
        updateSendButtonState();
    }
    
    function updateProviderInfo(providerInfo) {
        currentProvider = providerInfo.current;
        
        if (currentProvider && providerInfo.configured.includes(currentProvider)) {
            statusDot.classList.add('connected');
            providerName.textContent = currentProvider;
            switchProviderBtn.title = `Current: ${currentProvider} - Click to switch`;
        } else {
            statusDot.classList.remove('connected');
            providerName.textContent = 'Not configured';
            switchProviderBtn.title = 'Configure AI provider';
        }
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <span class="codicon codicon-error"></span>
            <span>${message}</span>
        `;
        
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Insert error message before chat input
        const chatSection = document.querySelector('.chat-section');
        chatSection.insertBefore(errorDiv, document.querySelector('.chat-input-container'));
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    function updateSendButtonState() {
        const hasContent = chatInput.value.trim().length > 0;
        sendButton.disabled = !hasContent || isWaiting;
    }
    
    function scrollToBottom() {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }
    
    // Handle messages from extension
    window.addEventListener('message', function(event) {
        const message = event.data;
        
        switch (message.type) {
            case 'addMessage':
                addMessage(message.data.role, message.data.content);
                break;
                
            case 'clearMessages':
                clearMessages();
                break;
                
            case 'setWaiting':
                setWaiting(message.data);
                break;
                
            case 'updateProviderInfo':
                updateProviderInfo(message.data);
                break;
                
            case 'showError':
                showError(message.data);
                setWaiting(false);
                break;
                
            case 'focusInput':
                chatInput.focus();
                break;
        }
    });
    
    // Initialize send button state
    updateSendButtonState();
})();