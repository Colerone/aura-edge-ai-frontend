
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RealTimeDetection.css";

const SCAN_DURATION = 30;

function RealTimeDetection() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const finishingRef = useRef(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [remaining, setRemaining] = useState(SCAN_DURATION);
  const [error, setError] = useState("");

  // Attach camera
  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    let cancelled = false;

    video.srcObject = streamRef.current;

    video.play()
      .then(() => {
        if (!cancelled) setCameraReady(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setError("Unable to start camera preview.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cameraOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  // Escape to close
  useEffect(() => {
    if (!cameraOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") closeCamera();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [cameraOpen]);

  // Open camera
  const openCamera = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera requires localhost or HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      setRemaining(SCAN_DURATION);
      setCameraOpen(true);

    } catch (err) {
      console.error(err);

      setError(
        err.name === "NotAllowedError"
          ? "Please allow camera permission in your browser."
          : "Unable to access your camera."
      );
    }
  };

  // Close camera
  const closeCamera = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraReady(false);
    setScanning(false);
    setRemaining(SCAN_DURATION);
    finishingRef.current = false;
  };

  // Capture final frame
  const captureFrame = () => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        reject(new Error("Camera image is not ready."));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Image processing failed."));
        return;
      }

      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Unable to capture image."));
          return;
        }

        resolve(
          new File([blob], "realtime-capture.jpg", {
            type: "image/jpeg",
          })
        );
      }, "image/jpeg", 0.92);
    });
  };

  // Finish scan
  const finishScan = async () => {
    if (finishingRef.current) return;

    finishingRef.current = true;
    clearInterval(timerRef.current);

    setScanning(false);

    try {
      const file = await captureFrame();

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;

      navigate("/analysis", {
        state: {
          file,
          source: "realtime",
        },
      });

    } catch (err) {
      console.error(err);
      setError("Unable to capture image. Please try again.");
      finishingRef.current = false;
      setScanning(false);
    }
  };

  // Start 30-second scan
  const startScan = () => {
    if (!cameraReady || scanning) return;

    clearInterval(timerRef.current);
    finishingRef.current = false;

    setError("");
    setRemaining(SCAN_DURATION);
    setScanning(true);

    const endTime = Date.now() + SCAN_DURATION * 1000;

    timerRef.current = setInterval(() => {
      const seconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
      );

      setRemaining(seconds);

      if (seconds === 0) {
        finishScan();
      }
    }, 200);
  };

  const stopScan = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;

    setScanning(false);
    setRemaining(SCAN_DURATION);
    finishingRef.current = false;
  };

  const progress =
    ((SCAN_DURATION - remaining) / SCAN_DURATION) * 100;

  return (
    <section className="realtime-section" id="realtime">

      <div className="realtime-container">

        {/* HEADER */}

        <div className="realtime-header">
          <span>AI-POWERED SKIN ANALYSIS</span>

          <h2>Real-Time Facial Skin Detection</h2>

          <p>
            Analyze your facial skin through a 30-second
            AI scanning session.
          </p>
        </div>

        {/* SIMPLE INFORMATION */}

        <div className="realtime-content">

          <div className="scan-statistics">

            <div className="stat-item">
              <strong>30s</strong>
              <span>Scan Duration</span>
            </div>

            <div className="stat-divider" />

            <div className="stat-item">
              <strong>05</strong>
              <span>Skin Conditions</span>
            </div>

          </div>

          <div className="skin-conditions">
            <span>Acne</span>
            <i>•</i>
            <span>Melasma</span>
            <i>•</i>
            <span>Rosacea</span>
            <i>•</i>
            <span>Freckle</span>
            <i>•</i>
            <span>Wrinkle</span>
          </div>

          <div className="scan-description">
            <h3>Ready to analyze your skin?</h3>

            <p>
              Open your camera to begin the facial skin scan.
              Your detection results and recommendations
              will appear on the next page.
            </p>
          </div>

          {error && (
            <div className="realtime-error">
              {error}
            </div>
          )}

          <button
            className="open-camera-button"
            onClick={openCamera}
            disabled={cameraOpen}
          >
            Open Camera
            <span>→</span>
          </button>

          <p className="camera-permission">
            Camera access requires your permission.
          </p>

        </div>

      </div>

{/* FULLSCREEN WEBCAM ONLY */}

{cameraOpen && (
  <div className="webcam-fullscreen">

    <video
      ref={videoRef}
      className="webcam-video"
      autoPlay
      muted
      playsInline
    />

    {/* Minimal close control */}
    <button
      className="webcam-close-minimal"
      onClick={closeCamera}
      aria-label="Close camera"
      title="Close camera"
    >
      ×
    </button>

  </div>
)}

<canvas ref={canvasRef} hidden />


    </section>
  );
}

export default RealTimeDetection;
