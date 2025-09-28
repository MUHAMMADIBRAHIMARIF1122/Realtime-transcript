import { io } from "socket.io-client";
import fetch from "node-fetch"; // <--- ADD THIS

// Replace with your actual Fireflies API token
const API_TOKEN = process.env.FIREFLIES_API_TOKEN;

// Replace with your real transcript ID from Fireflies
const TRANSCRIPT_ID = process.env.TRANSCRIPT_ID || "your-transcript-id-here";

// Your n8n webhook URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

if (!API_TOKEN || !N8N_WEBHOOK_URL) {
  console.error("❌ Missing required env variables");
  process.exit(1);
}

// Connect to Fireflies Realtime API
const socket = io("wss://api.fireflies.ai", {
  path: "/ws/realtime",
  auth: {
    token: `Bearer ${API_TOKEN}`,
    transcriptId: TRANSCRIPT_ID,
  },
});

// ---- Event Listeners ----

// Auth success/failure
socket.on("auth.success", (data) => {
  console.log("✅ Authenticated:", data);
});
socket.on("auth.failed", (err) => {
  console.error("❌ Authentication failed:", err);
});

// Connection status
socket.on("connection.established", () => {
  console.log("🔗 Connection established with Fireflies Realtime API");
});
socket.on("connection.error", (err) => {
  console.error("⚠️ Connection error:", err);
});

// Transcription events
socket.on("transcription.broadcast", async (event) => {
  console.log("📝 Transcript event:", event);

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      console.error("❌ Failed to send to n8n:", res.status, await res.text());
    } else {
      console.log("✅ Sent transcript to n8n");
    }
  } catch (err) {
    console.error("❌ Error sending to n8n:", err);
  }
});
