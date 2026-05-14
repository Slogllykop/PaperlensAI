"use client";

import {
    IconBook,
    IconBulb,
    IconRocket,
    IconSettings,
    IconTarget,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import type { LearningCard } from "@/lib/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    bulb: IconBulb,
    target: IconTarget,
    gear: IconSettings,
    rocket: IconRocket,
    book: IconBook,
};

const CARD_COLORS = [
    "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    "from-sky-500/10 to-sky-500/5 border-sky-500/20",
    "from-rose-500/10 to-rose-500/5 border-rose-500/20",
];

const ICON_COLORS = [
    "text-violet-500",
    "text-emerald-500",
    "text-amber-500",
    "text-sky-500",
    "text-rose-500",
];

interface LearningCardsProps {
    cards: LearningCard[];
}

export function LearningCards({ cards }: LearningCardsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
        >
            <h2 className="mb-3 font-bold text-lg">Learning Cards</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card, index) => {
                    const Icon = ICON_MAP[card.icon] || IconBulb;
                    const colorClass = CARD_COLORS[index % CARD_COLORS.length];
                    const iconColor = ICON_COLORS[index % ICON_COLORS.length];

                    return (
                        <motion.div
                            key={card.question}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + index * 0.08 }}
                        >
                            <Card
                                className={`h-full border bg-linear-to-br ${colorClass}`}
                            >
                                <CardContent className="flex flex-col gap-3 p-4">
                                    <div
                                        className={`flex size-9 items-center justify-center rounded-lg bg-background/50 ${iconColor}`}
                                    >
                                        <Icon className="size-5" />
                                    </div>
                                    <div>
                                        <h3 className="mb-1 font-semibold text-sm leading-tight">
                                            {card.question}
                                        </h3>
                                        <p className="text-muted-foreground text-xs leading-relaxed">
                                            {card.answer}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
