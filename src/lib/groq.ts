import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
}

export const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

export const AI_MODEL = "llama-3.3-70b-versatile";
