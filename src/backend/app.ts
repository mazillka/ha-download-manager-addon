import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  healthRoutes,
  configRoutes,
  parseRoutes,
  downloadRoutes,
  watchLaterRoutes,
} from "./routes";

const isProduction = process.env.NODE_ENV === "production";

export const app = express();

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
