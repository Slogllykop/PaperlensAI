"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisStatus } from "@/lib/types";

interface StatusData {
    id: string;
    status: AnalysisStatus;
    current_step: string;
    error_message: string | null;
    updated_at: string;
}

interface UsePaperStatusReturn {
    status: AnalysisStatus | null;
    currentStep: string;
    error: string | null;
    isPolling: boolean;
    isRetrying: boolean;
    retryCount: number;
    maxRetries: number;
    retry: () => Promise<void>;
    cancelRetry: () => void;
}

const MAX_AUTO_RETRIES = 2;

export function usePaperStatus(paperId: string): UsePaperStatusReturn {
    const [status, setStatus] = useState<AnalysisStatus | null>(null);
    const [currentStep, setCurrentStep] = useState("received");
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [retryCancelled, setRetryCancelled] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`/api/v1/papers/${paperId}/status`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to fetch status");
            }

            const data = result.data as StatusData;
            setStatus(data.status);
            setCurrentStep(data.current_step);

            if (data.status === "failed") {
                setError(data.error_message || "Analysis failed");
                setIsPolling(false);
            }

            if (data.status === "completed") {
                setError(null);
                setIsPolling(false);
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to check status";
            setError(message);
            setIsPolling(false);
        }
    }, [paperId]);

    // Retry: calls the /retry endpoint to re-queue the analysis
    const retry = useCallback(async () => {
        setIsRetrying(true);
        setError(null);

        try {
            const response = await fetch(`/api/v1/papers/${paperId}/retry`, {
                method: "POST",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Retry failed");
            }

            // Reset state and resume polling
            setStatus("pending");
            setCurrentStep("received");
            setIsPolling(true);
            setRetryCount((prev) => prev + 1);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Retry failed";
            setError(message);
        } finally {
            setIsRetrying(false);
        }
    }, [paperId]);

    // Cancel auto-retry
    const cancelRetry = useCallback(() => {
        setRetryCancelled(true);
    }, []);

    // Auto-retry on failure (up to MAX_AUTO_RETRIES)
    useEffect(() => {
        if (
            status === "failed" &&
            retryCount < MAX_AUTO_RETRIES &&
            !retryCancelled &&
            !isRetrying
        ) {
            const delay = (retryCount + 1) * 3000; // 3s, 6s backoff
            const timer = setTimeout(() => {
                retry();
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [status, retryCount, retryCancelled, isRetrying, retry]);

    // Polling logic
    useEffect(() => {
        if (!isPolling) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Fetch immediately
        fetchStatus();

        // Then poll every 2 seconds
        intervalRef.current = setInterval(fetchStatus, 2000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPolling, fetchStatus]);

    return {
        status,
        currentStep,
        error,
        isPolling,
        isRetrying,
        retryCount,
        maxRetries: MAX_AUTO_RETRIES,
        retry,
        cancelRetry,
    };
}
