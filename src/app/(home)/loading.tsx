import GridSkeleton from '@/components/GridSkeleton';

export default function Loading() {
    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="h-6 w-40 bg-neutral-100 dark:bg-neutral-900 rounded animate-pulse mb-4" />
            <GridSkeleton count={12} />
        </div>
    );
}
