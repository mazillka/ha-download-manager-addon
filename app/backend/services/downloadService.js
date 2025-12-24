import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import * as dbService from "./dbService.js";

const downloadPath = process.env.DOWNLOAD_PATH || (process.platform === 'win32' ? "./media/downloads" : "/media/DOWNLOADS");
const activeControllers = {};

export const startDownload = async (id) => {
    const task = await dbService.getTask(id);
    if (!task)
        return;

    try {
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }
        const dest = path.join(downloadPath, task.filename);

        task.status = 'downloading';
        task.error = null;
        activeControllers[id] = new AbortController();
        await dbService.saveTask(task);

        let headers = {};
        let flags = 'w';

        if (task.loaded > 0 && fs.existsSync(dest)) {
            const stat = fs.statSync(dest);
            if (stat.size !== task.loaded) {
                task.loaded = stat.size;
            }
            headers['Range'] = `bytes=${task.loaded}-`;
            flags = 'a';
        } else {
            task.loaded = 0;
        }

        const response = await fetch(task.url, { headers, signal: activeControllers[id].signal });
        if (!response.ok) {
            if (response.status === 416) { // Range Not Satisfiable (likely completed)
                task.status = 'completed';
                task.progress = 100;
                await dbService.saveTask(task);
                delete activeControllers[id];
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        if (flags === 'a' && response.status !== 206) {
            flags = 'w'; // Server didn't accept range, restart
            task.loaded = 0;
        }

        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        if (response.status === 206) {
            const contentRange = response.headers.get('content-range');
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)$/);
                if (match) task.total = parseInt(match[1], 10);
            } else {
                task.total = task.loaded + contentLength;
            }
        } else {
            task.total = contentLength;
        }
        await dbService.saveTask(task); // Save total size

        const fileStream = fs.createWriteStream(dest, { flags });
        let lastLoaded = task.loaded;
        let lastTime = Date.now();

        response.body.on('data', (chunk) => {
            task.loaded += chunk.length;
            if (task.total) task.progress = Math.round((task.loaded / task.total) * 100);

            const now = Date.now();
            if (now - lastTime >= 1000) {
                task.speed = (task.loaded - lastLoaded) / ((now - lastTime) / 1000);
                lastLoaded = task.loaded;
                lastTime = now;
                dbService.saveTask(task).catch(console.error);
            }
        });

        response.body.on('error', (error) => {
            if (error.name === 'AbortError') return;
            task.status = 'error';
            task.error = error.message;
            task.speed = 0;
            delete activeControllers[id];
            dbService.saveTask(task).catch(console.error);
        });

        fileStream.on('finish', () => {
            if (task.status === 'downloading') {
                task.status = 'completed';
                task.progress = 100;
                task.speed = 0;
                delete activeControllers[id];
                dbService.saveTask(task).catch(console.error);

                // Log to Database
                dbService.addHistory(task.filename, task.total)
                    .then(() => console.info(`Saved ${task.filename} to history DB.`))
                    .catch(error => console.error("Failed to save download to DB:", error));
            }
        });

        response.body.pipe(fileStream);
    } catch (error) {
        if (error.name === 'AbortError') {
            if (task.status !== 'paused') {
                task.status = 'error';
                task.error = 'Aborted';
            }
        } else {
            task.status = 'error';
            task.error = error.message;
        }
        task.speed = 0;
        delete activeControllers[id];
        await dbService.saveTask(task);
    }
};

export const createDownload = async (url, filename) => {
    const id = Date.now().toString();
    const task = {
        id,
        filename,
        url,
        status: 'pending',
        progress: 0,
        loaded: 0,
        total: 0,
        speed: 0,
        startTime: Date.now(),
        error: null
    };

    await dbService.saveTask(task);
    startDownload(id);
    return id;
};

export const pauseDownload = async (id) => {
    const task = await dbService.getTask(id);
    if (task && task.status === 'downloading') {
        task.status = 'paused';
        if (activeControllers[id]) {
            activeControllers[id].abort();
            delete activeControllers[id];
        }
        await dbService.saveTask(task);
    }
};

export const resumeDownload = async (id) => {
    const task = await dbService.getTask(id);
    if (task && (task.status === 'paused' || task.status === 'error')) {
        startDownload(id);
    }
};

export const deleteDownload = async (id, removeFile) => {
    const task = await dbService.getTask(id);
    if (task) {
        if (activeControllers[id]) {
            activeControllers[id].abort();
            delete activeControllers[id];
        }
        if (removeFile) {
            const dest = path.join(downloadPath, task.filename);
            if (fs.existsSync(dest)) {
                try {
                    fs.unlinkSync(dest);
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        }
        await dbService.deleteTask(id);
    }
};

export const cancelDownload = async (id) => {
    return deleteDownload(id, false);
};

export const restoreDownloads = async () => {
    const tasks = await dbService.getAllTasks();
    await Promise.all(tasks.map(async (t) => {
        // If it was downloading when killed, set to paused
        if (t.status === 'downloading') {
            t.status = 'paused';
            t.error = 'Interrupted by server restart';
            await dbService.saveTask(t);
        }
    }));
    return tasks;
};