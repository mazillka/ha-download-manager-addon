import { app } from "./app";
import { DbService, DownloadService } from "./services";

const port = process.env.PORT || 3000;

DbService.initDB();

(async () => {
  const tasks = await DownloadService.restoreDownloads();
  console.info(`Loaded ${tasks.length} tasks`);

  const configs = await DbService.getAllConfig();
  console.info(`Loaded ${configs.length} configs`);

  app.listen(port, () => {
    console.info(`🚀 Server running on http://localhost:${port}`);
  });
})();
