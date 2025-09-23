import { io } from "socket.io-client";
import fetch from "node-fetch";

// 🔑 Environment variables (set them in Railway)
const API_TOKEN = process.env.FIREFLIES_API_TOKEN;  
const TRANSCRIPT_ID = process.env.FIREFLIES_TRANSCRIPT_ID;  
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;  

function connectSocket() {
  const socket = io("wss://api.fireflies.ai", {
    path: "/ws/realtime",
    auth: {
      token: `Bearer ${API_TOKEN}`,
      transcriptId: TRANSCRIPT_ID
    }
  });

  socket.on("auth.success", data => {
    console.log("✅ Authenticated:", data);
  });

  socket.on("auth.failed", err => {
    console.error("❌ Authentication failed:", err);
  });

  socket.on("connection.established", () => {
    console.log("🔗 Connection established");
  });

  socket.on("connection.error", err => {
    console.error("⚠️ Connection error:", err);
    setTimeout(connectSocket, 5000); // 🔄 auto-reconnect
  });

  socket.on("transcription.broadcast", async (event) => {
    console.log("📝 Transcript:", event);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });

      if (!res.ok) {
        console.error("⚠️ Failed to forward to n8n:", res.statusText);
      } else {
        console.log("📤 Forwarded to n8n successfully");
      }
    } catch (err) {
      console.error("🚨 Error sending to n8n:", err);
    }
  });
}

connectSocket();
