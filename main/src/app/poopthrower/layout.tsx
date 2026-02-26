export default function PoopthrowerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body style={{ margin: 0, overflow: "hidden" }}>{children}</body>
        </html>
    );
}
