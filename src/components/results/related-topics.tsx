"use client";

import { IconExternalLink } from "@tabler/icons-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import type { RelatedTopic } from "@/lib/types";

interface RelatedTopicsProps {
    topics: RelatedTopic[];
}

export function RelatedTopics({ topics }: RelatedTopicsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <h2 className="mb-3 font-bold text-lg">Related Topics</h2>
            <div className="flex flex-wrap gap-2">
                {topics.map((topic, index) => (
                    <motion.div
                        key={topic.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45 + index * 0.05 }}
                    >
                        <a
                            href={topic.search_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1.5"
                        >
                            <Badge
                                variant="outline"
                                className="cursor-pointer px-3 py-1.5 text-sm transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary"
                            >
                                {topic.name}
                                <IconExternalLink className="ml-1 size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                            </Badge>
                        </a>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
