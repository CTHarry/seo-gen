import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

type Provider = "openai" | "gemini";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    provider = "openai",
    apiKey = "",
    model = "",
    businessName = "",
    service = "",
    city = "",
    targetAudience = "",
    primaryKeyword = "",
    secondaryKeywords = "",
    tone = "clear, helpful",
    cta = "Contact us",
  } = body as {
    provider?: Provider;
    apiKey?: string;
    model?: string;
    businessName?: string;
    service?: string;
    city?: string;
    targetAudience?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string;
    tone?: string;
    cta?: string;
  };

  if (!apiKey) {
    return Response.json(
      { error: "Missing API key. Paste your API key in the page first." },
      { status: 400 }
    );
  }

  const secondary = String(secondaryKeywords)
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const prompt = buildPrompt({
    businessName,
    service,
    city,
    targetAudience,
    primaryKeyword,
    secondary,
    tone,
    cta,
  });

  let parsed: any;

  if (provider === "openai") {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: model || "gpt-4.1-mini", 
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    parsed = safeJsonParse(text);
  } else if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey });
    const resp = await ai.models.generateContent({
      model: model || "gemini-2.5-flash",
      contents: prompt,
    });

    const text = (resp as any).text ?? (resp as any).response?.text?.() ?? "{}";
    parsed = safeJsonParse(text);
  } else {
    return Response.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (!parsed?.metaTitle || !parsed?.metaDescription || !parsed?.html || !parsed?.schemaJsonLd) {
  return Response.json(
    { error: "Model did not return valid JSON fields. Try again or switch model/provider.", raw: parsed },
    { status: 502 }
  );
  }

  if (parsed?.schemaJsonLd && typeof parsed.schemaJsonLd !== "string") {
    parsed.schemaJsonLd = JSON.stringify(parsed.schemaJsonLd, null, 2);
  }

  const h1 = `${service} in ${city}`;
  const seoScore = scoreSeo(parsed.metaTitle || "", parsed.metaDescription || "", h1);

  return Response.json({ ...parsed, seoScore });
}

function buildPrompt({
  businessName,
  service,
  city,
  targetAudience,
  primaryKeyword,
  secondary,
  tone,
  cta,
}: {
  businessName: string;
  service: string;
  city: string;
  targetAudience: string;
  primaryKeyword: string;
  secondary: string[];
  tone: string;
  cta: string;
}) {
  return `
    You are an SEO copywriter.

    Return ONLY valid JSON. No markdown. No backticks. No explanation.
    Return JSON with exactly these keys:
    metaTitle, metaDescription, html, schemaJsonLd

    Rules:
    - metaTitle: 50–60 characters
    - metaDescription: 140–160 characters
    - html: clean HTML only (no markdown), include H1, multiple H2 sections, an FAQ section with 3 H3 Q&As, and a CTA section
    - schemaJsonLd: JSON-LD FAQPage schema matching the FAQ

    Business: ${businessName}
    Service: ${service}
    City: ${city}
    Audience: ${targetAudience}
    Primary keyword: ${primaryKeyword}
    Secondary keywords: ${secondary.join(", ")}
    Tone: ${tone}
    CTA: ${cta}
    `.trim();
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return {};
    return JSON.parse(text.slice(start, end + 1));
  }
}

function scoreSeo(metaTitle: string, metaDescription: string, h1: string) {
  const titleOk = metaTitle.length >= 30 && metaTitle.length <= 60;
  const descOk = metaDescription.length >= 120 && metaDescription.length <= 160;
  const h1Ok = h1.length > 0 && h1.length <= 70;

  return {
    titleLength: metaTitle.length,
    descriptionLength: metaDescription.length,
    checks: { titleOk, descOk, h1Ok },
  };
}
