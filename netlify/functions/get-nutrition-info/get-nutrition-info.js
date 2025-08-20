// Using node-fetch for compatibility with Netlify Functions environment
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt, isJson } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set.");
    }
    
    if (!prompt) {
        return { statusCode: 400, body: 'Prompt is required.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    if (isJson) {
      payload.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recipeName: { type: "STRING" },
            description: { type: "STRING" },
            ingredients: { type: "ARRAY", items: { type: "STRING" } },
            instructions: { type: "ARRAY", items: { type: "STRING" } },
            nutrition: {
              type: "OBJECT",
              properties: {
                calories: { type: "STRING" },
                protein: { type: "STRING" },
                carbs: { type: "STRING" },
                fat: { type: "STRING" }
              }
            }
          },
          required: ["recipeName", "description", "ingredients", "instructions", "nutrition"]
        }
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error:', errorBody);
      return { statusCode: response.status, body: `Gemini API error: ${errorBody}` };
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      
      const text = result.candidates[0].content.parts[0].text;
      return {
        statusCode: 200,
        body: JSON.stringify({ text })
      };

    } else {
      console.error('Invalid response structure from Gemini API:', result);
      return { statusCode: 500, body: 'Invalid response structure from API.' };
    }

  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
