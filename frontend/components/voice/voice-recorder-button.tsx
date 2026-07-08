"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/ui/notify";

interface VoiceRecorderButtonProps {
  onRecordingComplete: (blob: Blob) => void;
  /** Controlado por el padre: true mientras se transcribe/procesa el audio ya grabado. */
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
}

export function VoiceRecorderButton({
  onRecordingComplete,
  isProcessing = false,
  disabled = false,
  className,
}: VoiceRecorderButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => stopStream, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        stopStream();
        onRecordingComplete(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      notifyError(
        denied
          ? "No se concedió el permiso de micrófono. Puedes habilitarlo desde los ajustes de la aplicación."
          : "No se pudo acceder al micrófono. Verifica que el dispositivo tenga uno disponible.",
      );
      setIsRecording(false);
      stopStream();
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleClick = () => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  return (
    <span className="relative inline-flex">
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-md bg-destructive/40 animate-ping" />
          <span className="absolute inset-0 rounded-md bg-destructive/20 animate-pulse" />
        </>
      )}
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        aria-label={isRecording ? "Detener grabación" : "Grabar por voz"}
        className={cn("relative", isRecording && "scale-105", className)}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Mic className={cn("transition-transform duration-300", isRecording && "scale-110")} />
        )}
      </Button>
    </span>
  );
}
