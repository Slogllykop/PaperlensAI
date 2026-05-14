// ============================================================
// Position-aware PDF text extractor
// Uses TextItem transform matrices to preserve math formulas,
// superscripts, subscripts, and spatial structure
// ============================================================

import type {
    TextItem,
    TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

// ── Unicode super/subscript mapping tables ──────────────────

const SUPERSCRIPT_MAP: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
    "=": "⁼",
    "(": "⁽",
    ")": "⁾",
    n: "ⁿ",
    i: "ⁱ",
    a: "ᵃ",
    b: "ᵇ",
    c: "ᶜ",
    d: "ᵈ",
    e: "ᵉ",
    f: "ᶠ",
    g: "ᵍ",
    h: "ʰ",
    j: "ʲ",
    k: "ᵏ",
    l: "ˡ",
    m: "ᵐ",
    o: "ᵒ",
    p: "ᵖ",
    r: "ʳ",
    s: "ˢ",
    t: "ᵗ",
    u: "ᵘ",
    v: "ᵛ",
    w: "ʷ",
    x: "ˣ",
    y: "ʸ",
    z: "ᶻ",
    T: "ᵀ",
};

const SUBSCRIPT_MAP: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "+": "₊",
    "-": "₋",
    "=": "₌",
    "(": "₍",
    ")": "₎",
    a: "ₐ",
    e: "ₑ",
    h: "ₕ",
    i: "ᵢ",
    j: "ⱼ",
    k: "ₖ",
    l: "ₗ",
    m: "ₘ",
    n: "ₙ",
    o: "ₒ",
    p: "ₚ",
    r: "ᵣ",
    s: "ₛ",
    t: "ₜ",
    u: "ᵤ",
    v: "ᵥ",
    x: "ₓ",
};

// ── Types ───────────────────────────────────────────────────

interface PositionedItem {
    str: string;
    x: number; // translateX from transform matrix
    y: number; // translateY from transform matrix
    width: number; // item width
    fontSize: number; // derived from transform scaleX
    fontName: string;
}

interface TextLine {
    y: number;
    items: PositionedItem[];
    baseFontSize: number; // dominant font size on this line
}

// ── Helper: check if an item is a TextItem (not marked content) ─

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
    return "str" in item && typeof item.str === "string";
}

// ── Helper: convert a string to Unicode superscript ─────────

function toSuperscript(str: string): string {
    return str
        .split("")
        .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
        .join("");
}

// ── Helper: convert a string to Unicode subscript ───────────

function toSubscript(str: string): string {
    return str
        .split("")
        .map((ch) => SUBSCRIPT_MAP[ch] ?? ch)
        .join("");
}

// ── Core: extract positioned items from a page ─────────────

function extractPositionedItems(
    items: Array<TextItem | TextMarkedContent>,
): PositionedItem[] {
    const result: PositionedItem[] = [];

    for (const item of items) {
        if (!isTextItem(item) || !item.str) continue;

        // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
        const transform = item.transform;
        const fontSize = Math.abs(transform[0]);
        const x = transform[4];
        const y = transform[5];

        result.push({
            str: item.str,
            x,
            y,
            width: item.width,
            fontSize,
            fontName: item.fontName ?? "",
        });
    }

    return result;
}

// ── Core: group items into lines by Y-coordinate ───────────

function groupIntoLines(items: PositionedItem[]): TextLine[] {
    if (items.length === 0) return [];

    // Sort by Y descending (PDF Y increases upward), then X ascending
    const sorted = [...items].sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 1) return yDiff;
        return a.x - b.x;
    });

    const lines: TextLine[] = [];
    let currentLine: PositionedItem[] = [sorted[0]];
    let currentY = sorted[0].y;

    for (let i = 1; i < sorted.length; i++) {
        const item = sorted[i];
        // Items within ~60% of the dominant font size are on the "same line"
        // (accounts for super/subscripts being slightly offset)
        const threshold = Math.max(sorted[0].fontSize * 0.6, 3);

        if (Math.abs(item.y - currentY) < threshold) {
            currentLine.push(item);
        } else {
            // Finalize current line
            currentLine.sort((a, b) => a.x - b.x);
            const baseFontSize = getBaseFontSize(currentLine);
            lines.push({ y: currentY, items: currentLine, baseFontSize });

            // Start new line
            currentLine = [item];
            currentY = item.y;
        }
    }

    // Don't forget the last line
    if (currentLine.length > 0) {
        currentLine.sort((a, b) => a.x - b.x);
        const baseFontSize = getBaseFontSize(currentLine);
        lines.push({ y: currentY, items: currentLine, baseFontSize });
    }

    return lines;
}

// ── Helper: find the dominant font size on a line ───────────

function getBaseFontSize(items: PositionedItem[]): number {
    if (items.length === 0) return 12;

    // Count frequency of each font size (rounded to 1 decimal)
    const freq = new Map<number, number>();
    for (const item of items) {
        const rounded = Math.round(item.fontSize * 10) / 10;
        const charCount = item.str.length;
        freq.set(rounded, (freq.get(rounded) ?? 0) + charCount);
    }

    // Return the most frequent font size
    let maxCount = 0;
    let dominantSize = 12;
    for (const [size, count] of freq) {
        if (count > maxCount) {
            maxCount = count;
            dominantSize = size;
        }
    }
    return dominantSize;
}

// ── Core: reconstruct a line with proper spacing & scripts ──

function reconstructLine(line: TextLine): string {
    const { items, baseFontSize } = line;
    if (items.length === 0) return "";

    const parts: string[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const prevItem = i > 0 ? items[i - 1] : null;

        // Determine if this item is a superscript or subscript
        const isSmallerFont = item.fontSize < baseFontSize * 0.78;
        let processedStr = item.str;

        if (isSmallerFont && baseFontSize > 0) {
            const yDiff = item.y - line.y;
            // PDF Y goes up, so superscript has higher Y relative to line baseline
            // We compare against the middle of the base font
            if (yDiff > baseFontSize * 0.15) {
                processedStr = toSuperscript(item.str);
            } else if (yDiff < -baseFontSize * 0.15) {
                processedStr = toSubscript(item.str);
            }
        }

        // Calculate spacing from previous item
        if (prevItem) {
            const expectedX = prevItem.x + prevItem.width;
            const gap = item.x - expectedX;
            const spaceWidth = baseFontSize * 0.3; // approximate space character width

            if (gap > spaceWidth * 2.5) {
                // Large gap → likely column or section break
                parts.push("  ");
            } else if (gap > spaceWidth * 0.4) {
                // Normal word space
                parts.push(" ");
            }
            // else: tight spacing → concatenate directly (math glyphs, ligatures)
        }

        parts.push(processedStr);
    }

    return parts.join("");
}

// ── Public: extract structured text from a single PDF page ──

export async function extractTextFromPage(page: {
    getTextContent: () => Promise<{
        items: Array<TextItem | TextMarkedContent>;
    }>;
}): Promise<string> {
    const content = await page.getTextContent();
    const positionedItems = extractPositionedItems(content.items);

    if (positionedItems.length === 0) return "";

    const lines = groupIntoLines(positionedItems);
    return lines.map(reconstructLine).join("\n");
}

// ── Public: extract text from all pages of a PDF document ───

export async function extractTextFromDocument(
    pdf: {
        numPages: number;
        getPage: (n: number) => Promise<{
            getTextContent: () => Promise<{
                items: Array<TextItem | TextMarkedContent>;
            }>;
        }>;
    },
    maxPages = 20,
): Promise<string> {
    const pageCount = Math.min(pdf.numPages, maxPages);
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const pageText = await extractTextFromPage(page);
        if (pageText.trim()) {
            pageTexts.push(pageText);
        }
    }

    return pageTexts.join("\n\n").trim();
}
