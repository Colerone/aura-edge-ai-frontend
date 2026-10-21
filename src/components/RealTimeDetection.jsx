
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RealTimeDetection.css";
import scanPreview from "../assets/hero.png";

const DURATION = 30;

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
  const [remaining, setRemaining] = useState(DURATION);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  // Attach the camera stream after the fullscreen video mounts.
  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    video.play()
      .then(() => setCameraReady(true))
      .catch((err) => {
        console.error("Unable to play camera:", err);
        setError("Unable to start video preview. Please try again.");
      });
  }, [cameraOpen]);

  // Release all camera resources when leaving this component.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopCamera = () => {
    clearTimer();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraReady(false);
    setScanning(false);
    setProcessing(false);
  };

  const openCamera = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires localhost or a secure HTTPS connection.");
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
      setRemaining(DURATION);
      setCameraOpen(true);
    } catch (err) {
      console.error("Camera access error:", err);

      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser."
          : "Unable to access the camera. Check your webcam and try again."
      );
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
      throw new Error("The camera frame is not ready.");
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create an image canvas.");
    }

    // Match the mirrored webcam preview in the captured image.
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not create the captured image."));
            return;
          }

          resolve(
            new File([blob], "realtime-capture.jpg", {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.92
      );
    });
  };

  const finishScan = async () => {
    if (finishingRef.current) return;

    finishingRef.current = true;
    clearTimer();
    setScanning(false);
    setProcessing(true);

    try {
      const file = await captureFrame();

      stopCamera();

      navigate("/analysis", {
        state: {
          file,
          source: "realtime",
        },
      });
    } catch (err) {
      console.error("Capture error:", err);
      setError("Unable to capture the image. Please try scanning again.");
      setProcessing(false);
      finishingRef.current = false;
    }
  };

  const startScan = () => {
    if (!cameraReady || scanning || processing) return;

    setError("");
    setRemaining(DURATION);
    setScanning(true);
    finishingRef.current = false;

    const endTime = Date.now() + DURATION * 1000;

    timerRef.current = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
      );

      setRemaining(secondsLeft);

      if (secondsLeft === 0) {
        finishScan();
      }
    }, 200);
  };

  const handleStopScan = () => {
    clearTimer();
    setScanning(false);
    setRemaining(DURATION);
    finishingRef.current = false;
  };

  const progress = ((DURATION - remaining) / DURATION) * 100;

  return (
    <section className="realtime-section" id="realtime">
      <div className="realtime-container">

        <header className="realtime-header">
          <span className="realtime-eyebrow">
            AI-POWERED SKIN ANALYSIS
          </span>

          <h2>Real-Time Facial Skin Detection</h2>

          <p>
            Scan your facial skin for 30 seconds
            and explore personalized skincare recommendations.
          </p>
        </header>

        <div className="realtime-layout">

          {/* STATIC PREVIEW */}
          <div className="realtime-camera-card">
            <div className="realtime-preview">

              <img
                className="realtime-preview-image"
                src={scanPreview}
                alt="Illustration of AI facial skin scanning"
              />

              <div className="preview-vignette" />

              <div className="preview-status">
                <span className="preview-status-dot" />
                READY TO SCAN
              </div>

              <div className="preview-bottom-label">
                <span className="preview-pulse" />
                AI FACIAL SKIN ANALYSIS
              </div>
            </div>

            <div className="preview-caption">
              <div>
                <strong>See your skin more clearly.</strong>
                <p>
                  Get comfortable, face the camera,
                  and begin your scan.
                </p>
              </div>

              <span className="preview-duration">30 SEC</span>
            </div>
          </div>

          {/* REPLACEMENT FOR HOW IT WORKS */}
          <aside className="scan-overview">

            <div className="overview-heading">
              <span className="overview-heading-icon">✳</span>

              <div>
                <h3>Skin Analysis</h3>
                <p>Your real-time scan overview</p>
              </div>
            </div>

            <div className="overview-duration">
              <div>
                <span>SCAN DURATION</span>
                <strong>30 seconds</strong>
              </div>

              <div className="duration-clock">◷</div>
            </div>

            <div className="overview-divider" />

            <span className="overview-label">
              SKIN CONDITIONS
            </span>

            <div className="condition-list">
              {["Acne", "Melasma", "Rosacea", "Freckle", "Wrinkle"].map(
                (condition) => (
                  <div className="condition-item" key={condition}>
                    <span className="condition-dot" />
                    <span>{condition}</span>
                  </div>
                )
              )}
            </div>

            <div className="overview-note">
              <span className="privacy-icon">♧</span>

              <p>
                Your camera will only activate after you give permission.
                You can close the camera whenever you need to.
              </p>
            </div>

            {error && (
              <div className="realtime-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="realtime-start-button"
              onClick={openCamera}
              disabled={cameraOpen || processing}
            >
              <span>Open Camera</span>
              <span className="button-arrow">↗</span>
            </button>

            <p className="overview-footnote">
              Results appear on the next page.
            </p>
          </aside>
        </div>

        <div className="realtime-info-bar">
          <div className="realtime-info-item">
            <span className="info-symbol">◷</span>
            <div>
              <strong>30-Second Scan</strong>
              <span>A fixed scan session</span>
            </div>
          </div>

          <div className="realtime-info-item">
            <span className="info-symbol">◎</span>
            <div>
              <strong>5 Skin Conditions</strong>
              <span>Acne, Melasma, Rosacea, Freckle, Wrinkle</span>
            </div>
          </div>

          <div className="realtime-info-item">
            <span className="info-symbol">↗</span>
            <div>
              <strong>Personalized Recommendations</strong>
              <span>Results and skincare guidance on the next page</span>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} hidden />
      </div>

      {/* FULLSCREEN WEBCAM */}
      {cameraOpen && (
        <div className="webcam-fullscreen" role="dialog" aria-modal="true">

          <video
            ref={videoRef}
            className="webcam-fullscreen-video"
            autoPlay
            muted
            playsInline
          />

          <div className="webcam-screen-shade" />

          <div className="webcam-topbar">
            <div className="webcam-brand">
              <span className="webcam-brand-mark">✳</span>
              <div>
                <strong>Aura Edge AI</strong>
                <span>Real-Time Facial Skin Detection</span>
              </div>
            </div>

            <button
              className="webcam-close"
              onClick={stopCamera}
              aria-label="Close camera"
              title="Close camera"
            >
              ×
            </button>
          </div>

          {/* No face box: a full-screen horizontal scan effect */}
          {scanning && <div className="webcam-scan-line" />}

          <div className="webcam-center-status">
            <span className={`webcam-live-dot ${scanning ? "active" : ""}`} />

            {processing
              ? "PREPARING CAPTURE"
              : scanning
              ? "SKIN SCAN IN PROGRESS"
              : cameraReady
              ? "CAMERA READY"
              : "STARTING CAMERA"}
          </div>

          <div className="webcam-bottom-panel">
            <div className="webcam-timer">
              <span>{scanning ? "TIME REMAINING" : "SCAN DURATION"}</span>

              <strong>
                00:{String(remaining).padStart(2, "0")}
              </strong>

              <div className="webcam-progress-track">
                <div
                  className="webcam-progress-fill"
                  style={{ width: `${scanning ? progress : 0}%` }}
                />
              </div>
            </div>

            <div className="webcam-controls">
              {!scanning ? (
                <button
                  className="webcam-start"
                  onClick={startScan}
                  disabled={!cameraReady || processing}
                >
                  {processing ? "Preparing..." : "Start 30-Second Scan"}
                </button>
              ) : (
                <button
                  className="webcam-stop"
                  onClick={handleStopScan}
                >
                  Stop Scan
                </button>
              )}

              <button
                className="webcam-exit"
                onClick={stopCamera}
              >
                Close Camera
              </button>
            </div>

            <p className="webcam-hint">
              Keep a comfortable distance from your screen.
              No face-positioning box is required.
            </p>

            {error && <p className="webcam-error">{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

export default RealTimeDetection;
