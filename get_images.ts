import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getEquipmentImages() {
  const queries = [
    "Stihl FS 160 brushcutter professional",
    "Husqvarna LC 140P lawn mower",
    "Stihl MS 170 chainsaw",
    "Stihl BG 50 leaf blower",
    "Makita DUR181Z cordless string trimmer",
    "Husqvarna riding lawn mower tractor"
  ];

  const results = [];

  for (const query of queries) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find a high-quality public image URL for: ${query}. Return ONLY the URL.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    results.push({ query, url: response.text.trim() });
  }

  console.log(JSON.stringify(results, null, 2));
}

getEquipmentImages();
