import { getLlmBaseUrl } from "@/lib/api/llm";

export type VoiceIntent = "consulta" | "registrar_movimiento";

export interface TranscribeResult {
  text: string;
  intent: VoiceIntent | null;
}

/**
 * Sube un clip de audio grabado en el navegador y devuelve su transcripción.
 * Si `options.classify` es true, además clasifica la intención del texto
 * resultante (consulta vs. registrar movimiento) en la misma llamada.
 */
export async function transcribeAudio(
  token: string,
  audioBlob: Blob,
  options?: { classify?: boolean },
): Promise<TranscribeResult> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.webm");

  const query = options?.classify ? "?classify=true" : "";
  const response = await fetch(`${getLlmBaseUrl()}/api/voice/transcribe${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Error ${response.status} al transcribir el audio.`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") message = payload.detail;
    } catch {
      // dejar el mensaje por defecto
    }
    throw new Error(message);
  }

  return (await response.json()) as TranscribeResult;
}

export interface MovimientoEstado {
  tipo: "Ingreso" | "Egreso" | "Transferencia" | null;
  concepto_id: number | null;
  concepto_nombre: string;
  cuenta_origen_id: number | null;
  cuenta_origen_nombre: string;
  cuenta_destino_id: number | null;
  cuenta_destino_nombre: string;
  monto: number | null;
  nota: string | null;
}

export interface ParseMovimientoResult {
  estado: MovimientoEstado;
  faltantes: string[];
  pregunta: string | null;
  completo: boolean;
}

/**
 * Extrae/completa los campos de un movimiento a partir de texto transcrito
 * por voz. `estadoPrevio` permite encadenar turnos: si al usuario le falta
 * un dato, se le pregunta puntualmente y su respuesta se combina con lo que
 * ya se había entendido en el turno anterior.
 */
export async function parseMovimiento(
  token: string,
  texto: string,
  estadoPrevio?: Partial<MovimientoEstado>,
): Promise<ParseMovimientoResult> {
  const response = await fetch(`${getLlmBaseUrl()}/api/voice/parse-movimiento`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ texto, estado_previo: estadoPrevio ?? null }),
  });

  if (!response.ok) {
    let message = `Error ${response.status} al interpretar el movimiento.`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") message = payload.detail;
    } catch {
      // dejar el mensaje por defecto
    }
    throw new Error(message);
  }

  return (await response.json()) as ParseMovimientoResult;
}
