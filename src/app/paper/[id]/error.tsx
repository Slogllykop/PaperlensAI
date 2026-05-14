"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function PaperError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center px-4 pt-14">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
                    <IconAlertTriangle className="size-7 text-destructive" />
                </div>
                <h2 className="font-bold text-xl">Something went wrong</h2>
                <p className="max-w-sm text-muted-foreground text-sm">
                    {error.message ||
                        "An unexpected error occurred while loading this paper."}
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => window.history.back()}
                    >
                        Go Back
                    </Button>
                    <Button onClick={reset}>Try Again</Button>
                </div>
            </div>
        </main>
    );
}
