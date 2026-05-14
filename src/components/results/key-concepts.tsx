"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KeyConcept } from "@/lib/types";

interface KeyConceptsProps {
    concepts: KeyConcept[];
}

export function KeyConcepts({ concepts }: KeyConceptsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <h2 className="mb-3 font-bold text-lg">Key Concepts</h2>
            <div className="flex flex-wrap gap-2">
                {concepts.map((concept, index) => (
                    <motion.div
                        key={concept.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 + index * 0.05 }}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="secondary"
                                    className="cursor-default px-3 py-1.5 text-sm transition-colors hover:bg-primary/15 hover:text-primary"
                                >
                                    {concept.name}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent
                                side="bottom"
                                className="max-w-xs text-sm"
                            >
                                {concept.description}
                            </TooltipContent>
                        </Tooltip>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
