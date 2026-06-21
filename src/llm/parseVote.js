/**
 * Vote parser — extract structured vote data from LLM text output
 * Handles multiple JSON formats, markdown fences, truncated responses
 */

// --- Partial JSON recovery ---

/**
 * Recover scores from a truncated JSON response where closing braces may be missing.
 * Uses regex to extract completed "ObjectName": { "ParamName": {grade, ...} } blocks.
 */
function recoverPartialScores(text) {
    const scores = {};

    // Strategy 1: Find completed object blocks inside "scores": { ... }
    // Match "ObjectName": { ... } where the inner braces are balanced
    const scoresBlockMatch = text.match(/"scores"\s*:\s*\{/);
    if (!scoresBlockMatch) return null;

    const scoresStart = scoresBlockMatch.index + scoresBlockMatch[0].length;

    // Walk through objects inside scores, collecting only complete ones
    let pos = scoresStart;
    let depth = 1; // we're inside "scores": {

    while (pos < text.length && depth > 0) {
        // Find next object entry: "name": {
        const objMatch = text.slice(pos).match(/"([^"]+)"\s*:\s*\{/);
        if (!objMatch) break;

        const objName = objMatch[1];
        const objStart = pos + objMatch.index + objMatch[0].length;

        // Find all complete param entries inside this object
        const objScores = {};
        let paramPos = objStart;
        let objDepth = 1;
        let foundComplete = false;

        while (paramPos < text.length && objDepth > 0) {
            // Try to match a complete param entry: "param": { "grade": N, ... }
            const paramMatch = text.slice(paramPos).match(/"([^"]+)"\s*:\s*\{/);
            if (!paramMatch) break;

            const paramName = paramMatch[1];
            const paramStart = paramPos + paramMatch.index + paramMatch[0].length;

            // Try to find the closing } of this param value
            let paramDepth = 1;
            let p = paramStart;
            let closed = false;

            while (p < text.length && paramDepth > 0) {
                if (text[p] === '{') paramDepth++;
                else if (text[p] === '}') paramDepth--;
                if (paramDepth === 0) {
                    // Found closing brace — try to parse this param block
                    try {
                        const block = text.slice(paramStart - 1, p + 1);
                        // block already has { and } wrapping
                        const val = JSON.parse(block);
                        // Extract grade
                        if (val && (val.grade !== undefined || typeof val === 'number')) {
                            objScores[paramName] = val;
                        }
                    } catch (_) {}
                    closed = true;
                    paramPos = p + 1;
                    break;
                }
                p++;
            }

            if (!closed) break; // Incomplete param — stop
        }

        // Check if this object block itself closed
        if (Object.keys(objScores).length > 0) {
            scores[objName] = objScores;
        }

        // Move past this object
        // Find closing } of the object
        let searchPos = objStart;
        let oDepth = 1;
        while (searchPos < text.length && oDepth > 0) {
            if (text[searchPos] === '{') oDepth++;
            else if (text[searchPos] === '}') oDepth--;
            if (oDepth === 0) {
                pos = searchPos + 1;
                foundComplete = true;
                break;
            }
            searchPos++;
        }
        if (!foundComplete) break; // Object didn't close — remaining objects are incomplete
    }

    return Object.keys(scores).length > 0 ? scores : null;
}

// --- Vote parser ---

export function parseVote(text) {
    if (!text) return { recommendation: null, confidence: null, score: null, scores: null };

    let recommendation = null;
    let confidence = null;
    let score = null;
    let scores = null;
    let parsed = null;

    // 1. ```json ... ``` block
    try {
        const m = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (m) parsed = JSON.parse(m[1]);
    } catch (_) {}

    // 2. ``` ... ``` block (without json tag)
    if (!parsed) try {
        const m = text.match(/```\s*([\s\S]*?)\s*```/);
        if (m) parsed = JSON.parse(m[1]);
    } catch (_) {}

    // 3. Raw JSON — find outermost { ... }
    if (!parsed) try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            parsed = JSON.parse(text.substring(firstBrace, lastBrace + 1));
        }
    } catch (_) {}

    // 4. Incremental brace matching — handles truncated JSON
    if (!parsed) try {
        const firstBrace = text.indexOf('{');
        if (firstBrace !== -1) {
            let depth = 0;
            for (let i = firstBrace; i < text.length; i++) {
                if (text[i] === '{') depth++;
                if (text[i] === '}') depth--;
                if (depth === 0) {
                    parsed = JSON.parse(text.substring(firstBrace, i + 1));
                    break;
                }
            }
        }
    } catch (_) {}

    // 5. Strip markdown bold/italic/headers then retry JSON
    if (!parsed) try {
        const cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^#{1,6}\s+/gm, '');
        const fb = cleaned.indexOf('{');
        const lb = cleaned.lastIndexOf('}');
        if (fb !== -1 && lb > fb) parsed = JSON.parse(cleaned.substring(fb, lb + 1));
    } catch (_) {}

    // 6. Partial JSON recovery — extract scores from truncated response
    // Handles cases where closing } is missing (LLM output cut off mid-JSON)
    if (!parsed || !parsed.scores) try {
        const scores = recoverPartialScores(text);
        if (scores && Object.keys(scores).length > 0) {
            if (!parsed) parsed = {};
            parsed.scores = scores;
            // Try to recover other fields from partial text
            if (!parsed.recommendation) {
                const recMatch = text.match(/"recommendation"\s*:\s*"([^"]+)"/);
                if (recMatch) parsed.recommendation = recMatch[1];
            }
            if (parsed.confidence == null) {
                const confMatch = text.match(/"confidence"\s*:\s*(\d+)/);
                if (confMatch) parsed.confidence = parseInt(confMatch[1]);
            }
            if (parsed.score == null) {
                const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
                if (scoreMatch) parsed.score = parseInt(scoreMatch[1]);
            }
            // Recover prices and links
            if (!parsed.prices) {
                const pricesMatch = text.match(/"prices"\s*:\s*\{([^}]+)\}/);
                if (pricesMatch) try { parsed.prices = JSON.parse('{' + pricesMatch[1] + '}'); } catch(_) {}
            }
            if (!parsed.links) {
                const linksMatch = text.match(/"links"\s*:\s*\{([^}]+)\}/);
                if (linksMatch) try { parsed.links = JSON.parse('{' + linksMatch[1] + '}'); } catch(_) {}
            }
        }
    } catch (_) {}

    // Extract fields
    if (parsed) {
        if (parsed.recommendation) recommendation = String(parsed.recommendation);
        if (parsed.confidence != null) confidence = Number(parsed.confidence);
        if (parsed.score != null) score = Number(parsed.score);
        if (parsed.scores && typeof parsed.scores === 'object') scores = parsed.scores;
        // Also expose prices and links if present
        if (parsed.prices && typeof parsed.prices === 'object') parsed._prices = parsed.prices;
        if (parsed.links && typeof parsed.links === 'object') parsed._links = parsed.links;
    }

    // Fallback: regex from raw text
    if (!recommendation) {
        const recMatch = text.match(/recommendation["'\s:]+["']?([^"'\n,}]+)/i);
        if (recMatch) recommendation = recMatch[1].trim();
    }
    if (confidence == null) {
        const confMatch = text.match(/confidence["\s:]+(\d+)/i);
        if (confMatch) confidence = parseInt(confMatch[1]);
    }
    if (score == null) {
        const scoreMatch = text.match(/"score"\s*:\s*(\d+)/i);
        if (scoreMatch) score = parseInt(scoreMatch[1]);
    }

    console.log(`[parseVote] scores=${scores ? Object.keys(scores).length + ' objects' : 'null'}, recommendation=${recommendation}, parsed=${parsed ? 'yes' : 'no'}`);

    return {
        recommendation, confidence, score, scores,
        prices: parsed?._prices || null,
        links: parsed?._links || null
    };
}
