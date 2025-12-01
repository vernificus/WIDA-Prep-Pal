import { GoogleGenAI, Modality } from "@google/genai";
import { Domain, GradeCluster, QuestionData, FeedbackData } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_TEXT = 'gemini-2.5-flash';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_IMAGE = 'gemini-2.5-flash-image';

// Helper to clean JSON string if model wraps in markdown
const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json/, '').replace(/```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```/, '').replace(/```$/, '');
  }
  return clean;
};

// --- Image Generation ---

export const generateImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: { 
        parts: [{ 
          text: `Create a simple, clear, educational illustration suitable for an elementary school ESL test (WIDA ACCESS style). 
          The style should be friendly, clean, with distinct lines and a white background. 
          Subject: ${prompt}` 
        }] 
      },
      // Note: responseMimeType is not supported for gemini-2.5-flash-image
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation failed:", error);
    return undefined;
  }
};

// --- Speech Generation ---

export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  const response = await ai.models.generateContent({
    model: MODEL_TTS,
    contents: { parts: [{ text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data returned");
  }

  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// --- Question Generation ---

export const generateQuestion = async (domain: Domain, grade: GradeCluster): Promise<QuestionData> => {
  const prompt = `Generate a ${domain} question for ${grade} level ESL students (WIDA ACCESS style).
  
  For ${Domain.LISTENING}: Create a short story script (approx 3-5 sentences) and a multiple choice question about it.
  For ${Domain.READING}: Create a short reading passage and a multiple choice question.
  For ${Domain.SPEAKING}: Create a prompt that asks the student to describe something or tell a story about an image.
  For ${Domain.WRITING}: Create a writing prompt based on an image or topic.

  CRITICAL: You must also provide a "imageDescription" field. This description will be used to generate an image that provides necessary context for the question. The image is VITAL for the student to answer the question (e.g., "A picture of a boy playing soccer in the rain").

  Return strictly valid JSON with this structure:
  {
    "promptText": "The main passage, story, or instruction text",
    "questionText": "The actual question asked to the student",
    "options": ["Option A", "Option B", "Option C"], // Required for Reading/Listening
    "correctOption": "Option A", // Required for Reading/Listening
    "rubric": "Criteria for grading", // Required for Speaking/Writing
    "imageDescription": "Detailed description of the visual context needed"
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  if (!response.text) throw new Error("No content generated");

  const data = JSON.parse(cleanJson(response.text));
  
  let imageUrl = undefined;
  if (data.imageDescription) {
    // Generate image based on the description from the text model
    imageUrl = await generateImage(data.imageDescription);
  }

  return {
    id: Date.now().toString(),
    domain,
    ...data,
    imageUrl
  };
};

// --- Evaluation ---

export const evaluateSubmission = async (question: QuestionData, answer: string | Blob, domain: Domain, grade: GradeCluster): Promise<FeedbackData> => {
  if (answer instanceof Blob) {
      // Handle audio submission for Speaking
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  const base64String = reader.result.split(',')[1];
                  resolve(base64String);
              } else {
                  reject(new Error("Failed to convert blob"));
              }
          };
          reader.readAsDataURL(answer);
      });
      const base64Data = await base64Promise;

      const promptText = `The student was asked: "${question.questionText}". 
      The rubric is: ${question.rubric}. 
      The context image described was: ${question.imageUrl ? "an image was provided" : "no image"}.
      Grade their spoken answer provided in the audio for a ${grade} student.
      
      Return JSON:
      {
        "score": number (1-6),
        "feedbackText": "Encouraging feedback for a child",
        "corrections": "Specific correction if needed"
      }`;

      const resp = await ai.models.generateContent({
          model: MODEL_TEXT,
          contents: {
              parts: [
                  { text: promptText },
                  { inlineData: { mimeType: 'audio/webm', data: base64Data } } // Assuming standard webm from MediaRecorder
              ]
          },
          config: { responseMimeType: 'application/json' }
      });
      
      if (!resp.text) throw new Error("No evaluation");
      return JSON.parse(cleanJson(resp.text));
  }

  // Text evaluation
  const prompt = `Evaluate this ${domain} answer for a ${grade} student.
  Question: ${question.questionText}
  Correct Answer/Rubric: ${question.correctOption || question.rubric}
  Student Answer: ${answer}
  
  Return JSON:
  {
    "score": number (1-6),
    "feedbackText": "Encouraging feedback for a child",
    "corrections": "Specific correction if needed"
  }`;

  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  if (!response.text) throw new Error("No evaluation");
  return JSON.parse(cleanJson(response.text));
};