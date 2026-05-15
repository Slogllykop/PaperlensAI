import { createClient } from "@supabase/supabase-js";

// ============================================================
// Server-side PDF preview generator
//
// Strategy:
// 1. Try arXiv thumbnail API (fast, no rendering needed)
// 2. Fall back to pdfjs-dist + node-canvas for other sources
// ============================================================

/**
 * Extract arXiv paper ID from any URL.
 * Matches standard arXiv ID formats: YYMM.NNNNN or subject-class/YYMMNNN
 */
function extractArxivId(url: string): string | null {
    // New format: 2605.10663, 1706.03762
    const newFormat = url.match(/(\d{4}\.\d{4,5})/);
    if (newFormat) return newFormat[1];
    // Old format: hep-th/9901001
    const oldFormat = url.match(/([a-z-]+\/\d{7})/);
    if (oldFormat) return oldFormat[1];
    return null;
}

/**
 * Try to get a preview image from arXiv's thumbnail service.
 * arXiv provides thumbnails at: https://arxiv.org/static/browse/YYMM.NNNNN1.png
 * (first page thumbnail, low-res). A more reliable approach is to
 * fetch the actual PDF and render page 1.
 *
 * Instead, we download the PDF and render page 1 with pdfjs-dist.
 */
function toPdfUrl(url: string): string {
    // arXiv: /abs/XXXX → /pdf/XXXX.pdf
    if (url.includes("arxiv.org/abs/")) {
        return url.replace("/abs/", "/pdf/").replace(/\/?$/, ".pdf");
    }
    if (url.includes("arxiv.org/pdf/")) {
        return url;
    }
    // alphaxiv.org
    if (url.includes("alphaxiv.org/abs/")) {
        const id = url.match(/alphaxiv\.org\/abs\/([\d.]+)/)?.[1];
        if (id) return `https://arxiv.org/pdf/${id}.pdf`;
    }
    // Semantic Scholar
    if (url.includes("semanticscholar.org")) {
        const arxivId = url.match(/arXiv[:/]([\d.]+)/i)?.[1];
        if (arxivId) return `https://arxiv.org/pdf/${arxivId}.pdf`;
    }
    // Hugging Face Papers
    if (url.includes("huggingface.co/papers/")) {
        const id = url.match(/huggingface\.co\/papers\/([\d.]+)/)?.[1];
        if (id) return `https://arxiv.org/pdf/${id}.pdf`;
    }
    // bioRxiv / medRxiv
    if (
        (url.includes("biorxiv.org") || url.includes("medrxiv.org")) &&
        !url.endsWith(".pdf")
    ) {
        return `${url.replace(/\/$/, "")}.full.pdf`;
    }
    return url;
}

/**
 * Attempt to fetch a PDF from the given URL. Returns ArrayBuffer or null.
 */
async function attemptPdfFetch(pdfUrl: string): Promise<ArrayBuffer | null> {
    try {
        const response = await fetch(pdfUrl, {
            headers: {
                "User-Agent":
                    "PaperLensAI/1.0 (Research Paper Analyzer; mailto:contact@paperlens.ai)",
                Accept: "application/pdf,*/*",
            },
            redirect: "follow",
        });

        if (!response.ok) return null;

        const contentType = response.headers.get("content-type") ?? "";
        if (
            !contentType.includes("pdf") &&
            !contentType.includes("octet-stream")
        ) {
            return null;
        }

        return await response.arrayBuffer();
    } catch (err) {
        console.warn("[PaperLens] Failed to fetch PDF from URL:", err);
        return null;
    }
}

/**
 * Fetch PDF bytes using multiple strategies.
 */
async function fetchPdfBytes(url: string): Promise<ArrayBuffer | null> {
    const pdfUrl = toPdfUrl(url);

    // Strategy 1: try the transformed URL
    const result = await attemptPdfFetch(pdfUrl);
    if (result) return result;

    // Strategy 2: try extracting arXiv ID as fallback
    if (pdfUrl === url) {
        const arxivId = extractArxivId(url);
        if (arxivId) {
            const fallbackUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
            console.log(`[PaperLens] Trying arXiv fallback: ${fallbackUrl}`);
            return attemptPdfFetch(fallbackUrl);
        }
    }

    return null;
}

/**
 * Render page 1 of a PDF to a JPEG buffer using pdfjs-dist + node-canvas.
 * Uses dynamic imports to avoid Turbopack bundling issues.
 */
async function renderFirstPage(pdfBytes: ArrayBuffer): Promise<Buffer | null> {
    try {
        // Dynamic import to avoid bundler issues — node-canvas is a native module
        // biome-ignore lint/suspicious/noExplicitAny: canvas types differ across versions
        let canvasModule: any;
        try {
            canvasModule = await import("canvas");
        } catch {
            console.error(
                "[PaperLens] 'canvas' (node-canvas) package not available",
            );
            return null;
        }

        // Use dynamic import for pdfjs-dist — Turbopack can handle this
        // biome-ignore lint/suspicious/noExplicitAny: pdfjs types are complex
        let pdfjsLib: any;
        try {
            // Try the legacy CommonJS-compatible build first
            pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        } catch {
            try {
                pdfjsLib = await import("pdfjs-dist");
            } catch (importErr) {
                console.error(
                    "[PaperLens] Failed to import pdfjs-dist:",
                    importErr,
                );
                return null;
            }
        }

        // Disable worker for server-side rendering (not needed)
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";

        const doc = await pdfjsLib.getDocument({
            data: new Uint8Array(pdfBytes),
            useSystemFonts: true,
            disableFontFace: true,
            isEvalSupported: false,
            useWorkerFetch: false,
            isOffscreenCanvasSupported: false,
        }).promise;

        const page = await doc.getPage(1);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = canvasModule.createCanvas(
            viewport.width,
            viewport.height,
        );
        const ctx = canvas.getContext("2d");

        await page.render({
            canvasContext: ctx,
            viewport,
        }).promise;

        // Export as JPEG buffer
        return canvas.toBuffer("image/jpeg", { quality: 0.75 });
    } catch (err) {
        console.error("[PaperLens] Failed to render PDF first page:", err);
        return null;
    }
}

/**
 * Upload a JPEG buffer to Supabase Storage and return the public URL.
 */
async function uploadToStorage(jpegBuffer: Buffer): Promise<string | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error(
            "[PaperLens] Supabase env vars missing for storage upload",
        );
        return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileName = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { data, error } = await supabase.storage
        .from("paper-previews")
        .upload(fileName, jpegBuffer, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        console.error("[PaperLens] Storage upload failed:", error.message);
        return null;
    }

    const {
        data: { publicUrl },
    } = supabase.storage.from("paper-previews").getPublicUrl(data.path);

    return publicUrl;
}

/**
 * Upload image bytes fetched from a URL to Supabase Storage.
 */
async function uploadImageFromUrl(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                "User-Agent":
                    "PaperLensAI/1.0 (Research Paper Analyzer; mailto:contact@paperlens.ai)",
            },
        });

        if (!response.ok) return null;

        const buffer = Buffer.from(await response.arrayBuffer());
        return uploadToStorage(buffer);
    } catch (err) {
        console.warn("[PaperLens] Failed to fetch thumbnail:", err);
        return null;
    }
}

/**
 * Generate a preview image from a paper URL.
 *
 * Strategy order:
 * 1. arXiv thumbnail API (fast, no PDF rendering)
 * 2. PDF fetch + pdfjs-dist render (fallback)
 *
 * Returns the public URL of the preview image, or null on failure.
 */
export async function generatePreviewFromUrl(
    url: string,
): Promise<string | null> {
    console.log(`[PaperLens] Generating preview from URL: ${url}`);

    // ── Strategy 1: arXiv thumbnail ──
    // arXiv provides thumbnails at a predictable URL pattern
    const arxivId = extractArxivId(url);
    if (arxivId) {
        // arXiv thumbnail URL pattern: https://arxiv.org/static/browse/{id}v1.png
        // But more reliably, we can use the PDF rendering approach below.
        // Let's try a direct thumbnail first:
        const thumbUrl = `https://arxiv.org/static/browse/${arxivId.replace("/", "")}1.png`;
        console.log(`[PaperLens] Trying arXiv thumbnail: ${thumbUrl}`);

        const thumbResult = await uploadImageFromUrl(thumbUrl);
        if (thumbResult) {
            console.log(
                `[PaperLens] Preview from arXiv thumbnail: ${thumbResult}`,
            );
            return thumbResult;
        }
        console.log(
            "[PaperLens] arXiv thumbnail not available, trying PDF render...",
        );
    }

    // ── Strategy 2: PDF fetch + render ──
    const pdfBytes = await fetchPdfBytes(url);
    if (!pdfBytes) {
        console.warn("[PaperLens] Could not fetch PDF bytes from URL");
        return null;
    }

    const jpegBuffer = await renderFirstPage(pdfBytes);
    if (!jpegBuffer) {
        console.warn("[PaperLens] Could not render first page");
        return null;
    }

    const publicUrl = await uploadToStorage(jpegBuffer);
    if (!publicUrl) {
        console.warn("[PaperLens] Could not upload preview to storage");
        return null;
    }

    console.log(`[PaperLens] Preview generated: ${publicUrl}`);
    return publicUrl;
}
