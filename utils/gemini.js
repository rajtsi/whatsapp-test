const generateContent = async (prompt, options = {}) => {
  const { useGoogleSearch = false, isJson = false } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  if (useGoogleSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  if (isJson) {
    payload.generationConfig = { responseMimeType: "application/json" };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errText = await response.text();
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
};

module.exports = {
  generateContent
};
