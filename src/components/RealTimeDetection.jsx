
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RealTimeDetection.css";

const SCAN_DURATION = 30;
const FRAME_INTERVAL = 200;
const API_URL = "http://127.0.0.1:8000";

function RealTimeDetection() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const finishingRef = useRef(false);
  const scanActiveRef = useRef(false);
  const fpsTimestampsRef = useRef([]);

  const scanResultsRef = useRef({
    framesProcessed: 0,
    bestScore: -1,
    summary: [],
    resultImage: null,
  });

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraFps, setCameraFps] = useState(0);
  const [remaining, setRemaining] = useState(SCAN_DURATION);
  const [error, setError] = useState("");

  const [metrics, setMetrics] = useState({
  fps: 0,
  latency: 0,
  inferenceLatency: 0,
  frames: 0,
});

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

  // Measure actual webcam display FPS
useEffect(() => {
  if (!cameraReady) return;

  const video = videoRef.current;
  if (!video) return;

  let active = true;
  let callbackId = null;
  let rafId = null;

  const timestamps = [];

  if (typeof video.requestVideoFrameCallback === "function") {
    const measureFPS = (now) => {
      if (!active) return;

      timestamps.push(now);

      while (
        timestamps.length > 2 &&
        now - timestamps[0] > 1000
      ) {
        timestamps.shift();
      }

      if (timestamps.length >= 2) {
        const elapsed =
          timestamps[timestamps.length - 1] -
          timestamps[0];

        if (elapsed > 0) {
          setCameraFps(
            Math.round(
              ((timestamps.length - 1) * 1000) / elapsed
            )
          );
        }
      }

      callbackId = video.requestVideoFrameCallback(measureFPS);
    };

    callbackId = video.requestVideoFrameCallback(measureFPS);

  } else {
    // Fallback for browsers without requestVideoFrameCallback
    let lastTime = -1;
    let startTime = performance.now();
    let frameCount = 0;

    const measureFallback = () => {
      if (!active) return;

      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        frameCount++;
      }

      const now = performance.now();

      if (now - startTime >= 1000) {
        setCameraFps(frameCount);
        frameCount = 0;
        startTime = now;
      }

      rafId = requestAnimationFrame(measureFallback);
    };

    rafId = requestAnimationFrame(measureFallback);
  }

  return () => {
    active = false;

    if (
      callbackId !== null &&
      video.cancelVideoFrameCallback
    ) {
      video.cancelVideoFrameCallback(callbackId);
    }

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}, [cameraReady]);

  // Cleanup
  useEffect(() => {
    return () => {
      scanActiveRef.current = false;
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

  // Draw AI bounding boxes
  const drawDetections = (detections) => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Match the video object-fit: contain layout
    const scale = Math.min(
      width / video.videoWidth,
      height / video.videoHeight
    );

    const renderedWidth = video.videoWidth * scale;
    const renderedHeight = video.videoHeight * scale;

    const offsetX = (width - renderedWidth) / 2;
    const offsetY = (height - renderedHeight) / 2;

    detections.forEach((item) => {
      if (!item.box) return;

      const x1 = offsetX + item.box.x1 * scale;
      const y1 = offsetY + item.box.y1 * scale;
      const x2 = offsetX + item.box.x2 * scale;
      const y2 = offsetY + item.box.y2 * scale;

      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;

      if (boxWidth <= 0 || boxHeight <= 0) return;

      const label = `${item.class} ${(
        item.confidence * 100
      ).toFixed(0)}%`;

      ctx.strokeStyle = "#39D98A";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x1, y1, boxWidth, boxHeight);

      ctx.font = "600 13px Arial";

      const textWidth = ctx.measureText(label).width;
      const labelHeight = 23;
      const labelY = Math.max(0, y1 - labelHeight);

      ctx.fillStyle = "#176B49";
      ctx.fillRect(
        x1,
        labelY,
        textWidth + 14,
        labelHeight
      );

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(label, x1 + 7, labelY + 16);
    });
  };

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
          facingMode: { ideal: "user" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: {
            ideal: 30,
            max: 30,
          },
        },
      });

      streamRef.current = stream;

      scanResultsRef.current = {
        framesProcessed: 0,
        bestScore: -1,
        summary: [],
        resultImage: null,
      };

      fpsTimestampsRef.current = [];

      setMetrics({
        fps: 0,
        latency: 0,
        frames: 0,
        inferenceLatency: 0,
      });

      finishingRef.current = false;
      scanActiveRef.current = false;

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

  // Stop camera
  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Close camera
  const closeCamera = () => {
    scanActiveRef.current = false;

    clearInterval(timerRef.current);
    timerRef.current = null;

    stopCameraStream();

    setCameraOpen(false);
    setCameraReady(false);
    setScanning(false);
    setRemaining(SCAN_DURATION);

    finishingRef.current = false;
  };

  // Capture webcam frame
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

      // Mirror the captured image
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to capture image."));
            return;
          }

          resolve(
            new File([blob], "realtime-frame.jpg", {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.90
      );
    });
  };

  // Send frame to INT8 backend
  const analyzeFrame = async () => {
    const requestStart = performance.now();

    const file = await captureFrame();

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Prediction failed: ${response.status}`);
    }

    const data = await response.json();

    const latency = performance.now() - requestStart;
    const detections = data.detections || [];

    // Count detections by class in this frame
    const grouped = detections.reduce((acc, item) => {
      const disease = item.class;
      acc[disease] = (acc[disease] || 0) + 1;
      return acc;
    }, {});

    const summary = Object.entries(grouped).map(
      ([diseaseName, count]) => ({
        diseaseName,
        count,
      })
    );

    // Update live bounding boxes
    drawDetections(detections);

    // Calculate actual AI processing rate over recent 1 second
    const completedAt = performance.now();

    fpsTimestampsRef.current = [
      ...fpsTimestampsRef.current.filter(
        (time) => completedAt - time < 1000
      ),
      completedAt,
    ];

    const currentFPS = fpsTimestampsRef.current.length;

    scanResultsRef.current.framesProcessed += 1;

    setMetrics({
  fps: currentFPS,
  latency: latency.toFixed(1),
  inferenceLatency: Number(
    data.performance?.inference_ms ?? 0
  ).toFixed(1),
  frames: scanResultsRef.current.framesProcessed,
});

    // Save the frame with the most detections
    if (detections.length > scanResultsRef.current.bestScore) {
      scanResultsRef.current.bestScore = detections.length;
      scanResultsRef.current.summary = summary;
      scanResultsRef.current.resultImage = data.result_image;
    }
  };

  // Finish scan
  const finishScan = () => {
    if (finishingRef.current) return;

    finishingRef.current = true;
    scanActiveRef.current = false;

    clearInterval(timerRef.current);
    timerRef.current = null;

    setScanning(false);

    const scan = scanResultsRef.current;

    stopCameraStream();

    setCameraOpen(false);
    setCameraReady(false);

    if (scan.framesProcessed === 0 || !scan.resultImage) {
      setError("No frames were successfully analyzed. Please try again.");
      finishingRef.current = false;
      return;
    }

    navigate("/realtime-analysis", {
      state: {
        source: "realtime",
        summary: scan.summary,
        resultImage: scan.resultImage,
        framesProcessed: scan.framesProcessed,
      },
    });
  };

  // Process frames sequentially
  const runScan = async (endTime) => {
    while (
      scanActiveRef.current &&
      Date.now() < endTime
    ) {
      try {
        await analyzeFrame();
      } catch (err) {
        console.error("Frame detection failed:", err);
      }

      if (!scanActiveRef.current) return;

      const delay = Math.min(
        FRAME_INTERVAL,
        Math.max(0, endTime - Date.now())
      );

      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }

    if (scanActiveRef.current) {
      finishScan();
    }
  };

  // Start scanning
  const startScan = () => {
    if (!cameraReady || scanning) return;

    clearInterval(timerRef.current);

    finishingRef.current = false;
    scanActiveRef.current = true;

    scanResultsRef.current = {
      framesProcessed: 0,
      bestScore: -1,
      summary: [],
      resultImage: null,
    };

    fpsTimestampsRef.current = [];

    setMetrics({
      fps: 0,
      latency: 0,
      frames: 0,
      inferenceLatency: 0,
    });

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
        clearInterval(timerRef.current);
      }
    }, 100);

    runScan(endTime);
  };

  // Automatically start after camera is ready
  useEffect(() => {
    if (cameraReady) {
      startScan();
    }
  }, [cameraReady]);

  const progress = ((SCAN_DURATION - remaining) / SCAN_DURATION) * 100;

  return (
    <section className="realtime-section" id="realtime">

      <div className="realtime-container">

        <div className="realtime-header">
          <span>AI-POWERED SKIN ANALYSIS</span>

          <h2>Real-Time Facial Skin Detection</h2>

          <p>
            Analyze your facial skin through a 30-second
            AI scanning session.
          </p>
        </div>

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

      {/* FULLSCREEN WEBCAM WITH AI OVERLAY */}

      {cameraOpen && (
        <div className="webcam-fullscreen">

          <video
            ref={videoRef}
            className="webcam-video"
            autoPlay
            muted
            playsInline
          />

          {/* AI Bounding Boxes */}
          <canvas
            ref={overlayCanvasRef}
            className="webcam-overlay-canvas"
          />

          {/* Countdown: Top Right */}
          <div className="webcam-countdown">
            <span>SCAN TIME</span>
            <strong>
              00:{String(remaining).padStart(2, "0")}
            </strong>
            <div className="webcam-countdown-track">
              <div
                className="webcam-countdown-progress"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

            {/* Performance Metrics */}



        <div className="webcam-performance">

  <div className="webcam-live-label">
    <span className="webcam-live-dot" />
    LIVE AI DETECTION
  </div>

  <div className="webcam-metric">
    <span>CAMERA FPS</span>
    <strong>{cameraFps}</strong>
  </div>

  <div className="webcam-metric">
    <span>AI FPS</span>
    <strong>{metrics.fps}</strong>
  </div>

  <div className="webcam-metric">
    <span>API LATENCY</span>
    <strong>{metrics.latency} ms</strong>
  </div>

  <div className="webcam-metric">
    <span>AI INFERENCE</span>
    <strong>{metrics.inferenceLatency} ms</strong>
  </div>

  <div className="webcam-metric">
    <span>FRAMES ANALYZED</span>
    <strong>{metrics.frames}</strong>
  </div>

</div>

          {/* Close Camera */}
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
