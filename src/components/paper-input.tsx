"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    IconAlertCircle,
    IconFileText,
    IconLink,
    IconLoader2,
    IconSparkles,
    IconUpload,
    IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAnalyzePaper } from "@/hooks/use-analyze-paper";
import { usePdfParser } from "@/hooks/use-pdf-parser";
import type { InputType } from "@/lib/types";

const INPUT_MODES = [
    { id: "text" as InputType, label: "Paste Text", icon: IconFileText },
    { id: "pdf" as InputType, label: "Upload PDF", icon: IconUpload },
    { id: "url" as InputType, label: "Paper URL", icon: IconLink },
] as const;

const formSchema = z
    .object({
        inputType: z.enum(["text", "pdf", "url"]),
        title: z.string().optional(),
        text: z.string().optional(),
        url: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.inputType === "url") {
            if (!data.url || data.url.trim() === "") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "URL is required",
                    path: ["url"],
                });
            } else {
                try {
                    new URL(data.url);
                } catch {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Please enter a valid URL",
                        path: ["url"],
                    });
                }
            }
        }
        if (
            data.inputType === "text" &&
            (!data.text || data.text.trim() === "")
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Paper content is required",
                path: ["text"],
            });
        }
    });

type FormValues = z.infer<typeof formSchema>;

export function PaperInput() {
    const [fileName, setFileName] = useState<string | null>(null);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

    const { analyze, isAnalyzing, error, clearError } = useAnalyzePaper();
    const { parsePdf, isParsing, error: pdfError } = usePdfParser();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            inputType: "text",
            title: "",
            text: "",
            url: "",
        },
    });

    const inputType = form.watch("inputType");
    const textValue = form.watch("text");

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setFileName(file.name);
            try {
                const result = await parsePdf(file);
                form.setValue("text", result.text, { shouldValidate: true });
                form.clearErrors("text");
                // Save the preview for submission
                setPreviewDataUrl(result.previewDataUrl);
            } catch {
                // Error handled by hook
            }
        },
        [parsePdf, form],
    );

    const onSubmit = useCallback(
        async (values: FormValues) => {
            clearError();

            if (
                values.inputType === "pdf" &&
                (!values.text || values.text.trim() === "")
            ) {
                form.setError("text", {
                    type: "manual",
                    message: "Please upload and extract a PDF first",
                });
                return;
            }

            await analyze({
                inputType: values.inputType,
                text: values.inputType !== "url" ? values.text : undefined,
                url: values.inputType === "url" ? values.url : undefined,
                title: values.title || undefined,
                previewDataUrl:
                    values.inputType === "pdf" ? previewDataUrl : undefined,
            });
        },
        [analyze, clearError, form, previewDataUrl],
    );

    const displayError = error || pdfError;

    return (
        <div className="mx-auto w-full max-w-2xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8"
            >
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                >
                    {/* Input Mode Selector */}
                    <div className="flex gap-2 rounded-xl bg-muted/50 p-1.5">
                        {INPUT_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => {
                                    form.setValue("inputType", mode.id, {
                                        shouldValidate: true,
                                    });
                                    clearError();
                                }}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-medium text-sm transition-all ${
                                    inputType === mode.id
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <mode.icon className="size-4" />
                                <span className="hidden sm:inline">
                                    {mode.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <FieldGroup>
                        {/* Title Field */}
                        <Controller
                            name="title"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel
                                        htmlFor="paper-title"
                                        className="font-medium text-muted-foreground text-sm"
                                    >
                                        Paper Title{" "}
                                        <span className="text-muted-foreground/60 text-xs">
                                            (optional: AI will detect it)
                                        </span>
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="paper-title"
                                        value={field.value || ""}
                                        type="text"
                                        aria-invalid={fieldState.invalid}
                                        placeholder="e.g. Attention Is All You Need"
                                        className="w-full rounded-lg bg-background px-4 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/50"
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        {/* Content Input */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={inputType}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {inputType === "text" && (
                                    <Controller
                                        name="text"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                data-invalid={
                                                    fieldState.invalid
                                                }
                                            >
                                                <FieldLabel
                                                    htmlFor="paper-text"
                                                    className="font-medium text-muted-foreground text-sm"
                                                >
                                                    Paper Content
                                                </FieldLabel>
                                                <Textarea
                                                    {...field}
                                                    id="paper-text"
                                                    value={field.value || ""}
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    placeholder="Paste the abstract, introduction, or full text of a research paper here..."
                                                    className="min-h-[200px] resize-y text-sm leading-relaxed"
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError
                                                        errors={[
                                                            fieldState.error,
                                                        ]}
                                                    />
                                                )}
                                                <p className="mt-1.5 text-muted-foreground/60 text-xs">
                                                    {(
                                                        field.value || ""
                                                    ).length.toLocaleString()}{" "}
                                                    characters
                                                </p>
                                            </Field>
                                        )}
                                    />
                                )}

                                {inputType === "pdf" && (
                                    <Controller
                                        name="text"
                                        control={form.control}
                                        render={({ fieldState }) => (
                                            <Field
                                                data-invalid={
                                                    fieldState.invalid
                                                }
                                            >
                                                <FieldLabel
                                                    htmlFor="paper-pdf"
                                                    className="font-medium text-muted-foreground text-sm"
                                                >
                                                    Upload PDF
                                                </FieldLabel>
                                                <div>
                                                    <label
                                                        htmlFor="paper-pdf"
                                                        className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-border/60 border-dashed bg-muted/20 px-6 py-10 transition-colors hover:border-primary/40 hover:bg-muted/40"
                                                    >
                                                        {isParsing ? (
                                                            <IconLoader2 className="size-8 animate-spin text-primary" />
                                                        ) : previewDataUrl ? (
                                                            // biome-ignore lint/performance/noImgElement: data URL preview can't use next/image
                                                            <img
                                                                src={
                                                                    previewDataUrl
                                                                }
                                                                alt="PDF first page preview"
                                                                className="max-h-32 rounded-lg border border-border/30 shadow-sm"
                                                            />
                                                        ) : (
                                                            <IconUpload className="size-8 text-muted-foreground" />
                                                        )}
                                                        <div className="text-center">
                                                            <p className="font-medium text-sm">
                                                                {fileName
                                                                    ? fileName
                                                                    : "Click to upload or drag a PDF"}
                                                            </p>
                                                            <p className="mt-1 text-muted-foreground/60 text-xs">
                                                                PDF up to 10MB
                                                            </p>
                                                        </div>
                                                        <input
                                                            id="paper-pdf"
                                                            type="file"
                                                            accept=".pdf"
                                                            onChange={
                                                                handleFileChange
                                                            }
                                                            className="hidden"
                                                        />
                                                    </label>
                                                    {textValue && (
                                                        <p className="mt-2 text-emerald-500 text-xs">
                                                            ✓ Extracted{" "}
                                                            {textValue.length.toLocaleString()}{" "}
                                                            characters
                                                        </p>
                                                    )}
                                                </div>
                                                {fieldState.invalid && (
                                                    <FieldError
                                                        errors={[
                                                            fieldState.error,
                                                        ]}
                                                    />
                                                )}
                                            </Field>
                                        )}
                                    />
                                )}

                                {inputType === "url" && (
                                    <Controller
                                        name="url"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field
                                                data-invalid={
                                                    fieldState.invalid
                                                }
                                            >
                                                <FieldLabel
                                                    htmlFor="paper-url"
                                                    className="font-medium text-muted-foreground text-sm"
                                                >
                                                    Paper URL
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="paper-url"
                                                    value={field.value || ""}
                                                    type="url"
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    placeholder="https://arxiv.org/abs/1706.03762"
                                                    className="w-full rounded-lg bg-background px-4 py-2.5 text-sm transition-colors placeholder:text-muted-foreground/50"
                                                />
                                                {fieldState.invalid && (
                                                    <FieldError
                                                        errors={[
                                                            fieldState.error,
                                                        ]}
                                                    />
                                                )}
                                                <p className="mt-1.5 text-muted-foreground/60 text-xs">
                                                    Supports arXiv, Semantic
                                                    Scholar, bioRxiv, and most
                                                    paper URLs
                                                </p>
                                            </Field>
                                        )}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </FieldGroup>

                    {/* Error Display */}
                    {displayError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4"
                        >
                            <Alert className="flex items-start gap-2 border-destructive/50 bg-destructive/10 text-destructive">
                                <IconAlertCircle className="mt-0.5 size-4 shrink-0" />
                                <span className="flex-1 text-sm">
                                    {displayError}
                                </span>
                                <button
                                    type="button"
                                    onClick={clearError}
                                    className="shrink-0"
                                >
                                    <IconX className="size-4" />
                                </button>
                            </Alert>
                        </motion.div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isAnalyzing || isParsing}
                        size="lg"
                        className="w-full gap-2 font-semibold text-base"
                    >
                        {isAnalyzing ? (
                            <>
                                <IconLoader2 className="size-5 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <IconSparkles className="size-5" />
                                Analyze Paper
                            </>
                        )}
                    </Button>
                </form>
            </motion.div>
        </div>
    );
}
