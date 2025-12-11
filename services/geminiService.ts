
import { GoogleGenAI } from "@google/genai";
import { GET_SYSTEM_INSTRUCTION, ANALYSIS_SCHEMA } from "../constants";
import { AnalysisResult } from "../types";

export const analyzeDataset = async (userInput: string, persona: string = "General Data Analyst"): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userInput,
      config: {
        systemInstruction: GET_SYSTEM_INSTRUCTION(persona),
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
        charts: [],
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

export const sendChatMessage = async (
  history: {role: string, content: string}[], 
  newMessage: string, 
  contextData: string
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';

  // Construct a prompt that includes the context of the CSV analysis
  const prompt = `
    Context: You are a data assistant helping a user analyze a CSV file.
    Here is the summary of the data: ${contextData}
    
    User Question: ${newMessage}
    
    Answer concisely and helpfully based on the data context provided.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};
