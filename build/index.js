#!/usr/bin/env node
/**
 * Wanderlog MCP Server
 * Exposes travel-planning tools to Bob via the Model Context Protocol.
 * All tool logic lives in tools.ts — this file wires them into McpServer.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { toolGetWeather, toolSearchDestinations, toolBuildItinerary, toolCompareTransport, toolCompareAccommodation, toolEstimateBudget, toolGetVisaInfo, toolGetLocalTips, toolConvertCurrency, toolCheckTravelAlerts, } from "./tools.js";
const server = new McpServer({ name: "wanderlog-agent", version: "1.0.0" });
const ok = (text) => ({ content: [{ type: "text", text }] });
const err = (text) => ({ content: [{ type: "text", text }], isError: true });
// get_weather
server.registerTool("get_weather", {
    description: "Get current weather conditions and a 5-day forecast for any city.",
    inputSchema: z.object({
        city: z.string().describe("City name (e.g. 'Tokyo', 'Paris', 'New York')"),
    }),
}, async ({ city }) => {
    try {
        return ok(await toolGetWeather(city));
    }
    catch (e) {
        return err(`Weather lookup failed: ${e instanceof Error ? e.message : String(e)}`);
    }
});
// search_destinations
server.registerTool("search_destinations", {
    description: "Suggest travel destinations matching travel style, budget tier, month, and trip duration.",
    inputSchema: z.object({
        travel_style: z.string().describe("Travel style keywords, comma-separated (e.g. 'adventure, culture, food')"),
        budget_tier: z.enum(["budget", "mid-range", "premium"]),
        month: z.number().int().min(1).max(12).describe("Month of travel (1=Jan … 12=Dec)"),
        trip_duration_days: z.number().int().min(1),
        group_size: z.number().int().min(1),
    }),
}, async ({ travel_style, budget_tier, month, trip_duration_days, group_size }) => {
    try {
        return ok(toolSearchDestinations(travel_style, budget_tier, month, trip_duration_days, group_size));
    }
    catch (e) {
        return err(`Destination search failed: ${e instanceof Error ? e.message : String(e)}`);
    }
});
// build_itinerary
server.registerTool("build_itinerary", {
    description: "Generate a structured day-by-day itinerary with time blocks, activities, and alternatives.",
    inputSchema: z.object({
        destination: z.string(),
        duration_days: z.number().int().min(1).max(21),
        travel_style: z.string(),
        start_date: z.string().optional().describe("YYYY-MM-DD"),
    }),
}, async ({ destination, duration_days, travel_style, start_date }) => {
    try {
        return ok(toolBuildItinerary(destination, duration_days, travel_style, start_date));
    }
    catch (e) {
        return err(`Itinerary generation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
});
// compare_transport
server.registerTool("compare_transport", {
    description: "Compare transport options (flight, train, bus, car) between two cities with cost ranges and booking links.",
    inputSchema: z.object({
        origin: z.string(),
        destination: z.string(),
        travel_date: z.string().optional(),
        group_size: z.number().int().min(1),
    }),
}, async ({ origin, destination, travel_date, group_size }) => {
    return ok(toolCompareTransport(origin, destination, group_size, travel_date));
});
// compare_accommodation
server.registerTool("compare_accommodation", {
    description: "Compare accommodation tiers (budget/mid-range/premium) for a destination with cost estimates.",
    inputSchema: z.object({
        destination: z.string(),
        duration_nights: z.number().int().min(1),
        group_size: z.number().int().min(1),
        travel_style: z.enum(["budget", "mid-range", "premium"]),
    }),
}, async ({ destination, duration_nights, group_size, travel_style }) => {
    return ok(toolCompareAccommodation(destination, duration_nights, group_size, travel_style));
});
// estimate_budget
server.registerTool("estimate_budget", {
    description: "Produce a categorised budget estimate (flights, accommodation, food, activities, etc.).",
    inputSchema: z.object({
        destination: z.string(),
        origin: z.string(),
        duration_days: z.number().int().min(1),
        group_size: z.number().int().min(1),
        budget_tier: z.enum(["budget", "mid-range", "premium"]),
    }),
}, async ({ destination, origin, duration_days, group_size, budget_tier }) => {
    return ok(toolEstimateBudget(destination, origin, duration_days, group_size, budget_tier));
});
// get_visa_info
server.registerTool("get_visa_info", {
    description: "Return visa requirement guidance and official verification resources.",
    inputSchema: z.object({
        destination: z.string(),
        passport_nationality: z.string(),
    }),
}, async ({ destination, passport_nationality }) => {
    return ok(toolGetVisaInfo(destination, passport_nationality));
});
// get_local_tips
server.registerTool("get_local_tips", {
    description: "Return practical local tips: currency, language, customs, safety, and recommended apps.",
    inputSchema: z.object({
        destination: z.string(),
    }),
}, async ({ destination }) => {
    return ok(toolGetLocalTips(destination));
});
// convert_currency
server.registerTool("convert_currency", {
    description: "Convert an amount between two currencies using live exchange rates.",
    inputSchema: z.object({
        amount: z.number().positive(),
        from_currency: z.string().length(3).describe("Source currency code (e.g. 'USD')"),
        to_currency: z.string().length(3).describe("Target currency code (e.g. 'THB')"),
    }),
}, async ({ amount, from_currency, to_currency }) => {
    try {
        return ok(await toolConvertCurrency(amount, from_currency, to_currency));
    }
    catch (e) {
        return err(`Currency conversion failed: ${e instanceof Error ? e.message : String(e)}`);
    }
});
// check_travel_alerts
server.registerTool("check_travel_alerts", {
    description: "Return travel safety advisories, risk categories, and official government advisory links.",
    inputSchema: z.object({
        destination: z.string(),
        nationality: z.string(),
    }),
}, async ({ destination, nationality }) => {
    return ok(toolCheckTravelAlerts(destination, nationality));
});
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Wanderlog MCP server v1.0.0 running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in Wanderlog MCP server:", error);
    process.exit(1);
});
