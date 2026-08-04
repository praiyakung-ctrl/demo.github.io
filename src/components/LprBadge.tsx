export function LprBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 bg-amber-400 border border-amber-600 text-gray-900 text-xs font-extrabold px-1.5 py-0.5 rounded ${className}`}>
      LPR
    </span>
  );
}
