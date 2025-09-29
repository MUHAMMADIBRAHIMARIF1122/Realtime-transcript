import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json()); // we’ll use JSON body parser for the webhook

const PORT = process.env.PORT || 3000;
const RECALL_REGION = "us-east-1"; // change if you’re using another region
const RECALL_API_KEY = process.env.RECALL_API_KEY;

// ---------------
// Start Recall Bot
// ---------------
app.post("/api/startRecall", async (req, res) => {
  try {
    const { zoomLink, externalId } = req.body;

    if (!zoomLink || !externalId) {
      return res.status(400).json({ error: "zoomLink and externalId required" });
    }

    const botResp = await fetch(`https://${RECALL_REGION}.recall.ai/api/v1/bot`, {
      method: "POST",
      headers: {
        authorization: RECALL_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        meeting_url: zoomLink,
        external_id: externalId,
        metadata: { external_id: externalId },
        webhook_url: "https://primary-production-bd4d.up.railway.app/webhook/Transcript",
        recording_config: {
          transcript: { provider: { meeting_captions: {} } },
          realtime_endpoints: [
            {
              type: "webhook",
              url: "https://primary-production-bd4d.up.railway.app/webhook/Transcript",
              events: ["transcript.data"], // ✅ only finalized transcripts
            },
          ],
        },
      }),
    });

    const data = await botResp.json();
    return res.json(data);
  } catch (err) {
    console.error("Error starting Recall bot:", err);
    res.status(500).json({ error: "Failed to start bot" });
  }
});

// -------------------
// Webhook for Recall.ai
// -------------------
app.post("/webhook/Transcript", (req, res) => {
  const body = req.body;

  // Real-time finalized transcript
  if (body.event === "transcript.data") {
    const words = body.data?.data?.words ?? [];
    const text = words.map((w) => w.text).join(" ").trim();
    const speaker = body.data?.data?.participant?.name ?? "Unknown";

    console.log(`📝 ${speaker}: ${text}`);
  }

  // When the meeting is done
  if (body.event === "bot.done") {
    console.log("✅ Meeting finished, transcript ready for download. Bot ID:", body.data.bot.id);
  }

  res.sendStatus(200);
});

// -------------------
// Start server
// -------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
