"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { useAuth } from "@/lib/auth/context";
import {
  transcribeAudio,
  parseMovimiento,
  type MovimientoEstado,
} from "@/lib/api/voice";
import { VoiceRecorderButton } from "@/components/voice/voice-recorder-button";
import type { MovimientoFormState } from "@/components/forms/movimiento-form";

/** Mapea el resultado ya resuelto de la captura por voz al shape que espera
 * `MovimientoForm` (usado con `initialState`/`initialStep={5}` en los 2
 * puntos de entrada: Movimientos y Dashboard). */
export function estadoVozToFormState(estado: MovimientoEstado): Partial<MovimientoFormState> {
  return {
    tipo: estado.tipo,
    concepto_id: estado.concepto_id,
    concepto_nombre: estado.concepto_nombre,
    cuenta_origen_id: estado.cuenta_origen_id,
    cuenta_origen_nombre: estado.cuenta_origen_nombre,
    cuenta_destino_id: estado.cuenta_destino_id,
    cuenta_destino_nombre: estado.cuenta_destino_nombre,
    monto: estado.monto !== null ? String(estado.monto) : "",
    nota: estado.nota ?? "",
  };
}

interface VoiceMovimientoCaptureProps {
  open: boolean;
  onClose: () => void;
  /** Se dispara cuando ya se resolvieron todos los campos obligatorios. El
   * padre es responsable de abrir `MovimientoForm` con estos datos (paso 5). */
  onCompleto: (estado: MovimientoEstado) => void;
  /** Texto ya transcrito desde afuera (ej. el mic del dashboard), para no
   * pedirle al usuario que repita lo que ya dijo. */
  initialTexto?: string;
}

const CAMPO_LABELS: Record<string, string> = {
  tipo: "Tipo",
  concepto_nombre: "Concepto",
  cuenta_origen_nombre: "Cuenta origen",
  cuenta_destino_nombre: "Cuenta destino",
  monto: "Monto",
  nota: "Nota",
};

function resumenCampos(estado: Partial<MovimientoEstado>): Array<[string, string]> {
  const campos: Array<[string, unknown]> = [
    ["tipo", estado.tipo],
    ["concepto_nombre", estado.concepto_nombre],
    ["cuenta_origen_nombre", estado.cuenta_origen_nombre],
    ["cuenta_destino_nombre", estado.cuenta_destino_nombre],
    ["monto", estado.monto],
    ["nota", estado.nota],
  ];
  return campos
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [CAMPO_LABELS[key] ?? key, String(value)]);
}

export function VoiceMovimientoCapture({
  open,
  onClose,
  onCompleto,
  initialTexto,
}: VoiceMovimientoCaptureProps) {
  const { token } = useAuth();

  const [estado, setEstado] = useState<Partial<MovimientoEstado>>({});
  const [pregunta, setPregunta] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const wasOpenRef = useRef(false);
  const initialTextoHandledRef = useRef(false);

  const procesarTexto = async (texto: string) => {
    if (!token || !texto.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseMovimiento(token, texto, estado);
      setEstado(result.estado);
      setPregunta(result.pregunta);
      if (result.completo) {
        onCompleto(result.estado);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrabacion = async (blob: Blob) => {
    if (!token) return;
    setIsProcessing(true);
    setError(null);
    try {
      const { text } = await transcribeAudio(token, blob);
      await procesarTexto(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo transcribir el audio.");
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    const texto = textInput.trim();
    if (!texto) return;
    setTextInput("");
    void procesarTexto(texto);
  };

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setEstado({});
      setPregunta(null);
      setError(null);
      setTextInput("");
      initialTextoHandledRef.current = false;
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (open && initialTexto && !initialTextoHandledRef.current) {
      initialTextoHandledRef.current = true;
      void procesarTexto(initialTexto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTexto]);

  const campos = resumenCampos(estado);

  return (
    <Modal open={open} onClose={onClose} title="Registrar por voz" size="sm" persistent={isProcessing}>
      <div className="flex flex-col gap-4">
        {campos.length > 0 && (
          <div className="bg-muted/20 rounded-xl p-3 flex flex-col gap-1 border border-border/60">
            {campos.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}

        <p className="small text-muted-foreground">
          {pregunta ?? "Contame qué movimiento querés registrar."}
        </p>

        {error && <FormError message={error} />}

        <div className="flex items-center justify-center py-2">
          <VoiceRecorderButton
            onRecordingComplete={handleGrabacion}
            isProcessing={isProcessing}
            disabled={!token}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
            placeholder="O escribí la respuesta..."
            disabled={isProcessing}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleTextSubmit}
            disabled={isProcessing || !textInput.trim()}
            aria-label="Enviar respuesta"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
