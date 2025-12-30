export default interface DownloadTask {
    id: string;
    url: string;
    filename: string;
    status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
    startTime: number;
    progress?: number;
    speed?: number;
    size?: number;
}
