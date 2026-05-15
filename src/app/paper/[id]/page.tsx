"use client";

import { IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
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
    const { status, error, isPolling } = usePaperStatus(id);
    const router = useRouter();

    // If polling has stopped with an error and status never resolved,
    // show an error state instead of skeleton forever
    if (status === null && !isPolling && error) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center px-4 pt-14">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
                        <IconAlertTriangle className="size-8 text-destructive" />
                    </div>
                    <h2 className="mb-2 font-bold text-xl">Paper Not Found</h2>
                    <p className="mb-6 text-muted-foreground text-sm">
                        {error.includes("not found")
                            ? "This paper doesn't exist or has been deleted."
                            : `Something went wrong: ${error}`}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-5 py-2.5 font-medium text-primary text-sm transition-colors hover:bg-primary/20"
                    >
                        <IconArrowLeft className="size-4" />
                        Back to Home
                    </Link>
                </motion.div>
            </main>
        );
    }

    // Initial loading state (polling hasn't returned yet)
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
