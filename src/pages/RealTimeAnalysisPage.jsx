
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./RealTimeAnalysisPage.css";

const API_URL = "http://127.0.0.1:8000";

function getRecommendation(disease, count) {
  switch (disease) {
    case "Acne":
      if (count <= 5) {
        return {
          severity: "Mild",
          ingredients: ["Salicylic Acid", "Niacinamide"],
          treatment: [
            "Cleanse your face twice daily.",
            "Use a lightweight moisturizer.",
            "Apply SPF 30+ sunscreen every morning.",
          ],
        };
      }

      if (count <= 15) {
        return {
          severity: "Moderate",
          ingredients: [
            "Salicylic Acid",
            "Niacinamide",
            "Benzoyl Peroxide",
          ],
          treatment: [
            "Avoid squeezing pimples.",
            "Use an acne treatment every night.",
            "Consult a dermatologist if acne persists.",
          ],
        };
      }

      return {
        severity: "Severe",
        ingredients: [
          "Benzoyl Peroxide",
          "Adapalene",
          "Niacinamide",
        ],
        treatment: [
          "Multiple acne lesions detected.",
          "Professional dermatologist consultation is recommended.",
          "Prescription medication may be required.",
        ],
      };

    case "Freckle":
    case "Freckles":
      return count <= 10
        ? {
            severity: "Light",
            ingredients: ["Vitamin C", "Niacinamide"],
            treatment: [
              "Wear sunscreen daily.",
              "Avoid prolonged UV exposure.",
            ],
          }
        : {
            severity: "Extensive",
            ingredients: [
              "Vitamin C",
              "Tranexamic Acid",
              "Retinol",
            ],
            treatment: [
              "Use SPF50 sunscreen.",
              "Consider professional skin consultation.",
            ],
          };

    case "Melasma":
      return {
        severity: count < 5 ? "Mild" : "Moderate",
        ingredients: [
          "Tranexamic Acid",
          "Vitamin C",
          "Niacinamide",
        ],
        treatment: [
          "Avoid direct sunlight.",
          "Use SPF50 every day.",
          "Apply brightening serum.",
        ],
      };

    case "Rosacea":
      return {
        severity: count < 5 ? "Mild" : "Moderate",
        ingredients: [
          "Azelaic Acid",
          "Ceramide",
          "Centella Asiatica",
        ],
        treatment: [
          "Avoid spicy food.",
          "Use gentle cleanser.",
          "Keep skin moisturized.",
        ],
      };

    case "Wrinkle":
      return {
        severity: "Detected",
        ingredients: [
          "Retinol",
          "Hyaluronic Acid",
          "Peptides",
        ],
        treatment: [
          "Use moisturizer regularly.",
          "Apply sunscreen daily.",
          "Consider a gentle retinol skincare routine.",
        ],
      };

  //   default:
  //     return {
  //       severity: "Normal",
  //       ingredients: [
  //         "Gentle Cleanser",
  //         "Moisturizer",
  //         "Sunscreen",
  //       ],
  //       treatment: [
  //         "Maintain a basic skincare routine daily.",
  //       ],
  //     };
  // }

        default:
          return {
            severity: "Detected",
            ingredients: [],
            treatment: [
              "Recommendation is not configured for this condition yet.",
            ],
          };
        }
}

function RealTimeAnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const scanData = location.state;

  const summary = scanData?.summary || [];
  const resultImage = scanData?.resultImage || null;
  const framesProcessed = scanData?.framesProcessed || 0;

  const validScan =
    scanData?.source === "realtime" &&
    Array.isArray(scanData?.summary);

  useEffect(() => {
    if (!validScan) {
      navigate("/", { replace: true });
    }
  }, [validScan, navigate]);

  if (!validScan) {
    return null;
  }

  const imageUrl = resultImage || null;

  const detectedDiseases = summary.map((item) => ({
    ...item,
    recommendation: getRecommendation(
      item.diseaseName,
      item.count
    ),
  }));

  const totalDetections = summary.reduce(
    (total, item) => total + Number(item.count || 0),
    0
  );

  const handleDownloadImage = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("Unable to download image.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Aura_Edge_RealTime_${Date.now()}.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Cannot download detection image.");
    }
  };

  return (
    <>
      <Navbar />

      <main className="realtime-analysis-page">
        <div className="realtime-analysis-container">

          {/* HEADER */}

          <div className="realtime-analysis-header">
            <span>AI-POWERED SKIN ANALYSIS</span>
            <h1>Real-Time Analysis Report</h1>
            <p>
              Your facial skin scanning session has been completed.
            </p>
          </div>

          {/* SCAN SUMMARY */}

          <div className="realtime-summary">
            <div className="realtime-summary-card">
              <strong>30s</strong>
              <span>Scan Duration</span>
            </div>

            <div className="realtime-summary-card">
              <strong>{framesProcessed}</strong>
              <span>Frames Analyzed</span>
            </div>

            <div className="realtime-summary-card">
              <strong>{totalDetections}</strong>
              <span>Total Detections</span>
            </div>
          </div>

          {/* RESULT CONTENT */}

          <div className="realtime-result-layout">

            {/* LEFT: DETECTION IMAGE */}

            <div className="realtime-result-left">
              <div className="realtime-result-image-card">
                <h3>AI Detection Result</h3>

                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Real-time skin detection result"
                    className="realtime-result-image"
                  />
                ) : (
                  <div className="realtime-no-image">
                    Detection image unavailable.
                  </div>
                )}

                {imageUrl && (
                  <button
                    className="realtime-download-button"
                    onClick={handleDownloadImage}
                  >
                    Download Detection Image
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT: RECOMMENDATIONS */}

            <div className="realtime-result-right">

              <div className="realtime-report-card">
                <h3 className="realtime-report-title">
                  Aura Edge AI Report
                </h3>

                {detectedDiseases.length === 0 ? (
                  <div className="realtime-no-disease">
                    <h3>No Skin Conditions Detected</h3>
                    <p>
                      No target skin conditions were identified
                      during this scanning session.
                    </p>
                  </div>
                ) : (
                  detectedDiseases.map((item, index) => (
                    <div
                      key={index}
                      className="realtime-disease-block"
                    >
                      <div className="realtime-disease-header">
                        <h2>{item.diseaseName}</h2>

                        <span
                          className={`realtime-severity ${
                            item.recommendation.severity.toLowerCase()
                          }`}
                        >
                          {item.recommendation.severity}
                        </span>
                      </div>

                      <div className="realtime-disease-count">
                        <strong>Detected Areas:</strong>
                        <span>{item.count}</span>
                      </div>

                      <h4>Recommended Ingredients</h4>

                      {item.recommendation.ingredients.map(
                        (ingredient, idx) => (
                          <p
                            className="realtime-list-item"
                            key={idx}
                          >
                            ✓ {ingredient}
                          </p>
                        )
                      )}

                      <h4>Treatment Recommendation</h4>

                      {item.recommendation.treatment.map(
                        (treatment, idx) => (
                          <p
                            className="realtime-list-item"
                            key={idx}
                          >
                            ✓ {treatment}
                          </p>
                        )
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ACTION */}

          <div className="realtime-report-actions">
            <button
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>

          <p className="realtime-disclaimer">
            AI-generated results are for informational purposes
            only and are not a substitute for professional
            dermatological diagnosis.
          </p>

        </div>
      </main>
    </>
  );
}

export default RealTimeAnalysisPage;
