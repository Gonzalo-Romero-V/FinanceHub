import { getBrowserTimezone } from "@/lib/utils/format";

export function getLlmBaseUrl() {
  return (process.env.NEXT_PUBLIC_LLM_API_BASE_URL ?? "").replace(/\/$/, "");
}

export interface AnalyzeRequestBody {
  prompt: string;
  user_id: number;
}

export interface AnalyzeWidget {
  id: string;
  type: "kpi" | "line" | "bar" | "pie" | "table";
  title: string;
  description?: string;
  data: Array<Record<string, unknown>>;
  raw_total_records: number;
  sql?: string | null;
  metric?: number | null;
  value_format?: "currency" | "percent" | "integer" | "number" | "auto";
  currency?: string | null;
  unit?: string | null;
}

export interface AnalyzeResponse {
  intent: string;
  dashboard_title: string;
  summary: string;
  mode: "replace" | "append" | "update";
  widgets: AnalyzeWidget[];
}

/**
 * POST al servicio LLM. Manda automáticamente el header `X-Client-Timezone`
 * con la TZ del browser; el LLM la usa para interpretar "hoy", "ayer", etc.
 * sin desfases.
 */
export async function analyzeRequest(body: AnalyzeRequestBody): Promise<AnalyzeResponse> {
  const response = await fetch(`${getLlmBaseUrl()}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Client-Timezone": getBrowserTimezone(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Error ${response.status} del servicio de análisis.`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") message = payload.detail;
    } catch {
      // dejar el mensaje por defecto
    }
    throw new Error(message);
  }

  return (await response.json()) as AnalyzeResponse;
}
