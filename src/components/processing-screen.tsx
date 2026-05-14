"use client";

import {
    IconAlertTriangle,
    IconBrain,
    IconCheck,
    IconCircleDot,
    IconFileText,
    IconHierarchy2,
    IconLoader2,
    IconMathFunction,
    IconRefresh,
    IconSparkles,
    IconX,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { usePaperStatus } from "@/hooks/use-paper-status";
import type { ProcessingStep } from "@/lib/types";

const STEPS: ProcessingStep[] = [
    { id: "received", label: "Paper received", status: "waiting" },
    { id: "reading_content", label: "Reading content", status: "waiting" },
    { id: "finding_ideas", label: "Finding key ideas", status: "waiting" },
    { id: "explaining_math", label: "Explaining math", status: "waiting" },
    { id: "creating_mindmap", label: "Creating mind map", status: "waiting" },
    {
        id: "preparing_summary",
        label: "Preparing visual summary",
        status: "waiting",
    },
];

const STEP_ICONS = [
    IconFileText,
    IconBrain,
    IconBrain,
    IconMathFunction,
    IconHierarchy2,
    IconSparkles,
];

function getStepStatus(
    stepId: string,
    currentStep: string,
): "waiting" | "active" | "completed" {
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

    if (currentStep === "done") return "completed";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "waiting";
}

interface ProcessingScreenProps {
    paperId: string;
    onComplete: () => void;
}

export function ProcessingScreen({
    paperId,
    onComplete,
}: ProcessingScreenProps) {
    const {
        status,
        currentStep,
        error,
        isRetrying,
        retryCount,
        maxRetries,
        retry,
        cancelRetry,
    } = usePaperStatus(paperId);

    // Navigate to results when complete
    if (status === "completed") {
        // Small delay for the final animation
        setTimeout(onComplete, 800);
    }

    const isFailed = status === "failed";
    const isAutoRetrying = isFailed && retryCount < maxRetries && !isRetrying;
    const hasExhaustedRetries = isFailed && retryCount >= maxRetries;

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="mb-8 text-center">
                    <motion.div
                        animate={{
                            rotate:
                                status === "completed" || isFailed ? 0 : 360,
                        }}
                        transition={{
                            duration: 2,
                            repeat:
                                status === "completed" || isFailed
                                    ? 0
                                    : Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                        className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl ${
                            isFailed
                                ? "bg-destructive/10"
                                : status === "completed"
                                  ? "bg-emerald-500/10"
                                  : "bg-primary/10"
                        }`}
                    >
                        {status === "completed" ? (
                            <IconCheck className="size-8 text-emerald-500" />
                        ) : isFailed ? (
                            <IconAlertTriangle className="size-8 text-destructive" />
                        ) : (
                            <IconBrain className="size-8 text-primary" />
                        )}
                    </motion.div>
                    <h2 className="font-bold text-xl">
                        {status === "completed"
                            ? "Analysis Complete!"
                            : isFailed
                              ? "Analysis Failed"
                              : "Analyzing your paper..."}
                    </h2>
                    <p className="mt-1 text-muted-foreground text-sm">
                        {status === "completed"
                            ? "Your visual explanation is ready"
                            : isFailed
                              ? isRetrying
                                  ? "Retrying analysis..."
                                  : isAutoRetrying
                                    ? `Auto-retrying in a moment... (${retryCount + 1}/${maxRetries})`
                                    : "All retry attempts have been exhausted"
                              : "This usually takes 15-30 seconds"}
                    </p>
                </div>

                {/* Steps */}
                <div className="rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm">
                    <div className="flex flex-col gap-4">
                        {STEPS.map((step, index) => {
                            const stepStatus = getStepStatus(
                                step.id,
                                currentStep,
                            );
                            const StepIcon = STEP_ICONS[index];

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    {/* Status Icon */}
                                    <div
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                            stepStatus === "completed"
                                                ? "bg-emerald-500/15 text-emerald-500"
                                                : stepStatus === "active"
                                                  ? "bg-primary/15 text-primary"
                                                  : "bg-muted text-muted-foreground/40"
                                        }`}
                                    >
                                        {stepStatus === "completed" ? (
                                            <IconCheck className="size-4" />
                                        ) : stepStatus === "active" ? (
                                            <IconLoader2 className="size-4 animate-spin" />
                                        ) : (
                                            <IconCircleDot className="size-4" />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="flex flex-1 items-center gap-2">
                                        <StepIcon
                                            className={`size-4 ${
                                                stepStatus === "completed"
                                                    ? "text-emerald-500"
                                                    : stepStatus === "active"
                                                      ? "text-foreground"
                                                      : "text-muted-foreground/40"
                                            }`}
                                        />
                                        <span
                                            className={`font-medium text-sm ${
                                                stepStatus === "completed"
                                                    ? "text-emerald-500"
                                                    : stepStatus === "active"
                                                      ? "text-foreground"
                                                      : "text-muted-foreground/40"
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>

                                    {/* Status Indicator */}
                                    {stepStatus === "active" && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{
                                                opacity: [0.3, 1, 0.3],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Number.POSITIVE_INFINITY,
                                            }}
                                            className="size-2 rounded-full bg-primary"
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Error / Retry State */}
                {isFailed && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
                    >
                        <p className="font-medium text-destructive text-sm">
                            {error}
                        </p>

                        {/* Auto-retry countdown */}
                        {isAutoRetrying && (
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                    <IconLoader2 className="size-3 animate-spin" />
                                    <span>
                                        Auto-retrying ({retryCount + 1}/
                                        {maxRetries})...
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={cancelRetry}
                                    className="flex items-center gap-1 rounded-md bg-destructive/20 px-2.5 py-1 font-medium text-destructive text-xs transition-colors hover:bg-destructive/30"
                                >
                                    <IconX className="size-3" />
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Retrying indicator */}
                        {isRetrying && (
                            <div className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
                                <IconLoader2 className="size-3 animate-spin" />
                                <span>Re-queuing analysis...</span>
                            </div>
                        )}

                        {/* Manual retry when auto-retries exhausted */}
                        {hasExhaustedRetries && !isRetrying && (
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => retry()}
                                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 font-medium text-primary text-xs transition-colors hover:bg-primary/20"
                                >
                                    <IconRefresh className="size-3.5" />
                                    Retry manually
                                </button>
                                <a
                                    href="/"
                                    className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted/80"
                                >
                                    Start over
                                </a>
                            </div>
                        )}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
