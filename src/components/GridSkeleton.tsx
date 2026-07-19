export default function GridSkeleton({ count = 12 }: { count?: number }) {
    return (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: count }).map((_, i) => (
                <li key={i} className="aspect-square bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
            ))}
        </ul>
    );
}
