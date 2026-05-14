"use client";

import {
    IconClock,
    IconFileText,
    IconLink,
    IconLoader2,
    IconSearch,
    IconUpload,
    IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface RecentPaper {
    id: string;
    title: string;
    input_type: string;
    source_url: string | null;
    preview_image_url: string | null;
    status: string;
    created_at: string;
}

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function InputTypeIcon({ type }: { type: string }) {
    switch (type) {
        case "url":
            return <IconLink className="size-3.5" />;
        case "pdf":
            return <IconUpload className="size-3.5" />;
        default:
            return <IconFileText className="size-3.5" />;
    }
}

export function RecentPapers() {
    const [papers, setPapers] = useState<RecentPaper[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchPapers = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            const url = query
                ? `/api/v1/papers/recent?q=${encodeURIComponent(query)}`
                : "/api/v1/papers/recent";
            const response = await fetch(url);
            const result = await response.json();
            if (response.ok && result.data) {
                setPapers(result.data);
            }
        } catch (err) {
            console.warn("[PaperLens] Failed to load papers:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPapers(debouncedQuery);
    }, [debouncedQuery, fetchPapers]);

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto w-full max-w-2xl pb-8"
        >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <IconClock className="size-4 text-muted-foreground" />
                    <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
                        Explore Library
                    </h2>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                    <IconSearch className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search your papers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-full border border-border/40 bg-card/50 py-2 pr-10 pl-9 text-sm transition-all focus:border-primary/50 focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="-translate-y-1/2 absolute top-1/2 right-3 flex items-center gap-2">
                        {isLoading && searchQuery && (
                            <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                        {searchQuery && !isLoading && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <IconX className="size-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isLoading && papers.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <IconLoader2 className="size-6 animate-spin text-primary/40" />
                </div>
            ) : papers.length === 0 ? (
                <div className="rounded-2xl border border-border/40 border-dashed py-12 text-center">
                    <p className="text-muted-foreground text-sm">
                        {debouncedQuery
                            ? `No papers found for "${debouncedQuery}"`
                            : "No analyzed papers yet. Start by uploading one above!"}
                    </p>
                </div>
            ) : (
                <div className={`flex flex-col gap-2 transition-opacity duration-300 ${isLoading ? "opacity-50" : "opacity-100"}`}>
                    <AnimatePresence>
                        {papers.map((paper, index) => (
                            <motion.div
                                key={paper.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Link
                                    href={`/paper/${paper.id}`}
                                    className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3 transition-all hover:border-primary/30 hover:bg-card/80"
                                >
                                    {/* Preview thumbnail or icon */}
                                    {paper.preview_image_url ? (
                                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border/20">
                                            <Image
                                                src={paper.preview_image_url}
                                                alt=""
                                                fill
                                                className="object-cover"
                                                sizes="40px"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <IconFileText className="size-5 text-primary/60" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-sm leading-tight group-hover:text-primary">
                                            {paper.title}
                                        </p>
                                        <div className="mt-0.5 flex items-center gap-2 text-muted-foreground/60 text-xs">
                                            <InputTypeIcon
                                                type={paper.input_type}
                                            />
                                            <span>
                                                {timeAgo(paper.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <span className="text-muted-foreground/30 transition-colors group-hover:text-primary">
                                        →
                                    </span>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.section>
    );
}
