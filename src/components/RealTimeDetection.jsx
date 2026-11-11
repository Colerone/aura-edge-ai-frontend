
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RealTimeDetection.css";

// ========================================
// CONFIGURATION
// ========================================

const SCAN_DURATION = 30;

// No additional waiting between successful requests.
// Requests remain sequential (one request at a time).
const FRAME_INTERVAL = 0;

// Camera configuration
const CAMERA_WIDTH = 1280;
const CAMERA_HEIGHT = 720;
const CAMERA_FPS = 60;

// Maximum image width sent to the AI backend
const MAX_AI_FRAME_WIDTH = 1280;

// JPEG compression quality
const JPEG_QUALITY = 0.80;

// API
const API_URL = "http://127.0.0.1:8001";


// ========================================
// COMPONENT
// ========================================

function RealTimeDetection() {

  const navigate = useNavigate();

  // DOM references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Camera and timer references
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Control references
  const finishingRef = useRef(false);
  const scanActiveRef = useRef(false);
  const openingCameraRef = useRef(false);

  // FPS timestamps
  const fpsTimestampsRef = useRef([]);

  // Scan result storage
  const scanResultsRef = useRef({
    framesProcessed: 0,
    bestScore: -1,
    summary: [],
    resultImage: null,
  });


  // ========================================
  // STATES
  // ========================================

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


  // ========================================
  // CAMERA ATTACHMENT
  // ========================================

  useEffect(() => {

    if (
      !cameraOpen ||
      !streamRef.current ||
      !videoRef.current
    ) {
      return;
    }

    const video = videoRef.current;

    let cancelled = false;

    const markCameraReady = () => {

      if (
        !cancelled &&
        video.readyState >= 2
      ) {
        setCameraReady(true);
      }

    };

    // Wait until an actual video frame is available
    video.addEventListener(
      "loadeddata",
      markCameraReady
    );

    video.srcObject = streamRef.current;

    video.play()
      .then(() => {
        markCameraReady();
      })
      .catch((err) => {

        console.error(
          "Camera playback error:",
          err
        );

        if (!cancelled) {
          setError(
            "Unable to start camera preview."
          );
        }

      });

    return () => {

      cancelled = true;

      video.removeEventListener(
        "loadeddata",
        markCameraReady
      );

    };

  }, [cameraOpen]);


  // ========================================
  // CAMERA FPS MONITOR
  // ========================================

  useEffect(() => {

    if (!cameraReady) return;

    const video = videoRef.current;

    if (!video) return;

    let active = true;

    let callbackId = null;
    let rafId = null;

    let lastUIUpdate = 0;

    const timestamps = [];

    // Modern browser API
    if (
      typeof video.requestVideoFrameCallback === "function"
    ) {

      const measureFPS = (now) => {

        if (!active) return;

        timestamps.push(now);

        while (
          timestamps.length > 2 &&
          now - timestamps[0] > 1000
        ) {
          timestamps.shift();
        }

        // Update React state only every 500ms
        if (
          timestamps.length >= 2 &&
          now - lastUIUpdate >= 500
        ) {

          const elapsed =
            timestamps[timestamps.length - 1] -
            timestamps[0];

          if (elapsed > 0) {

            const fps = Math.round(
              ((timestamps.length - 1) * 1000) /
              elapsed
            );

            setCameraFps(fps);

          }

          lastUIUpdate = now;

        }

        callbackId =
          video.requestVideoFrameCallback(
            measureFPS
          );

      };

      callbackId =
        video.requestVideoFrameCallback(
          measureFPS
        );

    } else {

      // Fallback
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

        rafId =
          requestAnimationFrame(
            measureFallback
          );

      };

      rafId =
        requestAnimationFrame(
          measureFallback
        );

    }

    return () => {

      active = false;

      if (
        callbackId !== null &&
        video.cancelVideoFrameCallback
      ) {

        video.cancelVideoFrameCallback(
          callbackId
        );

      }

      if (rafId !== null) {

        cancelAnimationFrame(rafId);

      }

    };

  }, [cameraReady]);


  // ========================================
  // GLOBAL CLEANUP
  // ========================================

  useEffect(() => {

    return () => {

      scanActiveRef.current = false;

      clearInterval(timerRef.current);

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;

    };

  }, []);


  // ========================================
  // ESCAPE TO CLOSE CAMERA
  // ========================================

  useEffect(() => {

    if (!cameraOpen) return;

    const handleEscape = (e) => {

      if (e.key === "Escape") {
        closeCamera();
      }

    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {

      window.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, [cameraOpen]);


  // ========================================
  // DRAW AI BOUNDING BOXES
  // ========================================

  const drawDetections = (
    detections,
    sourceWidth,
    sourceHeight
  ) => {

    const video = videoRef.current;

    const canvas = overlayCanvasRef.current;

    if (
      !video ||
      !canvas ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return;
    }

    const container = canvas.parentElement;

    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;

    const targetWidth = Math.round(width * dpr);
    const targetHeight = Math.round(height * dpr);

    // Avoid unnecessary canvas reallocations
    if (
      canvas.width !== targetWidth ||
      canvas.height !== targetHeight
    ) {

      canvas.width = targetWidth;
      canvas.height = targetHeight;

    }

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    // Match object-fit: contain
    const displayScale = Math.min(
      width / video.videoWidth,
      height / video.videoHeight
    );

    const renderedWidth =
      video.videoWidth * displayScale;

    const renderedHeight =
      video.videoHeight * displayScale;

    const offsetX =
      (width - renderedWidth) / 2;

    const offsetY =
      (height - renderedHeight) / 2;

    // Convert AI image coordinates to camera coordinates
    const scaleX =
      video.videoWidth / sourceWidth;

    const scaleY =
      video.videoHeight / sourceHeight;

    detections.forEach((item) => {

      if (!item.box) return;

      const x1 =
        offsetX +
        item.box.x1 * scaleX * displayScale;

      const y1 =
        offsetY +
        item.box.y1 * scaleY * displayScale;

      const x2 =
        offsetX +
        item.box.x2 * scaleX * displayScale;

      const y2 =
        offsetY +
        item.box.y2 * scaleY * displayScale;

      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;

      if (
        boxWidth <= 0 ||
        boxHeight <= 0
      ) {
        return;
      }

      const label =
        `${item.class} ${(
          item.confidence * 100
        ).toFixed(0)}%`;

      ctx.strokeStyle = "#39D98A";
      ctx.lineWidth = 2.5;

      ctx.strokeRect(
        x1,
        y1,
        boxWidth,
        boxHeight
      );

      ctx.font = "600 13px Arial";

      const textWidth =
        ctx.measureText(label).width;

      const labelHeight = 23;

      const labelY = Math.max(
        0,
        y1 - labelHeight
      );

      ctx.fillStyle = "#176B49";

      ctx.fillRect(
        x1,
        labelY,
        textWidth + 14,
        labelHeight
      );

      ctx.fillStyle = "#FFFFFF";

      ctx.fillText(
        label,
        x1 + 7,
        labelY + 16
      );

    });

  };


  // ========================================
  // OPEN CAMERA
  // ========================================

  const openCamera = async () => {

    if (
      openingCameraRef.current ||
      cameraOpen
    ) {
      return;
    }

    openingCameraRef.current = true;

    setError("");

    setCameraReady(false);

    if (
      !navigator.mediaDevices?.getUserMedia
    ) {

      setError(
        "Camera requires localhost or HTTPS."
      );

      openingCameraRef.current = false;

      return;

    }

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({

          audio: false,

          video: {

            facingMode: {
              ideal: "user",
            },

            width: {
              ideal: CAMERA_WIDTH,
            },

            height: {
              ideal: CAMERA_HEIGHT,
            },

            frameRate: {
              ideal: CAMERA_FPS,
              max: CAMERA_FPS,
            },

          },

        });

      streamRef.current = stream;

      const track =
        stream.getVideoTracks()[0];

      // Check actual hardware camera settings
      console.log(
        "Actual Camera Settings:",
        track.getSettings()
      );

      // Reset scan results
      scanResultsRef.current = {

        framesProcessed: 0,
        bestScore: -1,
        summary: [],
        resultImage: null,

      };

      fpsTimestampsRef.current = [];

      setCameraFps(0);

      setMetrics({

        fps: 0,
        latency: 0,
        frames: 0,
        inferenceLatency: 0,

      });

      finishingRef.current = false;

      scanActiveRef.current = false;

      setRemaining(SCAN_DURATION);

      setScanning(false);

      setCameraOpen(true);

    } catch (err) {

      console.error(
        "Camera access error:",
        err
      );

      setError(
        err.name === "NotAllowedError"
          ? "Please allow camera permission in your browser."
          : err.name === "NotFoundError"
          ? "No camera device was found."
          : "Unable to access your camera."
      );

      streamRef.current = null;

    } finally {

      openingCameraRef.current = false;

    }

  };


  // ========================================
  // STOP CAMERA
  // ========================================

  const stopCameraStream = () => {

    if (streamRef.current) {

      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

    }

    streamRef.current = null;

    if (videoRef.current) {

      videoRef.current.pause();

      videoRef.current.srcObject = null;

    }

  };


  // ========================================
  // CLOSE CAMERA
  // ========================================

  const closeCamera = () => {

    scanActiveRef.current = false;

    clearInterval(timerRef.current);

    timerRef.current = null;

    stopCameraStream();

    setCameraOpen(false);

    setCameraReady(false);

    setScanning(false);

    setCameraFps(0);

    setRemaining(SCAN_DURATION);

    setMetrics({

      fps: 0,
      latency: 0,
      frames: 0,
      inferenceLatency: 0,

    });

    finishingRef.current = false;

  };


  // ========================================
  // CAPTURE WEBCAM FRAME
  // ========================================

  const captureFrame = () => {

    return new Promise((resolve, reject) => {

      const video = videoRef.current;

      const canvas = canvasRef.current;

      if (
        !video ||
        !canvas ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {

        reject(
          new Error("Camera image is not ready.")
        );

        return;

      }

      // Downscale only the AI frame.
      // Keep the original camera preview unchanged.
      const resizeScale = Math.min(
        1,
        MAX_AI_FRAME_WIDTH / video.videoWidth
      );

      const captureWidth = Math.round(
        video.videoWidth * resizeScale
      );

      const captureHeight = Math.round(
        video.videoHeight * resizeScale
      );

      canvas.width = captureWidth;
      canvas.height = captureHeight;

      const ctx = canvas.getContext("2d", {
        alpha: false,
      });

      if (!ctx) {

        reject(
          new Error("Image processing failed.")
        );

        return;

      }

      // Mirror captured image
      ctx.save();

      ctx.translate(canvas.width, 0);

      ctx.scale(-1, 1);

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.restore();

      // Compress JPEG
      canvas.toBlob(

        (blob) => {

          if (!blob) {

            reject(
              new Error("Unable to capture image.")
            );

            return;

          }

          const file = new File(
            [blob],
            "realtime-frame.jpg",
            {
              type: "image/jpeg",
            }
          );

          resolve({

            file,
            width: captureWidth,
            height: captureHeight,

          });

        },

        "image/jpeg",

        JPEG_QUALITY

      );

    });

  };


  // ========================================
  // CREATE FINAL ANNOTATED IMAGE
  // ========================================

  const createAnnotatedImage = async (
    file,
    detections
  ) => {

    const bitmap =
      await createImageBitmap(file);

    try {

      const canvas =
        document.createElement("canvas");

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {

        throw new Error(
          "Unable to create result image."
        );

      }

      // Draw captured webcam frame
      ctx.drawImage(
        bitmap,
        0,
        0
      );

      const scale = Math.max(
        bitmap.width / 640,
        bitmap.height / 640
      );

      ctx.lineWidth = Math.max(
        2,
        2 * scale
      );

      ctx.font =
        `bold ${Math.max(14, 13 * scale)}px Arial`;

      detections.forEach((item) => {

        if (!item.box) return;

        const {
          x1,
          y1,
          x2,
          y2,
        } = item.box;

        const width = x2 - x1;
        const height = y2 - y1;

        if (
          width <= 0 ||
          height <= 0
        ) {
          return;
        }

        const label =
          `${item.class} ${(
            item.confidence * 100
          ).toFixed(0)}%`;

        ctx.strokeStyle = "#39D98A";

        ctx.strokeRect(
          x1,
          y1,
          width,
          height
        );

        const labelWidth =
          ctx.measureText(label).width +
          14 * scale;

        const labelHeight =
          24 * scale;

        const labelY = Math.max(
          0,
          y1 - labelHeight
        );

        ctx.fillStyle = "#176B49";

        ctx.fillRect(
          x1,
          labelY,
          labelWidth,
          labelHeight
        );

        ctx.fillStyle = "#FFFFFF";

        ctx.fillText(
          label,
          x1 + 7 * scale,
          labelY + 17 * scale
        );

      });

      return canvas.toDataURL(
        "image/jpeg",
        0.9
      );

    } finally {

      bitmap.close();

    }

  };


  // ========================================
  // ANALYZE ONE FRAME
  // ========================================

  const analyzeFrame = async () => {

    const requestStart = performance.now();

    // Capture image
    const captured = await captureFrame();

    const {
      file,
      width,
      height,
    } = captured;

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    // Prevent indefinitely hanging requests
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      15000
    );

    let response;

    let data;

    try {

      response = await fetch(
        `${API_URL}/realtime/predict`,
        {

          method: "POST",

          body: formData,

          signal: controller.signal,

        }
      );

      if (!response.ok) {

        let detail = "";

        try {

          const errorData = await response.json();

          detail =
            errorData.detail || "";

        } catch {
          // Response may not be JSON
        }

        throw new Error(
          `Prediction failed: ${response.status} ${detail}`
        );

      }

      data = await response.json();

    } finally {

      clearTimeout(timeoutId);

    }

    // Stop processing if the camera was closed
    if (!scanActiveRef.current) {
      return;
    }

    // Total capture + upload + server + response time
    const latency =
      performance.now() - requestStart;

    const detections =
      Array.isArray(data.detections)
        ? data.detections
        : [];

    // Group detections by disease
    const grouped = detections.reduce(
      (acc, item) => {

        const disease = item.class;

        acc[disease] =
          (acc[disease] || 0) + 1;

        return acc;

      },
      {}
    );

    const summary =
      Object.entries(grouped).map(
        ([diseaseName, count]) => ({

          diseaseName,
          count,

        })
      );

    // Update bounding boxes
    drawDetections(
      detections,
      width,
      height
    );

    // Update analyzed frame count
    scanResultsRef.current.framesProcessed += 1;

    // Save frame with the most detections
    if (
      detections.length >
      scanResultsRef.current.bestScore
    ) {

      const annotatedImage =
        await createAnnotatedImage(
          file,
          detections
        );

      scanResultsRef.current.bestScore =
        detections.length;

      scanResultsRef.current.summary =
        summary;

      scanResultsRef.current.resultImage =
        annotatedImage;

    }

    if (!scanActiveRef.current) {
      return;
    }

    // Measure completed AI processing FPS
    const completedAt = performance.now();

    fpsTimestampsRef.current =
      fpsTimestampsRef.current.filter(
        (time) => completedAt - time < 1000
      );

    fpsTimestampsRef.current.push(
      completedAt
    );

    const currentFPS =
      fpsTimestampsRef.current.length;

    // Update performance metrics
    setMetrics({

      fps: currentFPS,

      latency: latency.toFixed(1),

      inferenceLatency: Number(
        data.performance?.inference_ms ?? 0
      ).toFixed(1),

      frames:
        scanResultsRef.current.framesProcessed,

    });

    setError("");

  };


  // ========================================
  // FINISH SCAN
  // ========================================

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

    if (
      scan.framesProcessed === 0 ||
      !scan.resultImage
    ) {

      setError(
        "No frames were successfully analyzed. Please try again."
      );

      finishingRef.current = false;

      return;

    }

    navigate(
      "/realtime-analysis",
      {

        state: {

          source: "realtime",

          summary: scan.summary,

          resultImage: scan.resultImage,

          framesProcessed: scan.framesProcessed,

        },

      }
    );

  };


  // ========================================
  // PROCESS FRAMES SEQUENTIALLY
  // ========================================

  const runScan = async (endTime) => {

    while (

      scanActiveRef.current &&
      Date.now() < endTime

    ) {

      let successful = false;

      try {

        await analyzeFrame();

        successful = true;

      } catch (err) {

        console.error(
          "Frame detection failed:",
          err
        );

        if (scanActiveRef.current) {

          setError(
            err.name === "AbortError"
              ? "AI request timed out. Please check the backend."
              : err.message
          );

        }

      }

      if (!scanActiveRef.current) {
        return;
      }

      // No unnecessary waiting after successful requests.
      // Keep a short retry delay only when an error occurs.
      const delay = successful
        ? FRAME_INTERVAL
        : 500;

      const remainingTime =
        Math.max(
          0,
          endTime - Date.now()
        );

      if (remainingTime <= 0) {
        break;
      }

      await new Promise((resolve) => {

        setTimeout(
          resolve,
          Math.min(delay, remainingTime)
        );

      });

    }

    if (scanActiveRef.current) {
      finishScan();
    }

  };


  // ========================================
  // START SCAN
  // ========================================

  const startScan = () => {

    if (
      !cameraReady ||
      scanning ||
      scanActiveRef.current
    ) {
      return;
    }

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

    setCameraFps(0);

    setMetrics({

      fps: 0,
      latency: 0,
      frames: 0,
      inferenceLatency: 0,

    });

    setError("");

    setRemaining(SCAN_DURATION);

    setScanning(true);

    const endTime =
      Date.now() + SCAN_DURATION * 1000;

    // Countdown
    timerRef.current = setInterval(() => {

      const seconds = Math.max(

        0,

        Math.ceil(
          (endTime - Date.now()) / 1000
        )

      );

      setRemaining(seconds);

      if (seconds === 0) {

        clearInterval(timerRef.current);

        timerRef.current = null;

      }

    }, 100);

    // Start sequential inference
    void runScan(endTime);

  };


  // ========================================
  // AUTO START WHEN CAMERA IS READY
  // ========================================

  useEffect(() => {

    if (cameraReady) {
      startScan();
    }

  }, [cameraReady]);


  // ========================================
  // PROGRESS
  // ========================================

  const progress = Math.max(

    0,

    Math.min(

      100,

      ((SCAN_DURATION - remaining) /
        SCAN_DURATION) * 100

    )

  );


  // ========================================
  // UI
  // ========================================

  return (

    <section
      className="realtime-section"
      id="realtime"
    >

      <div className="realtime-container">

        <div className="realtime-header">

          <span>
            AI-POWERED SKIN ANALYSIS
          </span>

          <h2>
            Real-Time Facial Skin Detection
          </h2>

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

            <h3>
              Ready to analyze your skin?
            </h3>

            <p>
              Open your camera to begin the facial skin scan.
              Your detection results and recommendations
              will appear on the next page.
            </p>

          </div>


          {error && !cameraOpen && (

            <div className="realtime-error">

              {error}

            </div>

          )}


          <button
            className="open-camera-button"
            onClick={openCamera}
            disabled={cameraOpen}
          >

            {openingCameraRef.current
              ? "Opening Camera..."
              : "Open Camera"}

            <span>→</span>

          </button>


          <p className="camera-permission">

            Camera access requires your permission.

          </p>

        </div>

      </div>


      {/* ==================================
          FULLSCREEN WEBCAM
      ================================== */}

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


          {/* Countdown */}

          <div className="webcam-countdown">

            <span>
              SCAN TIME
            </span>

            <strong>

              00:{String(remaining).padStart(2, "0")}

            </strong>

            <div className="webcam-countdown-track">

              <div
                className="webcam-countdown-progress"
                style={{
                  width: `${progress}%`,
                }}
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

              <strong>
                {cameraFps}
              </strong>

            </div>


            <div className="webcam-metric">

              <span>AI FPS</span>

              <strong>
                {metrics.fps}
              </strong>

            </div>


            <div className="webcam-metric">

              <span>TOTAL LATENCY</span>

              <strong>
                {metrics.latency} ms
              </strong>

            </div>


            <div className="webcam-metric">

              <span>AI INFERENCE</span>

              <strong>
                {metrics.inferenceLatency} ms
              </strong>

            </div>


            <div className="webcam-metric">

              <span>FRAMES ANALYZED</span>

              <strong>
                {metrics.frames}
              </strong>

            </div>

          </div>


          {/* API Error Display */}

          {error && (

            <div
              style={{
                position: "absolute",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(140, 35, 35, 0.9)",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                zIndex: 20,
                maxWidth: "90%",
                textAlign: "center",
              }}
            >

              {error}

            </div>

          )}


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


      {/* Hidden capture canvas */}

      <canvas
        ref={canvasRef}
        hidden
      />

    </section>

  );

}

export default RealTimeDetection;
