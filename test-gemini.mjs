import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

async function listModels() {
  try {
    console.log('Listing available models...');
    // The listModels method might not be directly on genAI in all SDK versions
    // but we can try to find it or use a manual fetch if needed.
    // In newer SDKs it's:
    // const models = await genAI.listModels(); 
    // However, the standard way in the current SDK is sometimes restricted.
    
    // Let's just try to call a model we know should exist with v1
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Success with gemini-1.5-flash!");
  } catch (error) {
    console.error('Error:', error);
  }
}

listModels();
