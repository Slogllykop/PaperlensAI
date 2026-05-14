"use client";

import { useCallback, useState } from "react";

interface UseExportPdfReturn {
    exportPdf: (elementId: string, fileName?: string) => Promise<void>;
    isExporting: boolean;
    error: string | null;
}

/**
 * Robustly replace modern CSS color functions that html2canvas cannot parse.
 * Uses a parenthesis-balancing algorithm to handle infinite nesting
 * (e.g. oklch(calc(var(--a) + 1) ...)) which regex struggles with.
 */
function replaceModernColors(cssText: string): string {
    let result = cssText;
    const regex = /(oklch|oklab|lab|lch|color|color-mix)\s*\(/gi;

    while (true) {
        regex.lastIndex = 0;
        const match = regex.exec(result);
        if (!match) break;

        const idx = match.index;
        let openParens = 0;
        let endIdx = -1;

        for (let i = idx + match[0].length - 1; i < result.length; i++) {
            if (result[i] === "(") openParens++;
            else if (result[i] === ")") {
                openParens--;
                if (openParens === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            result =
                result.substring(0, idx) +
                "#e5e7eb" +
                result.substring(endIdx + 1);
        } else {
            // Break to avoid infinite loop if unbalanced
            break;
        }
    }
    return result;
}

export function useExportPdf(): UseExportPdfReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const exportPdf = useCallback(
        async (elementId: string, fileName = "PaperLens-Summary") => {
            setIsExporting(true);
            setError(null);

            const originalStyles: Element[] = [];

            try {
                const element = document.getElementById(elementId);
                if (!element) {
                    throw new Error("Export target not found");
                }

                // 1. Extract and patch all CSS from original document
                const cssBlocks: string[] = [];
                for (const sheet of window.document.styleSheets) {
                    try {
                        const rules = sheet.cssRules;
                        for (let i = 0; i < rules.length; i++) {
                            cssBlocks.push(rules[i].cssText);
                        }
                    } catch (e) {
                        // Ignore cross-origin
                    }
                }
                const allCss = cssBlocks.join("\n");
                const patchedCss = replaceModernColors(allCss);

                // 2. Temporarily disable original stylesheets for html2canvas
                const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
                for (const node of styleNodes) {
                    if (!node.hasAttribute("data-html2canvas-ignore")) {
                        node.setAttribute("data-html2canvas-ignore", "true");
                        originalStyles.push(node);
                    }
                }

                // 3. Inject our patched stylesheet
                const tempStyle = document.createElement("style");
                tempStyle.id = "pdf-export-patched-styles";
                tempStyle.textContent = patchedCss;
                document.head.appendChild(tempStyle);

                // Dynamically import to avoid SSR issues
                const html2canvas = (await import("html2canvas")).default;
                const { jsPDF } = await import("jspdf");

                // Render the element to a canvas
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#111113",
                    logging: false,
                    windowWidth: element.scrollWidth,
                    onclone: (_doc, _el) => {
                        // Remove interactive elements that don't belong in a PDF
                        const selectorsToRemove = [
                            "[data-export-ignore]",
                            ".react-flow__controls",
                            ".react-flow__minimap",
                            ".react-flow__attribution",
                            ".react-flow__panel",
                            '[data-testid="rf__minimap"]',
                        ];

                        for (const selector of selectorsToRemove) {
                            const els = _doc.querySelectorAll(selector);
                            for (const el of els) {
                                el.remove();
                            }
                        }

                        // Make the React Flow viewport non-interactive and static
                        const rfViewports = _doc.querySelectorAll(".react-flow__viewport");
                        const htmlElementClass = _doc.defaultView?.HTMLElement;
                        if (htmlElementClass) {
                            for (const vp of rfViewports) {
                                if (vp instanceof htmlElementClass) {
                                    vp.style.transform = "none";
                                    vp.style.pointerEvents = "none";
                                }
                            }
                        }
                    },
                    ignoreElements: (el) =>
                        el.hasAttribute("data-export-ignore"),
                });

                // Create PDF with correct aspect ratio
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;

                // A4 width in mm
                const pdfWidth = 210;
                const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

                // Split into pages if content is taller than A4
                const a4Height = 297; // A4 height in mm
                const totalPages = Math.ceil(pdfHeight / a4Height);

                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "a4",
                });

                for (let page = 0; page < totalPages; page++) {
                    if (page > 0) {
                        pdf.addPage();
                    }

                    // Calculate the source area for this page
                    const sourceY = (page * a4Height * imgWidth) / pdfWidth;
                    const sourceHeight = Math.min(
                        (a4Height * imgWidth) / pdfWidth,
                        imgHeight - sourceY,
                    );
                    const destHeight = (sourceHeight * pdfWidth) / imgWidth;

                    // Create a temporary canvas for this page to avoid memory limits
                    const pageCanvas = document.createElement("canvas");
                    pageCanvas.width = imgWidth;
                    pageCanvas.height = sourceHeight;
                    const ctx = pageCanvas.getContext("2d");

                    if (ctx) {
                        ctx.fillStyle = "#111113";
                        ctx.fillRect(0, 0, imgWidth, sourceHeight);
                        ctx.drawImage(
                            canvas,
                            0,
                            sourceY,
                            imgWidth,
                            sourceHeight,
                            0,
                            0,
                            imgWidth,
                            sourceHeight,
                        );

                        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
                        pdf.addImage(
                            pageImgData,
                            "JPEG",
                            0,
                            0,
                            pdfWidth,
                            destHeight,
                            undefined,
                            "FAST",
                        );
                    }
                }

                pdf.save(`${fileName}.pdf`);
            } catch (err) {
                console.error("[PaperLens] PDF export failed:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "An unexpected error occurred during PDF export.",
                );
            } finally {
                // RESTORE DOM STATE
                const tempStyle = document.getElementById("pdf-export-patched-styles");
                if (tempStyle) tempStyle.remove();

                for (const node of originalStyles) {
                    node.removeAttribute("data-html2canvas-ignore");
                }

                setIsExporting(false);
            }
        },
        [],
    );

    return { exportPdf, isExporting, error };
}
