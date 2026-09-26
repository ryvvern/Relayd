const NAV_ITEMS = ["Overview", "Endpoints", "Events", "Settings"] as const;
const ACTIVE_ITEM = "Events";

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-hairline bg-background px-4 py-6">
      <div className="mb-8 px-2">
        <span className="text-2xl font-bold text-foreground">Relayd</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item === ACTIVE_ITEM;

          return (
            <span
              key={item}
              title={isActive ? undefined : "Coming soon"}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isActive
                  ? "bg-dark-highlight text-white"
                  : "cursor-not-allowed text-gray-400 select-none"
              }`}
            >
              {item}
            </span>
          );
        })}
      </nav>
    </aside>
  );
}
