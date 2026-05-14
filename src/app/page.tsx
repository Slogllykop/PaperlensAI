import { PaperInput } from "@/components/paper-input";
import { RecentPapers } from "@/components/recent-papers";

export default function HomePage() {
    return (
        <main className="relative flex min-h-screen flex-col items-center px-4 pt-28 pb-12 sm:px-6 sm:pt-32">
            {/* Background gradient */}
            <div className="-z-10 pointer-events-none fixed inset-0">
                <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent" />
                <div className="-translate-x-1/2 absolute top-0 left-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />
            </div>

            {/* Hero */}
            <div className="mb-8 text-center sm:mb-12">
                <h1 className="mb-3 font-bold text-4xl tracking-tight sm:text-5xl">
                    Understand any paper
                    <br />
                    <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        in minutes
                    </span>
                </h1>
                <p className="mx-auto max-w-md text-base text-muted-foreground sm:text-lg">
                    Paste, upload, or link a research paper. Get a visual
                    explanation with summaries, mind maps, and learning cards.
                </p>
            </div>

            {/* Input Form */}
            <PaperInput />

            {/* Recent Papers */}
            <div className="mt-12 w-full max-w-2xl">
                <RecentPapers />
            </div>

            {/* Footer hint */}
            <p className="mt-8 text-center text-muted-foreground/50 text-xs">
                Powered by AI · Supports arXiv, Semantic Scholar, bioRxiv & more
            </p>
        </main>
    );
}
