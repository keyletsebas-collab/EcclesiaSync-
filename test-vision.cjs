const fs = require('fs');

async function test() {
  const payload = {
      contents: [
        {
          parts: [
            { text: "Describe this image" },
            {
              inline_data: {
                mime_type: "image/png",
                data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
              }
            }
          ]
        }
      ]
  };

  const apiKey = process.env.GEMINI_API_KEY || '';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}
test();
