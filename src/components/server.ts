import express from "express";
import cors from "cors";
import path from "path";
import { SquareClient, SquareEnvironment } from "square";
import 'dotenv/config'; // loads .env automatically

export const app = express();

app.use(cors());
app.use(express.json());

const squareToken = process.env.SQUARE_ACCESS_TOKEN || "";
const squareEnvStr = process.env.SQUARE_ENVIRONMENT?.toLowerCase();

const environment = squareEnvStr === "sandbox" ? SquareEnvironment.Sandbox :
                    squareEnvStr === "production" ? SquareEnvironment.Production :
                    squareToken.startsWith("EAAAE") ? SquareEnvironment.Sandbox :
                    squareToken.startsWith("sandbox-") ? SquareEnvironment.Sandbox :
                    process.env.NODE_ENV === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;

// Initialize Square Client
const squareClient = new SquareClient({
  token: squareToken,
  environment,
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
     if (error.errors && error.errors.length > 0) {
       console.error("Square Error Details:", JSON.stringify(error.errors, null, 2));
       const isAuth = error.errors.some((e: any) => e.category === 'AUTHENTICATION_ERROR');
       if (isAuth) {
         return res.status(401).json({ error: "Square Authentication Error. Check SQUARE_ACCESS_TOKEN and SQUARE_ENVIRONMENT." });
       }
     }
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
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const { operationName } = req.body;

    if (!operationName) return res.status(400).json({ error: "Missing operationName" });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(400).json({ error: "Video not ready or failed" });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
    });

    res.setHeader('Content-Type', 'video/mp4');
    if (videoRes.body) {
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

async function startServer() {
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

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if not running mapped to a serverless function export
if (!process.env.NETLIFY) {
  startServer();
}
