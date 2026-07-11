const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateContent = async (prompt, options = {}, maxRetries = 6) => {
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
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
        const waitTimesMinutes = [5, 11, 17, 20, 24];
        // Fallback to 24 mins if we exceed the array length
        const delayMins = waitTimesMinutes[attempt - 1] || 24; 
        const waitTime = delayMins * 60 * 1000;
        console.warn(`⚠️ Gemini API error on attempt ${attempt}/${maxRetries} (${error.message}). Retrying in ${delayMins} minutes...`);
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
