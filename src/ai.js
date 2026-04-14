async function getAIResponse(input) {
    if (!input || input.length < 2) {
        console.error("Invalid input");
        return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: input }] }]
            })
        }
    );
    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    }
    
    if (data.error) {
        throw new Error(data.error.message);
    }

    return "AI was unable to generate a coherent response.";
}

export default getAIResponse;