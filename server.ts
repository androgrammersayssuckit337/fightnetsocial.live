import express from "express";
// vite is imported dynamically
import cors from "cors";
import path from "path";
import { SquareClient, SquareEnvironment } from "square";
import 'dotenv/config'; // loads .env automatically

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Square Client
  const squareClient = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN || "",
    environment: process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });

  // API Route for Square Checkout
  app.post("/api/subscribe", async (req, res) => {
    try {
      const { successUrl, customerEmail } = req.body;
      const locationId = process.env.SQUARE_LOCATION_ID;

      if (!locationId) {
        throw new Error("SQUARE_LOCATION_ID is missing.");
      }

      // Create a Square Checkout link
      const response = await squareClient.checkout.paymentLinks.create({
        idempotencyKey: Date.now().toString(),
        order: {
          locationId: locationId,
          lineItems: [
            {
              name: "FightNet Pro Subscription",
              quantity: "1",
              basePriceMoney: {
                amount: BigInt(999), // $9.99 in cents
                currency: "USD",
              },
            },
          ],
        },
        checkoutOptions: {
          redirectUrl: successUrl,
          askForShippingAddress: false,
        },
      });

      const paymentLink = response.paymentLink;
      if (!paymentLink?.url) {
        throw new Error("Failed to create payment link");
      }

      res.json({ url: paymentLink.url });
    } catch (error: any) {
       console.error("Square Checkout Error:", error);
       res.status(500).json({ error: error.message || "An error occurred with Square" });
    }
  });

  // Veo Video Generation API Routes
  app.post("/api/generate-video", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(403).json({ error: "GEMINI_API_KEY missing in Secrets." });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const { prompt } = req.body;

      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
      res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error("Video Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(403).json({ error: "GEMINI_API_KEY missing in Secrets." });
      }
      const { GoogleGenAI, GenerateVideosOperation } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const { operationName } = req.body;

      if (!operationName) return res.status(400).json({ error: "Missing operationName" });

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      res.json({ done: updated.done });
    } catch (error: any) {
      console.error("Video Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/video-download", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(403).json({ error: "GEMINI_API_KEY missing in Secrets." });
      }
      const { GoogleGenAI, GenerateVideosOperation } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const { operationName } = req.body;

      if (!operationName) return res.status(400).json({ error: "Missing operationName" });

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        // Not ready or failed
        return res.status(400).json({ error: "Video not ready or failed" });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      });

      res.setHeader('Content-Type', 'video/mp4');
      if (videoRes.body) {
        /* Support Node stream pipe */
        const reader = videoRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        res.status(500).json({ error: "Unable to read video response stream" });
      }
    } catch (error: any) {
      console.error("Video Download Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built dist directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
