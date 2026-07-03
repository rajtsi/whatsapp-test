const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateContent = async (prompt, options = {}, maxRetries = 5) => {
  const { useGoogleSearch = false, isJson = false } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  if (useGoogleSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  if (isJson) {
    payload.generationConfig = { responseMimeType: "application/json" };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        if (response.status >= 500 || response.status === 429) {
          throw new Error(`Status: ${response.status} - ${errText}`);
        }
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error("Could not parse text from Gemini response");
      }

      if (isJson) {
        return JSON.parse(textContent);
      }

      return textContent;
    } catch (error) {
      if (attempt < maxRetries) {
        const waitTime = attempt * 5000; // 5s, 10s, 15s...
        console.warn(`⚠️ Gemini API error on attempt ${attempt}/${maxRetries} (${error.message}). Retrying in ${waitTime/1000}s...`);
        await sleep(waitTime);
      } else {
        throw new Error(`Gemini API failed after ${maxRetries} attempts. Last error: ${error.message}`);
      }
    }
  }
};

module.exports = {
  generateContent
};
