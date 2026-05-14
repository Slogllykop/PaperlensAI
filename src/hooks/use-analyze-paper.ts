/** biome-ignore-all lint/style/noNonNullAssertion: Env vars verified */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { InputType } from "@/lib/types";

interface AnalyzePaperParams {
    inputType: InputType;
    text?: string;
    url?: string;
    title?: string;
    previewDataUrl?: string | null;
}

interface UseAnalyzePaperReturn {
    analyze: (params: AnalyzePaperParams) => Promise<void>;
    isAnalyzing: boolean;
    error: string | null;
    clearError: () => void;
}

/**
 * Convert a data URL to a File object for Supabase Storage upload.
 */
function dataUrlToFile(dataUrl: string, fileName: string): File {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new File([u8arr], fileName, { type: mime });
}

export function useAnalyzePaper(): UseAnalyzePaperReturn {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const clearError = useCallback(() => setError(null), []);

    const analyze = useCallback(
        async (params: AnalyzePaperParams) => {
            setIsAnalyzing(true);
            setError(null);

            try {
                // Upload preview image to Supabase Storage if present
                let previewImageUrl: string | undefined;
                if (params.previewDataUrl) {
                    try {
                        const supabase = createBrowserClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                        );
                        const fileName = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
                        const file = dataUrlToFile(
                            params.previewDataUrl,
                            fileName,
                        );

                        const { data: uploadData, error: uploadError } =
                            await supabase.storage
                                .from("paper-previews")
                                .upload(fileName, file, {
                                    cacheControl: "3600",
                                    upsert: false,
                                });

                        if (uploadError) {
                            console.warn(
                                "[PaperLens] Preview upload failed:",
                                uploadError,
                            );
                        } else {
                            const {
                                data: { publicUrl },
                            } = supabase.storage
                                .from("paper-previews")
                                .getPublicUrl(uploadData.path);
                            previewImageUrl = publicUrl;
                        }
                    } catch (uploadErr) {
                        console.warn(
                            "[PaperLens] Preview upload error:",
                            uploadErr,
                        );
                    }
                }

                const response = await fetch("/api/v1/papers/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        inputType: params.inputType,
                        text: params.text,
                        url: params.url,
                        title: params.title,
                        previewImageUrl,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to analyze paper");
                }

                // Navigate to processing/results page
                router.push(`/paper/${result.data.paperId}`);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Something went wrong";
                setError(message);
            } finally {
                setIsAnalyzing(false);
            }
        },
        [router],
    );

    return { analyze, isAnalyzing, error, clearError };
}
