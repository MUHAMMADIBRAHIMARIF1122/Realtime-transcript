import express from "express";
import { io } from "socket.io-client";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const API_TOKEN = process.env.FIREFLIES_API_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

let currentSocket = null;

// Function to connect to Fireflies
function connectFireflies(transcriptId) {
  if (currentSocket) {
    currentSocket.disconnect(); // Disconnect previous meeting if exists
  }

  const socket = io("wss://api.fireflies.ai", {
    path: "/ws/realtime",
    auth: { token: `Bearer ${API_TOKEN}`, transcriptId }
  });

  socket.on("auth.success", () => console.log("✅ Authenticated"));
  socket.on("auth.failed", err => console.error("❌ Auth failed", err));
  socket.on("connection.established", () => console.log("🔗 Connected to meeting", transcriptId));
  socket.on("connection.error", err => {
    console.error("⚠️ Connection error", err);
    setTimeout(() => connectFireflies(transcriptId), 5000);
  });

  socket.on("transcription.broadcast", async event => {
    console.log("📝 Transcript:", event);
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });
    } catch (err) {
      console.error("🚨 Error sending to n8n:", err);
    }
  });

  currentSocket = socket;
}

// POST endpoint to update meeting ID dynamically
app.post("/update-meeting", (req, res) => {
  const { transcriptId } = req.body;
  if (!transcriptId) return res.status(400).send({ error: "Missing transcriptId" });
  connectFireflies(transcriptId);
  res.send({ status: "ok", transcriptId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
