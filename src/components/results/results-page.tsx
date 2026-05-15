"use client";

import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { KeyConcepts } from "@/components/results/key-concepts";
import { LearningCards } from "@/components/results/learning-cards";
import { MathExplained } from "@/components/results/math-explained";
import { MindMapView } from "@/components/results/mind-map";
import { PaperPreview } from "@/components/results/paper-preview";
import { RelatedTopics } from "@/components/results/related-topics";
import { SummaryCard } from "@/components/results/summary-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { usePaperResults } from "@/hooks/use-paper-results";

interface ResultsPageProps {
    paperId: string;
}

export function ResultsPage({ paperId }: ResultsPageProps) {
    const { data, isLoading, error } = usePaperResults(paperId);
    const { exportPdf, isExporting } = useExportPdf();

    if (isLoading) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <div className="flex flex-col gap-6">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !data?.analysis) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
                <div className="text-center">
                    <h2 className="font-bold text-xl">
                        Could not load results
                    </h2>
                    <p className="mt-2 text-muted-foreground text-sm">
                        {error || "Analysis data is not available yet."}
                    </p>
                </div>
            </div>
        );
    }

    const { paper, analysis } = data;

    const handleExport = () => {
        exportPdf(
            analysis,
            paper.title ?? "Untitled Paper",
            "mindmap-container",
        );
    };

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            {/* Export Button — excluded from PDF */}
            <div
                className="mb-6 flex items-center justify-end"
                data-export-ignore
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="gap-2"
                >
                    {isExporting ? (
                        <>
                            <IconLoader2 className="size-4 animate-spin" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <IconDownload className="size-4" />
                            Export as PDF
                        </>
                    )}
                </Button>
            </div>

            {/* Exportable content area */}
            <div id="export-target" className="flex flex-col gap-8">
                {/* A. Summary Card */}
                <SummaryCard summary={analysis.summary} />

                {/* B. Key Concepts */}
                <KeyConcepts concepts={analysis.key_concepts} />

                {/* C. Math Made Simple */}
                <MathExplained math={analysis.math_explanation} />

                {/* D. Paper Preview */}
                <PaperPreview
                    sourceUrl={paper.source_url}
                    previewImageUrl={paper.preview_image_url}
                    title={analysis.summary.title}
                    inputType={paper.input_type}
                />

                {/* E. Mind Map */}
                <div id="mindmap-container">
                    <MindMapView mindMap={analysis.mind_map} />
                </div>

                {/* F. Learning Cards */}
                <LearningCards cards={analysis.learning_cards} />

                {/* G. Related Topics */}
                <RelatedTopics topics={analysis.related_topics} />

                {/* Footer */}
                <div className="border-border/30 border-t pt-4 text-center text-muted-foreground/50 text-xs">
                    Analyzed with {analysis.ai_model} in{" "}
                    {(analysis.processing_time_ms / 1000).toFixed(1)}s
                </div>
            </div>
        </div>
    );
}
