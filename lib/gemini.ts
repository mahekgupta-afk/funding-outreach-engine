import { z } from "zod";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set");
  return apiKey;
}

function getModel(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429 (rate limited) and 503 (momentarily overloaded) are both worth a
// backoff-and-retry; anything else (4xx auth/validation errors) is not.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** One network call to Gemini, with backoff retry on 429/503. Returns raw response text. */
async function callGemini(body: unknown): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${getApiKey()}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json: GeminiResponse = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
      if (!text) throw new Error("Gemini returned an empty response");
      return text;
    }

    const errText = await res.text().catch(() => "");
    if (isRetryableStatus(res.status) && attempt < 2) {
      await sleep(2 ** attempt * 1000 + Math.random() * 500);
      continue;
    }
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  throw new Error("Gemini call failed after retries");
}

/**
 * Calls Gemini Flash directly via the REST API (generativelanguage.googleapis.com),
 * asking for JSON output matching `schema`, and validates the result with zod.
 *
 * Uses `fetch` rather than the @google/genai SDK: the SDK was observed to hang
 * indefinitely in this deployment environment, while a plain REST call to the
 * same endpoint returns normally, so fetch is both simpler and more reliable.
 *
 * Retries once on invalid JSON / schema mismatch (a fresh call to Gemini, per
 * spec section 7); backoff-retries on 429/503 happen inside each call.
 */
export async function generateJson<T>(opts: {
  schema: z.ZodType<T>;
  prompt: string;
  systemInstruction?: string;
}): Promise<T> {
  const { schema, prompt, systemInstruction } = opts;
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    },
  };

  let lastError: unknown;

  for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
    const text = await callGemini(body);

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

  throw lastError instanceof Error ? lastError : new Error("Gemini returned invalid JSON twice");
}
