"use client";

import { IconExternalLink, IconFileText } from "@tabler/icons-react";
import { motion } from "motion/react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface PaperPreviewProps {
    sourceUrl: string | null;
    previewImageUrl: string | null;
    title: string;
    inputType: string;
}

export function PaperPreview({
    sourceUrl,
    previewImageUrl,
    title,
    inputType,
}: PaperPreviewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
        >
            <h2 className="mb-3 font-bold text-lg">Paper Preview</h2>
            <Card className="border-border/50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        {/* Preview image or fallback icon */}
                        {previewImageUrl ? (
                            <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-lg border border-border/30 shadow-sm sm:w-36">
                                <Image
                                    src={previewImageUrl}
                                    alt={`First page of ${title}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 112px, 144px"
                                    unoptimized
                                />
                            </div>
                        ) : (
                            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <IconFileText className="size-8 text-primary" />
                            </div>
                        )}

                        <div className="flex-1">
                            <h3 className="font-semibold leading-tight">
                                {title}
                            </h3>
                            <p className="mt-1 text-muted-foreground text-xs">
                                Source:{" "}
                                {inputType === "url"
                                    ? "URL"
                                    : inputType === "pdf"
                                      ? "PDF Upload"
                                      : "Pasted Text"}
                            </p>

                            {sourceUrl && (
                                <a
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 font-medium text-primary text-xs transition-colors hover:bg-muted"
                                >
                                    <IconExternalLink className="size-3.5" />
                                    View Original Paper
                                </a>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
