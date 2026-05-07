import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
}

export const extractTransactionsFromPDF = async (pdfBase64: string): Promise<ExtractedTransaction[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            text: "Extract all bank transactions from this PDF. For each transaction, provide the date, description, and amount. Return the data as a JSON array of objects with keys 'date', 'description', and 'amount'. CRITICAL: Identify withdrawals (debits/money out) and mark their amount as a negative number (e.g., -150.00). Identify deposits (credits/money in) and mark their amount as a positive number (e.g., 500.00). The date should be in a standard format like YYYY-MM-DD.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
          },
          required: ["date", "description", "amount"],
        },
      },
    },
  });

  try {
    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to extract transactions from PDF. Please ensure the PDF is a valid bank statement.");
  }
};
