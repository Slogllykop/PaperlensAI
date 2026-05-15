"use client";

import { useCallback, useState } from "react";
import type { AnalysisResult } from "@/lib/types";

interface UseExportPdfReturn {
    exportPdf: (
        analysis: AnalysisResult,
        paperTitle: string,
        mindMapElementId?: string,
    ) => Promise<void>;
    isExporting: boolean;
    error: string | null;
}

// ────────────────────────────────────────────────────────────
// Constants for PDF layout
// ────────────────────────────────────────────────────────────
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const LINE_HEIGHT = 6; // Base line height in mm

// ────────────────────────────────────────────────────────────
// Strip LaTeX $ delimiters for plain-text representation
// ────────────────────────────────────────────────────────────
function stripLatex(text: string): string {
    if (!text) return "";
    return text
        .replace(/\$\$([^$]+)\$\$/g, "$1")
        .replace(/\$([^$]+)\$/g, "$1")
        .replace(
            /\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|sigma|omega|pi|phi|psi|rho|tau|eta|zeta|xi|kappa|nu|chi|iota|upsilon)/gi,
            "$1",
        )
        .replace(
            /\\(frac|sqrt|sum|prod|int|lim|log|ln|sin|cos|tan|exp|inf|sup|min|max)\b/g,
            "$1",
        )
        .replace(/[\\{}^_]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function useExportPdf(): UseExportPdfReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const exportPdf = useCallback(
        async (
            analysis: AnalysisResult,
            paperTitle: string,
            mindMapElementId?: string,
        ) => {
            setIsExporting(true);
            setError(null);

            try {
                const { jsPDF } = await import("jspdf");
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "a4",
                });

                let y = MARGIN_TOP;

                // ─── Helper functions ────────────────────────────────
                function checkPageBreak(neededHeight: number) {
                    if (y + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
                        pdf.addPage();
                        y = MARGIN_TOP;
                    }
                }

                function addHeading(text: string, fontSize = 16) {
                    checkPageBreak(fontSize * 0.6 + 8);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(fontSize);
                    pdf.setTextColor(0, 0, 0);
                    const lines = pdf.splitTextToSize(text, CONTENT_WIDTH);
                    pdf.text(lines, MARGIN_LEFT, y);
                    y += lines.length * fontSize * 0.45 + 4;
                }

                function addSubheading(text: string) {
                    checkPageBreak(14);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(11);
                    pdf.setTextColor(60, 60, 60);
                    pdf.text(text.toUpperCase(), MARGIN_LEFT, y);
                    y += 6;
                }

                function addBody(text: string, indent = 0) {
                    if (!text) return;
                    const cleanText = stripLatex(text);
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(30, 30, 30);
                    const maxWidth = CONTENT_WIDTH - indent;
                    const lines = pdf.splitTextToSize(cleanText, maxWidth);
                    for (const line of lines) {
                        checkPageBreak(LINE_HEIGHT);
                        pdf.text(line, MARGIN_LEFT + indent, y);
                        y += LINE_HEIGHT;
                    }
                }

                function addBullet(label: string, description: string) {
                    const bulletText = `• ${label}`;
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(10);
                    pdf.setTextColor(30, 30, 30);
                    checkPageBreak(LINE_HEIGHT);
                    pdf.text(bulletText, MARGIN_LEFT + 4, y);
                    y += LINE_HEIGHT;

                    if (description) {
                        addBody(description, 8);
                    }
                }

                function addSeparator() {
                    checkPageBreak(8);
                    y += 2;
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineWidth(0.3);
                    pdf.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
                    y += 6;
                }

                function addSpacer(height = 4) {
                    y += height;
                }

                // ═════════════════════════════════════════════════════
                // 1. TITLE & METADATA
                // ═════════════════════════════════════════════════════
                addHeading(analysis.summary.title, 18);
                addSpacer(2);

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                const metaLine = `Category: ${analysis.summary.category}  |  Difficulty: ${analysis.summary.difficulty}`;
                pdf.text(metaLine, MARGIN_LEFT, y);
                y += 6;

                addSeparator();

                // ═════════════════════════════════════════════════════
                // 2. SUMMARY
                // ═════════════════════════════════════════════════════
                addHeading("Summary", 14);
                addBody(analysis.summary.one_line_summary);
                addSpacer(4);

                addSubheading("Problem Solved");
                addBody(analysis.summary.problem_solved);
                addSpacer(4);

                addSubheading("Method Used");
                addBody(analysis.summary.method_used);

                addSeparator();

                // ═════════════════════════════════════════════════════
                // 3. KEY CONCEPTS
                // ═════════════════════════════════════════════════════
                addHeading("Key Concepts", 14);
                for (const concept of analysis.key_concepts) {
                    addBullet(concept.name, concept.description);
                    addSpacer(2);
                }

                addSeparator();

                // ═════════════════════════════════════════════════════
                // 4. MATH EXPLANATION
                // ═════════════════════════════════════════════════════
                if (analysis.math_explanation.has_math) {
                    addHeading("Math Explanation", 14);

                    if (analysis.math_explanation.equation_name) {
                        addSubheading(analysis.math_explanation.equation_name);
                    }

                    if (analysis.math_explanation.equation) {
                        addBody(
                            `Equation: ${stripLatex(analysis.math_explanation.equation)}`,
                        );
                        addSpacer(2);
                    }

                    if (analysis.math_explanation.what_it_means) {
                        addSubheading("What It Means");
                        addBody(analysis.math_explanation.what_it_means);
                        addSpacer(2);
                    }

                    // Symbols table
                    if (analysis.math_explanation.symbols.length > 0) {
                        addSubheading("Symbol Reference");
                        for (const sym of analysis.math_explanation.symbols) {
                            const symbolText = stripLatex(sym.symbol);
                            const meaningText = stripLatex(sym.meaning);
                            addBody(`${symbolText}  =  ${meaningText}`, 4);
                        }
                        addSpacer(2);
                    }

                    // Step by step
                    if (analysis.math_explanation.step_by_step.length > 0) {
                        addSubheading("Step by Step");
                        analysis.math_explanation.step_by_step.forEach(
                            (step, i) => {
                                const cleanStep = stripLatex(step);
                                pdf.setFont("helvetica", "bold");
                                pdf.setFontSize(10);
                                checkPageBreak(LINE_HEIGHT);
                                pdf.text(`${i + 1}.`, MARGIN_LEFT + 4, y);
                                pdf.setFont("helvetica", "normal");
                                const stepLines = pdf.splitTextToSize(
                                    cleanStep,
                                    CONTENT_WIDTH - 14,
                                );
                                for (const line of stepLines) {
                                    checkPageBreak(LINE_HEIGHT);
                                    pdf.text(line, MARGIN_LEFT + 12, y);
                                    y += LINE_HEIGHT;
                                }
                                addSpacer(1);
                            },
                        );
                    }

                    // Simple explanation
                    if (analysis.math_explanation.simple_explanation) {
                        addSpacer(2);
                        addSubheading("In Simple Terms");
                        addBody(analysis.math_explanation.simple_explanation);
                    }

                    addSeparator();
                }

                // ═════════════════════════════════════════════════════
                // 5. MIND MAP (always starts on a new page)
                //
                // Uses html-to-image instead of html2canvas because
                // html2canvas crashes on CSS v4 color functions (oklch,
                // lab, etc.) from Tailwind v4. html-to-image uses SVG
                // foreignObject serialization which handles modern CSS.
                // We force B&W output for clean PDF rendering.
                // ═════════════════════════════════════════════════════
                if (mindMapElementId) {
                    try {
                        const mindMapEl =
                            document.getElementById(mindMapElementId);
                        if (mindMapEl) {
                            // Always start mind map on a fresh page
                            pdf.addPage();
                            y = MARGIN_TOP;
                            addHeading("Mind Map", 14);

                            // Inject B&W override + hide RF controls
                            const bwStyle = document.createElement("style");
                            bwStyle.setAttribute(
                                "data-pdf-export",
                                "mind-map-bw",
                            );
                            bwStyle.textContent = `
                                #${mindMapElementId} *,
                                #${mindMapElementId} *::before,
                                #${mindMapElementId} *::after {
                                    color: #1a1a1a !important;
                                    background-color: #ffffff !important;
                                    background: #ffffff !important;
                                    border-color: #cccccc !important;
                                    outline-color: #cccccc !important;
                                    box-shadow: none !important;
                                    text-shadow: none !important;
                                    fill: #1a1a1a !important;
                                    stroke: #666666 !important;
                                }
                                #${mindMapElementId} .react-flow__edge path {
                                    stroke: #888888 !important;
                                    stroke-width: 2px !important;
                                }
                                #${mindMapElementId} .react-flow__controls,
                                #${mindMapElementId} .react-flow__minimap,
                                #${mindMapElementId} .react-flow__attribution,
                                #${mindMapElementId} .react-flow__panel,
                                #${mindMapElementId} .react-flow__background,
                                #${mindMapElementId} .react-flow__handle {
                                    display: none !important;
                                }
                            `;
                            document.head.appendChild(bwStyle);

                            // Trigger fitView so the entire graph is visible
                            window.dispatchEvent(
                                new Event("paperlens:fitview"),
                            );
                            // Wait for React Flow viewport transition
                            await new Promise((r) => setTimeout(r, 500));

                            let dataUrl: string;
                            try {
                                const { toPng } = await import("html-to-image");
                                dataUrl = await toPng(mindMapEl, {
                                    backgroundColor: "#ffffff",
                                    pixelRatio: 2,
                                    cacheBust: true,
                                    filter: (node: HTMLElement) => {
                                        // Filter out RF interactive elements
                                        const cls = node.className ?? "";
                                        if (typeof cls !== "string")
                                            return true;
                                        return !(
                                            cls.includes(
                                                "react-flow__controls",
                                            ) ||
                                            cls.includes(
                                                "react-flow__minimap",
                                            ) ||
                                            cls.includes(
                                                "react-flow__attribution",
                                            ) ||
                                            cls.includes("react-flow__panel") ||
                                            cls.includes(
                                                "react-flow__background",
                                            )
                                        );
                                    },
                                });
                            } finally {
                                bwStyle.remove();
                            }

                            // Create an Image from the data URL to get dimensions
                            const img = new window.Image();
                            await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = reject;
                                img.src = dataUrl;
                            });

                            const imgWidth = CONTENT_WIDTH;
                            const imgHeight =
                                (img.naturalHeight * imgWidth) /
                                img.naturalWidth;

                            // Fit within remaining page space
                            const maxHeight = PAGE_HEIGHT - y - MARGIN_BOTTOM;
                            const finalHeight = Math.min(imgHeight, maxHeight);

                            pdf.addImage(
                                dataUrl,
                                "PNG",
                                MARGIN_LEFT,
                                y,
                                imgWidth,
                                finalHeight,
                            );
                            y += finalHeight + 4;
                            addSeparator();
                        }
                    } catch (mindMapErr) {
                        console.warn(
                            "[PaperLens] Mind map capture failed (non-critical):",
                            mindMapErr,
                        );
                        // Continue without the mind map image
                    }
                }

                // ═════════════════════════════════════════════════════
                // 6. LEARNING CARDS
                // ═════════════════════════════════════════════════════
                if (analysis.learning_cards.length > 0) {
                    addHeading("Learning Cards", 14);
                    for (const card of analysis.learning_cards) {
                        checkPageBreak(LINE_HEIGHT * 3);
                        pdf.setFont("helvetica", "bold");
                        pdf.setFontSize(10);
                        pdf.setTextColor(30, 30, 30);

                        const questionLines = pdf.splitTextToSize(
                            `Q: ${card.question}`,
                            CONTENT_WIDTH - 4,
                        );
                        for (const line of questionLines) {
                            checkPageBreak(LINE_HEIGHT);
                            pdf.text(line, MARGIN_LEFT + 4, y);
                            y += LINE_HEIGHT;
                        }

                        pdf.setFont("helvetica", "normal");
                        const answerLines = pdf.splitTextToSize(
                            `A: ${card.answer}`,
                            CONTENT_WIDTH - 4,
                        );
                        for (const line of answerLines) {
                            checkPageBreak(LINE_HEIGHT);
                            pdf.text(line, MARGIN_LEFT + 4, y);
                            y += LINE_HEIGHT;
                        }
                        addSpacer(4);
                    }

                    addSeparator();
                }

                // ═════════════════════════════════════════════════════
                // 7. RELATED TOPICS
                // ═════════════════════════════════════════════════════
                if (analysis.related_topics.length > 0) {
                    addHeading("Related Topics", 14);
                    for (const topic of analysis.related_topics) {
                        addBullet(topic.name, topic.description);
                        addSpacer(2);
                    }
                    addSpacer(4);
                }

                // ═════════════════════════════════════════════════════
                // FOOTER
                // ═════════════════════════════════════════════════════
                checkPageBreak(16);
                addSpacer(4);
                pdf.setDrawColor(180, 180, 180);
                pdf.setLineWidth(0.2);
                pdf.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
                y += 6;

                pdf.setFont("helvetica", "italic");
                pdf.setFontSize(8);
                pdf.setTextColor(130, 130, 130);
                const footerText = `Generated by PaperLens AI  •  Analyzed with ${analysis.ai_model} in ${(analysis.processing_time_ms / 1000).toFixed(1)}s`;
                pdf.text(footerText, MARGIN_LEFT, y);

                // ─── Save ────────────────────────────────────────────
                const sanitizedTitle = paperTitle
                    .replace(/[^a-zA-Z0-9\s]/g, "")
                    .replace(/\s+/g, "-")
                    .slice(0, 50);
                pdf.save(`PaperLens-${sanitizedTitle}.pdf`);
            } catch (err) {
                console.error("[PaperLens] PDF export failed:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "An unexpected error occurred during PDF export.",
                );
            } finally {
                setIsExporting(false);
            }
        },
        [],
    );

    return { exportPdf, isExporting, error };
}
