export const SanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[\/\\:*?"<>|]/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();
};

export default { SanitizeFileName };
