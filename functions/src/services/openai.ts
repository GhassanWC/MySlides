import OpenAI from 'openai';
import { PROMPT_GENERATOR, PROMPT_EDITOR } from '../prompts/design-engine';

export interface LLMProvider {
    generate(systemPrompt: string, userPrompt: string, modelName: string): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
    private client: OpenAI | null;
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.client = apiKey ? new OpenAI({ apiKey }) : null;
    }
    async generate(systemPrompt: string, userPrompt: string, modelName: string): Promise<string> {
        if (!this.client) throw new Error('OPENAI_API_KEY is not configured.');
        const completion = await this.client.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
        });
        return completion.choices[0]?.message?.content || "{}";
    }
}

class FallbackSimulatorProvider implements LLMProvider {
    private client: OpenAI | null;
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.client = apiKey ? new OpenAI({ apiKey }) : null;
    }
    async generate(systemPrompt: string, userPrompt: string, modelName: string): Promise<string> {
        if (!this.client) throw new Error('OPENAI_API_KEY is not configured.');
        // Simulate other models using OpenAI to ensure the app still works if keys are missing
        const completion = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `[Please fulfill this request as if you are ${modelName}]\nTopic: ${userPrompt}` },
            ],
            temperature: 0.7,
        });
        return completion.choices[0]?.message?.content || "{}";
    }
}

export function getProvider(modelName: string): LLMProvider {
    if (modelName.startsWith('gpt')) {
        return new OpenAIProvider();
    }
    // For claude and gemini, if actual native SDKs/keys are absent, we use the fallback simulator
    // In a real production environment, you would conditionally return an AnthropicProvider/GeminiProvider here.
    return new FallbackSimulatorProvider();
}

function extractJSON(text: string): any {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n?/, '');
    else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\w*\n?/, '');
    cleaned = cleaned.replace(/\n?```$/, '');

    try {
        return JSON.parse(cleaned) as any;
    } catch (e) {
        console.error("Failed to parse LLM JSON output:", cleaned);
        throw new Error('LLM did not output valid JSON.');
    }
}

export interface GenerateSlidesResult {
    theme?: any;
    slides: any[];
    generatedByModel: string;
}

export async function generateSlidesPayload(topic: string, modelName: string = 'gpt-4o-mini'): Promise<GenerateSlidesResult> {
    console.log(`Starting slide generation using model: ${modelName}`);

    const provider = getProvider(modelName);
    const rawContent = await provider.generate(PROMPT_GENERATOR, "Topic: " + topic, modelName);
    const parsed = extractJSON(rawContent);

    let rawSlides = [];
    if (Array.isArray(parsed)) {
        rawSlides = parsed;
    } else if (parsed.slides && Array.isArray(parsed.slides)) {
        rawSlides = parsed.slides;
    } else {
        rawSlides = [parsed];
    }

    const slides = rawSlides.map((s: any, i: number) => ({
        id: s.id || `slide-${i}`,
        title: s.title || `Slide ${i + 1}`,
        content: [], // Not used for HTML renderer
        layout: 'title-content', // Dummy fallback
        customHtml: s.html || '<div>No HTML generated</div>',
        customCss: s.css || ''
    }));

    return {
        theme: {},
        slides,
        generatedByModel: modelName,
    };
}

export interface EditSlidesResult {
    action: string;
    summary: string;
    changes: any[];
}

export async function editSlidesPayload(
    request: string,
    currentSlides: any[],
    selectedSlideId?: string,
    availableAssets: any[] = [],
    modelName: string = 'gpt-4o-mini'
): Promise<EditSlidesResult> {
    console.log(`Starting slide editing using model: ${modelName}`);

    const provider = getProvider(modelName);

    const userPrompt = `
User Request: ${request}

Current Slides (JSON array of {id, html, css, elements}):
${JSON.stringify(currentSlides)}

Currently Selected Slide ID: ${selectedSlideId || 'None'}

Available Uploaded Assets (JSON array of {id, name, type, url}):
${JSON.stringify(availableAssets.map(a => ({ id: a.id, name: a.name, type: a.type, url: a.fileUrl })))}
`;

    const rawContent = await provider.generate(PROMPT_EDITOR, userPrompt, modelName);
    const parsed = extractJSON(rawContent);

    return {
        action: parsed.action || 'update_slides',
        summary: parsed.summary || 'Updated slides based on your request.',
        changes: Array.isArray(parsed.changes) ? parsed.changes : []
    };
}
