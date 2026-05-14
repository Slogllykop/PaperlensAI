"use client";

import { IconSparkles } from "@tabler/icons-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Summary } from "@/lib/types";

const DIFFICULTY_COLORS: Record<string, string> = {
    Beginner: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    Intermediate: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    Advanced: "bg-orange-500/15 text-orange-500 border-orange-500/20",
    Expert: "bg-red-500/15 text-red-500 border-red-500/20",
};

interface SummaryCardProps {
    summary: Summary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="overflow-hidden border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    {summary.category}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${DIFFICULTY_COLORS[summary.difficulty] || ""}`}
                                >
                                    {summary.difficulty}
                                </Badge>
                            </div>
                            <h1 className="font-bold text-2xl leading-tight tracking-tight sm:text-3xl">
                                {summary.title}
                            </h1>
                        </div>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <IconSparkles className="size-5 text-primary" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-base text-muted-foreground leading-relaxed">
                        {summary.one_line_summary}
                    </p>
                    <Separator className="my-4" />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <h3 className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Problem Solved
                            </h3>
                            <p className="text-sm leading-relaxed">
                                {summary.problem_solved}
                            </p>
                        </div>
                        <div>
                            <h3 className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                                Method Used
                            </h3>
                            <p className="text-sm leading-relaxed">
                                {summary.method_used}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
