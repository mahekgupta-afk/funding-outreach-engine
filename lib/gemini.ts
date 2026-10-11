import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY must be set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function getModel(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("429") || message.toLowerCase().includes("rate limit");
}

/**
 * Calls Gemini Flash asking for JSON output matching `schema`, validates the
 * result with zod, and retries once on invalid JSON / schema mismatch.
 * Separately retries with exponential backoff on 429s (up to 3 attempts).
 */
export async function generateJson<T>(opts: {
  schema: z.ZodType<T>;
  prompt: string;
  systemInstruction?: string;
}): Promise<T> {
  const { schema, prompt, systemInstruction } = opts;
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });

  let lastError: unknown;

  for (let rateLimitAttempt = 0; rateLimitAttempt < 3; rateLimitAttempt++) {
    try {
      // One retry on invalid JSON / schema validation failure, per spec section 7.
      for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
        const response = await getClient().models.generateContent({
          model: getModel(),
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
          },
        });

        const text = response.text;
        if (!text) {
          lastError = new Error("Gemini returned an empty response");
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          lastError = err;
          continue;
        }

        const result = schema.safeParse(parsed);
        if (result.success) return result.data;
        lastError = result.error;
      }

      // Both parse attempts failed (not a rate limit issue) — stop retrying.
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    } catch (err) {
      if (isRateLimitError(err) && rateLimitAttempt < 2) {
        await sleep(2 ** rateLimitAttempt * 1000 + Math.random() * 500);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini call failed");
}
