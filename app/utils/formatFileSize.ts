/**
 * Formats a size in bytes as a human-readable string (e.g. "3.6 MB").
 * Uses the runtime locale so the decimal separator follows the user's
 * language. Returns an empty string for 0 (caller decides how to render
 * "missing file").
 *
 * @param bytes - Size in bytes; 0 means the size is unknown/missing.
 * @returns Localized size string, or "" when `bytes` is 0.
 */
export function formatFileSize(bytes: number): string {
    if (bytes <= 0) {
        return "";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    /** Index of the largest unit that keeps the value >= 1. */
    let unitIndex = 0;
    let value = bytes;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    const formatted = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
    }).format(value);
    return `${formatted} ${units[unitIndex]}`;
}
