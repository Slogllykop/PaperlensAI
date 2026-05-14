"use client";

import { IconInfoCircle, IconMathFunction } from "@tabler/icons-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import type { MathExplanation } from "@/lib/types";

// Strip surrounding $ or $$ delimiters that the AI sometimes adds.
// BlockMath/InlineMath expect raw LaTeX, not dollar-wrapped.
function stripDollars(latex: string): string {
    let s = latex.trim();
    if (s.startsWith("$$") && s.endsWith("$$")) {
        s = s.slice(2, -2).trim();
    } else if (s.startsWith("$") && s.endsWith("$")) {
        s = s.slice(1, -1).trim();
    }
    return s;
}

// Helper component to parse and render inline math within text
function TextWithMath({ text }: { text: string }) {
    if (!text) return null;

    // Split by $...$ (new standard from updated prompt)
    const parts = text.split(/(\$[^$]+\$)/g);

    return (
        <>
            {parts.map((part, i) => {
                // Generate a stable key for the text part
                const partKey = `math-part-${i}`;

                if (part.startsWith("$") && part.endsWith("$")) {
                    return (
                        <InlineMath key={partKey} math={part.slice(1, -1)} />
                    );
                }

                // Fallback for naked backslash commands (like \gamma) in old data
                const subParts = part.split(/(\\[a-zA-Z]+)/g);
                return (
                    <span key={partKey}>
                        {subParts.map((sub, j) => {
                            const subKey = `math-sub-${i}-${j}`;
                            if (sub.startsWith("\\")) {
                                return <InlineMath key={subKey} math={sub} />;
                            }
                            return <span key={subKey}>{sub}</span>;
                        })}
                    </span>
                );
            })}
        </>
    );
}

interface MathExplainedProps {
    math: MathExplanation;
}

export function MathExplained({ math }: MathExplainedProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <IconMathFunction className="size-5 text-primary" />
                        Math Made Simple
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!math.has_math ? (
                        /* Empty state */
                        <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/30 py-8 text-center">
                            <IconInfoCircle className="size-8 text-muted-foreground/40" />
                            <p className="text-muted-foreground text-sm">
                                No major mathematical equations found in this
                                paper.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {/* Equation */}
                            {math.equation && (
                                <div className="rounded-lg bg-muted/30 p-4">
                                    <div className="mb-1 flex items-center gap-2">
                                        {math.equation_name && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {math.equation_name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="mt-2 overflow-x-auto text-sm">
                                        <BlockMath
                                            math={stripDollars(math.equation)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* What it means */}
                            {math.what_it_means && (
                                <div>
                                    <h4 className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                        What it means
                                    </h4>
                                    <p className="text-sm leading-relaxed">
                                        <TextWithMath
                                            text={math.what_it_means}
                                        />
                                    </p>
                                </div>
                            )}

                            {/* Symbols */}
                            {math.symbols.length > 0 && (
                                <div>
                                    <h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                        Symbol Reference
                                    </h4>
                                    <div className="grid gap-1.5 sm:grid-cols-2">
                                        {math.symbols.map((sym) => (
                                            <div
                                                key={sym.symbol}
                                                className="flex items-center gap-2 rounded-md bg-muted/20 px-3 py-1.5"
                                            >
                                                <span className="text-primary text-sm">
                                                    <InlineMath
                                                        math={stripDollars(
                                                            sym.symbol,
                                                        )}
                                                    />
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                    ={" "}
                                                    <TextWithMath
                                                        text={sym.meaning}
                                                    />
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Step by step */}
                            {math.step_by_step.length > 0 && (
                                <div>
                                    <h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                        Step by Step
                                    </h4>
                                    <ol className="flex flex-col gap-2">
                                        {math.step_by_step.map((step, i) => (
                                            <li
                                                key={step}
                                                className="flex gap-3 text-sm leading-relaxed"
                                            >
                                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                                                    {i + 1}
                                                </span>
                                                <span>
                                                    <TextWithMath text={step} />
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Simple explanation */}
                            {math.simple_explanation && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <h4 className="mb-1 font-semibold text-primary text-xs uppercase tracking-wider">
                                        In Simple Terms
                                    </h4>
                                    <p className="text-sm leading-relaxed">
                                        <TextWithMath
                                            text={math.simple_explanation}
                                        />
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
