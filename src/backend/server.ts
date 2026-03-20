import { app } from "./app";
import { DownloadService, ConfigService, DatabaseService } from "./services";
import { Server } from "http";

const port = process.env.PORT || 5172;

let server: Server;

(async () => {
  await DatabaseService.Initialize();

  const tasks = await DownloadService.Restore();
  console.info(`Loaded ${tasks.length} tasks`);

  const configs = await ConfigService.GetAll();
  console.info(`Loaded ${configs.length} configs`);

  server = app.listen(port, () => {
    console.info(`🚀 Backend running on http://localhost:${port} 🚀`);
  });
})();

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  console.info(`\n${signal} received, shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      console.info("HTTP server closed");

      try {
        // Close database connection
        await DatabaseService.Close();
        console.info("Database connection closed");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
