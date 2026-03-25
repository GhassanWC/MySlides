"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
exports.generateSlidesPayload = generateSlidesPayload;
exports.editSlidesPayload = editSlidesPayload;
const openai_1 = require("openai");
const design_engine_1 = require("../prompts/design-engine");
class OpenAIProvider {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.client = apiKey ? new openai_1.default({ apiKey }) : null;
    }
    async generate(systemPrompt, userPrompt, modelName) {
        var _a, _b;
        if (!this.client)
            throw new Error('OPENAI_API_KEY is not configured.');
        const completion = await this.client.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
        });
        return ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
    }
}
class FallbackSimulatorProvider {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.client = apiKey ? new openai_1.default({ apiKey }) : null;
    }
    async generate(systemPrompt, userPrompt, modelName) {
        var _a, _b;
        if (!this.client)
            throw new Error('OPENAI_API_KEY is not configured.');
        // Simulate other models using OpenAI to ensure the app still works if keys are missing
        const completion = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `[Please fulfill this request as if you are ${modelName}]\nTopic: ${userPrompt}` },
            ],
            temperature: 0.7,
        });
        return ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
    }
}
function getProvider(modelName) {
    if (modelName.startsWith('gpt')) {
        return new OpenAIProvider();
    }
    // For claude and gemini, if actual native SDKs/keys are absent, we use the fallback simulator
    // In a real production environment, you would conditionally return an AnthropicProvider/GeminiProvider here.
    return new FallbackSimulatorProvider();
}
function extractJSON(text) {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json'))
        cleaned = cleaned.replace(/^```json\n?/, '');
    else if (cleaned.startsWith('```'))
        cleaned = cleaned.replace(/^```\w*\n?/, '');
    cleaned = cleaned.replace(/\n?```$/, '');
    try {
        return JSON.parse(cleaned);
    }
    catch (e) {
        console.error("Failed to parse LLM JSON output:", cleaned);
        throw new Error('LLM did not output valid JSON.');
    }
}
async function generateSlidesPayload(topic, modelName = 'gpt-4o-mini') {
    console.log(`Starting slide generation using model: ${modelName}`);
    const provider = getProvider(modelName);
    const rawContent = await provider.generate(design_engine_1.PROMPT_GENERATOR, "Topic: " + topic, modelName);
    const parsed = extractJSON(rawContent);
    let rawSlides = [];
    if (Array.isArray(parsed)) {
        rawSlides = parsed;
    }
    else if (parsed.slides && Array.isArray(parsed.slides)) {
        rawSlides = parsed.slides;
    }
    else {
        rawSlides = [parsed];
    }
    const slides = rawSlides.map((s, i) => ({
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
async function editSlidesPayload(request, currentSlides, selectedSlideId, availableAssets = [], modelName = 'gpt-4o-mini') {
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
    const rawContent = await provider.generate(design_engine_1.PROMPT_EDITOR, userPrompt, modelName);
    const parsed = extractJSON(rawContent);
    return {
        action: parsed.action || 'update_slides',
        summary: parsed.summary || 'Updated slides based on your request.',
        changes: Array.isArray(parsed.changes) ? parsed.changes : []
    };
}
