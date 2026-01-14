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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.resolve(__dirname, "../frontend");

export const app = express();

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api", parseRoutes);
app.use("/api/configs", configRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/watchLater", watchLaterRoutes);

app.use(express.static(frontendPath));
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
