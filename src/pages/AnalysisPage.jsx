
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";

import Navbar from "../components/Navbar";
import { getRecommendation } from "../utils/recommendationEngine";

import "./AnalysisPage.css";


// ======================================
// CONFIGURATION
// ======================================

const API_URL = "http://127.0.0.1:8000";



const renderFormattedText = (text) => {
  if (typeof text !== "string") return text;

  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {

    if (part.startsWith("**") && part.endsWith("**")) {

      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );

    }

    return part;

  });
};


// ======================================
// COMPONENT
// ======================================

function AnalysisPage() {

  const location = useLocation();
  const navigate = useNavigate();

  const file = location.state?.file;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState("");


  // ======================================
  // ANALYZE IMAGE
  // ======================================

  useEffect(() => {

    if (!file) {

      navigate("/", { replace: true });

      return;

    }

    const controller = new AbortController();

    let isMounted = true;

    let progressTimer = null;
    let finishTimer = null;


    // Progress Animation
    progressTimer = setInterval(() => {

      setProgress((previous) => {

        if (previous >= 95) {
          return 95;
        }

        return Math.min(
          95,
          previous + Math.floor(Math.random() * 5) + 1
        );

      });

    }, 180);


    const analyzeImage = async () => {

      try {

        const formData = new FormData();

        formData.append("file", file);


        const response = await fetch(
          `${API_URL}/predict`,
          {
            method: "POST",
            body: formData,
            signal: controller.signal
          }
        );


        if (!response.ok) {

          throw new Error(
            `Analysis failed: ${response.status}`
          );

        }


        const data = await response.json();


        if (!isMounted) return;


        clearInterval(progressTimer);

        setProgress(100);


        finishTimer = setTimeout(() => {

          if (!isMounted) return;

          setResult(data);

          setLoading(false);

        }, 600);


      } catch (error) {

        if (error.name === "AbortError") return;

        console.error(
          "Image Analysis Error:",
          error
        );


        if (!isMounted) return;

        clearInterval(progressTimer);

        setAnalysisError(
          "Unable to analyze this image. Please try again."
        );

        setLoading(false);

      }

    };


    analyzeImage();


    return () => {

      isMounted = false;

      controller.abort();

      clearInterval(progressTimer);

      clearTimeout(finishTimer);

    };

  }, [file, navigate]);


  // ======================================
  // DOWNLOAD PDF REPORT
  // ======================================

  const handleDownloadPDF = () => {

    const element = document.getElementById(
      "printable-report"
    );

    if (!element) return;


    const options = {

      margin: [8, 8, 8, 8],

      filename: `Aura_Edge_AI_Report_${Date.now()}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      }

    };


    html2pdf()
      .set(options)
      .from(element)
      .save();

  };


  // ======================================
  // DOWNLOAD RESULT IMAGE
  // ======================================

  const handleDownloadImage = async () => {

    if (!result?.result_image) return;


    try {

      const imageUrl =
        `${API_URL}${result.result_image}`;


      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("Image download failed.");
      }


      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download =
        `Aura_Edge_AI_Result_${Date.now()}.jpg`;


      document.body.appendChild(link);

      link.click();

      link.remove();


      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);


    } catch (error) {

      console.error(
        "Download failed:",
        error
      );

      alert("Cannot download image.");

    }

  };


  // ======================================
  // LOADING SCREEN
  // ======================================

  if (loading) {

    return (

      <>
        <Navbar />

        <div className="analysis-loading">

          <div className="loader-circle">

            <div className="loader-spinner" />

            <span>{progress}%</span>

          </div>


          <h2>Analyzing Your Skin</h2>


          <p>

            {progress < 30 &&
              "Uploading facial image..."}

            {progress >= 30 &&
              progress < 60 &&
              "Detecting facial skin conditions..."}

            {progress >= 60 &&
              progress < 90 &&
              "Analyzing detected regions..."}

            {progress >= 90 &&
              "Preparing skincare recommendations..."}

          </p>


          <div className="progress-bar">

            <div
              className="progress-fill"
              style={{
                width: `${progress}%`
              }}
            />

          </div>

        </div>

      </>

    );

  }


  // ======================================
  // ERROR SCREEN
  // ======================================

  if (analysisError || !result) {

    return (

      <>
        <Navbar />

        <div className="analysis-loading">

          <h2>Analysis Unsuccessful</h2>

          <p>
            {analysisError || "No analysis result available."}
          </p>

          <button
            className="download-btn"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>

        </div>

      </>

    );

  }


  // ======================================
  // GROUP DETECTIONS
  // ======================================

  const detections = Array.isArray(result.detections)
    ? result.detections
    : [];


  const groupedDetections = detections.reduce(
    (accumulator, item) => {

      const disease = item.class || "Unknown";

      if (!accumulator[disease]) {
        accumulator[disease] = [];
      }

      accumulator[disease].push(item);

      return accumulator;

    },
    {}
  );


  // ======================================
  // GENERATE CONDITION REPORTS
  // ======================================

  const detectedDiseases = Object.entries(
    groupedDetections
  ).map(([diseaseName, items]) => {

    const count = items.length;

    return {

      diseaseName,

      count,

      recommendation: getRecommendation(
        diseaseName,
        count
      )

    };

  });


  // ======================================
  // MAIN UI
  // ======================================

  return (

    <>
      <Navbar />

      <main className="analysis-page">

        <div
          className="analysis-container"
          id="printable-report"
        >


          {/* LEFT SIDE */}

          <div className="analysis-left">

            <div className="image-card">

              {result.result_image && (

                <img
                  src={`${API_URL}${result.result_image}`}
                  alt="AI Skin Detection Result"
                  className="detection-image"
                  crossOrigin="anonymous"
                />

              )}

            </div>

          </div>


          {/* RIGHT SIDE */}

          <div className="analysis-right">

            <div className="report-card">

              <h3 className="report-header">
                Aura Edge AI Report
              </h3>


              {detectedDiseases.length === 0 ? (

                <div className="no-detection-message">

                  <h2>No Target Condition Detected</h2>

                  <p>
                    When this image was analyzed using AI, no specific skin conditions were detected. However, the fact that the AI ​​did not detect anything does not confirm that there are absolutely no skin issues present.
                  </p>

                  <p>
                   If you have any concerns regarding your skin, you should consult a dermatologist.
                  </p>

                </div>

              ) : (

                detectedDiseases.map((item, index) => (

                  <div
                    key={`${item.diseaseName}-${index}`}
                    className="disease-block"
                  >


                    {/* CONDITION HEADER */}

                    <div className="disease-header">

                      <h2 className="disease-title">
                        {item.recommendation.conditionName}
                      </h2>

                      <span className="detection-status-badge">
                        AI Detected
                      </span>

                    </div>


                    {/* DETECTED COUNT */}

                    <div className="stats-row">

                      <p>

                        <strong>
                          Detected Areas:
                        </strong>

                        {" "}

                        <span>
                          {item.count}
                        </span>

                      </p>

                    </div>


                    {/* SINGLE RECOMMENDATION BOX */}

                    <div className="recommendation-box">

                      <h4 className="recommendation-title">
                        Recommendations
                      </h4>


                      <div className="recommendation-content">

                        {item.recommendation.paragraphs.map(
                          (paragraph, paragraphIndex) => (

                           <p key={paragraphIndex}>
  {renderFormattedText(paragraph)}
</p>

                          )
                        )}

                      </div>

                    </div>


                  </div>

                ))

              )}


              {/* IMPORTANT DISCLAIMER */}

              <div className="recommendation-disclaimer">

                <h4>
                  Important Note
                </h4>

                <p>
                 These results provide general recommendations based on visual findings—analyzed from facial images by an AI model—and a skincare knowledge base. They do not constitute a medical diagnosis and cannot replace professional medical treatment. For an accurate assessment of your skin condition, it is best to consult with a dermatologist.
                </p>

              </div>


            </div>


            {/* ACTION BUTTONS */}

            <div className="action-buttons">

              <button
                className="download-btn"
                onClick={handleDownloadPDF}
              >
                📄 Download PDF Report
              </button>


              <button
                className="download-btn secondary"
                onClick={handleDownloadImage}
              >
                🖼️ Download Image Only
              </button>


              <button
                className="download-btn secondary"
                onClick={() => navigate("/")}
              >
                Analyze Another Image
              </button>

            </div>


          </div>

        </div>

      </main>

    </>

  );

}


export default AnalysisPage;
