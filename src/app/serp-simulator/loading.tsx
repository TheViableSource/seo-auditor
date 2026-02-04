import { Skeleton } from "@/components/ui/skeleton"

export default function SerpSimulatorLoading() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8" role="status" aria-label="Loading SERP simulator">
      <span className="sr-only">Loading SERP simulator...</span>
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Two-column grid skeleton */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
