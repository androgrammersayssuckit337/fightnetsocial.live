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
