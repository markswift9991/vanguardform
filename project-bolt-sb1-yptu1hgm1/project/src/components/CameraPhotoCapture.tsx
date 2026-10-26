import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Upload, CheckCircle2, AlertCircle, X } from "lucide-react";

interface CameraPhotoCaptureProps {
  onCapture: (file: File) => void;
  capturedPreview?: string;
}

export function CameraPhotoCapture({ onCapture, capturedPreview }: CameraPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamActive(true);
    } catch (err) {
      setError(
        "Could not access the camera. Please grant camera permission or use the upload option below."
      );
    } finally {
      setStarting(false);
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1024;
    canvas.height = video.videoHeight || 768;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `nin-doc-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      stopStream();
    }, "image/jpeg", 0.9);
  }, [onCapture, stopStream]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  };

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  if (capturedPreview) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={capturedPreview} alt="NIN document" className="max-h-72 w-full object-contain" />
          <button
            type="button"
            onClick={() => onCapture(new File([], "clear"))}
            className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white"
          >
            Retake
          </button>
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Captured
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 aspect-[4/3] flex items-center justify-center">
        {streamActive ? (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Camera className="h-10 w-10" />
            <p className="text-sm">{starting ? "Starting camera..." : "Camera preview"}</p>
          </div>
        )}
        {streamActive && (
          <button
            type="button"
            onClick={stopStream}
            className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 text-white transition hover:bg-black/70"
            aria-label="Close camera"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!streamActive ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            {starting ? "Starting..." : "Open Camera"}
          </button>
        ) : (
          <button
            type="button"
            onClick={capture}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            Capture Photo
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
