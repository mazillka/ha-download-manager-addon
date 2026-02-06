import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";

import {
  healthRoutes,
  configRoutes,
  parseRoutes,
  downloadRoutes,
  watchLaterRoutes,
} from "./routes";
import { createRateLimiter } from "./middleware/rateLimit";

const isProduction = process.env.NODE_ENV === "production";

export const app = express();

// Compression middleware (gzip/deflate responses)
app.use(
  compression({
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Compression level (0-9)
  }),
);

// Rate limiting: 100 requests per minute per IP
app.use(createRateLimiter(60000, 100));

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api", parseRoutes);
app.use("/api/configs", configRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/watch-later", watchLaterRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Backend error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err?.message,
  });
});

if (isProduction) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendPath = path.resolve(__dirname, "../frontend");

  app.use(express.static(frontendPath));

  app.use((req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}
