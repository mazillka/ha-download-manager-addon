import { app } from "./app";
import { DownloadService, ConfigService } from "./services";
import { initDB } from "./db";

const port = process.env.PORT || 3000;

initDB();

(async () => {
  const tasks = await DownloadService.Restore();
  console.info(`Loaded ${tasks.length} tasks`);

  const configs = await ConfigService.GetAll();
  console.info(`Loaded ${configs.length} configs`);

  app.listen(port, () => {
    console.info(`🚀 Server running on http://localhost:${port}`);
  });
})();
