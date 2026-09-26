export function TopBar() {
  return (
    <div className="flex items-center justify-between border-b border-hairline px-4 py-4 sm:px-8">
      <span className="text-sm text-muted">
        Relayd Team <span className="mx-1">/</span> events-pipeline
      </span>

      <div className="flex items-center gap-3">
        <button
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-lg bg-card px-4 py-2 text-sm font-medium text-muted"
        >
          New endpoint
        </button>
        <div className="h-8 w-8 rounded-full bg-card" />
      </div>
    </div>
  );
}
