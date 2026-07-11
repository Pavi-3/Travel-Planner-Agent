/**
 * Wanderlog Travel Tools
 * All structured travel-planning tool implementations.
 * Exported for use by both the MCP server (index.ts) and the Express web server (server.ts).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

export function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function err(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

// ---------------------------------------------------------------------------
// Geocoding (Open-Meteo, no key)
// ---------------------------------------------------------------------------

export interface GeoResult {
  id: number;
  name: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export async function geocode(city: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const data = await fetchJson<{ results?: GeoResult[] }>(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not geocode "${city}". Try a more specific name.`);
  }
  return data.results[0];
}

// WMO weather code descriptions
export const WMO_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Heavy thunderstorm with hail",
};

// ---------------------------------------------------------------------------
// Destination knowledge base
// ---------------------------------------------------------------------------

export const DESTINATION_DB: Record<string, {
  style: string[];
  budget_tier: string[];
  best_months: number[];
  highlights: string[];
  avg_daily_budget_usd: Record<string, number>;
  visa_note: string;
  currency: string;
  language: string;
  safety: string;
  time_zone: string;
}> = {
  "Bangkok": {
    style: ["budget", "adventure", "culture", "food", "solo"],
    budget_tier: ["budget", "mid-range"],
    best_months: [11, 12, 1, 2, 3],
    highlights: ["Grand Palace", "Chatuchak Market", "Wat Pho", "Khao San Road", "street food scene"],
    avg_daily_budget_usd: { budget: 35, mid_range: 80, premium: 200 },
    visa_note: "Visa-on-arrival or e-visa available for most nationalities. Verify at thaiembassy.com.",
    currency: "Thai Baht (THB)",
    language: "Thai (English widely spoken in tourist areas)",
    safety: "Generally safe; watch for tourist scams, particularly tuk-tuk and gem shop scams.",
    time_zone: "ICT (UTC+7)",
  },
  "Paris": {
    style: ["luxury", "romance", "culture", "family", "solo"],
    budget_tier: ["mid-range", "premium"],
    best_months: [4, 5, 6, 9, 10],
    highlights: ["Eiffel Tower", "Louvre Museum", "Montmartre", "Seine River cruise", "Palace of Versailles"],
    avg_daily_budget_usd: { budget: 100, mid_range: 200, premium: 500 },
    visa_note: "EU Schengen visa required for non-EU nationals. Check france-visas.gouv.fr.",
    currency: "Euro (EUR)",
    language: "French (English spoken in most tourist areas)",
    safety: "Generally safe; be aware of pickpockets around major tourist sites.",
    time_zone: "CET (UTC+1), CEST (UTC+2) in summer",
  },
  "Bali": {
    style: ["adventure", "wellness", "romance", "culture", "budget", "family"],
    budget_tier: ["budget", "mid-range", "premium"],
    best_months: [4, 5, 6, 7, 8, 9],
    highlights: ["Ubud rice terraces", "Tanah Lot temple", "Seminyak beach", "Mount Batur sunrise trek", "Uluwatu cliffs"],
    avg_daily_budget_usd: { budget: 40, mid_range: 90, premium: 250 },
    visa_note: "Visa on arrival (30 days, extendable) or Bali Tourism Levy applies. Check imigrasi.go.id.",
    currency: "Indonesian Rupiah (IDR)",
    language: "Balinese / Indonesian (English widely spoken in tourist areas)",
    safety: "Safe for tourists; respect temple dress codes, watch for strong ocean currents.",
    time_zone: "WITA (UTC+8)",
  },
  "Tokyo": {
    style: ["culture", "food", "technology", "family", "luxury", "solo"],
    budget_tier: ["mid-range", "premium"],
    best_months: [3, 4, 10, 11],
    highlights: ["Shibuya crossing", "Senso-ji temple", "Tsukiji outer market", "teamLab Planets", "Mount Fuji day trip"],
    avg_daily_budget_usd: { budget: 70, mid_range: 150, premium: 400 },
    visa_note: "Visa-free for many nationalities (90 days). Check mofa.go.jp for your passport.",
    currency: "Japanese Yen (JPY)",
    language: "Japanese (English signage common in Tokyo; translation apps recommended)",
    safety: "One of the safest cities in the world. Low crime rate.",
    time_zone: "JST (UTC+9)",
  },
  "Barcelona": {
    style: ["culture", "beach", "food", "adventure", "romance", "family"],
    budget_tier: ["mid-range", "premium"],
    best_months: [4, 5, 6, 9, 10],
    highlights: ["Sagrada Familia", "Park Guell", "Las Ramblas", "Gothic Quarter", "Barceloneta beach"],
    avg_daily_budget_usd: { budget: 80, mid_range: 160, premium: 400 },
    visa_note: "EU Schengen visa required for non-EU nationals. Check exteriores.gob.es.",
    currency: "Euro (EUR)",
    language: "Spanish / Catalan (English widely spoken)",
    safety: "Generally safe; pickpocketing is common on Las Ramblas and public transport.",
    time_zone: "CET (UTC+1), CEST (UTC+2) in summer",
  },
  "New York": {
    style: ["culture", "food", "luxury", "solo", "family"],
    budget_tier: ["mid-range", "premium"],
    best_months: [4, 5, 6, 9, 10],
    highlights: ["Central Park", "Times Square", "Metropolitan Museum of Art", "Brooklyn Bridge", "High Line"],
    avg_daily_budget_usd: { budget: 120, mid_range: 250, premium: 600 },
    visa_note: "ESTA required for Visa Waiver Program countries. US visa required otherwise. Check travel.state.gov.",
    currency: "US Dollar (USD)",
    language: "English",
    safety: "Generally safe in tourist areas; stay aware in less-frequented neighbourhoods at night.",
    time_zone: "EST (UTC-5), EDT (UTC-4) in summer",
  },
  "Cape Town": {
    style: ["adventure", "nature", "culture", "family", "romance"],
    budget_tier: ["budget", "mid-range", "premium"],
    best_months: [10, 11, 12, 1, 2, 3, 4],
    highlights: ["Table Mountain", "Cape of Good Hope", "Boulders Beach penguins", "V&A Waterfront", "Cape Winelands"],
    avg_daily_budget_usd: { budget: 50, mid_range: 120, premium: 300 },
    visa_note: "Visa-free for many nationalities (30-90 days). Check dha.gov.za.",
    currency: "South African Rand (ZAR)",
    language: "English, Afrikaans, Xhosa (English dominant in tourist areas)",
    safety: "Take precautions; avoid isolated areas after dark; use registered taxis or ride-hailing apps.",
    time_zone: "SAST (UTC+2)",
  },
  "Kyoto": {
    style: ["culture", "nature", "romance", "solo", "food"],
    budget_tier: ["mid-range", "premium"],
    best_months: [3, 4, 10, 11],
    highlights: ["Fushimi Inari Taisha", "Arashiyama bamboo grove", "Kinkaku-ji (Golden Pavilion)", "Geisha district Gion", "Nishiki Market"],
    avg_daily_budget_usd: { budget: 65, mid_range: 140, premium: 380 },
    visa_note: "Visa-free for many nationalities (90 days). Check mofa.go.jp.",
    currency: "Japanese Yen (JPY)",
    language: "Japanese (less English than Tokyo; translation apps recommended)",
    safety: "Extremely safe; low crime.",
    time_zone: "JST (UTC+9)",
  },
  "Santorini": {
    style: ["romance", "luxury", "beach", "culture"],
    budget_tier: ["mid-range", "premium"],
    best_months: [4, 5, 6, 9, 10],
    highlights: ["Oia sunset", "caldera views", "Amoudi Bay seafood", "Akrotiri ruins", "black sand beaches"],
    avg_daily_budget_usd: { budget: 100, mid_range: 220, premium: 600 },
    visa_note: "EU Schengen visa for non-EU nationals. Check mfa.gr.",
    currency: "Euro (EUR)",
    language: "Greek (English widely spoken in tourist areas)",
    safety: "Very safe tourist destination.",
    time_zone: "EET (UTC+2), EEST (UTC+3) in summer",
  },
  "Marrakech": {
    style: ["culture", "adventure", "budget", "food", "solo"],
    budget_tier: ["budget", "mid-range"],
    best_months: [3, 4, 10, 11],
    highlights: ["Jemaa el-Fna square", "Majorelle Garden", "Medina souks", "Bahia Palace", "Atlas Mountains day trip"],
    avg_daily_budget_usd: { budget: 40, mid_range: 90, premium: 250 },
    visa_note: "Visa-free for most Western nationalities. Check consulat.ma.",
    currency: "Moroccan Dirham (MAD)",
    language: "Arabic / French / Darija (English spoken in tourist areas)",
    safety: "Generally safe; expect persistent vendor approaches in the Medina; use licensed guides.",
    time_zone: "WET (UTC+0), WEST (UTC+1) in summer",
  },
  "Dubai": {
    style: ["luxury", "family", "culture", "solo", "adventure"],
    budget_tier: ["mid-range", "premium"],
    best_months: [10, 11, 12, 1, 2, 3],
    highlights: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Dubai Creek", "Desert Safari"],
    avg_daily_budget_usd: { budget: 80, mid_range: 180, premium: 500 },
    visa_note: "Many nationalities get visa on arrival (30 days). Check uaeicp.gov.ae.",
    currency: "UAE Dirham (AED)",
    language: "Arabic (English widely spoken)",
    safety: "Very safe city; conservative dress code in public areas.",
    time_zone: "GST (UTC+4)",
  },
  "Singapore": {
    style: ["family", "food", "culture", "luxury", "solo"],
    budget_tier: ["mid-range", "premium"],
    best_months: [2, 3, 4, 7, 8],
    highlights: ["Gardens by the Bay", "Marina Bay Sands", "Sentosa Island", "Chinatown", "Hawker Centre food"],
    avg_daily_budget_usd: { budget: 80, mid_range: 180, premium: 450 },
    visa_note: "Visa-free for most nationalities (30-90 days). Check ica.gov.sg.",
    currency: "Singapore Dollar (SGD)",
    language: "English, Mandarin, Malay, Tamil",
    safety: "One of the safest cities in the world.",
    time_zone: "SGT (UTC+8)",
  },
  "Amsterdam": {
    style: ["culture", "romance", "solo", "food", "adventure"],
    budget_tier: ["mid-range", "premium"],
    best_months: [4, 5, 6, 7, 8, 9],
    highlights: ["Rijksmuseum", "Anne Frank House", "Canal cruise", "Vondelpark", "Van Gogh Museum"],
    avg_daily_budget_usd: { budget: 90, mid_range: 180, premium: 450 },
    visa_note: "EU Schengen visa for non-EU nationals. Check government.nl.",
    currency: "Euro (EUR)",
    language: "Dutch (English very widely spoken)",
    safety: "Very safe; watch for bicycle traffic and pickpockets in tourist areas.",
    time_zone: "CET (UTC+1), CEST (UTC+2) in summer",
  },
};

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export async function toolGetWeather(city: string): Promise<string> {
  const geo = await geocode(city);
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weathercode,windspeed_10m` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max` +
    `&timezone=auto&forecast_days=6`;

  const w = await fetchJson<{
    current: {
      time: string;
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      precipitation: number;
      weathercode: number;
      windspeed_10m: number;
    };
    daily: {
      time: string[];
      weathercode: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      windspeed_10m_max: number[];
    };
  }>(url);

  const c = w.current;
  const lines: string[] = [
    `## 🌤️ Weather in ${geo.name}, ${geo.country}`,
    `**Current conditions** (as of ${c.time.replace("T", " ")})`,
    `- Condition: ${WMO_CODES[c.weathercode] ?? "Unknown"}`,
    `- Temperature: ${c.temperature_2m}°C (feels like ${c.apparent_temperature}°C)`,
    `- Humidity: ${c.relative_humidity_2m}%`,
    `- Precipitation: ${c.precipitation} mm`,
    `- Wind: ${c.windspeed_10m} km/h`,
    "",
    "**5-Day Forecast**",
    "| Date | Condition | High | Low | Rain | Wind |",
    "|------|-----------|------|-----|------|------|",
  ];

  for (let i = 1; i <= 5; i++) {
    lines.push(
      `| ${w.daily.time[i]} | ${WMO_CODES[w.daily.weathercode[i]] ?? "?"} | ${w.daily.temperature_2m_max[i]}°C | ${w.daily.temperature_2m_min[i]}°C | ${w.daily.precipitation_sum[i]} mm | ${w.daily.windspeed_10m_max[i]} km/h |`
    );
  }
  lines.push("", `_Data source: Open-Meteo — updated hourly._`);
  return lines.join("\n");
}

export function toolSearchDestinations(
  travel_style: string,
  budget_tier: "budget" | "mid-range" | "premium",
  month: number,
  trip_duration_days: number,
  group_size: number
): string {
  const styles = travel_style.toLowerCase().split(",").map((s) => s.trim());
  const scored: Array<{ name: string; score: number }> = [];

  for (const [name, d] of Object.entries(DESTINATION_DB)) {
    let score = 0;
    if (d.budget_tier.includes(budget_tier)) score += 3;
    if (d.best_months.includes(month)) score += 3;
    for (const s of styles) if (d.style.includes(s)) score += 2;
    if (score > 0) scored.push({ name, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  if (top.length === 0) {
    return "No destinations matched your criteria. Try broadening your travel style or adjusting the budget tier.";
  }

  const tierKey = budget_tier === "mid-range" ? "mid_range" : budget_tier;
  const lines: string[] = [
    `## 🗺️ Suggested Destinations`,
    `_Criteria: ${budget_tier} budget · ${travel_style} · Month ${month} · ${trip_duration_days} days · ${group_size} traveller(s)_`,
    "",
  ];

  for (const { name } of top) {
    const d = DESTINATION_DB[name];
    const perDay = d.avg_daily_budget_usd[tierKey] ?? 0;
    const totalPerson = perDay * trip_duration_days;
    const totalGroup = totalPerson * group_size;
    lines.push(`### ✈️ ${name}`);
    lines.push(`- **Best for:** ${d.style.join(", ")}`);
    lines.push(`- **Best months:** ${d.best_months.map((m) => new Date(2000, m - 1).toLocaleString("en", { month: "short" })).join(", ")}`);
    lines.push(`- **Currency:** ${d.currency} | **Language:** ${d.language}`);
    lines.push(`- **Safety:** ${d.safety}`);
    lines.push(`- **Highlights:** ${d.highlights.slice(0, 4).join(" · ")}`);
    lines.push(`- **Estimated budget (${budget_tier}):** ~$${perDay}/person/day → $${totalPerson.toLocaleString()} pp · $${totalGroup.toLocaleString()} total`);
    lines.push(`- **Visa:** ${d.visa_note}`);
    lines.push("");
  }
  lines.push("_Budget estimates are approximate. Prices vary by season and booking lead time._");
  return lines.join("\n");
}

export function toolBuildItinerary(
  destination: string,
  duration_days: number,
  travel_style: string,
  start_date?: string
): string {
  const dest = DESTINATION_DB[destination];
  const specificHighlights = dest ? dest.highlights : [];

  const genericDay = (day: number, dateLabel: string) => [
    `### Day ${day}${dateLabel ? " — " + dateLabel : ""}`,
    `| Time | Activity | Travel Time | Alt (free/budget) |`,
    `|------|----------|-------------|-------------------|`,
    `| 08:00–09:00 | Breakfast at local café or market | — | Street food / hostel breakfast |`,
    `| 09:00–11:30 | Morning sightseeing: key landmark | 20 min walk | Free walking tour |`,
    `| 11:30–13:00 | Explore neighbourhood market | 15 min | Wander independently |`,
    `| 13:00–14:00 | Lunch at local restaurant | — | Street food stalls |`,
    `| 14:00–16:30 | Afternoon cultural site or nature spot | 30 min transit | Free park / viewpoint |`,
    `| 16:30–18:00 | Café break, shopping, or sunset spot | 15 min | Public beach / park |`,
    `| 18:00–19:00 | Return to accommodation & freshen up | 20 min | — |`,
    `| 19:00–21:00 | Dinner & evening out | — | Cook at accommodation |`,
    "",
  ];

  const lines: string[] = [
    `## 📅 Sample Itinerary — ${destination}`,
    `_${duration_days}-day ${travel_style} trip${start_date ? " starting " + start_date : ""}_`,
    "",
    "> This is a suggested framework. Adjust timings based on opening hours and personal pace.",
    "",
  ];

  for (let day = 1; day <= duration_days; day++) {
    let dateLabel = "";
    if (start_date) {
      const d = new Date(start_date);
      d.setDate(d.getDate() + day - 1);
      dateLabel = d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
    }

    if (day <= specificHighlights.length && dest) {
      lines.push(`### Day ${day}${dateLabel ? " — " + dateLabel : ""}`);
      lines.push(`| Time | Activity | Travel Time | Alt (free/budget) |`);
      lines.push(`|------|----------|-------------|-------------------|`);
      lines.push(`| 08:00–09:00 | Breakfast | — | Street food / local market |`);
      const h = specificHighlights[day - 1];
      lines.push(`| 09:00–12:00 | Visit **${h}** | 20–40 min transit | Explore surrounding area on foot |`);
      lines.push(`| 12:00–13:30 | Lunch near ${h} | — | Packed lunch / street food |`);
      lines.push(`| 13:30–16:00 | ${specificHighlights[day] ? `Explore **${specificHighlights[day]}**` : "Afternoon free exploration"} | 20–30 min | Free walking / park |`);
      lines.push(`| 16:00–18:00 | Café break, shopping or riverside walk | 15 min | Free public spaces |`);
      lines.push(`| 18:00–21:00 | Dinner & evening out | — | Home-cook / market food |`);
      lines.push("");
    } else {
      lines.push(...genericDay(day, dateLabel));
    }
  }

  lines.push("---");
  lines.push("**📌 Practical Notes**");
  if (dest) {
    lines.push(`- **Currency:** ${dest.currency}`);
    lines.push(`- **Time zone:** ${dest.time_zone}`);
    lines.push(`- **Safety:** ${dest.safety}`);
    lines.push(`- **Visa:** ${dest.visa_note}`);
  }
  lines.push("", "_Tip: Book must-visit attractions in advance during peak season._");
  return lines.join("\n");
}

export function toolCompareTransport(
  origin: string,
  destination: string,
  group_size: number,
  travel_date?: string
): string {
  const lines: string[] = [
    `## 🚌 Transport Options: ${origin} → ${destination}`,
    `_${group_size} traveller(s)${travel_date ? " · " + travel_date : ""}_`,
    "",
    "| Option | Typical Duration | Cost/Person (USD) | Pros | Cons |",
    "|--------|-----------------|-------------------|------|------|",
    `| ✈️ Flight | 1–14 hrs | $50–$800 | Fastest for long distances | Airport time, baggage fees |`,
    `| 🚆 Train | 2–20 hrs | $20–$200 | Scenic, city-centre arrival | Not always available |`,
    `| 🚌 Bus | 3–24 hrs | $5–$60 | Cheapest option | Slowest, less comfortable |`,
    `| 🚗 Car Rental | Self-paced | $30–$120/day + fuel | Flexibility, great for groups | Parking costs, local rules |`,
    "",
    "**Where to check real-time prices:**",
    "- ✈️ Flights: [Google Flights](https://flights.google.com) · [Skyscanner](https://www.skyscanner.com)",
    "- 🚆 Trains: [Rome2Rio](https://www.rome2rio.com) · [Trainline](https://www.thetrainline.com)",
    "- 🚌 Buses: [FlixBus](https://www.flixbus.com) · [Busbud](https://www.busbud.com)",
    "- 🚗 Car rental: [Rentalcars](https://www.rentalcars.com) · [Expedia Cars](https://www.expedia.com/Cars)",
    "",
    `**Group tip:** For ${group_size} travellers, car rental may be more cost-effective than individual tickets on short routes.`,
    "",
    "_⚠️ Prices are indicative ranges only. Always verify current fares on the platforms above._",
  ];
  return lines.join("\n");
}

export function toolCompareAccommodation(
  destination: string,
  duration_nights: number,
  group_size: number,
  travel_style: "budget" | "mid-range" | "premium"
): string {
  const dest = DESTINATION_DB[destination];
  const bRoom = Math.round((dest?.avg_daily_budget_usd?.budget ?? 25) * 0.4);
  const mRoom = Math.round((dest?.avg_daily_budget_usd?.mid_range ?? 80) * 0.4);
  const pRoom = Math.round((dest?.avg_daily_budget_usd?.premium ?? 250) * 0.4);

  const lines: string[] = [
    `## 🏨 Accommodation Options — ${destination}`,
    `_${duration_nights} night(s) · ${group_size} traveller(s) · Preferred tier: ${travel_style}_`,
    "",
    `| Tier | Type | Cost/Night (USD) | Total (${duration_nights}n) | Best For |`,
    "|------|------|-----------------|---------------------|----------|",
    `| 🟢 Budget | Hostel / guesthouse / shared Airbnb | $${bRoom}–$${bRoom + 15} | ~$${bRoom * duration_nights}–$${(bRoom + 15) * duration_nights} | Backpackers, solo |`,
    `| 🟡 Mid-range | 3-star hotel / boutique B&B | $${mRoom}–$${mRoom + 40} | ~$${mRoom * duration_nights}–$${(mRoom + 40) * duration_nights} | Couples, small families |`,
    `| 🔴 Premium | 4–5-star hotel / luxury villa | $${pRoom}–$${pRoom + 150} | ~$${pRoom * duration_nights}–$${(pRoom + 150) * duration_nights} | Luxury, special occasions |`,
    "",
    "**Where to book:**",
    "- [Booking.com](https://www.booking.com) · [Hostelworld](https://www.hostelworld.com) · [Airbnb](https://www.airbnb.com) · [Agoda](https://www.agoda.com)",
    "",
    "_⚠️ Prices are estimates. Actual rates depend on season, availability, and lead time._",
  ];
  return lines.join("\n");
}

export function toolEstimateBudget(
  destination: string,
  origin: string,
  duration_days: number,
  group_size: number,
  budget_tier: "budget" | "mid-range" | "premium"
): string {
  const dest = DESTINATION_DB[destination];
  const tierKey = budget_tier === "mid-range" ? "mid_range" : budget_tier;
  const dailyTotal = dest?.avg_daily_budget_usd?.[tierKey] ?? (budget_tier === "budget" ? 60 : budget_tier === "mid-range" ? 150 : 400);
  const nights = Math.max(1, duration_days - 1);

  const acc = Math.round(dailyTotal * 0.40) * nights;
  const food = Math.round(dailyTotal * 0.25) * duration_days;
  const acts = Math.round(dailyTotal * 0.15) * duration_days;
  const lt = Math.round(dailyTotal * 0.12) * duration_days;
  const misc = Math.round(dailyTotal * 0.08) * duration_days;
  const flight = budget_tier === "budget" ? 250 : budget_tier === "mid-range" ? 550 : 1200;

  const subtotal = acc + food + acts + lt + misc + flight;
  const grand = subtotal * group_size;

  const lines: string[] = [
    `## 💰 Budget Estimate — ${origin} → ${destination}`,
    `_${duration_days} days · ${group_size} traveller(s) · ${budget_tier} tier_`,
    "",
    `| Category | Per Person | Group Total (×${group_size}) |`,
    "|----------|-----------|--------------------------|",
    `| ✈️ Flights (return, est.) | $${flight} | $${(flight * group_size).toLocaleString()} |`,
    `| 🏨 Accommodation (${nights} nights) | $${acc} | $${(acc * group_size).toLocaleString()} |`,
    `| 🍽️ Food & drink | $${food} | $${(food * group_size).toLocaleString()} |`,
    `| 🎟️ Activities & entrance fees | $${acts} | $${(acts * group_size).toLocaleString()} |`,
    `| 🚌 Local transport | $${lt} | $${(lt * group_size).toLocaleString()} |`,
    `| 🛍️ Miscellaneous | $${misc} | $${(misc * group_size).toLocaleString()} |`,
    `| **TOTAL** | **$${subtotal.toLocaleString()}** | **$${grand.toLocaleString()}** |`,
    "",
    "_⚠️ Estimates only. Use Google Flights and Booking.com for exact quotes._",
  ];
  return lines.join("\n");
}

export function toolGetVisaInfo(destination: string, passport_nationality: string): string {
  const dest = DESTINATION_DB[destination];
  const lines: string[] = [`## 🛂 Visa Information — ${destination}`, `_Passport: ${passport_nationality}_`, ""];
  if (dest) lines.push(`**Known guidance:** ${dest.visa_note}`, "");
  lines.push(
    "**⚠️ Important:** Visa rules change frequently. Always verify with official sources.",
    "",
    "**Official resources:**",
    "- [IATA Travel Centre](https://www.iatatravelcentre.com)",
    "- [VisaHQ](https://www.visahq.com)",
    "- [Sherpa by Kayak](https://www.joinsherpa.com)",
    "",
    "**Document checklist:**",
    "- ✅ Passport valid 6+ months beyond return date",
    "- ✅ Return / onward ticket",
    "- ✅ Proof of accommodation",
    "- ✅ Proof of sufficient funds",
    "- ✅ Travel insurance with medical coverage"
  );
  return lines.join("\n");
}

export function toolGetLocalTips(destination: string): string {
  const dest = DESTINATION_DB[destination];
  const lines: string[] = [`## 💡 Local Tips — ${destination}`, ""];
  if (dest) {
    lines.push(`**Currency:** ${dest.currency}`);
    lines.push(`**Language:** ${dest.language}`);
    lines.push(`**Time zone:** ${dest.time_zone}`);
    lines.push(`**Safety:** ${dest.safety}`, "");
  }
  lines.push(
    "**General tips:**",
    "- 💱 Use bank ATMs; avoid airport exchange for bulk conversions",
    "- 📶 Buy a local SIM on arrival for cheap data",
    "- 🚕 Use official taxis or Uber/Grab/Bolt",
    "- 🔌 Check plug type and voltage — carry a universal adapter",
    "- 📱 Download offline maps (Google Maps / Maps.me) before arrival",
    "- 🏛️ Respect dress codes at religious sites",
    "",
    "**Recommended apps:**",
    "| App | Purpose |",
    "|-----|---------|",
    "| Google Translate | Language + camera text |",
    "| Maps.me | Offline navigation |",
    "| XE Currency | Real-time exchange rates |",
    "| TripAdvisor | Reviews & attraction info |"
  );
  return lines.join("\n");
}

export async function toolConvertCurrency(amount: number, from: string, to: string): Promise<string> {
  const FROM = from.toUpperCase();
  const TO = to.toUpperCase();
  const url = `https://open.er-api.com/v6/latest/${FROM}`;
  const data = await fetchJson<{ result: string; rates: Record<string, number>; time_last_update_utc: string }>(url);
  if (data.result !== "success") throw new Error(`Currency "${FROM}" not supported.`);
  const rate = data.rates[TO];
  if (rate === undefined) throw new Error(`Target currency "${TO}" not found.`);
  const converted = (amount * rate).toFixed(2);
  return [
    `## 💱 Currency Conversion`,
    `**${amount.toLocaleString()} ${FROM}** = **${Number(converted).toLocaleString()} ${TO}**`,
    `Exchange rate: 1 ${FROM} = ${rate.toFixed(6)} ${TO}`,
    `_Updated: ${data.time_last_update_utc}_`,
    "",
    "_Source: Open Exchange Rates. Use your bank's official rate for large transactions._",
  ].join("\n");
}

export function toolCheckTravelAlerts(destination: string, nationality: string): string {
  const dest = DESTINATION_DB[destination];
  const lines: string[] = [
    `## 🚨 Travel Alerts & Safety — ${destination}`,
    `_For ${nationality} travellers_`,
    "",
  ];
  if (dest) lines.push(`**Local safety context:** ${dest.safety}`, "");
  lines.push(
    "**Official advisory portals:**",
    "| Country | Portal |",
    "|---------|--------|",
    "| 🇺🇸 USA | [travel.state.gov](https://travel.state.gov) |",
    "| 🇬🇧 UK | [gov.uk/foreign-travel-advice](https://www.gov.uk/foreign-travel-advice) |",
    "| 🇦🇺 Australia | [smartraveller.gov.au](https://www.smartraveller.gov.au) |",
    "| 🇨🇦 Canada | [travel.gc.ca](https://travel.gc.ca/travelling/advisories) |",
    "| 🌍 Others | Search '[your country] foreign travel advice' |",
    "",
    "**Before you go:**",
    "- Register your trip with your embassy",
    "- Save local emergency numbers: police, ambulance, fire",
    "- Share your itinerary with a trusted contact",
    "- Ensure travel insurance covers planned activities"
  );
  return lines.join("\n");
}
