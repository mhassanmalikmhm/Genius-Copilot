
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, ANALYSIS_SCHEMA } from "../constants";
import { AnalysisResult } from "../types";

export const analyzeDataset = async (userInput: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userInput,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for factual consistency
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA
      },
    });

    const text = response.text || "{}";
    
    // Parse the JSON response
    let data: AnalysisResult;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini JSON response", e);
      // Fallback object if JSON parsing fails
      data = {
        inferredType: "Data Analysis",
        summary: "Could not parse analysis results. Please try again.",
        keyMetrics: [],
        pythonCode: "# Error parsing response",
        recommendation: {
            goal: "N/A",
            strategy: "N/A"
        }
      };
    }

    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
