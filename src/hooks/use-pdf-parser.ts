"use client";

import { useCallback, useState } from "react";

interface PdfParseResult {
    text: string;
    previewDataUrl: string | null;
}

interface UsePdfParserReturn {
    parsePdf: (file: File) => Promise<PdfParseResult>;
    isParsing: boolean;
    error: string | null;
}

export function usePdfParser(): UsePdfParserReturn {
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parsePdf = useCallback(
        async (file: File): Promise<PdfParseResult> => {
            setIsParsing(true);
            setError(null);

            try {
                // Validate file
                if (file.type !== "application/pdf") {
                    throw new Error("Please upload a valid PDF file.");
                }
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error("File size must be under 10MB.");
                }

                const arrayBuffer = await file.arrayBuffer();

                // Dynamically import pdfjs to avoid SSR issues
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                    "pdfjs-dist/build/pdf.worker.min.mjs",
                    import.meta.url,
                ).toString();

                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer })
                    .promise;

                // Render first page as preview image
                let previewDataUrl: string | null = null;
                try {
                    const page = await pdf.getPage(1);
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext("2d");

                    if (ctx) {
                        await page.render({
                            canvasContext: ctx,
                            viewport,
                            canvas,
                        }).promise;
                        previewDataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    }
                } catch (previewErr) {
                    console.warn(
                        "[PaperLens] Failed to render preview:",
                        previewErr,
                    );
                }

                // Use position-aware extraction to preserve math formulas
                const { extractTextFromDocument } = await import(
                    "@/lib/pdf-text-extractor"
                );
                const fullText = await extractTextFromDocument(pdf, 20);

                if (!fullText) {
                    throw new Error(
                        "Could not extract text from this PDF. It may be image-based. Please paste the text manually.",
                    );
                }

                return { text: fullText, previewDataUrl };
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to parse PDF";
                setError(message);
                throw err;
            } finally {
                setIsParsing(false);
            }
        },
        [],
    );

    return { parsePdf, isParsing, error };
}
