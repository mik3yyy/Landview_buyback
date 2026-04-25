import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

interface ExtractedInvestmentData {
  clientName?: string;
  plotNumber?: string;
  principal?: number;
  interestRate?: number;
  duration?: string;
  transactionDate?: string;
  clientEmail?: string;
  realtorName?: string;
  realtorEmail?: string;
  upfrontPayment?: number | null;
  confidence: {
    clientName?: number;
    plotNumber?: number;
    principal?: number;
    interestRate?: number;
    duration?: number;
    transactionDate?: number;
    clientEmail?: number;
    realtorName?: number;
    realtorEmail?: number;
    upfrontPayment?: number;
  };
}

async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text as string;
  }
  // For images — return a placeholder note; DeepSeek chat model is text-only
  return `[Image file uploaded: ${path.basename(filePath)}. Please note this is an image — extract any visible text fields related to a land investment buyback agreement.]`;
}

export async function extractInvestmentDataFromDocument(
  filePath: string,
  mimeType: string
): Promise<ExtractedInvestmentData> {
  const documentText = await extractTextFromFile(filePath, mimeType);

  const prompt = `You are extracting data from a land investment buyback agreement document.

Here is the document content:
---
${documentText}
---

Extract the following fields and return them as a JSON object:
- clientName: The investor/client's full name
- plotNumber: The plot number or plot ID
- principal: The principal investment amount (number only, no currency symbols)
- interestRate: The interest rate as a percentage (number only, e.g., 15 for 15%)
- duration: The investment duration (e.g., "6 months", "12 months", "1 year")
- transactionDate: The transaction/agreement date in YYYY-MM-DD format
- clientEmail: The client's email address
- realtorName: The realtor/agent's full name
- realtorEmail: The realtor's email address
- upfrontPayment: Any upfront payment made (number only, null if none or not mentioned)

Also provide confidence scores (0.0 to 1.0) for each field in a "confidence" object based on how clearly each field appeared in the document.

Return ONLY valid JSON, no explanations, no markdown. Example:
{
  "clientName": "John Doe",
  "plotNumber": "PLT-001",
  "principal": 5000000,
  "interestRate": 15,
  "duration": "12 months",
  "transactionDate": "2024-01-15",
  "clientEmail": "john@example.com",
  "realtorName": "Jane Smith",
  "realtorEmail": "jane@landview.com",
  "upfrontPayment": null,
  "confidence": {
    "clientName": 0.95,
    "plotNumber": 0.90,
    "principal": 0.88,
    "interestRate": 0.92,
    "duration": 0.85,
    "transactionDate": 0.80,
    "clientEmail": 0.70,
    "realtorName": 0.88,
    "realtorEmail": 0.65,
    "upfrontPayment": 0.50
  }
}`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 1024,
  });

  const text = response.choices[0]?.message?.content || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse DeepSeek response as JSON');
  }
}
