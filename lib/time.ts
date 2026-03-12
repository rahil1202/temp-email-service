export function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

export function formatRelativeTime(timestamp: string): string {
  const seconds = Math.round((new Date(timestamp).getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return rtf.format(seconds, "second");
  }

  if (absoluteSeconds < 3600) {
    return rtf.format(Math.round(seconds / 60), "minute");
  }

  if (absoluteSeconds < 86400) {
    return rtf.format(Math.round(seconds / 3600), "hour");
  }

  return rtf.format(Math.round(seconds / 86400), "day");
}
