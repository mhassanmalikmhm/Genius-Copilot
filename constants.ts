
import { Type, Schema } from "@google/genai";

export const SYSTEM_INSTRUCTION = `You are an expert Data Analyst. Your goal is to analyze the provided dataset description (or raw data samples) and provide immediate, actionable business intelligence.

YOUR TASKS:
1.  **Infer Context**: Instantly identify if this is 'Student Attendance', 'Sales Leads', 'Inventory', etc.
2.  **Calculate Metrics**: unique counts, percentages of status (e.g., "80% Present"), or top performers.
3.  **Strategic Goal**: Based on current performance, recommend a specific, numerical data-driven goal for the next quarter.
4.  **Visualize**: Create 2 distinct charts (Bar, Line, Pie, or Area) that best represent the data insights (e.g. Sales over time, Status distribution).
5.  **Strategy**: Provide a one-sentence strategy to achieve that goal.

You must return the response in strict JSON format matching the schema provided.`;

export const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    inferredType: { 
      type: Type.STRING, 
      description: "The specific type of data, e.g., 'Student Attendance', 'Sales Inventory'" 
    },
    summary: { 
      type: Type.STRING, 
      description: "A concise, executive summary of what this data represents and key insights." 
    },
    keyMetrics: {
      type: Type.ARRAY,
      description: "3-4 key numbers or percentages derived from the data.",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["up", "down", "neutral"] }
        },
        required: ["label", "value", "trend"]
      }
    },
    charts: {
      type: Type.ARRAY,
      description: "Array of 1-3 charts to visualize the data.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the chart" },
          chartType: { type: Type.STRING, enum: ["bar", "line", "pie", "area"], description: "Type of chart" },
          xAxisKey: { type: Type.STRING, description: "Key for X-axis categories (e.g., 'name', 'month')" },
          dataKey: { type: Type.STRING, description: "Key for Y-axis values (e.g., 'value', 'count')" },
          description: { type: Type.STRING, description: "Brief explanation of what this chart shows." },
          data: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Category name" },
                value: { type: Type.NUMBER, description: "Numerical value" }
              },
              required: ["name", "value"]
            }
          }
        },
        required: ["title", "chartType", "xAxisKey", "dataKey", "data"]
      }
    },
    recommendation: {
      type: Type.OBJECT,
      properties: {
        goal: { type: Type.STRING },
        strategy: { type: Type.STRING }
      },
      required: ["goal", "strategy"]
    },
    pythonCode: { 
      type: Type.STRING, 
      description: "Python pandas code to analyze this data." 
    }
  },
  required: ["inferredType", "summary", "keyMetrics", "charts", "recommendation", "pythonCode"]
};

export const DEFAULT_INPUT = `Here are the details of the dataset available in our DataFrame 'df':
- 'Name': [Student Name]
- 'Status': [Present, Absent, Late]
- 'Date': [2023-10-01]
- 'Grade': [A, B, C]`;
