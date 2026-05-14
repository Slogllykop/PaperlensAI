import { IconScan } from "@tabler/icons-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
    return (
        <header className="fixed top-0 right-0 left-0 z-50 border-border/40 border-b bg-background/60 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                <a href="/" className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                        <IconScan className="size-4.5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">
                        Paper<span className="text-primary">Lens</span>{" "}
                        <span className="font-medium text-muted-foreground text-xs">
                            AI
                        </span>
                    </span>
                </a>
                <ThemeToggle />
            </div>
        </header>
    );
}
