export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes) {
    return "0 Bytes";
  }
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${
    ["Bytes", "KB", "MB", "GB", "TB"][i]
  }`;
}
