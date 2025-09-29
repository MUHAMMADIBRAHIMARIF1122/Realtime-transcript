const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

/**
 * 1. Start Recall bot
 * Endpoint: POST /api/startRecall
 * Body: { "zoomLink": "...", "externalId": "..." }
 */
app.post("/api/startRecall", async (req, res) => {
  try {
    const { zoomLink, externalId } = req.body;

    const botResp = await fetch(`https://${process.env.RECALL_REGION}.recall.ai/api/v1/bot`, {
      method: "POST",
      headers: {
        Authorization: process.env.RECALL_API_KEY ?? "",
        "Content-Type": "application/json",
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
              events: ["transcript.data"], // ✅ ONLY finalized transcript events
            },
          ],
        },
      }),
    });

    const data = await botResp.json();
    res.json(data);
  } catch (err) {
    console.error("Error starting bot:", err);
    res.status(500).json({ error: "Failed to start bot" });
  }
});

/**
 * 2. Webhook receiver
 * Recall.ai will POST finalized transcript + status events here
 */
app.post("/webhook/Transcript", (req, res) => {
  const body = req.body;

  if (body.event === "transcript.data") {
    console.log("✅ Final transcript chunk:", body.data.data.words);
  }

  if (body.event === "bot.done") {
    console.log("🎉 Meeting finished! Transcript ready. botId:", body.data.bot.id);
  }

  res.sendStatus(200);
});

/**
 * 3. Fetch full transcript after meeting
 * Endpoint: GET /api/getTranscript/:botId
 */
app.get("/api/getTranscript/:botId", async (req, res) => {
  try {
    const botId = req.params.botId;

    // Retrieve bot details
    const botResp = await fetch(
      `https://${process.env.RECALL_REGION}.recall.ai/api/v1/bot/${botId}/`,
      {
        method: "GET",
        headers: {
          Authorization: process.env.RECALL_API_KEY ?? "",
          Accept: "application/json",
        },
      }
    );
    const botData = await botResp.json();

    // Find transcript download URL
    const recordings = botData.recordings || [];
    if (!recordings.length || !recordings[0].media_shortcuts?.transcript) {
      return res.status(404).json({ error: "No transcript available yet" });
    }

    const downloadUrl = recordings[0].media_shortcuts.transcript.download_url;

    // Download full transcript JSON
    const transcriptResp = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.RECALL_API_KEY ?? ""}`,
        Accept: "application/json",
      },
    });
    const transcript = await transcriptResp.json();

    res.json(transcript);
  } catch (err) {
    console.error("Error fetching transcript:", err);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
