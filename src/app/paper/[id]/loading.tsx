import { Skeleton } from "@/components/ui/skeleton";

export default function PaperLoading() {
    return (
        <main className="mx-auto max-w-4xl px-4 pt-20 sm:px-6">
            <div className="flex flex-col gap-6">
                <Skeleton className="h-48 w-full rounded-xl" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
                <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                </div>
            </div>
        </main>
    );
}
