import { app } from "./app";
import { initDB } from "./db";
import { DownloadService, ConfigService } from "./services";

const port = process.env.PORT || 3000;

(async () => {
  initDB();

  const tasks = await DownloadService.Restore();
  console.info(`Loaded ${tasks.length} tasks`);

  const configs = await ConfigService.GetAll();
  console.info(`Loaded ${configs.length} configs`);

  app.listen(port, () => {
    console.info(`🚀 Server running on http://localhost:${port} 🚀`);
  });
})();
