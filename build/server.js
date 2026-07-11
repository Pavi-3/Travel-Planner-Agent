#!/usr/bin/env node
/**
 * Wanderlog — Express Web Server
 * Serves the frontend and exposes an AI chat API backed by IBM Watsonx.ai Granite.
 *
 * Routes:
 *   GET  /             → serves public/index.html
 *   POST /api/chat     → Watsonx Granite-powered travel assistant
 *   POST /api/tool     → direct structured tool calls (weather, budget, etc.)
 *   GET  /api/health   → health check
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { toolGetWeather, toolSearchDestinations, toolBuildItinerary, toolCompareTransport, toolCompareAccommodation, toolEstimateBudget, toolGetVisaInfo, toolGetLocalTips, toolConvertCurrency, toolCheckTravelAlerts, DESTINATION_DB, } from "./tools.js";
// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const IBM_CLOUD_API_KEY = process.env.IBM_CLOUD_API_KEY;
const WATSONX_PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const WATSONX_URL = process.env.WATSONX_URL ?? "https://au-syd.ml.cloud.ibm.com";
const PORT = parseInt(process.env.PORT ?? "3000", 10);
// Model ID is resolved at startup (auto-discovered if not set in .env)
const MODEL_ID_FROM_ENV = process.env.WATSONX_MODEL_ID?.trim();
let WATSONX_MODEL_ID = MODEL_ID_FROM_ENV || "";
if (!IBM_CLOUD_API_KEY || !WATSONX_PROJECT_ID) {
    console.error("❌  Missing required environment variables.\n" +
        "    Please set IBM_CLOUD_API_KEY and WATSONX_PROJECT_ID in your .env file.\n" +
        "    Copy .env.example to .env and fill in your IBM Cloud credentials.");
    process.exit(1);
}
let cachedToken = null;
async function getIAMToken() {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 60_000)
        return cachedToken.token;
    const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(IBM_CLOUD_API_KEY)}`,
    });
    if (!res.ok)
        throw new Error(`IAM authentication failed: ${res.status} ${res.statusText}`);
    const data = (await res.json());
    cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
    return cachedToken.token;
}
// ---------------------------------------------------------------------------
// Model auto-discovery — find best available Granite instruct model in region
// ---------------------------------------------------------------------------
// Preference order: newer / larger instruct models first
const GRANITE_PREFERENCE = [
    "ibm/granite-3-3-8b-instruct",
    "ibm/granite-3-8b-instruct",
    "ibm/granite-3-2b-instruct",
    "ibm/granite-3.3-8b-instruct",
    "ibm/granite-3.0-8b-instruct",
    "ibm/granite-3.2-2b-instruct",
    "ibm/granite-4-h-small",
    "ibm/granite-13b-instruct-v2",
    "ibm/granite-13b-chat-v2",
    "ibm/granite-7b-lab",
];
async function discoverModel() {
    if (MODEL_ID_FROM_ENV) {
        console.log(`   Model (from .env): ${MODEL_ID_FROM_ENV}`);
        return MODEL_ID_FROM_ENV;
    }
    console.log("   WATSONX_MODEL_ID not set — auto-discovering available Granite models...");
    try {
        const token = await getIAMToken();
        const res = await fetch(`${WATSONX_URL}/ml/v1/foundation_model_specs?version=2024-05-31&limit=200`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = (await res.json());
        const available = new Set(data.resources.map((m) => m.model_id));
        console.log(`   Available models in region (${data.resources.length} total). Granite matches:`);
        data.resources
            .filter((m) => m.model_id.includes("granite"))
            .forEach((m) => console.log(`     • ${m.model_id}`));
        for (const preferred of GRANITE_PREFERENCE) {
            if (available.has(preferred)) {
                console.log(`   ✅ Auto-selected model: ${preferred}`);
                return preferred;
            }
        }
        // Fallback: any granite instruct model in the region
        const anyGranite = data.resources.find((m) => m.model_id.includes("granite") && m.model_id.includes("instruct"));
        if (anyGranite) {
            console.log(`   ✅ Auto-selected model (fallback): ${anyGranite.model_id}`);
            return anyGranite.model_id;
        }
        throw new Error("No Granite instruct model found in region.");
    }
    catch (e) {
        console.error(`   ⚠️  Model discovery failed: ${e instanceof Error ? e.message : e}`);
        console.error("   Falling back to ibm/granite-13b-instruct-v2 — set WATSONX_MODEL_ID in .env to override.");
        return "ibm/granite-13b-instruct-v2";
    }
}
// ---------------------------------------------------------------------------
// Wanderlog system prompt
// ---------------------------------------------------------------------------
const WANDERLOG_SYSTEM_PROMPT = `You are **Wanderlog**, an AI-powered travel planning assistant built by IBM Watsonx.ai using the Granite model. You operate as a professional, friendly, and detail-oriented travel consultant.

## Your Core Capabilities
1. **Understand preferences**: destinations, travel style (budget, luxury, family, solo, adventure), dates, group size, budget, and constraints (visa, health, time, mobility).
2. **Suggest destinations**: based on preferences, season, weather, costs, and safety.
3. **Build itineraries**: day-by-day plans with time blocks, activities, travel times, and alternatives.
4. **Transport recommendations**: flights, trains, buses, car rentals — compare costs, durations, convenience.
5. **Accommodation recommendations**: hotels, hostels, apartments, resorts — compare prices, locations, amenities.
6. **Budget estimates**: detailed breakdowns by category (flights, hotel, food, activities, transport, misc).
7. **Visa & travel documents**: guidance on requirements, official sources, checklist.
8. **Local tips**: currency, language, customs, safety, useful apps.
9. **Travel alerts**: safety advisories and official government sources.

## Behavioral Rules
- Ask clarifying questions if input is incomplete (missing dates, budget, group size).
- Provide options in tiers: budget / mid-range / premium with pros and cons.
- Be honest about uncertainty — if you lack real-time data, say so and provide verification links.
- Never make false promises about bookings, prices, or availability.
- Keep responses concise but complete.

## Output Format
- Use clear headings: "Suggested Destinations", "Sample Itinerary", "Transport Options", "Accommodation Options", "Budget Estimate", "Next Steps".
- Use markdown tables and bullet points for comparisons.
- Always end with a **Next Steps** section.
- For itineraries: include Day number, time blocks (09:00–11:00), activity, travel time, and alternatives.

## Available Destinations in Database
${Object.keys(DESTINATION_DB).join(", ")}

## Current Date
${new Date().toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Respond in well-formatted markdown. Be warm, professional, and practical.`;
async function runAutoTools(message) {
    const results = [];
    const lower = message.toLowerCase();
    // Weather
    const weatherMatch = lower.match(/weather\s+(?:in\s+)?([a-z\s]+?)(?:\?|$|,|\.|today|forecast)/i);
    if (weatherMatch) {
        const city = weatherMatch[1].trim();
        try {
            const content = await toolGetWeather(city);
            results.push({ toolName: "get_weather", content });
        }
        catch { /* skip if geocode fails */ }
    }
    // Currency conversion
    const currencyMatch = message.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s+(?:to|in|into)\s+([A-Z]{3})/i);
    if (currencyMatch) {
        try {
            const content = await toolConvertCurrency(parseFloat(currencyMatch[1]), currencyMatch[2], currencyMatch[3]);
            results.push({ toolName: "convert_currency", content });
        }
        catch { /* skip */ }
    }
    return results;
}
const sessions = new Map();
function buildConversationPrompt(history, newUserMessage) {
    let prompt = "";
    for (const msg of history.slice(-8)) { // last 8 turns for context
        if (msg.role === "user") {
            prompt += `<|start_of_role|>user<|end_of_role|>${msg.content}<|end_of_text|>\n`;
        }
        else {
            prompt += `<|start_of_role|>assistant<|end_of_role|>${msg.content}<|end_of_text|>\n`;
        }
    }
    prompt += `<|start_of_role|>user<|end_of_role|>${newUserMessage}<|end_of_text|>\n`;
    prompt += `<|start_of_role|>assistant<|end_of_role|>`;
    return prompt;
}
async function generateWithHistory(sessionId, userMessage) {
    const history = sessions.get(sessionId) ?? [];
    const token = await getIAMToken();
    const fullPrompt = `<|start_of_role|>system<|end_of_role|>${WANDERLOG_SYSTEM_PROMPT}<|end_of_text|>\n` +
        buildConversationPrompt(history, userMessage);
    const body = {
        model_id: WATSONX_MODEL_ID,
        project_id: WATSONX_PROJECT_ID,
        input: fullPrompt,
        parameters: {
            decoding_method: "greedy",
            max_new_tokens: 2048,
            min_new_tokens: 1,
            stop_sequences: ["<|end_of_text|>", "<|start_of_role|>"],
            repetition_penalty: 1.05,
        },
    };
    const res = await fetch(`${WATSONX_URL}/ml/v1/text/generation?version=2024-05-31`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Watsonx API error ${res.status}: ${errText}`);
    }
    const data = (await res.json());
    const reply = data.results?.[0]?.generated_text?.trim() ?? "I'm sorry, I couldn't generate a response. Please try again.";
    // Save to history
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: reply });
    sessions.set(sessionId, history.slice(-20)); // keep last 20 messages
    return reply;
}
// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public");
// Serve frontend
app.use(express.static(PUBLIC_DIR));
app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
// ---------------------------------------------------------------------------
// POST /api/chat — main AI chat endpoint
// ---------------------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
    try {
        const { message, sessionId = "default" } = req.body;
        if (!message || typeof message !== "string") {
            res.status(400).json({ error: "message is required" });
            return;
        }
        // Run structured tools for real-time data (weather, currency)
        const toolResults = await runAutoTools(message);
        // Build augmented message with tool data injected
        let augmentedMessage = message;
        if (toolResults.length > 0) {
            const toolContext = toolResults.map((t) => `[Live data from ${t.toolName}]:\n${t.content}`).join("\n\n");
            augmentedMessage = `${message}\n\n---\n**Live data retrieved for your query:**\n${toolContext}\n---\nPlease use the above live data in your response.`;
        }
        const reply = await generateWithHistory(sessionId, augmentedMessage);
        res.json({ reply, toolsUsed: toolResults.map((t) => t.toolName) });
    }
    catch (e) {
        console.error("Chat error:", e);
        res.status(500).json({ error: e instanceof Error ? e.message : "Internal server error" });
    }
});
// ---------------------------------------------------------------------------
// POST /api/tool — direct structured tool endpoint
// ---------------------------------------------------------------------------
app.post("/api/tool", async (req, res) => {
    try {
        const { tool, params } = req.body;
        let result = "";
        switch (tool) {
            case "get_weather":
                result = await toolGetWeather(params.city);
                break;
            case "search_destinations":
                result = toolSearchDestinations(params.travel_style, params.budget_tier, params.month, params.trip_duration_days, params.group_size);
                break;
            case "build_itinerary":
                result = toolBuildItinerary(params.destination, params.duration_days, params.travel_style, params.start_date);
                break;
            case "compare_transport":
                result = toolCompareTransport(params.origin, params.destination, params.group_size, params.travel_date);
                break;
            case "compare_accommodation":
                result = toolCompareAccommodation(params.destination, params.duration_nights, params.group_size, params.travel_style);
                break;
            case "estimate_budget":
                result = toolEstimateBudget(params.destination, params.origin, params.duration_days, params.group_size, params.budget_tier);
                break;
            case "get_visa_info":
                result = toolGetVisaInfo(params.destination, params.passport_nationality);
                break;
            case "get_local_tips":
                result = toolGetLocalTips(params.destination);
                break;
            case "convert_currency":
                result = await toolConvertCurrency(params.amount, params.from_currency, params.to_currency);
                break;
            case "check_travel_alerts":
                result = toolCheckTravelAlerts(params.destination, params.nationality);
                break;
            default:
                res.status(400).json({ error: `Unknown tool: ${tool}` });
                return;
        }
        res.json({ result });
    }
    catch (e) {
        console.error("Tool error:", e);
        res.status(500).json({ error: e instanceof Error ? e.message : "Tool execution failed" });
    }
});
// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "Wanderlog Travel Planner",
        model: WATSONX_MODEL_ID,
        region: WATSONX_URL,
        destinations: Object.keys(DESTINATION_DB).length,
        timestamp: new Date().toISOString(),
    });
});
// ---------------------------------------------------------------------------
// GET /api/models — list available Granite models in the configured region
// ---------------------------------------------------------------------------
app.get("/api/models", async (_req, res) => {
    try {
        const token = await getIAMToken();
        const r = await fetch(`${WATSONX_URL}/ml/v1/foundation_model_specs?version=2024-05-31&limit=200`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        const data = (await r.json());
        const granite = data.resources
            .filter((m) => m.model_id.includes("granite"))
            .map((m) => m.model_id)
            .sort();
        res.json({ region: WATSONX_URL, active_model: WATSONX_MODEL_ID, granite_models: granite });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
});
// ---------------------------------------------------------------------------
// GET /api/destinations — list all known destinations
// ---------------------------------------------------------------------------
app.get("/api/destinations", (_req, res) => {
    const list = Object.entries(DESTINATION_DB).map(([name, d]) => ({
        name,
        styles: d.style,
        best_months: d.best_months,
        budget_tiers: d.budget_tier,
        currency: d.currency,
        highlights: d.highlights.slice(0, 3),
    }));
    res.json(list);
});
// ---------------------------------------------------------------------------
// Start — resolve model ID before accepting requests
// ---------------------------------------------------------------------------
async function start() {
    WATSONX_MODEL_ID = await discoverModel();
    app.listen(PORT, () => {
        console.log(`\n✈️  Wanderlog Travel Planner is running!`);
        console.log(`   → Web app:  http://localhost:${PORT}`);
        console.log(`   → Health:   http://localhost:${PORT}/api/health`);
        console.log(`   → Models:   http://localhost:${PORT}/api/models`);
        console.log(`   → Model:    ${WATSONX_MODEL_ID}`);
        console.log(`   → Region:   ${WATSONX_URL}\n`);
    });
}
start().catch((e) => { console.error("Fatal startup error:", e); process.exit(1); });
export default app;
