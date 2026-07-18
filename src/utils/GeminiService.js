/**
 * Service for interacting with Google Gemini API
 * Used for OCR and text extraction from poetry photos/docs
 */

const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:3001';
  if (window.location.hostname && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' && 
      window.location.hostname !== '10.0.2.2' &&
      !window.location.hostname.startsWith('192.168.') &&
      !window.location.protocol.startsWith('file')) {
      return window.location.origin;
  }
  const hostname = window.location.hostname || '127.0.0.1';
  return `http://${hostname}:3001`;
};

let cachedApiKey = null;

const getGeminiApiKey = async () => {
  if (cachedApiKey) return cachedApiKey;
  try {
    const configRes = await fetch(`${getApiUrl()}/api/config`);
    const config = await configRes.json();
    cachedApiKey = config.geminiApiKey || '';
    return cachedApiKey;
  } catch (err) {
    console.error("Failed to load Gemini API key from config:", err);
    return '';
  }
};

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
];

const WORD_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword" // .doc
];

export const digitalizePoetry = async (file) => {
  try {
    const mimeType = file.type;

    // Handle Word documents via mammoth.js (client-side text extraction)
    if (WORD_MIME_TYPES.includes(mimeType) || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      return await digitalizeWordDocument(file);
    }

    // Check if MIME type is supported by Gemini Vision
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`El formato de archivo "${mimeType || 'desconocido'}" no es compatible. Por favor, usa imágenes (JPG, PNG), PDF o Word (.docx).`);
    }

    // Convert file to base64 for image/pdf
    const base64Data = await fileToBase64(file);
    const base64Content = base64Data.split(',')[1];

    const prompt = "Digitaliza el texto de esta imagen o documento. Si es una poesía, mantén el formato original con sus versos y estrofas. Devuelve solo el texto digitalizado.";

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Content
              }
            }
          ]
        }
      ],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 2048,
      }
    };

    return await callGemini(payload);
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};

const digitalizeWordDocument = async (file) => {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value?.trim();

    if (!rawText) {
      throw new Error("No se pudo extraer texto del documento Word. Asegúrate de que el archivo no esté vacío.");
    }

    const prompt = `El siguiente texto fue extraído de un documento Word. Si contiene una poesía, formátala correctamente manteniendo sus versos, estrofas y puntuación. Devuelve solo el texto limpio y formateado:\n\n${rawText}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 2048,
      }
    };

    return await callGemini(payload);
  } catch (error) {
    if (error.message?.includes("extraer") || error.message?.includes("vacío")) {
      throw error;
    }
    console.warn("Gemini formatting failed for Word doc, returning raw text:", error.message);
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value?.trim() || '';
  }
};

const callGemini = async (payload) => {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la clave API de Gemini. Por favor, añádela al archivo .env del proyecto como GEMINI_API_KEY.");
  }
  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Gemini API Error Response:", errorData);

    if (response.status === 403) {
      throw new Error("Error de permisos: La clave API de Gemini podría ser inválida o estar restringida.");
    }

    throw new Error(errorData.error?.message || `Error del servidor IA (${response.status})`);
  }

  const result = await response.json();

  if (!result.candidates || result.candidates.length === 0) {
    throw new Error("La IA no pudo generar una respuesta. Es posible que el contenido haya sido bloqueado por filtros de seguridad.");
  }

  const candidate = result.candidates[0];

  if (candidate.finishReason === "SAFETY") {
    throw new Error("El contenido fue bloqueado por los filtros de seguridad de la IA.");
  }

  if (!candidate.content?.parts?.length) {
    throw new Error("La IA devolvió una respuesta vacía.");
  }

  return candidate.content.parts[0].text;
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};
