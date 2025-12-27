import { GoogleGenAI, Type } from "@google/genai";
import { PatientProfile, SymptomLog, Medication, MedicalRecord, AnalysisResult } from "../types";

// Helper to initialize the client safely
const getGenAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates a comprehensive health insight report based on patient data.
 */
export const generateHealthInsights = async (
  profile: PatientProfile,
  symptoms: SymptomLog[],
  medications: Medication[],
  history: MedicalRecord[]
): Promise<string> => {
  const ai = getGenAIClient();
  if (!ai) return "API Key missing. Cannot generate insights.";

  const prompt = `
    You are MediQuest AI, an advanced medical assistant. Analyze the following patient data and provide a JSON response.
    
    Patient Profile: ${JSON.stringify(profile)}
    Symptoms Logs: ${JSON.stringify(symptoms)}
    Current Medications: ${JSON.stringify(medications)}
    Medical History: ${JSON.stringify(history)}

    Task:
    1. Calculate a hypothetical 'Health Risk Score' (0-100, where 100 is perfect health, 0 is critical).
    2. Summarize the patient's current status.
    3. Identify top 3 risk factors.
    4. Provide 3 actionable health recommendations.
    5. Recommend the most appropriate specialist doctor type (e.g., Cardiologist, General Physician).
    6. Estimate urgency level (Low, Moderate, High, Emergency).

    Return ONLY raw JSON with this schema:
    {
      "healthScore": number,
      "summary": "string",
      "riskFactors": ["string", "string", "string"],
      "recommendations": ["string", "string", "string"],
      "doctorSpecialty": "string",
      "urgency": "Low" | "Moderate" | "High" | "Emergency"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return response.text || "{}";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return JSON.stringify({
      healthScore: 0,
      summary: "Error generating insights. Please try again.",
      riskFactors: [],
      recommendations: [],
      doctorSpecialty: "General Physician",
      urgency: "Low"
    });
  }
};

/**
 * Processes a medical image to remove noise and crop to the region of interest.
 * Returns the processed image as a base64 string (data only, no prefix).
 */
export const processMedicalImage = async (
  base64Data: string,
  mimeType: string
): Promise<string | null> => {
  const ai = getGenAIClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: 'Enhance this medical scan: remove noise/grain, improve contrast, and crop exactly to the main anatomical region of interest (e.g., the lung, bone, or organ). Maintain medical accuracy. Do not add non-existent features.',
          },
        ],
      },
    });

    // Extract the generated image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Image Processing Error:", error);
    return null;
  }
};

/**
 * Analyzes an uploaded medical document or image.
 * Returns structured JSON with bounding boxes for localization.
 */
export const analyzeMedicalDocument = async (
  base64Data: string,
  mimeType: string
): Promise<AnalysisResult> => {
  const ai = getGenAIClient();
  const defaultError: AnalysisResult = { 
    summary: "Analysis failed.", 
    findings: [], 
    disclaimer: "System Error." 
  };

  if (!ai) return defaultError;

  const prompt = `
    You are an expert medical imaging assistant. 
    Analyze the provided medical image (X-ray, MRI, CT, Skin Lesion, or Document).

    Tasks:
    1. Identify any visually suspicious regions, anomalies, or key medical text/values.
    2. If it is an image scan, estimate the bounding box coordinates for these regions.
    3. Provide a brief summary of findings.

    IMPORTANT: 
    - Coordinates must be normalized (0.0 to 1.0) in the order [ymin, xmin, ymax, xmax].
    - This is for educational/screening purposes only. Do not provide a definitive diagnosis.

    Return JSON matching this schema:
    {
      "summary": "string",
      "findings": [
        {
          "label": "string (e.g. 'Possible Nodule', 'Fracture', 'High Glucose Value')",
          "confidence": "string (e.g. 'High', 'Medium')",
          "explanation": "string",
          "box_2d": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } // Optional if not applicable
        }
      ],
      "disclaimer": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Strong multimodal reasoning
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      // Ensure findings is always an array to prevent UI crashes
      return {
        ...parsed,
        findings: Array.isArray(parsed.findings) ? parsed.findings : []
      } as AnalysisResult;
    }
    return defaultError;

  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return {
      summary: "Could not process image.",
      findings: [],
      disclaimer: "Error occurred during analysis."
    };
  }
};