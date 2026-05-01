const submitBtn = document.getElementById("submitBtn");
const questionInput = document.getElementById("questionInput");
const chatWindow = document.getElementById("chatWindow");
const welcomeScreen = document.getElementById("welcomeScreen");
const themeToggle = document.getElementById("themeToggle");
const newChatBtn = document.getElementById("newChatBtn");

// Configure Marked.js
marked.setOptions({
    highlight: function(code, lang) {
        if (Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        }
        return code;
    },
    breaks: true,
    gfm: true
});

// Theme Logic
let isDark = true; // Default to Night Mode
themeToggle.addEventListener("click", () => {
    isDark = !isDark;
    document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    themeToggle.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    lucide.createIcons();
});

// Auto-expand textarea
questionInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
});

// Helper: Append Message
function appendMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;
    
    const icon = role === "user" ? "user" : "bot";
    const bgIcon = role === "user" ? "sparkle" : "bot";

    messageDiv.innerHTML = `
        <div class="icon"><i data-lucide="${icon}"></i></div>
        <div class="message-content">${role === 'ai' ? marked.parse(content) : content}</div>
    `;
    
    chatWindow.appendChild(messageDiv);
    lucide.createIcons();
    
    // Trigger Prism highlighting for AI responses
    if (role === 'ai') {
        Prism.highlightAllUnder(messageDiv);
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Hide welcome screen if messages exist
    if (chatWindow.children.length > 0) {
        welcomeScreen.style.display = "none";
    }
}

// Submit Logic
async function handleSubmit() {
    const question = questionInput.value.trim();
    if (!question) return;

    // Reset input
    questionInput.value = "";
    questionInput.style.height = "auto";
    submitBtn.disabled = true;

    // Show user message
    appendMessage("user", question);

    // Show AI thinking state
    const thinkingId = "thinking-" + Date.now();
    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = "message ai";
    thinkingDiv.id = thinkingId;
    thinkingDiv.innerHTML = `
        <div class="icon"><i data-lucide="bot"></i></div>
        <div class="message-content">Thinking... <span class="loader"></span></div>
    `;
    chatWindow.appendChild(thinkingDiv);
    lucide.createIcons();
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const res = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
        });

        const data = await res.json();
        
        // Remove thinking message and replace with actual answer
        document.getElementById(thinkingId).remove();
        
        if (data.answer) {
            appendMessage("ai", data.answer);
        } else {
            appendMessage("ai", `**Error:** ${data.error || "Something went wrong."}`);
        }

    } catch (err) {
        console.error(err);
        document.getElementById(thinkingId).remove();
        appendMessage("ai", "**Error:** Failed to connect to server. Please check your connection.");
    } finally {
        submitBtn.disabled = false;
    }
}

submitBtn.addEventListener("click", handleSubmit);

questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
});

newChatBtn.addEventListener("click", () => {
    chatWindow.innerHTML = "";
    welcomeScreen.style.display = "block";
});

// Add CSS for Loader
const style = document.createElement('style');
style.textContent = `
    .loader {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid var(--text-secondary);
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
        margin-left: 8px;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
