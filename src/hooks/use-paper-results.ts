"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaperWithResults } from "@/lib/types";

interface UsePaperResultsReturn {
    data: PaperWithResults | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

export function usePaperResults(paperId: string): UsePaperResultsReturn {
    const [data, setData] = useState<PaperWithResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchResults = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/v1/papers/${paperId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to fetch results");
            }

            setData(result.data as PaperWithResults);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to load results";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [paperId]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    return { data, isLoading, error, refetch: fetchResults };
}
