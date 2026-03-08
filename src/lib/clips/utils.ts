export function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseDurationToSeconds(input: string) {
  const clean = input.trim();
  if (!clean) return null;
  const parts = clean.split(":").map((token) => Number(token));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

export function parseYouTubeInput(input: string) {
  const clean = input.trim();
  if (!clean) {
    return { videoId: null as string | null, timestamp: null as number | null };
  }

  // Already a plain YouTube video id.
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return { videoId: clean, timestamp: null };
  }

  try {
    const url = new URL(clean);
    let videoId: string | null = null;
    if (url.hostname.includes("youtube.com")) {
      videoId = url.searchParams.get("v");
    } else if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.replace("/", "");
    }

    const t = url.searchParams.get("t") || url.searchParams.get("start");
    const timestamp = t ? Number(t) : null;
    return {
      videoId: videoId || null,
      timestamp: timestamp != null && !Number.isNaN(timestamp) ? timestamp : null,
    };
  } catch {
    return { videoId: null, timestamp: null };
  }
}

export function safeStoragePath(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 200);
}

export function splitEntityText(input: string) {
  return input
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function normalizeEntity(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
