import { io } from "socket.io-client";

// Replace with your actual Fireflies API token
const API_TOKEN = process.env.FIREFLIES_API_TOKEN;

// TEMP: Replace with your real transcript ID from Fireflies
const MEETING_ID = process.env.TRANSCRIPT_ID || "your-transcript-id-here";

// Connect to Fireflies Realtime API
const socket = io("wss://api.fireflies.ai", {
  path: "/ws/realtime",
  auth: {
    token: `Bearer ${API_TOKEN}`,
    meetingid: MEETING_ID,
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
socket.on("transcription.broadcast", (event) => {
  console.log("📝 Transcript event:", event);

  // Example: Forward transcript to n8n webhook
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch((err) => console.error("❌ Failed to send to n8n:", err));
});
