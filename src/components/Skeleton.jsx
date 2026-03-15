export function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="h-5 bg-white/10 rounded w-3/4 mb-4"></div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="h-10 bg-white/10 rounded"></div>
        <div className="h-10 bg-white/10 rounded"></div>
        <div className="h-10 bg-white/10 rounded"></div>
      </div>
      <div className="h-2 bg-white/10 rounded w-full mb-3"></div>
      <div className="h-4 bg-white/10 rounded w-1/2"></div>
    </div>
  );
}
