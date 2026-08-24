import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { outputKinds, outputLabels, type OutputKind } from "./types";

const generatedSchema = z.object(
  Object.fromEntries(
    outputKinds.map((kind) => [kind, z.string().min(1)]),
  ) as Record<OutputKind, z.ZodString>,
);
const systemInstruction =
  "You are Reword, an expert content editor. Preserve the speaker’s meaning and distinctive voice. Never invent personal facts.";

function extractJson(text: string) {
  const start = text.indexOf("{"),
    end = text.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new Error("The AI provider returned an invalid response");
  return text.slice(start, end + 1);
}

function fallback(transcript: string, kind: OutputKind) {
  const clean = transcript.trim(),
    short = clean.length > 500 ? `${clean.slice(0, 497)}...` : clean;
  const templates: Record<OutputKind, string> = {
    linkedin_blog: `${short}\n\nWhat would you add?`,
    x_thread: `1/ ${short}\n\n2/ The core idea: make the insight useful, specific, and easy to act on.\n\n3/ What is your take?`,
    instagram_facebook: `${short}\n\nSave this for later — and share it with someone who needs the reminder.`,
    tiktok_reels: `HOOK\nHere is something worth thinking about.\n\nSCRIPT\n${short}\n\nCLOSE\nWhat do you think?`,
  };
  return templates[kind];
}

export function getAiProvider() {
  if (
    (process.env.AI_PROVIDER === "gemini" || !process.env.ANTHROPIC_API_KEY) &&
    process.env.GEMINI_API_KEY
  )
    return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "fallback";
}

async function complete(prompt: string, json = false, maxTokens = 5000) {
  if (getAiProvider() === "gemini") {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: maxTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    });
    return response.text?.trim() || "";
  }
  if (getAiProvider() === "anthropic") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system: `${systemInstruction}${json ? " Return only valid JSON." : ""}`,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
  }
  return "";
}

export async function generateContent(
  transcript: string,
  memories: string[],
  only?: OutputKind,
) {
  const kinds = only ? [only] : [...outputKinds];
  if (getAiProvider() === "fallback")
    return Object.fromEntries(
      kinds.map((kind) => [kind, fallback(transcript, kind)]),
    ) as Partial<Record<OutputKind, string>>;
  const prompt = `Create these exact formats: ${kinds.map((kind) => `${kind}: ${outputLabels[kind]}`).join(", ")}.\nOneVoice preferences:\n${memories.map((memory) => `- ${memory}`).join("\n") || "- none"}\n\nTranscript:\n${transcript}\n\nReturn a JSON object with exactly these keys: ${kinds.join(", ")}.`;
  const parsed = JSON.parse(
    extractJson(await complete(prompt, true)),
  ) as Record<string, string>;
  if (only) return { [only]: z.string().min(1).parse(parsed[only]) };
  return generatedSchema.parse(parsed);
}

export async function suggestMemory(original: string, edited: string) {
  if (getAiProvider() === "fallback" || original.trim() === edited.trim())
    return null;
  const result = await complete(
    `Identify one reusable writing preference demonstrated by this edit. Return only the preference sentence, or NONE if the edit is content-specific.\n\nOriginal:\n${original}\n\nEdited:\n${edited}`,
    false,
    160,
  );
  return !result || result.toUpperCase() === "NONE"
    ? null
    : result.slice(0, 280);
}
