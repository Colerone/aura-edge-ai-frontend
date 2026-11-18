import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./AboutPage.css";

const CONDITIONS = [
  {
    number: "01",
    name: "Acne",
    description:
      "Identifies facial image patterns that may be associated with acne-prone skin.",
  },
  {
    number: "02",
    name: "Melasma",
    description:
      "Looks for visible pigmentation patterns that may be associated with melasma.",
  },
  {
    number: "03",
    name: "Rosacea",
    description:
      "Identifies visible patterns that may be associated with facial redness and rosacea.",
  },
  {
    number: "04",
    name: "Freckle",
    description:
      "Detects small pigmented areas with visual patterns associated with freckles.",
  },
  {
    number: "05",
    name: "Wrinkle",
    description:
      "Looks for visible lines and texture patterns associated with wrinkles.",
  },
];

const WORKFLOW = [
  {
    number: "01",
    title: "Upload or scan",
    description:
      "Choose a facial image for analysis or use the real-time camera scanning feature.",
  },
  {
    number: "02",
    title: "AI visual detection",
    description:
      "The YOLO-based model analyzes the image and identifies visual patterns from the conditions supported by the system.",
  },
  {
    number: "03",
    title: "Skincare guidance",
    description:
      "A structured skincare knowledge base provides general information and care suggestions related to the detected findings.",
  },
];

const TECHNOLOGIES = [
  {
    name: "React",
    role: "Frontend interface",
    description: "Powers the interactive web experience and analysis pages.",
  },
  {
    name: "Python & FastAPI",
    role: "Backend services",
    description: "Handles image requests and connects the interface to the AI model.",
  },
  {
    name: "YOLO",
    role: "Object detection",
    description: "Finds and classifies supported visual patterns in facial images.",
  },
  {
    name: "OpenVINO",
    role: "Inference optimization",
    description: "Runs the optimized model for the real-time detection workflow.",
  },
  {
    name: "Skincare Knowledge Base",
    role: "Rule-based guidance",
    description: "Stores reviewed skincare information used by the recommendation engine.",
  },
];

function AboutPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <>
      <Navbar />

      <main className="about-page">
        {/* HERO */}
        <section className="about-hero">
          <div className="about-hero-inner">
            <div className="about-hero-copy">
              <span className="about-eyebrow">ABOUT AURA EDGE AI</span>
              <h1>A clearer way to understand facial skin findings.</h1>
              <p>
                Aura Edge AI brings facial image analysis and structured
                skincare knowledge together to make visual findings easier
                to understand.
              </p>
              <div className="about-hero-actions">
                <a className="about-primary-link" href="#about-how-it-works">
                  Explore how it works <span aria-hidden="true">→</span>
                </a>
                <Link className="about-secondary-link" to="/">
                  Back to home
                </Link>
              </div>
            </div>

            <div className="about-visual" aria-label="Illustration of an AI facial analysis scan">
              <div className="about-visual-grid" />
              <div className="about-orbit about-orbit-one" />
              <div className="about-orbit about-orbit-two" />
              <div className="about-scan-face">
                <div className="about-face-outline">
                  <span className="about-face-eye about-face-eye-left" />
                  <span className="about-face-eye about-face-eye-right" />
                  <span className="about-face-nose" />
                  <span className="about-face-mouth" />
                  <span className="about-detection-point point-one" />
                  <span className="about-detection-point point-two" />
                  <span className="about-detection-point point-three" />
                </div>
                <div className="about-scan-line" />
              </div>
              <div className="about-visual-label">
                <span className="about-visual-dot" />
                VISUAL ANALYSIS
              </div>
              <div className="about-visual-caption">AI-assisted facial skin analysis</div>
            </div>
          </div>
          <div className="about-hero-footnote">
            <span>UNDERSTAND</span>
            <span className="about-footnote-line" />
            <span>ANALYZE</span>
            <span className="about-footnote-line" />
            <span>CARE</span>
          </div>
        </section>

        {/* PURPOSE */}
        <section className="about-section about-purpose" id="about-purpose">
          <div className="about-section-heading">
            <span className="about-eyebrow">01 — OUR PURPOSE</span>
            <h2>Technology that helps make skin information easier to understand.</h2>
          </div>
          <div className="about-purpose-copy">
            <p>
              Understanding changes in facial skin can be confusing. It can
              also be difficult to know where to begin when looking for
              reliable skincare information.
            </p>
            <p>
              Aura Edge AI was developed to explore how artificial intelligence
              can assist with facial image analysis and present related
              skincare information in a clear, organized way. The project
              combines visual detection with a structured knowledge base so
              users can better understand what the system has identified and
              what general care information may be relevant.
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="about-section about-workflow" id="about-how-it-works">
          <div className="about-section-heading about-centered-heading">
            <span className="about-eyebrow">02 — HOW IT WORKS</span>
            <h2>From a facial image to understandable guidance.</h2>
            <p>
              The system follows three main steps to turn an image into a
              structured visual analysis report.
            </p>
          </div>

          <div className="about-workflow-grid">
            {WORKFLOW.map((step) => (
              <article className="about-workflow-card" key={step.number}>
                <span className="about-card-number">{step.number}</span>
                <div className="about-card-rule" />
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CONDITIONS */}
        <section className="about-section about-conditions" id="about-conditions">
          <div className="about-section-heading">
            <span className="about-eyebrow">03 — SUPPORTED CONDITIONS</span>
            <h2>Five facial skin conditions in focus.</h2>
            <p>
              Aura Edge AI is designed to identify visual patterns associated
              with the following five conditions.
            </p>
          </div>

          <div className="about-condition-grid">
            {CONDITIONS.map((condition) => (
              <article className="about-condition-card" key={condition.name}>
                <span>{condition.number}</span>
                <h3>{condition.name}</h3>
                <p>{condition.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* TECHNOLOGY */}
        <section className="about-section about-technology" id="about-technology">
          <div className="about-section-heading">
            <span className="about-eyebrow">04 — TECHNOLOGY</span>
            <h2>Built with computer vision and modern web technologies.</h2>
            <p>
              Each part of the system has a specific role, from presenting the
              interface to analyzing images and preparing skincare guidance.
            </p>
          </div>

          <div className="about-tech-list">
            {TECHNOLOGIES.map((technology, index) => (
              <article className="about-tech-row" key={technology.name}>
                <span className="about-tech-index">0{index + 1}</span>
                <div className="about-tech-main">
                  <h3>{technology.name}</h3>
                  <span>{technology.role}</span>
                </div>
                <p>{technology.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* RESPONSIBLE AI */}
        <section className="about-responsible" id="about-responsible">
          <div className="about-responsible-mark" aria-hidden="true">✓</div>
          <div>
            <span className="about-eyebrow">05 — RESPONSIBLE AI</span>
            <h2>Helpful information, with clear boundaries.</h2>
            <p>
              Aura Edge AI provides AI-assisted visual findings and general
              skincare information. It does not diagnose skin diseases,
              determine clinical severity from detection counts, or replace
              professional medical advice. AI results may be incomplete or
              inaccurate. For diagnosis or treatment decisions, consult a
              qualified dermatologist.
            </p>
          </div>
        </section>

        {/* CLOSING */}
        <section className="about-closing">
          <span className="about-eyebrow">AURA EDGE AI</span>
          <h2>Analyze with technology. Understand with knowledge.</h2>
          <Link to="/" className="about-primary-link">
            Explore Aura Edge AI <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    </>
  );
}

export default AboutPage;
