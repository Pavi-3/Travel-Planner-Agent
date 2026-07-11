# ✈️ Wanderlog — AI Travel Planner

An AI-powered travel planning web application backed by **IBM Watsonx.ai** with the **Granite** model.

## Features

| Capability | Details |
|---|---|
| 🤖 AI Chat | Full conversation with Granite 3.3 · multi-turn context · streaming responses |
| 🗺️ Destination Search | Score-ranked suggestions by style, budget, season, group size |
| 📅 Itinerary Builder | Day-by-day time-blocked plans with alternatives |
| 🚌 Transport Comparison | Flights · trains · buses · car rental with booking links |
| 🏨 Accommodation Tiers | Budget / mid-range / premium with cost estimates |
| 💰 Budget Estimator | Category breakdown (flights, hotel, food, activities, transport) |
| 🛂 Visa Guidance | Requirement notes + official verification sources |
| 💡 Local Tips | Currency, language, customs, safety, recommended apps |
| 💱 Currency Converter | Live rates via Open Exchange Rates (no key) |
| 🚨 Travel Alerts | Safety advisories and government portal links |
| 🌤️ Live Weather | Current + 5-day forecast via Open-Meteo (no key) |

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **IBM Cloud account** — [cloud.ibm.com](https://cloud.ibm.com)
- **IBM Watsonx.ai project** — [watsonx.ai](https://dataplatform.cloud.ibm.com)

---

## Setup

### 1. Get your IBM Cloud credentials

1. Go to [cloud.ibm.com](https://cloud.ibm.com) → **Manage → Access (IAM) → API keys**
2. Click **Create an IBM Cloud API key** → copy the key
3. Go to [watsonx.ai](https://dataplatform.cloud.ibm.com) → open your project → **Manage → General**
4. Copy your **Project ID**

### 2. Configure environment

```bash
# Copy the template
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
IBM_CLOUD_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://au-syd.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct
PORT=3000
```

**Available regions:**
| Region | URL |
|---|---|
| AU Sydney (default) | `https://au-syd.ml.cloud.ibm.com` |
| US South | `https://us-south.ml.cloud.ibm.com` |
| EU Germany | `https://eu-de.ml.cloud.ibm.com` |
| EU UK | `https://eu-gb.ml.cloud.ibm.com` |
| Japan | `https://jp-tok.ml.cloud.ibm.com` |

### 3. Install & build

```bash
npm install
npm run build
```

### 4. Start the server

```bash
npm start
```

Open your browser at **http://localhost:3000**

---

## Project Structure

```
wanderlog-agent/
├── src/
│   ├── index.ts     # MCP server (Bob integration)
│   ├── server.ts    # Express web server + Watsonx.ai API
│   └── tools.ts     # All 10 travel tool implementations
├── public/
│   └── index.html   # Single-file web application
├── .env.example     # Environment template
├── package.json
└── tsconfig.json
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Web application |
| `POST` | `/api/chat` | AI chat (Watsonx Granite) |
| `POST` | `/api/tool` | Direct tool execution |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/destinations` | List all known destinations |

### POST /api/chat

```json
{
  "message": "Plan a 7-day trip to Bali for 2 people in July",
  "sessionId": "optional-session-id"
}
```

Response:
```json
{
  "reply": "## 🗺️ Bali Trip Plan...",
  "toolsUsed": ["get_weather"]
}
```

### POST /api/tool

```json
{
  "tool": "estimate_budget",
  "params": {
    "destination": "Tokyo",
    "origin": "London",
    "duration_days": 10,
    "group_size": 2,
    "budget_tier": "mid-range"
  }
}
```

---

## Available Tools

| Tool | Description |
|---|---|
| `get_weather` | Live weather + 5-day forecast |
| `search_destinations` | Find destinations by style/season/budget |
| `build_itinerary` | Day-by-day itinerary with time blocks |
| `compare_transport` | Flight/train/bus/car comparison |
| `compare_accommodation` | Hotel tiers with cost estimates |
| `estimate_budget` | Full trip budget breakdown |
| `get_visa_info` | Visa requirements + official links |
| `get_local_tips` | Currency, language, safety, apps |
| `convert_currency` | Live currency conversion |
| `check_travel_alerts` | Safety advisories + government links |

---

## Granite Model Chat Format

The server uses Granite's native chat prompt format:

```
<|start_of_role|>system<|end_of_role|>{system prompt}<|end_of_text|>
<|start_of_role|>user<|end_of_role|>{user message}<|end_of_text|>
<|start_of_role|>assistant<|end_of_role|>
```

Conversation history (last 20 messages) is maintained per session for multi-turn context.

---

## Security

- API key is loaded from `.env` via `dotenv` — never hardcoded
- `.env` is in `.gitignore` — never committed
- IAM tokens are cached and refreshed automatically (60-second buffer before expiry)
- No user data is stored permanently — sessions are in-memory only

---

*Made with IBM Watsonx.ai · Granite 3.3 · Express · TypeScript*
