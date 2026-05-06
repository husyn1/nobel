import type { AxiosError } from "axios";

/** Normalize FastAPI / axios errors for user-visible messages. */
export function formatApiError(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{ detail?: unknown }>;
  const d = ax.response?.data?.detail;

  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((item: unknown) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (d != null && typeof d === "object") {
    return JSON.stringify(d);
  }
  if (ax.message && ax.message !== "Network Error") return ax.message;
  return fallback;
}
