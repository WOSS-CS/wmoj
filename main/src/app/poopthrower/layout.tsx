export default function PoopthrowerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Just pass through children — the AppShell in the root layout
    // will detect this route and skip rendering the sidebar/header.
    return <>{children}</>;
}
