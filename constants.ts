
import { Type, Schema } from "@google/genai";

export const SYSTEM_INSTRUCTION = `You are an expert Data Analyst. Your goal is to analyze the provided dataset description (or raw data samples) and provide immediate, actionable business intelligence.

YOUR TASKS:
1.  **Infer Context**: Instantly identify if this is 'Student Attendance', 'Sales Leads', 'Inventory', etc.
2.  **Calculate Metrics**: unique counts, percentages of status (e.g., "80% Present"), or top performers.
3.  **Strategic Goal**: Based on current performance, recommend a specific, numerical data-driven goal for the next quarter (e.g., "Target 95% Attendance").
4.  **Strategy**: Provide a one-sentence strategy to achieve that goal.

You must return the response in strict JSON format matching the schema provided.`;

export const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    inferredType: { 
      type: Type.STRING, 
      description: "The specific type of data, e.g., 'Student Attendance', 'Sales Inventory', 'Web Traffic'" 
    },
    summary: { 
      type: Type.STRING, 
      description: "A concise, executive summary of what this data represents and key insights." 
    },
    keyMetrics: {
      type: Type.ARRAY,
      description: "3-4 key numbers or percentages derived from the data context.",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Label for the metric, e.g. 'Attendance Rate'" },
          value: { type: Type.STRING, description: "Value, e.g. '85%'" },
          trend: { type: Type.STRING, enum: ["up", "down", "neutral"], description: "Visual trend indicator" }
        },
        required: ["label", "value", "trend"]
      }
    },
    recommendation: {
      type: Type.OBJECT,
      description: "A strategic recommendation for the future.",
      properties: {
        goal: { type: Type.STRING, description: "A specific numerical goal for the next quarter, e.g., 'Target 95% Attendance Rate'" },
        strategy: { type: Type.STRING, description: "A brief strategic action to achieve this goal." }
      },
      required: ["goal", "strategy"]
    },
    pythonCode: { 
      type: Type.STRING, 
      description: "Python pandas code to analyze this data." 
    }
  },
  required: ["inferredType", "summary", "keyMetrics", "recommendation", "pythonCode"]
};

export const DEFAULT_INPUT = `Here are the details of the dataset available in our DataFrame 'df':
- 'Name': [Student Name]
- 'Status': [Present, Absent, Late]
- 'Date': [2023-10-01]
- 'Grade': [A, B, C]`;
