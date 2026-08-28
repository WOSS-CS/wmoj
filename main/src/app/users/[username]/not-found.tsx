import Link from 'next/link';

export default function UserNotFound() {
  return (
    <div className="max-w-5xl mx-auto mt-8 px-4">
      <div className="glass-panel overflow-hidden">
        <div className="bg-surface-2 px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">User not found</h2>
        </div>
        <div className="p-8 flex flex-col items-center gap-6 text-center">
          <p className="text-sm text-text-muted">
            This user doesn&apos;t exist.
          </p>
          <Link
            href="/users"
            className="h-10 px-5 inline-flex items-center justify-center bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-secondary"
          >
            Back to leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
