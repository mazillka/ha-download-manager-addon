export default interface Task {
  id: string;
  filename: string;
  url: string;
  status: "pending" | "downloading" | "paused" | "completed" | "error";
  progress: number;
  loaded: number;
  total: number;
  startTime: number;
  error: string | null;
  speed: number;
}
