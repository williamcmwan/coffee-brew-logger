import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

interface CoffeeBeanInfo {
  name: string;
  roaster: string;
  country: string;
  region: string;
  altitude: string;
  varietal: string;
  process: string;
  roastLevel: string;
  roastFor: string;
  tastingNotes: string;
  url: string;
  roastDate: string;
  weight: number;
}

interface GeminiLogEntry {
  timestamp: string;
  success: boolean;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  extractedData?: CoffeeBeanInfo;
}

// Log file path
const logDir = path.join(process.cwd(), 'data');
const logFile = path.join(logDir, 'gemini-api.log');

function logGeminiCall(entry: GeminiLogEntry) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logFile, logLine);
  } catch (e) {
    console.error('Failed to write Gemini log:', e);
  }
}

router.post('/analyze-coffee-bag', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      logGeminiCall({ timestamp, success: false, error: 'No images provided' });
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logGeminiCall({ timestamp, success: false, error: 'API key not configured' });
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Build the parts array with images
    const parts: any[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      // Handle both base64 data URLs and raw base64
      let base64Data = imageData;
      let mimeType = 'image/jpeg';
      
      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    // Compact prompt to minimize tokens
    parts.push({
      text: `Extract coffee bag info as JSON only:
{"name":"","roaster":"","country":"","region":"","altitude":"(masl)","varietal":"","process":"","roastLevel":"","roastFor":"pour-over|espresso|","tastingNotes":"","url":"","roastDate":"YYYY-MM-DD","weight":0}
Rules: Use "N/A" if unknown (except roastFor/roastDate/weight). roastDate from stickers/stamps. weight in grams (250g→250, 1kg→1000). JSON only, no markdown.`
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      logGeminiCall({ timestamp, success: false, error: `API error: ${response.status}` });
      return res.status(500).json({ error: 'Failed to analyze images' });
    }

    const data = await response.json();
    
    // Extract token usage from response
    const inputTokens = data.usageMetadata?.promptTokenCount;
    const outputTokens = data.usageMetadata?.candidatesTokenCount;
    
    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      logGeminiCall({ timestamp, success: false, inputTokens, outputTokens, error: 'No response text' });
      return res.status(500).json({ error: 'No response from AI' });
    }

    // Parse the JSON response (handle potential markdown code blocks)
    let jsonStr = textResponse.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const coffeeInfo: CoffeeBeanInfo = JSON.parse(jsonStr);
    
    // Validate roastFor value
    if (coffeeInfo.roastFor && !['pour-over', 'espresso', ''].includes(coffeeInfo.roastFor)) {
      coffeeInfo.roastFor = '';
    }

    // Log successful call
    logGeminiCall({
      timestamp,
      success: true,
      inputTokens,
      outputTokens,
      extractedData: coffeeInfo
    });

    res.json(coffeeInfo);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error analyzing coffee bag:', error);
    logGeminiCall({ timestamp, success: false, error: errorMsg });
    res.status(500).json({ error: 'Failed to analyze coffee bag images' });
  }
});

export default router;
