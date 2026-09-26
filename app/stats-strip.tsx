function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-dark-highlight p-4">
      <div className="font-mono text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-300">{label}</div>
    </div>
  );
}

export function StatsStrip({
  deliveredToday,
  retrying,
  dead,
  successRate,
}: {
  deliveredToday: number;
  retrying: number;
  dead: number;
  successRate: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Delivered today" value={String(deliveredToday)} />
      <StatCard label="Retrying" value={String(retrying)} />
      <StatCard label="Dead-lettered" value={String(dead)} />
      <StatCard
        label="Success rate"
        value={successRate === null ? "—" : `${successRate}%`}
      />
    </div>
  );
}
