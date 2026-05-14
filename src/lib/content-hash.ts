import { createHash } from "node:crypto";

// ============================================================
// Content fingerprinting for deduplication
// Generates a stable SHA-256 hash from paper text so identical
// papers (regardless of upload method) resolve to the same key.
// ============================================================

/**
 * Normalize text before hashing to ensure minor whitespace
 * and metadata differences between PDF extraction and URL scraping don't
 * produce different hashes for the same paper.
 */
function normalizeText(text: string): string {
    let lower = text.toLowerCase();

    // Fix PDF hyphenation at line breaks (e.g., "trans-\n  duction")
    lower = lower.replace(/-\s*[\r\n]+\s*/g, "");

    // Remove all non-alphanumeric characters except whitespace
    lower = lower.replace(/[^a-z0-9\s]/g, " ");

    // Extract words of length 5 or more
    // This naturally strips out short navigation words, page numbers, and basic stop words.
    const words = lower.match(/[a-z0-9]{5,}/g) || [];

    // Find an anchor to align PDF and URL texts
    const anchors = ["abstract", "introduction", "background"];

    for (const anchor of anchors) {
        // Search backwards within the first 250 long words (bypassing early nav "abstract" links)
        let anchorIdx = -1;
        for (let i = Math.min(250, words.length - 1); i >= 0; i--) {
            if (words[i] === anchor) {
                anchorIdx = i;
                break;
            }
        }

        if (anchorIdx !== -1 && words.length > anchorIdx + 40) {
            // Return the 40 long words immediately following the anchor
            return words.slice(anchorIdx + 1, anchorIdx + 41).join("");
        }
    }

    // Fallback: Skip first 50 long words to bypass varying metadata, take the next 40
    const start = Math.min(50, Math.floor(words.length / 4));
    return words.slice(start, start + 40).join("");
}

/**
 * Generate a stable content fingerprint for a paper's text.
 * Two identical papers uploaded via PDF or URL will produce
 * the same hash, enabling cache deduplication.
 */
export function generateContentHash(rawText: string): string {
    const normalized = normalizeText(rawText);
    return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Generate a hash specifically for a paper title.
 * Used as an alternative deduplication mechanism.
 */
export function generateTitleHash(title: string): string {
    const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** Redis key for the content → paperId mapping */
export function contentCacheKey(hash: string): string {
    return `paperlens:content:${hash}`;
}

/** TTL for the content hash mapping (24 hours) */
export const CONTENT_CACHE_TTL = 60 * 60 * 24;
