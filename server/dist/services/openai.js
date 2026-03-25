import OpenAI from 'openai';
const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;
const SLIDE_SYSTEM_PROMPT = `You are a presentation slide generator. Given a user prompt, output a JSON array of slides. Each slide must have:
- "title": string (slide title)
- "content": string[] (array of bullet points or short paragraphs)

Use 3-10 slides depending on the topic. Keep titles concise and bullets clear. Output only valid JSON, no markdown code fences or extra text.`;
export async function generateSlides(prompt) {
    if (!client) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }
    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SLIDE_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
        ],
        temperature: 0.6,
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';
    let text = raw;
    if (text.startsWith('```')) {
        text = text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
        throw new Error('Invalid slide format from API.');
    }
    return parsed.map((s) => {
        const slide = s;
        return {
            title: typeof slide.title === 'string' ? slide.title : 'Untitled',
            content: Array.isArray(slide.content)
                ? slide.content.map((c) => (typeof c === 'string' ? c : String(c)))
                : [],
        };
    });
}
