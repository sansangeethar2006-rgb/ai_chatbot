const chatbox = document.getElementById('chatbox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const loading = document.getElementById('loading');
const imageBtn = document.getElementById('imageBtn');
const themeToggle = document.getElementById('themeToggle');
const newChatBtn = document.getElementById('newChatBtn');
const historyBtn = document.getElementById('historyBtn');
// ==================================================
// DISPLAY CHAT HISTORY
// ==================================================

const historyList = document.getElementById('historyList');

function displayChatHistory() {

    historyList.innerHTML = '';

    const history = getChatHistory();

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                No saved chats yet.
            </div>
        `;
        return;
    }

    history.forEach(chat => {

        const historyItem = document.createElement('div');

        historyItem.classList.add('history-item');

        // Chat title
        const title = document.createElement('span');

        title.textContent = chat.title;
        title.title = chat.title;

        // Delete button
        const deleteButton =
            document.createElement('button');

        deleteButton.textContent = '🗑️';
        deleteButton.title = 'Delete chat';

        deleteButton.classList.add(
            'delete-history-btn'
        );

        deleteButton.addEventListener(
            'click',
            function (event) {

                event.stopPropagation();

                deleteChat(chat.id);
            }
        );

        historyItem.appendChild(title);
        historyItem.appendChild(deleteButton);

        // Load chat when clicking the chat itself
        historyItem.addEventListener(
            'click',
            function () {

                loadChat(chat.id);
            }
        );

        historyList.appendChild(historyItem);
    });
}
// ==================================================
// DELETE SAVED CHAT
// ==================================================

function deleteChat(chatId) {

    const history = getChatHistory();

    const updatedHistory = history.filter(
        chat => chat.id !== chatId
    );

    saveChatHistory(updatedHistory);

    // If deleting the currently open chat
    if (currentChatId === chatId) {
        currentChatId = null;
    }

    displayChatHistory();
}
// ==================================================
// CLEAR ALL CHAT HISTORY
// ==================================================

const clearHistoryBtn =
    document.getElementById('clearHistoryBtn');

clearHistoryBtn.addEventListener(
    'click',
    function () {

        localStorage.removeItem(HISTORY_KEY);

        currentChatId = null;

        displayChatHistory();
    }
);
// ==================================================
// LOAD SAVED CHAT
// ==================================================

function loadChat(chatId) {

    const history = getChatHistory();

    const chat = history.find(
        item => item.id === chatId
    );

    if (!chat) {
        return;
    }

    // Stop any active generation
    if (isGenerating) {
        stopCurrentGeneration();
    }

    // Restore conversation data
    conversationHistory = chat.messages;

    // Remember which chat is currently open
    currentChatId = chat.id;

    // Clear current chatbox
    chatbox.innerHTML = '';

    // Display every saved message
    conversationHistory.forEach(message => {

        addMessage(
            message.content,
            message.role === 'user'
                ? 'user'
                : 'bot'
        );

    });

    // Close history panel
    historyPanel.classList.remove('open');

    // Focus input
    messageInput.focus();
}

// ==================================================
// CONVERSATION STATE
// ==================================================

let conversationHistory = [];
let isGenerating = false;
let currentAbortController = null;
// ==================================================
// CHAT HISTORY STORAGE
// ==================================================

const HISTORY_KEY = "aiAssistantChatHistory";

let currentChatId = null;

function getChatHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
}

function saveChatHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function saveCurrentChat() {
    if (conversationHistory.length === 0) return;

    const history = getChatHistory();

    const firstUserMessage = conversationHistory.find(
        message => message.role === "user"
    );

    if (!firstUserMessage) return;

    const title = firstUserMessage.content
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);

    const existingChat = history.find(
        chat => chat.id === currentChatId
    );

    if (existingChat) {
        existingChat.messages = conversationHistory;
        existingChat.title = title;
        existingChat.updatedAt = Date.now();
    } else {
        currentChatId = Date.now();

        history.unshift({
            id: currentChatId,
            title: title || "New conversation",
            messages: conversationHistory,
            updatedAt: Date.now()
        });
    }

    saveChatHistory(history);
}
// ==================================================
// ADD MESSAGE
// ==================================================

function addMessage(text, type) {

const messageElement = document.createElement('div');

messageElement.classList.add(
    'message',
    type === 'user'
        ? 'user-message'
        : 'bot-message'
);

// --------------------------------------------------
// BOT MESSAGE
// --------------------------------------------------

if (type === 'bot') {

    const formattedText = marked.parse(text);

    messageElement.innerHTML =
        DOMPurify.sanitize(formattedText);

    addResponseButtons(
        messageElement,
        text,
        null
    );

}

// --------------------------------------------------
// USER MESSAGE
// --------------------------------------------------

else {

    messageElement.textContent = text;

    messageElement.dataset.originalMessage =
        text;

    addEditButton(
        messageElement,
        text
    );
}

chatbox.appendChild(messageElement);

chatbox.scrollTop =
    chatbox.scrollHeight;

return messageElement;

}

// ==================================================
// EDIT BUTTON
// ==================================================

function addEditButton(
userMessageElement,
userMessage
) {

const editActions =
    document.createElement('div');

editActions.classList.add(
    'edit-actions'
);

const editButton =
    document.createElement('button');

editButton.textContent = '✏️';

editButton.classList.add(
    'edit-btn'
);

editButton.title =
    'Edit message';

editButton.addEventListener(
    'click',
    function () {

        editUserMessage(
            userMessageElement,
            userMessage
        );

    }
);

editActions.appendChild(
    editButton
);

userMessageElement.appendChild(
    editActions
);

}

// ==================================================
// EDIT USER MESSAGE
// ==================================================

function editUserMessage(
userMessageElement,
originalMessage
) {

// Stop active generation
if (isGenerating) {
    stopCurrentGeneration();
}

// Find the user message in history
let historyIndex = -1;

for (
    let i = 0;
    i < conversationHistory.length;
    i++
) {

    if (
        conversationHistory[i].role === 'user' &&
        conversationHistory[i].content === originalMessage
    ) {

        historyIndex = i;
        break;
    }
}

// Remove this message and everything after it
if (historyIndex !== -1) {

    conversationHistory =
        conversationHistory.slice(
            0,
            historyIndex
        );
}

// Remove this message and all following messages
let currentElement =
    userMessageElement;

while (currentElement) {

    const nextElement =
        currentElement.nextElementSibling;

    currentElement.remove();

    currentElement =
        nextElement;
}

// Put message back into input
messageInput.value =
    originalMessage;

messageInput.focus();

// Move cursor to end
messageInput.setSelectionRange(
    messageInput.value.length,
    messageInput.value.length
);

messageInput.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
});

}

// ==================================================
// STOP CURRENT GENERATION
// ==================================================

function stopCurrentGeneration() {

if (currentAbortController) {

    currentAbortController.abort();

    currentAbortController = null;
}

setGeneratingState(false);

showLoading(false);

}

// ==================================================
// GENERATING STATE
// ==================================================

function setGeneratingState(generating) {

isGenerating =
    generating;

if (generating) {

    sendBtn.textContent =
        '⏹';

    sendBtn.title =
        'Stop generating';

    sendBtn.classList.add(
        'stop-btn'
    );

} else {

    sendBtn.textContent =
        '➤';

    sendBtn.title =
        'Send message';

    sendBtn.classList.remove(
        'stop-btn'
    );
}

sendBtn.disabled = false;

}

// ==================================================
// TEXT TO SPEECH
// ==================================================

function speakText(text) {

// Stop current speech
window.speechSynthesis.cancel();

// Remove Markdown formatting
const cleanText = text
    .replace(/[*_#`~>\\-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const speech =
    new SpeechSynthesisUtterance(
        cleanText
    );

speech.lang =
    'en-IN';

const voices =
    window.speechSynthesis.getVoices();

const englishVoice =
    voices.find(
        voice =>
            voice.lang.toLowerCase() ===
            'en-in'
    );

if (englishVoice) {

    speech.voice =
        englishVoice;
}

speech.rate = 1;
speech.pitch = 1;

window.speechSynthesis.speak(
    speech
);

}

// ==================================================
// REGENERATE RESPONSE
// ==================================================

async function regenerateResponse(
userMessage,
botMessage
) {

if (isGenerating) {
    return;
}

showLoading(
    true,
    'AI is responding'
);

setGeneratingState(true);

currentAbortController =
    new AbortController();

try {

    // Remove old assistant response
    if (
        conversationHistory.length > 0 &&
        conversationHistory[
            conversationHistory.length - 1
        ].role === 'assistant'
    ) {

        conversationHistory.pop();
    }

    // Find the current user message
    const userIndex =
        conversationHistory.findIndex(
            item =>
                item.role === 'user' &&
                item.content === userMessage
        );

    // History BEFORE current user message
    const historyForRequest =
        userIndex !== -1
            ? conversationHistory.slice(
                0,
                userIndex
            )
            : conversationHistory;

    const response =
        await fetch(
            '/chat',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                signal:
                    currentAbortController.signal,

                body:
                    JSON.stringify({
                        message:
                            userMessage,

                        history:
                            historyForRequest
                    })
            }
        );

    // --------------------------------------------------
    // SERVER ERROR
    // --------------------------------------------------

    if (!response.ok) {

        let data = {};

        try {
            data =
                await response.json();
        }
        catch {
            data = {};
        }

        throw new Error(
            data.error ||
            'Something went wrong'
        );
    }

    // Clear old response
    botMessage.innerHTML = '';

    // --------------------------------------------------
    // CHECK RESPONSE TYPE
    // --------------------------------------------------

    const contentType =
        response.headers.get('content-type') || '';

    const isJSON =
        contentType.includes('application/json');

    // --------------------------------------------------
    // JSON RESPONSE (TEXT + IMAGE)
    // --------------------------------------------------

    if (isJSON) {

        const jsonData =
            await response.json();

        // Add text content
        if (jsonData.text) {

            botMessage.innerHTML =
                DOMPurify.sanitize(
                    marked.parse(
                        jsonData.text
                    )
                );
        }

        // Add image if available
        if (jsonData.has_image && jsonData.image_url) {

            const imageElement =
                document.createElement('img');

            imageElement.src =
                jsonData.image_url +
                '?t=' +
                Date.now();

            imageElement.alt =
                'AI generated image';

            imageElement.classList.add(
                'generated-image'
            );

            botMessage.appendChild(
                imageElement
            );
        }

        chatbox.scrollTop =
            chatbox.scrollHeight;

        // Update conversation history
        conversationHistory[
            conversationHistory.length - 1
        ] = {
            role: 'assistant',
            content: jsonData.text || ''
        };

        // Add response buttons
        addResponseButtons(
            botMessage,
            jsonData.text || '',
            userMessage
        );

        return;
    }

    // --------------------------------------------------
    // TEXT RESPONSE (STREAMING)
    // --------------------------------------------------

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder();

    let aiReply = '';

    // --------------------------------------------------
    // STREAM RESPONSE
    // --------------------------------------------------

    while (true) {

        const {
            value,
            done
        } = await reader.read();

        if (done) {
            break;
        }

        const chunk =
            decoder.decode(
                value,
                {
                    stream: true
                }
            );

        aiReply += chunk;

        // Show text immediately
        botMessage.textContent =
            aiReply;

        chatbox.scrollTop =
            chatbox.scrollHeight;
    }

    // Flush remaining bytes
    aiReply +=
        decoder.decode();

    // --------------------------------------------------
    // FINAL MARKDOWN
    // --------------------------------------------------

    botMessage.innerHTML =
        DOMPurify.sanitize(
            marked.parse(aiReply)
        );

    chatbox.scrollTop =
        chatbox.scrollHeight;

    // --------------------------------------------------
    // SAVE RESPONSE
    // --------------------------------------------------

    conversationHistory[
        conversationHistory.length - 1
    ] = {
        role: 'assistant',
        content: aiReply
    };

    // --------------------------------------------------
    // ADD RESPONSE BUTTONS
    // --------------------------------------------------

    addResponseButtons(
        botMessage,
        aiReply,
        userMessage
    );

}

catch (error) {

    if (
        error.name === 'AbortError'
    ) {
        return;
    }

    console.error(
        'Regeneration error:',
        error
    );

    botMessage.textContent =
        getFriendlyErrorMessage(
            error
        );
}

finally {

    showLoading(false);

    setGeneratingState(false);

    currentAbortController =
        null;
}

}

// ==================================================
// RESPONSE ACTION DROPDOWN
// 🔊 Read aloud | 🔄 Regenerate | 📋 Copy
// ==================================================

function addResponseButtons(
botMessage,
aiReply,
userMessage
) {

// Remove old actions
const oldActions =
    botMessage.querySelector(
        '.response-actions'
    );

if (oldActions) {
    oldActions.remove();
}

// --------------------------------------------------
// MAIN CONTAINER
// --------------------------------------------------

const responseActions =
    document.createElement('div');

responseActions.classList.add(
    'response-actions'
);

// --------------------------------------------------
// DROPDOWN WRAPPER
// --------------------------------------------------

const dropdown =
    document.createElement('div');

dropdown.classList.add(
    'response-dropdown'
);

// --------------------------------------------------
// THREE DOT BUTTON
// --------------------------------------------------

const menuButton =
    document.createElement('button');

menuButton.classList.add(
    'response-menu-btn'
);

menuButton.textContent =
    '▾';

menuButton.title =
    'Response options';

menuButton.setAttribute(
    'aria-label',
    'Response options'
);

menuButton.setAttribute(
    'aria-expanded',
    'false'
);

// --------------------------------------------------
// DROPDOWN MENU
// --------------------------------------------------

const menu =
    document.createElement('div');

menu.classList.add(
    'response-menu'
);

// --------------------------------------------------
// SPEAK
// --------------------------------------------------

const speakButton =
    document.createElement('button');

speakButton.classList.add(
    'response-menu-item'
);

speakButton.innerHTML =
    '<span>🔊</span><span>Read aloud</span>';

speakButton.title =
    'Read response aloud';

speakButton.addEventListener(
    'click',
    function (event) {

        event.stopPropagation();

        speakText(aiReply);

        closeResponseMenu(dropdown);
    }
);

// --------------------------------------------------
// REGENERATE
// --------------------------------------------------

const regenerateButton =
    document.createElement('button');

regenerateButton.classList.add(
    'response-menu-item'
);

regenerateButton.innerHTML =
    '<span>🔄</span><span>Regenerate</span>';

regenerateButton.title =
    'Regenerate response';

regenerateButton.addEventListener(
    'click',
    function (event) {

        event.stopPropagation();

        closeResponseMenu(dropdown);

        if (userMessage) {

            regenerateResponse(
                userMessage,
                botMessage
            );
        }
    }
);

// --------------------------------------------------
// COPY
// --------------------------------------------------

copyButton.addEventListener(
    'click',
    async function (event) {

        event.stopPropagation();

        try {

            if (navigator.clipboard && window.isSecureContext) {

                await navigator.clipboard.writeText(aiReply);

            } else {

                const textArea =
                    document.createElement('textarea');

                textArea.value = aiReply;

                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';

                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                document.execCommand('copy');

                textArea.remove();
            }

            // Show Copied
            copyButton.innerHTML =
                '<span>✅</span><span>Copied!</span>';

        } catch (error) {

            console.error(
                'Copy failed:',
                error
            );

            copyButton.innerHTML =
                '<span>❌</span><span>Copy failed</span>';
        }
    }
);

// Change back when cursor leaves the Copy button
copyButton.addEventListener(
    'mouseleave',
    function () {

        copyButton.innerHTML =
            '<span>📋</span><span>Copy</span>';

    }
);

// --------------------------------------------------
// ADD MENU ITEMS
// --------------------------------------------------

menu.appendChild(
    speakButton
);

menu.appendChild(
    regenerateButton
);

menu.appendChild(
    copyButton
);

// --------------------------------------------------
// ADD MENU TO DROPDOWN
// --------------------------------------------------

dropdown.appendChild(
    menuButton
);

dropdown.appendChild(
    menu
);

responseActions.appendChild(
    dropdown
);

botMessage.appendChild(
    responseActions
);

// --------------------------------------------------
// OPEN / CLOSE MENU
// --------------------------------------------------

menuButton.addEventListener(
    'click',
    function (event) {

        event.stopPropagation();

        const isOpen =
            dropdown.classList.contains(
                'open'
            );

        // Close all other menus
        document
            .querySelectorAll(
                '.response-dropdown.open'
            )
            .forEach(
                function (openDropdown) {

                    openDropdown.classList.remove(
                        'open'
                    );

                    const button =
                        openDropdown.querySelector(
                            '.response-menu-btn'
                        );

                    if (button) {

                        button.setAttribute(
                            'aria-expanded',
                            'false'
                        );
                    }
                }
            );

        // Open current menu
        if (!isOpen) {

            dropdown.classList.add(
                'open'
            );

            menuButton.setAttribute(
                'aria-expanded',
                'true'
            );
        }
    }
);

}

// ==================================================
// CLOSE RESPONSE MENU
// ==================================================

function closeResponseMenu(
dropdown
) {

if (!dropdown) {
    return;
}

dropdown.classList.remove(
    'open'
);

const button =
    dropdown.querySelector(
        '.response-menu-btn'
    );

if (button) {

    button.setAttribute(
        'aria-expanded',
        'false'
    );
}

}

// ==================================================
// LOADING
// ==================================================

function showLoading(
show,
text = 'AI is thinking'
) {

if (!loading) {
    return;
}

loading.classList.toggle(
    'hidden',
    !show
);

const loadingText =
    loading.querySelector(
        '.loading-text'
    );

if (loadingText) {

    loadingText.textContent =
        text;
}

}

// ==================================================
// IMAGE GENERATION
// ==================================================

async function generateImage(
prompt
) {

showLoading(
    true,
    'Generating image'
);

setGeneratingState(true);

currentAbortController =
    new AbortController();

try {

    const response =
        await fetch(
            '/generate-image',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                signal:
                    currentAbortController.signal,

                body:
                    JSON.stringify({
                        prompt: prompt
                    })
            }
        );

    // --------------------------------------------------
    // SERVER ERROR
    // --------------------------------------------------

    if (!response.ok) {

        let data = {};

        try {
            data =
                await response.json();
        }
        catch {
            data = {};
        }

        throw new Error(
            data.error ||
            'Image generation failed'
        );
    }

    const data =
        await response.json();

    // --------------------------------------------------
    // CREATE IMAGE MESSAGE
    // --------------------------------------------------

    const imageMessage =
        document.createElement('div');

    imageMessage.classList.add(
        'message',
        'bot-message'
    );

    const image =
        document.createElement('img');

    image.src =
        data.image_url +
        '?t=' +
        Date.now();

    image.alt =
        'AI generated image';

    image.classList.add(
        'generated-image'
    );

    imageMessage.appendChild(
        image
    );

    chatbox.appendChild(
        imageMessage
    );

    chatbox.scrollTop =
        chatbox.scrollHeight;

}

catch (error) {

    if (
        error.name === 'AbortError'
    ) {
        return;
    }

    console.error(
        'Image generation error:',
        error
    );

    addMessage(
        'Sorry, I could not generate the image. Please try again.',
        'bot'
    );
}

finally {

    showLoading(false);

    setGeneratingState(false);

    currentAbortController =
        null;
}


}

// ==================================================
// IMAGE REQUEST DETECTION
// ==================================================

function isImageRequest(
message
) {

const imageKeywords = [

    'generate an image',
    'generate image',

    'create an image',
    'create image',

    'make an image',
    'make image',

    'generate a picture',
    'generate picture',

    'create a picture',
    'create picture',

    'make a picture',
    'make picture',

    'draw an image',
    'draw a picture',
    'draw me',

    'generate a photo',
    'create a photo'
];

const lowerMessage =
    message.toLowerCase();

return imageKeywords.some(
    keyword =>
        lowerMessage.includes(
            keyword
        )
);

}

// ==================================================
// FRIENDLY ERROR MESSAGE
// ==================================================

function getFriendlyErrorMessage(
error
) {

const errorMessage =
    error.message?.toLowerCase() || '';

// --------------------------------------------------
// GEMINI QUOTA / RATE LIMIT
// --------------------------------------------------

if (
    errorMessage.includes('429') ||
    errorMessage.includes('resource_exhausted') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('rate limit')
) {

    return `

⚠️ Gemini request limit reached.

The free-tier request quota has been reached.

Please wait for the quota to reset before trying again.
`.trim();
}

// --------------------------------------------------
// NETWORK ERROR
// --------------------------------------------------

if (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('getaddrinfo') ||
    errorMessage.includes('connection')
) {

    return `


🌐 Unable to connect to the AI service.

Please check your internet connection and try again.
`.trim();
}


// --------------------------------------------------
// GENERAL ERROR
// --------------------------------------------------

return `


❌ Something went wrong.

Please try again in a moment.
`.trim();
}

// ==================================================
// SEND MESSAGE
// ==================================================

async function sendMessage() {

    // Get user's message
    const message = messageInput.value.trim();

    // Don't send empty messages
    if (!message) {
        return;
    }

    // Prevent multiple requests
    if (isGenerating) {
        return;
    }

// --------------------------------------------------
// DIRECT IMAGE REQUEST
// --------------------------------------------------

if (isImageRequest(message)) {

    addMessage(
        message,
        'user'
    );

    messageInput.value = '';

    await generateImage(message);

    return;
}


// --------------------------------------------------
// DISPLAY USER MESSAGE
// --------------------------------------------------

addMessage(
    message,
    'user'
);

// Clear input
messageInput.value = '';

// --------------------------------------------------
// SAVE USER MESSAGE
// --------------------------------------------------

conversationHistory.push({
    role: 'user',
    content: message
});



showLoading(
    true,
    'AI is thinking'
);

setGeneratingState(true);

currentAbortController =
    new AbortController();

try {
    // --------------------------------------------------
    // SEND PREVIOUS HISTORY
    // --------------------------------------------------

    const historyForRequest =
        conversationHistory.slice(
            0,
            -1
        );

    const response =
        await fetch(
            '/chat',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                signal:
                    currentAbortController.signal,

                body:
                    JSON.stringify({

                        message:
                            message,

                        history:
                            historyForRequest
                    })
            }
        );

    // --------------------------------------------------
    // SERVER ERROR
    // --------------------------------------------------

    if (!response.ok) {

        let data = {};

        try {
            data =
                await response.json();
        }
        catch {
            data = {};
        }

        throw new Error(
            data.error ||
            'Something went wrong'
        );
    }

    // --------------------------------------------------
    // CHECK RESPONSE TYPE
    // --------------------------------------------------

    const contentType =
        response.headers.get('content-type') || '';

    const isJSON =
        contentType.includes('application/json');

    // --------------------------------------------------
    // JSON RESPONSE (TEXT + IMAGE)
    // --------------------------------------------------

    if (isJSON) {

        const jsonData =
            await response.json();

        // Create bot message container
        const botMessage =
            document.createElement('div');

        botMessage.classList.add(
            'message',
            'bot-message'
        );

        // Add text content
        if (jsonData.text) {

            const textElement =
                document.createElement('div');

            textElement.innerHTML =
                DOMPurify.sanitize(
                    marked.parse(
                        jsonData.text
                    )
                );

            botMessage.appendChild(
                textElement
            );
        }

        // Add image if available
        if (jsonData.has_image && jsonData.image_url) {

            const imageElement =
                document.createElement('img');

            imageElement.src =
                jsonData.image_url +
                '?t=' +
                Date.now();

            imageElement.alt =
                'AI generated image';

            imageElement.classList.add(
                'generated-image'
            );

            botMessage.appendChild(
                imageElement
            );
        }

        chatbox.appendChild(
            botMessage
        );

        chatbox.scrollTop =
            chatbox.scrollHeight;

        // Save response
        conversationHistory.push({
            role: 'assistant',
            content: jsonData.text || ''
        });
        saveCurrentChat();

        // Add response buttons
        addResponseButtons(
            botMessage,
            jsonData.text || '',
            message
        );

        return;
    }

    // --------------------------------------------------
    // TEXT RESPONSE (STREAMING)
    // --------------------------------------------------

    // Create empty bot message
    const botMessage =
        document.createElement('div');

    botMessage.classList.add(
        'message',
        'bot-message'
    );

    chatbox.appendChild(
        botMessage
    );

    chatbox.scrollTop =
        chatbox.scrollHeight;

    // Stream response
    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder();

    let aiReply = '';
let displayPending = false;
let renderFrame = null;

    // --------------------------------------------------
    // SMOOTH RENDERING
    // --------------------------------------------------

    function updateMessage() {

        if (!displayPending) {
            return;
        }

        displayPending =
            false;

        botMessage.textContent =
            aiReply;

        chatbox.scrollTop =
            chatbox.scrollHeight;
    }

    // --------------------------------------------------
    // READ STREAM
    // --------------------------------------------------

    while (true) {

        const {
            value,
            done
        } = await reader.read();

        if (done) {
            break;
        }

        const chunk =
            decoder.decode(
                value,
                {
                    stream: true
                }
            );

        aiReply += chunk;

        if (!displayPending) {

            displayPending =
                true;

            renderFrame = requestAnimationFrame(
    updateMessage
);
        }
    }

    // --------------------------------------------------
    // FLUSH REMAINING BYTES
    // --------------------------------------------------

    aiReply +=
        decoder.decode();
// Cancel any pending animation frame
if (renderFrame) {
    cancelAnimationFrame(renderFrame);
    renderFrame = null;
}

displayPending = false;
    // --------------------------------------------------
    // FINAL MARKDOWN RENDERING
    // --------------------------------------------------

    botMessage.innerHTML =
        DOMPurify.sanitize(
            marked.parse(aiReply)
        );

    chatbox.scrollTop =
        chatbox.scrollHeight;

    // --------------------------------------------------
    // SAVE AI RESPONSE
    // --------------------------------------------------

    conversationHistory.push({
        role: 'assistant',
        content: aiReply
    });
    saveCurrentChat();

    // --------------------------------------------------
    // ADD RESPONSE BUTTONS
    // --------------------------------------------------

    addResponseButtons(
        botMessage,
        aiReply,
        message
    );

}

catch (error) {

    // --------------------------------------------------
    // IGNORE MANUALLY STOPPED REQUEST
    // --------------------------------------------------

    if (
        error.name === 'AbortError'
    ) {
        return;
    }

    console.error(
        'Chat error:',
        error
    );

    // --------------------------------------------------
    // REMOVE FAILED USER MESSAGE
    // --------------------------------------------------

    if (
        conversationHistory.length > 0 &&
        conversationHistory[
            conversationHistory.length - 1
        ].role === 'user' &&
        conversationHistory[
            conversationHistory.length - 1
        ].content === message
    ) {

        conversationHistory.pop();
    }

    addMessage(
        getFriendlyErrorMessage(
            error
        ),
        'bot'
    );
}

finally {

    showLoading(false);

    setGeneratingState(false);

    currentAbortController =
        null;
}

}

// ==================================================
// SEND / STOP BUTTON
// ==================================================

sendBtn.addEventListener(
'click',
function () {

    if (isGenerating) {

        stopCurrentGeneration();

    } else {

        sendMessage();
    }
}

);

// ==================================================
// ENTER KEY
// ==================================================

messageInput.addEventListener(
'keydown',
function (event) {

    if (event.key === 'Enter') {

        event.preventDefault();

        sendMessage();
    }
}

);

// ==================================================
// RESET CHAT UI
// ==================================================

function resetChatUI() {

chatbox.innerHTML = `

    <div class="welcome-message">

        <h2>Hello! 👋</h2>

        <p>How can I help you today?</p>

        <div class="suggestions">

            <button
                onclick="messageInput.value='Explain Python'; sendMessage()">
                💡 Explain Python
            </button>

            <button
                onclick="messageInput.value='What is Artificial Intelligence?'; sendMessage()">
                🤖 What is AI?
            </button>

            <button
                onclick="messageInput.value='Give me a study tip'; sendMessage()">
                📚 Study tip
            </button>

        </div>

    </div>
`;

}

// ==================================================
// CLEAR CHAT
// ==================================================

clearBtn.addEventListener(
'click',
async function () {

    // Stop generation
    if (isGenerating) {

        stopCurrentGeneration();
    }

    try {

        await fetch(
            '/clear',
            {
                method: 'POST'
            }
        );

    }

    catch (error) {

        console.error(
            'Error clearing conversation:',
            error
        );
    }

    conversationHistory = [];

    messageInput.value = '';

    resetChatUI();

    messageInput.focus();
}

);

// ==================================================
// NEW CHAT
// ==================================================

if (newChatBtn) {

newChatBtn.addEventListener(
    'click',
    function () {

        // Stop generation
        if (isGenerating) {

            stopCurrentGeneration();
        }

        // Clear history
        conversationHistory = [];

        // Clear input
        messageInput.value = '';

        // Reset chat
        resetChatUI();

        setGeneratingState(false);

        showLoading(false);

        messageInput.focus();
    }
);

}

// ==================================================
// THEME
// ==================================================

function applyTheme() {

const savedTheme =
    localStorage.getItem(
        'theme'
    );

if (savedTheme === 'light') {

    document.body.classList.add(
        'light-theme'
    );

    themeToggle.textContent =
        '☀️';

} else {

    document.body.classList.remove(
        'light-theme'
    );

    themeToggle.textContent =
        '🌙';
}

}

// ==================================================
// THEME TOGGLE
// ==================================================

themeToggle.addEventListener(
'click',
function () {

    document.body.classList.toggle(
        'light-theme'
    );

    if (
        document.body.classList.contains(
            'light-theme'
        )
    ) {

        localStorage.setItem(
            'theme',
            'light'
        );

        themeToggle.textContent =
            '☀️';

    } else {

        localStorage.setItem(
            'theme',
            'dark'
        );

        themeToggle.textContent =
            '🌙';
    }
}

);

// ==================================================
// APPLY SAVED THEME
// ==================================================

applyTheme();

// ==================================================
// IMAGE GENERATION BUTTON
// ==================================================

if (imageBtn) {


imageBtn.addEventListener(
    'click',
    async function () {

        if (isGenerating) {
            return;
        }

        const prompt =
            messageInput.value.trim();

        if (!prompt) {
            return;
        }

        // Display request
        addMessage(
            prompt,
            'user'
        );

        // Clear input
        messageInput.value = '';

        // Generate image
        await generateImage(
            prompt
        );
    }
);

}

// ==================================================
// CLOSE RESPONSE DROPDOWNS
// ==================================================

document.addEventListener(
'click',
function () {

    document
        .querySelectorAll(
            '.response-dropdown.open'
        )
        .forEach(
            function (dropdown) {

                closeResponseMenu(
                    dropdown
                );
            }
        );
}

);
// ==================================================
// CHAT HISTORY PANEL
// ==================================================

const historyPanel = document.getElementById('historyPanel');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');

historyBtn.addEventListener('click', () => {

    historyPanel.classList.toggle('open');

    if (historyPanel.classList.contains('open')) {
        displayChatHistory();
    }
});

closeHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.remove('open');
});