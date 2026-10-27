import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Upload, CheckCircle2, AlertCircle, X, ScanLine } from "lucide-react";
import { useFormContent } from "../lib/useFormContent";

interface DocumentScannerProps {
  onCapture: (file: File | null) => void;
  documentLabel: string;
  capturedPreview?: string;
}

export function DocumentScanner({ onCapture, documentLabel, capturedPreview }: DocumentScannerProps) {
  const { text } = useFormContent();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerViewRef = useRef<HTMLDivElement>(null);
  const scanFrameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string>();
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [localPreview, setLocalPreview] = useState<string>();
  const [videoAspectRatio, setVideoAspectRatio] = useState("4 / 3");

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  const captureFile = useCallback((file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : undefined;
    setLocalPreview(previewRef.current);
    if (!file && fileInputRef.current) fileInputRef.current.value = "";
    if (file) stopStream();
    onCapture(file);
  }, [onCapture, stopStream]);

  const startCamera = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamActive(true);
    } catch {
      stopStream();
      setError(
        text("Could not access the camera. Please grant camera permission or choose an image below.")
      );
    } finally {
      setStarting(false);
    }
  }, [stopStream, text]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const scannerView = scannerViewRef.current;
    const scanFrame = scanFrameRef.current;
    if (!video || !scannerView || !scanFrame || !streamRef.current) return;
    if (!video.videoWidth || !video.videoHeight) {
      setError(text("The scanner camera is not ready yet. Please wait and try again."));
      return;
    }
    const viewBounds = scannerView.getBoundingClientRect();
    const frameBounds = scanFrame.getBoundingClientRect();
    const scale = Math.min(viewBounds.width / video.videoWidth, viewBounds.height / video.videoHeight);
    const displayedWidth = video.videoWidth * scale;
    const displayedHeight = video.videoHeight * scale;
    const offsetX = (viewBounds.width - displayedWidth) / 2;
    const offsetY = (viewBounds.height - displayedHeight) / 2;
    const sourceX = Math.max(0, (frameBounds.left - viewBounds.left - offsetX) / scale);
    const sourceY = Math.max(0, (frameBounds.top - viewBounds.top - offsetY) / scale);
    const sourceWidth = Math.min(video.videoWidth - sourceX, frameBounds.width / scale);
    const sourceHeight = Math.min(video.videoHeight - sourceY, frameBounds.height / scale);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth);
    canvas.height = Math.round(sourceHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError(text("Could not prepare the document scan. Please try again."));
      return;
    }
    ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError(text("Could not create the document scan. Please try again."));
        return;
      }
      const file = new File([blob], `identity-scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      captureFile(file);
      stopStream();
    }, "image/jpeg", 0.9);
  }, [captureFile, stopStream, text]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) captureFile(file);
  };

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const preview = capturedPreview ?? localPreview;
  if (preview) {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={preview} alt={`${documentLabel} scan`} className="max-h-72 w-full object-contain" />
          <button
            type="button"
            onClick={() => captureFile(null)}
            className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white"
          >
            {text("Scan again")}
          </button>
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> {text("Scan captured")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-scanner">
      <p className="document-scanner-instructions"><ScanLine size={16} aria-hidden="true" /> {text("Place the full [document] inside the frame. Keep it flat, well lit, and in focus. Review the scan to confirm all details are clear.").replaceAll("[document]", documentLabel.toLowerCase())}</p>
      <div ref={scannerViewRef} className="document-scanner-view" style={{ aspectRatio: videoAspectRatio }}>
        {streamActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label={`${documentLabel} camera preview`}
            onLoadedMetadata={(event) => setVideoAspectRatio(`${event.currentTarget.videoWidth} / ${event.currentTarget.videoHeight}`)}
          />
        ) : (
          <div className="document-scanner-placeholder">
            <Camera size={40} aria-hidden="true" />
            <p>{starting ? text("Starting scanner...") : text("Document scanner preview")}</p>
          </div>
        )}
        <div ref={scanFrameRef} className="document-scan-frame" aria-hidden="true" />
        {streamActive && (
          <button
            type="button"
            onClick={stopStream}
            className="absolute right-3 top-3 rounded-lg bg-black/50 p-1.5 text-white transition hover:bg-black/70"
            aria-label={text("Close camera")}
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
            {starting ? text("Starting...") : text("Open document scanner")}
          </button>
        ) : (
          <button
            type="button"
            onClick={capture}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            {text("Scan document")}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          {text("Choose image")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
