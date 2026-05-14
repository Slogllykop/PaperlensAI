import { createClient } from "@supabase/supabase-js";

// ============================================================
// Server-side PDF preview generator
// Fetches a PDF, renders page 1 using pdfjs-dist + node-canvas,
// uploads the JPEG to Supabase Storage, returns public URL.
// ============================================================

/**
 * Known academic domains that serve PDFs.
 * Transforms abstract/landing page URLs into direct PDF links.
 */
function toPdfUrl(url: string): string {
    // arXiv: /abs/XXXX → /pdf/XXXX.pdf
    if (url.includes("arxiv.org/abs/")) {
        return url.replace("/abs/", "/pdf/").replace(/\/?$/, ".pdf");
    }
    // bioRxiv / medRxiv: append .full.pdf
    if (
        (url.includes("biorxiv.org") || url.includes("medrxiv.org")) &&
        !url.endsWith(".pdf")
    ) {
        return `${url.replace(/\/$/, "")}.full.pdf`;
    }
    return url;
}

/**
 * Attempt to fetch a PDF from the given URL.
 * Returns the ArrayBuffer, or null if the URL doesn't serve a PDF.
 */
async function fetchPdfBytes(url: string): Promise<ArrayBuffer | null> {
    const pdfUrl = toPdfUrl(url);

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
        // Accept application/pdf or octet-stream (some servers use this)
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
 * Render the first page of a PDF ArrayBuffer to a JPEG buffer.
 * Uses pdfjs-dist with node-canvas for server-side rendering.
 */
async function renderFirstPage(pdfBytes: ArrayBuffer): Promise<Buffer | null> {
    try {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

        // Let pdfjs-dist use the default fake worker for server-side usage

        const doc = await pdfjsLib.getDocument({
            data: new Uint8Array(pdfBytes),
            useSystemFonts: true,
            disableFontFace: true,
        }).promise;

        const page = await doc.getPage(1);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        // Use node-canvas for server-side rendering
        const { createCanvas } = await import("canvas");
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext("2d");

        await page.render({
            // biome-ignore lint/suspicious/noExplicitAny: pdfjs-dist types vs node-canvas types mismatch
            canvasContext: ctx as any,
            viewport,
            // biome-ignore lint/suspicious/noExplicitAny: node-canvas is compatible but type differs
            canvas: canvas as any,
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
 * Generate a preview image from a paper URL.
 * Fetches the PDF, renders page 1, uploads to Supabase Storage.
 * Returns the public URL of the preview image, or null on failure.
 */
export async function generatePreviewFromUrl(
    url: string,
): Promise<string | null> {
    console.log(`[PaperLens] Generating preview from URL: ${url}`);

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
