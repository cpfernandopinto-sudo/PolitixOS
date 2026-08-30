export default function WhatsAppLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3 mb-1">
        <div className="h-3 w-28 bg-white/10 rounded" />
        <div className="h-3 w-px bg-white/10" />
        <div className="h-4 w-24 bg-white/15 rounded" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-24 surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4" />

      {/* KPIs Bar Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4" />
        ))}
      </div>

      {/* Analytics Row Skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-5" />
        ))}
      </div>

      {/* Feed Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 surface-primary rounded-xl border border-[#2D3748] bg-[#161B26] p-4" />
        ))}
      </div>
    </div>
  );
}
