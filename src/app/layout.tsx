import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Header } from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-heading",
    display: "swap",
});

export const metadata: Metadata = {
    title: "PaperLens AI: Understand Any Research Paper Visually",
    description:
        "Paste, upload, or link a research paper. Get a visual explanation with summaries, concept maps, math breakdowns, mind maps, and learning cards. Powered by AI.",
    keywords: [
        "research paper",
        "AI",
        "visual explanation",
        "mind map",
        "paper analyzer",
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(dmSans.variable, instrumentSerif.variable)}
        >
            <body className="min-h-screen bg-background font-sans text-foreground antialiased">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TooltipProvider>
                        <Header />
                        {children}
                    </TooltipProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
