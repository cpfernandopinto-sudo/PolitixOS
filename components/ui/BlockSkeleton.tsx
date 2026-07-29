export function BlockSkeleton({ height = 200, className = '' }: { height?: number; className?: string }) {
  return (
    <div
      className={`bg-[#1A1A1A] border border-white/5 rounded-xl animate-pulse ${className}`}
      style={{ height }}
    />
  );
}

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <BlockSkeleton key={i} height={112} />
      ))}
    </div>
  );
}
