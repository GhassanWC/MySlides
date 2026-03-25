export function hexToHsl(hex: string): { h: number, s: number, l: number } {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

export function validateArtDirection(json: any, topic: string, theme: string): string[] {
    const violations: string[] = [];

    // 1. alignment must be never-centered
    const align = json.layout_philosophy?.alignment_enforcement?.toLowerCase() || "";
    if (align.includes("center")) {
        violations.push("FAIL: Alignment must be never-centered. Found: " + align);
    }

    // 2. whitespace_ratio >= 40%
    const targetWhite = json.layout_philosophy?.whitespace_ratio || "";
    const match = targetWhite.match(/\d+/);
    if (match) {
        const ratio = parseInt(match[0], 10);
        if (ratio < 40) violations.push("FAIL: whitespace_ratio must be >= 40%. Found: " + ratio + "%");
    } else {
        violations.push("FAIL: whitespace_ratio missing or invalid format.");
    }

    // 3. heading_weight must be >= 700
    const weightStr = json.typography?.heading_weight || "";
    const weight = parseInt(weightStr.replace(/\D/g, ''), 10);
    if (!weight || weight < 700) {
        violations.push("FAIL: heading_weight must be strictly >= 700 to ensure bold contrast. Found: " + weightStr);
    }

    // 4. design_rationale must reference deck_theme
    const rationale = json.design_rationale?.toLowerCase() || "";
    const themeWords = theme.toLowerCase().split(" ").filter(w => w.length > 3);
    const referencesTheme = themeWords.some(word => rationale.includes(word));
    if (!referencesTheme && themeWords.length > 0) {
        violations.push("FAIL: design_rationale does not conceptually reference the deck_theme ('" + theme + "').");
    }

    const bgHex = json.color_harmony?.background || "#FFFFFF";
    const bgHsl = hexToHsl(bgHex);
    const accentHex = json.color_harmony?.accent_1 || "#FFFFFF";
    const accHsl = hexToHsl(accentHex);

    // 5. must NOT use hacker-green-on-black for cybersecurity
    if (topic.toLowerCase().includes("cybersecurity")) {
        // bg is dark
        if (bgHsl.l < 20) {
            // accent is green (Hue 90-150) and highly saturated
            if (accHsl.h >= 90 && accHsl.h <= 150 && accHsl.s > 50) {
                violations.push("FAIL: Absolutely NO hacker-green-on-black for cybersecurity. It is a massive cliché. Change the accent color.");
            }
        }
    }

    // 6. accent_1 must NOT be blue/cyan/teal or GitHub-like
    // Blue/Cyan/Teal hue is roughly 170 to 260
    if (accHsl.h >= 170 && accHsl.h <= 260 && accHsl.s > 30) {
        violations.push("FAIL: accent_1 (" + accentHex + ") falls into the Blue/Cyan/Teal spectrum. This is banned as it feels too 'safe corporate' or GitHub-like.");
    }

    return violations;
}

// Applies hard-coded deterministic fixes if the LLM fails after retries
export function applyDeterministicFallbackFixes(json: any, violations: string[]): any {
    const corrected = JSON.parse(JSON.stringify(json));
    const vios = violations.join(" ").toLowerCase();

    // 1. typography: force heading_weight >= 700
    if (vios.includes("heading_weight")) {
        if (!corrected.typography) corrected.typography = {};
        corrected.typography.heading_weight = "900"; // Enforce the boldest fallback
    }

    // 2. whitespace: force >= 40%
    if (vios.includes("whitespace_ratio")) {
        if (!corrected.layout_philosophy) corrected.layout_philosophy = {};
        corrected.layout_philosophy.whitespace_ratio = "50%";
    }

    // 3. layout: force asymmetrical
    if (vios.includes("alignment") || vios.includes("center")) {
        if (!corrected.layout_philosophy) corrected.layout_philosophy = {};
        corrected.layout_philosophy.alignment_enforcement = "flush-left";
    }

    // 4. colors: avoid lazy fixes (like pure white) unless explicitly brutalist.
    // Use unexpected premium accents (warm terracotta, chartreuse, acid purple).
    if (vios.includes("accent_1") || vios.includes("blue/cyan/teal") || vios.includes("hacker-green-on-black")) {
        if (!corrected.color_harmony) corrected.color_harmony = {};

        const isBrutalist = corrected.layout_philosophy?.visual_tone?.toLowerCase().includes("brutalist");

        if (isBrutalist) {
            corrected.color_harmony.accent_1 = "#FF0055"; // acid pink
        } else {
            // cycle premium accents
            const premiumAccents = ["#E63946", "#FFB703", "#8338EC", "#FF006E", "#FB5607"];
            const themeName = (corrected.design_rationale || "").length;
            corrected.color_harmony.accent_1 = premiumAccents[themeName % premiumAccents.length];
        }
    }

    return corrected;
}
