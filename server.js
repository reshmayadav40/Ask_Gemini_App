const express = require("express");
const path = require("path");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
console.log("📍 Current Dir:", __dirname);
const envPath = path.join(__dirname, ".env");

// Direct manual load as a foolproof fallback
try {
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match && match[1]) {
            process.env.GEMINI_API_KEY = match[1].trim();
            console.log("✅ Manual Load Success!");
        }
    }
} catch (err) {
    console.error("❌ Manual Load Failed:", err.message);
}

require("dotenv").config({ path: envPath, override: true });
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if (!API_KEY) {
    console.error("❌ CRITICAL ERROR: GEMINI_API_KEY is missing in .env file!");
} else {
    const obscuredKey = `${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`;
    console.log(`✅ API Key detected (${obscuredKey}). Initializing Gemini SDK (v1)...`);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: 'v1' });

app.post("/ask", async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Question cannot be empty" });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: "Server configuration error: API key missing." });
    }

    try {
        const result = await model.generateContent(question);
        const response = await result.response;
        const answer = response.text();

        if (answer) {
            res.json({ answer });
        } else {
            res.status(500).json({ error: "Gemini returned an empty response." });
        }

    } catch (error) {
        console.error("Gemini SDK Error:", error.message);
        
        let errorMessage = "Failed to get answer from Gemini AI";
        
        // Specific handling for common errors
        if (error.message.includes("API key expired")) {
            errorMessage = "The API key provided has expired. Please check your Google AI Studio account.";
        } else if (error.message.includes("API_KEY_INVALID")) {
            errorMessage = "The API key is invalid. Please double-check the .env file.";
        } else if (error.message.includes("429")) {
            errorMessage = "Quota exceeded. Please try again later.";
        } else {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
});

// Catch-all route to serve the frontend for any other request
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Model: ${MODEL_NAME}`);
});