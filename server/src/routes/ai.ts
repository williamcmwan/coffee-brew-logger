import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';

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
  userId?: number;
  success: boolean;
  imageCount?: number;
  imageSizes?: number[];
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  extractedData?: CoffeeBeanInfo;
}

// Log file path
const logDir = path.join(process.cwd(), 'data');
const logFile = path.join(logDir, 'gemini-api.log');

// Log to file (for detailed debugging)
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

// Log API usage to database (for admin stats)
function logApiUsage(userId: number | undefined, inputTokens: number, outputTokens: number) {
  if (!userId) return;
  try {
    db.prepare(`
      INSERT INTO api_usage (user_id, input_tokens, output_tokens)
      VALUES (?, ?, ?)
    `).run(userId, inputTokens, outputTokens);
  } catch (e) {
    console.error('Failed to log API usage:', e);
  }
}

// Validation schema for AI request
const analyzeRequestSchema = z.object({
  images: z.array(z.string().max(10 * 1024 * 1024)) // Max 10MB per image base64
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed'),
});

router.post('/analyze-coffee-bag', async (req: AuthRequest, res: Response) => {
  const timestamp = new Date().toISOString();
  const userId = req.userId;
  
  try {
    // Validate input
    const result = analyzeRequestSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || 'Invalid input';
      logGeminiCall({ timestamp, userId, success: false, error: errorMessage });
      return res.status(400).json({ error: errorMessage });
    }
    
    const { images } = result.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logGeminiCall({ timestamp, userId, success: false, error: 'API key not configured' });
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Build the parts array with images
    const parts: any[] = [];
    const imageSizes: number[] = [];
    
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
      
      // Track image size in bytes
      imageSizes.push(Math.round(base64Data.length * 0.75)); // base64 to bytes approximation
      
      // Validate MIME type
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
        return res.status(400).json({ error: 'Invalid image type' });
      }
      
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }
    
    console.log(`Gemini request: ${images.length} images, sizes: ${imageSizes.map(s => Math.round(s/1024) + 'KB').join(', ')}`);

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
      logGeminiCall({ timestamp, userId, success: false, error: `API error: ${response.status}` });
      return res.status(500).json({ error: 'Failed to analyze images' });
    }

    const data = await response.json();
    
    // Extract token usage from response
    const inputTokens = data.usageMetadata?.promptTokenCount;
    const outputTokens = data.usageMetadata?.candidatesTokenCount;
    
    // Log API usage to database (tokens were consumed regardless of success)
    if (inputTokens && outputTokens) {
      logApiUsage(userId, inputTokens, outputTokens);
    }

    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      logGeminiCall({ timestamp, userId, success: false, imageCount: images.length, inputTokens, outputTokens, error: 'No response text' });
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

    let coffeeInfo: CoffeeBeanInfo;
    try {
      coffeeInfo = JSON.parse(jsonStr);
    } catch (parseError) {
      logGeminiCall({ timestamp, userId, success: false, imageCount: images.length, inputTokens, outputTokens, error: `JSON parse error: ${jsonStr.substring(0, 100)}` });
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    
    // Validate roastFor value
    if (coffeeInfo.roastFor && !['pour-over', 'espresso', ''].includes(coffeeInfo.roastFor)) {
      coffeeInfo.roastFor = '';
    }
    
    // Replace pipe separators with slash for better readability
    if (coffeeInfo.country) {
      coffeeInfo.country = coffeeInfo.country.replace(/\|/g, ' / ');
    }
    if (coffeeInfo.region) {
      coffeeInfo.region = coffeeInfo.region.replace(/\|/g, ' / ');
    }

    // Log successful call to file
    logGeminiCall({
      timestamp,
      userId,
      success: true,
      imageCount: images.length,
      imageSizes,
      inputTokens,
      outputTokens,
      extractedData: coffeeInfo
    });

    res.json(coffeeInfo);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error analyzing coffee bag:', error);
    logGeminiCall({ timestamp, userId, success: false, error: errorMsg });
    res.status(500).json({ error: 'Failed to analyze coffee bag images' });
  }
});

export default router;
