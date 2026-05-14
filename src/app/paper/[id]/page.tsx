"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { ProcessingScreen } from "@/components/processing-screen";
import { ResultsPage } from "@/components/results/results-page";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaperStatus } from "@/hooks/use-paper-status";

export default function PaperPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const { status } = usePaperStatus(id);
    const router = useRouter();

    // Initial loading state
    if (status === null) {
        return (
            <main className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </main>
        );
    }

    // Completed: show results
    if (status === "completed") {
        return (
            <main className="pt-14">
                <ResultsPage paperId={id} />
            </main>
        );
    }

    // Processing, pending, and failed states — all handled by ProcessingScreen
    // which has built-in auto-retry with cancel support
    return (
        <main className="pt-14">
            <ProcessingScreen
                paperId={id}
                onComplete={() => router.refresh()}
            />
        </main>
    );
}
