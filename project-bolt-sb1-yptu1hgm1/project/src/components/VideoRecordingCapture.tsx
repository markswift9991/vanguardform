import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Circle, RotateCcw, Square } from "lucide-react";
import { useFormContent } from "../lib/useFormContent";

interface VideoRecordingCaptureProps {
  fullName: string;
  nin: string;
  script: string;
  riderName?: string;
  onCapture: (file: File | null) => void;
}

const maxRecordingMs = 60_000;

function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function VideoRecordingCapture({ fullName, nin, script, riderName, onCapture }: VideoRecordingCaptureProps) {
  const { text } = useFormContent();
  const cameraRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<string>();
  const onCaptureRef = useRef(onCapture);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const clearPreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = undefined;
    setPreview("");
    onCaptureRef.current(null);
  }, []);

  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state === "recording") recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const openCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(text("This browser cannot record video. Open the form in a modern browser with camera access."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        await cameraRef.current.play();
      }
      setCameraOpen(true);
    } catch {
      stopStream();
      setError(text("Camera and microphone access is required. Allow access in your browser settings and try again."));
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setError("");
    clearPreview();
    try {
      const mimeType = recordingMimeType();
      const recorder = new MediaRecorder(streamRef.current, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 900_000,
        audioBitsPerSecond: 64_000,
      });
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
        setRecording(false);
        const recordedType = recorder.mimeType || chunksRef.current[0]?.type || "video/webm";
        const type = recordedType.split(";", 1)[0].trim().toLowerCase();
        const extension = type.includes("mp4") ? "mp4" : type.includes("quicktime") ? "mov" : "webm";
        const file = new File(chunksRef.current, `verification-${Date.now()}.${extension}`, { type });
        if (file.size > 50 * 1024 * 1024) {
          setError(text("The recording is larger than the 50 MB upload limit. Record a shorter video and try again."));
          return;
        }
        previewRef.current = URL.createObjectURL(file);
        setPreview(previewRef.current);
        onCaptureRef.current(file);
        stopStream();
      };
      recorder.onerror = () => {
        if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
        setRecording(false);
        setError(text("Video recording failed. Please reopen the camera and try again."));
        stopStream();
      };
      recorder.start(1000);
      setRecording(true);
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
        setRecording(false);
      }, maxRecordingMs);
    } catch {
      setError(text("Could not start video recording. Please check camera permissions and try again."));
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const retake = () => {
    clearPreview();
    setError("");
  };

  const resolvedScript = text(script)
    .replaceAll("[Full Name]", fullName.trim() || text("your full name"))
    .replaceAll("[NIN Number]", nin.trim() || text("your NIN number"))
    .replaceAll("[Rider Full Name]", riderName?.trim() || text("the rider's full name"));

  return (
    <div className="video-capture">
      <div className="video-prompt">
        <strong><Camera size={16} aria-hidden="true" /> {text("Read this aloud on camera")}</strong>
        <p>“{resolvedScript}”</p>
      </div>
      <div className="video-preview">
        {preview ? (
          <video src={preview} controls playsInline aria-label={text("Recorded video verification")} />
        ) : cameraOpen ? (
          <video ref={cameraRef} autoPlay muted playsInline aria-label={text("Live camera preview")} />
        ) : (
          <div className="video-placeholder"><Camera size={38} aria-hidden="true" /><span>{text("Camera preview will appear here")}</span></div>
        )}
        {recording && <span className="recording-indicator"><Circle size={11} fill="currentColor" /> {text("Recording (up to 60 seconds)")}</span>}
      </div>
      {error && <div className="video-error" role="alert"><AlertCircle size={16} />{error}</div>}
      {preview ? (
        <div className="video-actions"><span className="video-captured"><CheckCircle2 size={16} /> {text("Video recorded")}</span><button className="button button-secondary" type="button" onClick={retake}><RotateCcw size={16} /> {text("Record again")}</button></div>
      ) : recording ? (
        <button className="button button-danger" type="button" onClick={stopRecording}><Square size={15} fill="currentColor" /> {text("Stop recording")}</button>
      ) : cameraOpen ? (
        <button className="button button-primary" type="button" onClick={startRecording}><Circle size={15} fill="currentColor" /> {text("Start recording")}</button>
      ) : (
        <button className="button button-primary" type="button" onClick={() => void openCamera()}><Camera size={16} /> {text("Open camera")}</button>
      )}
    </div>
  );
}
