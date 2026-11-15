
import { SKINCARE_KNOWLEDGE } from "../data/skincareKnowledge";


// ======================================
// NORMALIZE MODEL CLASS NAMES
// ======================================

const CLASS_ALIASES = {
  acne: "Acne",
  melasma: "Melasma",
  rosacea: "Rosacea",

  freckle: "Freckle",
  freckles: "Freckle",

  wrinkle: "Wrinkle",
  wrinkles: "Wrinkle",

  normal: "Normal"
};


export const normalizeCondition = (diseaseName) => {

  const key = String(diseaseName || "")
    .trim()
    .toLowerCase();

  return CLASS_ALIASES[key] || "Unknown";

};


// ======================================
// GENERATE RECOMMENDATION
// ======================================

export const getRecommendation = (
  diseaseName,
  count
) => {

  const conditionKey =
    normalizeCondition(diseaseName);

  const knowledge =
    SKINCARE_KNOWLEDGE[conditionKey] ||
    SKINCARE_KNOWLEDGE.Unknown;

  const safeCount = Math.max(
    0,
    Math.floor(Number(count) || 0)
  );

  const paragraphs = knowledge.paragraphs.map(
    (paragraph) =>
      paragraph.replaceAll(
        "{{count}}",
        String(safeCount)
      )
  );

  return {

    conditionName: knowledge.label,

    paragraphs,

    // Keep references available for future
    // knowledge review. These are not displayed
    // as product recommendations.

    sources: knowledge.sources || []

  };

};
