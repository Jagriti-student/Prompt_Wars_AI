async function getAIResponse(input) {
    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=YOUR_API_KEY",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: input }] }]
            })
        }
    );

    return response.json();
}

export default getAIResponse;