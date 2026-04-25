import Link from "next/link";

type SidebarNavProps = {
  title: string;
  items: Array<{ href: string; label: string }>;
};

export function SidebarNav({ title, items }: SidebarNavProps) {
  return (
    <aside className="rounded-lg border border-white/10 bg-[#0A1633]/92 p-4">
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#19A7E8]">
        {title}
      </p>
      <nav className="mt-4 grid gap-1">
        {items.map((item) => (
          <Link
            className="rounded-md px-3 py-2 text-sm font-medium text-[#CBD5E1] transition hover:bg-white/10 hover:text-white"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
