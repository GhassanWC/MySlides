import OpenAI from 'openai';
import { PROMPT_NARRATIVE_DIRECTOR, PROMPT_ART_DIRECTOR, PROMPT_CONSTRAINT_ENFORCER, PROMPT_SLIDE_COMPILER, PROMPT_VISUAL_QUALITY_GATE } from '../prompts/design-engine.js';
import { validateArtDirection, applyDeterministicFallbackFixes } from './constraints.js';

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

// Helper to reliably extract JSON from markdown wrappers
function extractJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '');
  }
  cleaned = cleaned.replace(/\n?```$/, '');

  try {
    return JSON.parse(cleaned) as any;
  } catch (e) {
    console.error("Failed to parse LLM JSON output:", cleaned);
    throw new Error('LLM did not output valid JSON.');
  }
}

async function callLLM(systemPrompt: string, userContent: string): Promise<any> {
  if (!client) throw new Error('OPENAI_API_KEY is not configured.');

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });

  return extractJSON(completion.choices[0]?.message?.content || "{}");
}

export interface GenerateSlidesResult {
  theme?: any;
  slides: any[];
  narrative?: any;
  artDirection?: any;
}

export async function generateSlidesPayload(topic: string): Promise<GenerateSlidesResult> {
  // PASS 1: The Narrative Arc
  console.log("Starting Pass 1: Narrative Director...");
  const narrative = await callLLM(PROMPT_NARRATIVE_DIRECTOR, "Topic: " + topic);

  // PASS 2: The Art Direction
  console.log("Starting Pass 2: Art Director...");
  let artDirection = await callLLM(PROMPT_ART_DIRECTOR, JSON.stringify(narrative, null, 2));

  // PASS 3: The Constraint Enforcer Loop
  console.log("Starting Pass 3: Constraint Enforcer...");
  let attempts = 0;
  const maxAttempts = 2; // LLM retries

  while (attempts < maxAttempts) {
    attempts++;
    const violations = validateArtDirection(artDirection, topic, narrative.deck_theme || "");

    if (violations.length === 0) {
      console.log("✅ Passed Constraint Check.");
      break;
    }

    console.log("❌ Violations found (Attempt " + attempts + "):", violations);

    const enforcerPrompt = PROMPT_CONSTRAINT_ENFORCER
      .replace("{failed_json}", JSON.stringify(artDirection, null, 2))
      .replace("{violations}", violations.join("\\n"));

    console.log("Invoking auto-correct...");
    artDirection = await callLLM(enforcerPrompt, "Fix the JSON above.");
  }

  // PASS 4: Final Enforcer Gate Check & Hard-coded Safe Deterministic Fallback
  const finalViolations = validateArtDirection(artDirection, topic, narrative.deck_theme || "");
  if (finalViolations.length > 0) {
    console.log("🔥 AI failed to auto-correct gracefully after retries. Applying deterministic fallback fixes...");
    artDirection = applyDeterministicFallbackFixes(artDirection, finalViolations);
  }

  // PASS 5: Slide Compiler (Map narrative + artDirection to strict layout specs)
  console.log("Starting Pass 5: Slide Compiler...");
  const compilerPrompt = PROMPT_SLIDE_COMPILER
    .replace("{narrative}", JSON.stringify(narrative, null, 2))
    .replace("{artDirection}", JSON.stringify(artDirection, null, 2));

  let slides = await callLLM(compilerPrompt, "Generate the slides array.");
  if (!Array.isArray(slides)) {
    if (slides.slides && Array.isArray(slides.slides)) {
      slides = slides.slides;
    } else {
      slides = [slides];
    }
  }

  // PASS 6: Visual Quality Gate
  console.log("Starting Pass 6: Visual Quality Gate...");
  const gatePrompt = PROMPT_VISUAL_QUALITY_GATE.replace("{slides}", JSON.stringify(slides, null, 2));
  const gateResult = await callLLM(gatePrompt, "Review the slides JSON.");

  if (gateResult.status === "fail") {
    console.log("❌ Visual Quality Gate FAILED. Feedback:", gateResult.feedback);
    console.log("Attempting to auto-correct layouts...");
    const fixPrompt = `
The Visual Quality Gate failed for the following reasons:
${gateResult.feedback}
Specific Fixes Requested: ${JSON.stringify(gateResult.fixes)}

Original Slides JSON:
${JSON.stringify(slides, null, 2)}

Original Art Direction Context:
${JSON.stringify(artDirection, null, 2)}

You are the Master Presentation Designer. You must strictly mutate the Original Slides JSON to implement the requested fixes.
Make it dynamic, hero-anchored, asymmetrical, and apply generous whitespace (using strict percentages for top/left/width, e.g., "top": "20%", "left": "10%", "width": "50%").
Do NOT fall back to standard centered layouts.
OUTPUT ONLY VALID JSON ARRAY for the slides.
`;
    const fixedSlides = await callLLM(fixPrompt, "Output the corrected slides JSON array.");
    if (Array.isArray(fixedSlides)) {
      slides = fixedSlides;
    } else if (fixedSlides.slides && Array.isArray(fixedSlides.slides)) {
      slides = fixedSlides.slides;
    }
  } else {
    console.log("✅ Passed Visual Quality Gate.");
  }

  // Ensure blocks have basic defaults to prevent render crashes
  for (const slide of slides) {
    if (!slide.layout) slide.layout = 'title-content';
    if (!slide.animation) slide.animation = 'fadeIn';
    if (!slide.content) slide.content = [];
  }

  // Construct final format for the frontend
  // Extract theme info from Art Direction
  const theme = {
    primaryColor: artDirection.color_harmony?.accent_1 || '#4f46e5',
    secondaryColor: artDirection.color_harmony?.primary_text || '#1f2937',
    fontTitle: artDirection.typography?.heading_font || 'Inter',
    fontBody: artDirection.typography?.body_font || 'Inter',
    backgroundStyle: artDirection.layout_philosophy?.visual_tone?.includes('brutalist') ? 'solid' : 'light-gradient'
  };

  return {
    theme,
    slides,
    narrative,
    artDirection
  };
}
