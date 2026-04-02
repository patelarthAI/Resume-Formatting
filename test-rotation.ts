import { GoogleGenAI } from "@google/genai";

async function testRotation() {
  // Mocking the behavior of geminiService.ts
  const keys = ["invalid_key_1", "invalid_key_2"];
  let currentKeyIndex = 0;
  let totalAttempts = 0;
  const maxAttempts = 3;
  
  for (let i = 0; i < keys.length; i++) {
    if (totalAttempts >= maxAttempts) break;
    
    const apiKey = keys[currentKeyIndex % keys.length];
    console.log(`Attempt ${totalAttempts + 1}: Trying key ${currentKeyIndex % keys.length} (${apiKey})`);
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hello"
      });
      console.log("Success!");
      return;
    } catch (error: any) {
      console.log(`Failed with error: ${error.status || error.message}`);
      // Simulate 429 or 400 for testing
      currentKeyIndex++;
      totalAttempts++;
      continue;
    }
  }
}

testRotation();
