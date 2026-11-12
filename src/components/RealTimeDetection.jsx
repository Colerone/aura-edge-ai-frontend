
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RealTimeDetection.css";

// ========================================
// CONFIGURATION
// ========================================

const SCAN_DURATION = 30;
const FRAME_INTERVAL = 0;

const CAMERA_WIDTH = 1280;
const CAMERA_HEIGHT = 720;
const CAMERA_FPS = 30;

const MAX_AI_FRAME_WIDTH = 640;
const JPEG_QUALITY = 0.80;

const API_URL = "http://127.0.0.1:8001";


// ========================================
// INITIAL SCAN RESULTS
// ========================================

const createEmptyScanResults = () => ({
  framesProcessed: 0,
  bestScore: -1,
  summary: [],
  resultImage: null,
  bestFrame: null,
  bestDetections: [],
});


// ========================================
// COMPONENT
// ========================================

function RealTimeDetection() {

  const navigate = useNavigate();

  // DOM References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const liveTracksRef = useRef([]);
  // Camera References
  const streamRef = useRef(null);

  // Timer Reference
  const timerRef = useRef(null);

  // Control References
  const scanActiveRef = useRef(false);
  const finishingRef = useRef(false);
  const openingCameraRef = useRef(false);

  // Average FPS Timer
  const scanStartedAtRef = useRef(0);

  // Scan Results
  const scanResultsRef = useRef(
    createEmptyScanResults()
  );


  // ========================================
  // STATES
  // ========================================

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOpening, setCameraOpening] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [cameraFps, setCameraFps] = useState(0);

  const [remaining, setRemaining] = useState(
    SCAN_DURATION
  );

  const [error, setError] = useState("");

  const [metrics, setMetrics] = useState({
    fps: 0,
    latency: 0,
    inferenceLatency: 0,
    frames: 0,
  });


  // ========================================
  // CAMERA ERROR MESSAGES
  // ========================================

  const getCameraErrorMessage = (err) => {

    console.error("Camera Error Details:", {
      name: err.name,
      message: err.message,
      constraint: err.constraint,
    });

    switch (err.name) {

      case "NotAllowedError":
        return "Camera permission denied. Please allow camera access.";

      case "NotFoundError":
        return "No camera device was found.";

      case "NotReadableError":
        return "Camera is already being used by another application.";

      case "OverconstrainedError":
        return `Camera does not support the requested settings: ${err.constraint || "unknown constraint"}.`;

      case "AbortError":
        return "Camera initialization was interrupted. Please try again.";

      case "SecurityError":
        return "Camera access is blocked by browser security settings.";

      case "TypeError":
        return "Invalid camera configuration or camera API unavailable.";

      default:
        return `Unable to access camera (${err.name || "Unknown error"}): ${err.message || "Please check your camera."}`;

    }

  };


  // ========================================
  // STOP CAMERA STREAM
  // ========================================

  const stopCameraStream = () => {

    const stream = streamRef.current;

    if (stream) {

      stream.getTracks().forEach((track) => {

        try {
          track.stop();
        } catch (err) {
          console.warn("Camera track stop error:", err);
        }

      });

    }

    streamRef.current = null;

    const video = videoRef.current;

    if (video) {

      video.pause();
      video.srcObject = null;

    }

  };


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
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {

        setCameraReady(true);

      }

    };

    video.addEventListener(
      "loadeddata",
      markCameraReady
    );

    video.addEventListener(
      "canplay",
      markCameraReady
    );

    video.srcObject = streamRef.current;

    video.play()
      .then(() => {

        markCameraReady();

      })
      .catch((err) => {

        console.error("Camera playback error:", err);

        if (!cancelled) {

          setError(
            "Unable to start camera preview: " + err.message
          );

        }

      });

    return () => {

      cancelled = true;

      video.removeEventListener(
        "loadeddata",
        markCameraReady
      );

      video.removeEventListener(
        "canplay",
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

        // Update UI every 500ms
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
          video.requestVideoFrameCallback(measureFPS);

      };

      callbackId =
        video.requestVideoFrameCallback(measureFPS);

    } else {

      // Fallback for older browsers
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
          requestAnimationFrame(measureFallback);

      };

      rafId =
        requestAnimationFrame(measureFallback);

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


  // ========================================
  // GLOBAL CLEANUP
  // ========================================

  useEffect(() => {

    return () => {

      scanActiveRef.current = false;

      clearInterval(timerRef.current);

      stopCameraStream();

    };

  }, []);


  // ========================================
  // ESCAPE KEY
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
// BOUNDING BOX IOU
// ========================================

const calculateIoU = (a, b) => {

  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);

  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);

  const intersection =
    intersectionWidth * intersectionHeight;

  const areaA =
    Math.max(0, a.x2 - a.x1) *
    Math.max(0, a.y2 - a.y1);

  const areaB =
    Math.max(0, b.x2 - b.x1) *
    Math.max(0, b.y2 - b.y1);

  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;

};


// ========================================
// TEMPORAL DETECTION STABILIZATION
// ========================================

const stabilizeLiveDetections = (detections) => {

  const now = performance.now();

  const previousTracks = liveTracksRef.current;

  const matchedIndices = new Set();

  const nextTracks = [];

  const displayDetections = [];

  const SMOOTHING_FACTOR = 0.65;

  const HOLD_DURATION = 250;

  const MATCH_THRESHOLD = 0.10;


  // Match incoming detections with previous boxes

  detections.forEach((item) => {

    if (!item.box) return;

    let bestIndex = -1;

    let bestIoU = 0;

    previousTracks.forEach((track, index) => {

      if (matchedIndices.has(index)) return;

      if (track.class !== item.class) return;

      const iou = calculateIoU(
        track.box,
        item.box
      );

      if (iou > bestIoU) {

        bestIoU = iou;

        bestIndex = index;

      }

    });


    // Existing detection track found

    if (
      bestIndex !== -1 &&
      bestIoU >= MATCH_THRESHOLD
    ) {

      matchedIndices.add(bestIndex);

      const previous =
        previousTracks[bestIndex];

      const alpha = SMOOTHING_FACTOR;

      const smoothBox = {

        x1:
          previous.box.x1 * (1 - alpha) +
          item.box.x1 * alpha,

        y1:
          previous.box.y1 * (1 - alpha) +
          item.box.y1 * alpha,

        x2:
          previous.box.x2 * (1 - alpha) +
          item.box.x2 * alpha,

        y2:
          previous.box.y2 * (1 - alpha) +
          item.box.y2 * alpha,

      };

      const track = {

        class: item.class,

        confidence: item.confidence,

        box: smoothBox,

        lastSeen: now,

      };

      nextTracks.push(track);

      displayDetections.push({

        ...item,

        box: smoothBox,

        _opacity: 1,

      });

    } else {

      // New detection

      const track = {

        class: item.class,

        confidence: item.confidence,

        box: { ...item.box },

        lastSeen: now,

      };

      nextTracks.push(track);

      displayDetections.push({

        ...item,

        _opacity: 1,

      });

    }

  });


  // Keep temporarily missing detections

  previousTracks.forEach((track, index) => {

    if (matchedIndices.has(index)) return;

    const age = now - track.lastSeen;

    if (age <= HOLD_DURATION) {

      const opacity = Math.max(
        0.35,
        1 - (age / HOLD_DURATION) * 0.65
      );

      nextTracks.push(track);

      displayDetections.push({

        class: track.class,

        confidence: track.confidence,

        box: track.box,

        _opacity: opacity,

      });

    }

  });


  liveTracksRef.current = nextTracks;

  return displayDetections;

};

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
      !video.videoHeight ||
      !sourceWidth ||
      !sourceHeight
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

    // Match video object-fit: contain
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

    // Scale detection coordinates to original camera size
    const scaleX =
      video.videoWidth / sourceWidth;

    const scaleY =
      video.videoHeight / sourceHeight;

    detections.forEach((item) => {

      if (!item.box) return;
      ctx.globalAlpha = item._opacity ?? 1;

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

    ctx.globalAlpha = 1;

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

    setCameraOpening(true);

    setError("");

    setCameraReady(false);

    let acquiredStream = null;

    if (
      !navigator.mediaDevices?.getUserMedia
    ) {

      setError(
        "Camera requires localhost or HTTPS."
      );

      openingCameraRef.current = false;
      setCameraOpening(false);

      return;

    }

    try {

      // Release any previous stream first
      stopCameraStream();

      const constraints = {

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

      };

      acquiredStream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      // Keep a reference to the new stream
      streamRef.current = acquiredStream;

      const track =
        acquiredStream.getVideoTracks()[0];

      if (!track || track.readyState !== "live") {

        throw new Error(
          "Camera track is not active."
        );

      }

      // Camera diagnostics must never prevent camera opening
      try {

        console.log(
          "Actual Camera Settings:",
          track.getSettings?.()
        );

        if (
          typeof track.getCapabilities === "function"
        ) {

          const capabilities =
            track.getCapabilities();

          console.log(
            "CAMERA SUPPORTED CAPABILITIES:",
            {
              frameRate: capabilities.frameRate,
              width: capabilities.width,
              height: capabilities.height,
            }
          );

        }

      } catch (diagnosticError) {

        console.warn(
          "Camera diagnostic unavailable:",
          diagnosticError
        );

      }

      // Reset scan results
      scanResultsRef.current =
        createEmptyScanResults();

      // Reset performance metrics
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

      // Show fullscreen camera
      setCameraOpen(true);

    } catch (err) {

      console.error(
        "Camera initialization failed:",
        err
      );

      // IMPORTANT:
      // Stop the stream even if an error happens
      // after getUserMedia succeeds.
      if (acquiredStream) {

        acquiredStream
          .getTracks()
          .forEach((track) => {

            try {
              track.stop();
            } catch (stopError) {
              console.warn(stopError);
            }

          });

      }

      if (streamRef.current === acquiredStream) {
        streamRef.current = null;
      }

      setCameraOpen(false);

      setCameraReady(false);

      setError(
        getCameraErrorMessage(err)
      );

    } finally {

      openingCameraRef.current = false;

      setCameraOpening(false);

    }

  };


  // ========================================
  // CLOSE CAMERA
  // ========================================

  const closeCamera = () => {

    scanActiveRef.current = false;
    liveTracksRef.current = [];
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

    setError("");

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

      // Downscale only the AI image
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

      // JPEG compression
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

      // Original captured image
      ctx.drawImage(
        bitmap,
        0,
        0
      );

      const scale = Math.max(
        bitmap.width / 640,
        bitmap.height / 360
      );

      ctx.lineWidth = Math.max(
        2,
        2 * scale
      );

      ctx.font =
        `bold ${Math.max(13, 13 * scale)}px Arial`;

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

    // Capture camera frame
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

    // Request timeout
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

          detail = errorData.detail || "";

        } catch {
          // Non-JSON error response
        }

        throw new Error(
          `Prediction failed: ${response.status} ${detail}`
        );

      }

      data = await response.json();

    } finally {

      clearTimeout(timeoutId);

    }

    // Ignore late results after camera closes
    if (!scanActiveRef.current) {
      return;
    }

    // Total browser request time
    const latency =
      performance.now() - requestStart;

    const detections =
      Array.isArray(data.detections)
        ? data.detections
        : [];

    // Group detections
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

    // Draw live bounding boxes
   const stableDetections =
  stabilizeLiveDetections(detections);

drawDetections(
  stableDetections,
  width,
  height
);

    // Count successful frames
    scanResultsRef.current.framesProcessed += 1;

    // Keep only the best detection frame
    // Avoid repeatedly creating annotated images
    if (
      detections.length >
      scanResultsRef.current.bestScore
    ) {

      scanResultsRef.current.bestScore =
        detections.length;

      scanResultsRef.current.summary =
        summary;

      scanResultsRef.current.bestFrame =
        file;

      scanResultsRef.current.bestDetections =
        detections.map((item) => ({
          ...item,
          box: item.box
            ? { ...item.box }
            : null,
        }));

    }

    if (!scanActiveRef.current) {
      return;
    }

    // Average AI FPS since scan started
    const completedAt = performance.now();

    const elapsedSeconds = Math.max(
      (completedAt - scanStartedAtRef.current) / 1000,
      0.001
    );

    const currentFPS = Number(
      (
        scanResultsRef.current.framesProcessed /
        elapsedSeconds
      ).toFixed(1)
    );

    // Update metrics
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

  const finishScan = async () => {

    if (finishingRef.current) return;

    finishingRef.current = true;

    scanActiveRef.current = false;

    clearInterval(timerRef.current);

    timerRef.current = null;

    setScanning(false);

    const scan = scanResultsRef.current;

    // Stop camera before creating final image
    stopCameraStream();

    setCameraOpen(false);

    setCameraReady(false);

    if (
      scan.framesProcessed === 0 ||
      !scan.bestFrame
    ) {

      setError(
        "No frames were successfully analyzed. Please try again."
      );

      finishingRef.current = false;

      return;

    }

    try {

      // Create final annotated image once
      const resultImage =
        await createAnnotatedImage(
          scan.bestFrame,
          scan.bestDetections
        );

      scanResultsRef.current.resultImage =
        resultImage;

      navigate(
        "/realtime-analysis",
        {
          state: {
            source: "realtime",
            summary: scan.summary,
            resultImage,
            framesProcessed: scan.framesProcessed,
          },
        }
      );

    } catch (err) {

      console.error(
        "Final image creation failed:",
        err
      );

      setError(
        "Unable to create the final detection image."
      );

      finishingRef.current = false;

    }

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

      // Immediate next request after success
      // Short delay after errors
      const delay = successful
        ? FRAME_INTERVAL
        : 500;

      const remainingTime = Math.max(
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

      await finishScan();

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

    scanResultsRef.current =
      createEmptyScanResults();
      liveTracksRef.current = [];

    // Start average FPS timer
    scanStartedAtRef.current =
      performance.now();

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

    // Start sequential detection
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
      (
        (SCAN_DURATION - remaining) /
        SCAN_DURATION
      ) * 100
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
            disabled={cameraOpen || cameraOpening}
          >

            {cameraOpening
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

              <span>AI FPS (AVG)</span>

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


      {/* Hidden Capture Canvas */}

      <canvas
        ref={canvasRef}
        hidden
      />

    </section>

  );

}

export default RealTimeDetection;
