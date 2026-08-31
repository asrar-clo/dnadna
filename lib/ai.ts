import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-2.5-flash was deprecated ahead of its published date and now 404s.
// 3.6 Flash is the current free-tier workhorse model as of August 2026.
const MODEL = 'gemini-3.6-flash';

export type ExplainResult = {
  bottom_line: string;
  what_is_this: string;
  what_matters: string[];
  simple_explanation: string;
  what_to_know: string;
  high_stakes: boolean;
};

const SYSTEM_PROMPT = `You explain things simply. You will be given some content (text, a PDF, an image, or an audio recording).

Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:
{
  "bottom_line": "the single most important sentence \u2014 the verdict a reader would want if they only read one line",
  "what_is_this": "one or two short sentences describing what the content is",
  "what_matters": ["point 1", "point 2", "point 3"],
  "simple_explanation": "a short plain-language paragraph explaining it simply, no jargon",
  "what_to_know": "one short practical takeaway for the reader",
  "high_stakes": true or false
}

Rules:
- "bottom_line" comes first because it IS the answer \u2014 write it like a news lead or a briefing memo's headline, not a teaser. It should stand alone and make sense with nothing else read. Include the single most important number, risk, or fact if there is one.
- "what_matters" must have between 3 and 5 items, each one short sentence.
- Never invent facts that are not in the content. If something is unclear or missing, say so plainly instead of guessing.
- Use plain, everyday language. Avoid jargon; if a technical term is unavoidable, explain it in a few words.
- Keep every field concise. Do not write an essay.
- Set "high_stakes" to true if the content is legal, medical, financial, or otherwise high-stakes (i.e. acting on a wrong understanding of it could hurt the reader). Otherwise false.
- If the content could not be understood (empty, gibberish, unreadable image, silent or inaudible audio, etc.), still return the JSON shape, explaining that in "bottom_line" and "what_is_this" and leaving other fields minimal.`;

export async function explainText(content: string): Promise<ExplainResult> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: `Explain this:\n\n${content}` }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });
  return parseResult(response.text ?? '');
}

export async function explainPdf(base64: string): Promise<ExplainResult> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType: 'application/pdf' } },
          { text: 'Explain this document.' },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });
  return parseResult(response.text ?? '');
}

export async function explainImage(base64: string, mediaType: string): Promise<ExplainResult> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType: mediaType } },
          { text: 'Explain what this image shows.' },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });
  return parseResult(response.text ?? '');
}

// Gemini accepts audio inline the same way it accepts PDFs and images, so a
// voice note, a recorded meeting, or a podcast clip goes through the exact
// same path as any other upload — no separate transcription step or vendor.
export async function explainAudio(base64: string, mediaType: string): Promise<ExplainResult> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64, mimeType: mediaType } },
          { text: 'Explain what is being said in this audio.' },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });
  return parseResult(response.text ?? '');
}

function parseResult(raw: string): ExplainResult {
  const cleaned = raw.replace(/^```json\s*|```\s*$/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      bottom_line: String(parsed.bottom_line ?? ''),
      what_is_this: String(parsed.what_is_this ?? ''),
      what_matters: Array.isArray(parsed.what_matters) ? parsed.what_matters.slice(0, 5).map(String) : [],
      simple_explanation: String(parsed.simple_explanation ?? ''),
      what_to_know: String(parsed.what_to_know ?? ''),
      high_stakes: Boolean(parsed.high_stakes),
    };
  } catch {
    throw new Error('AI_PARSE_FAILED');
  }
}
