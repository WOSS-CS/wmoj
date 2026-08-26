'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { SubmissionHeatmap } from '@/components/SubmissionHeatmap';
import type { HeatmapDay } from '@/components/SubmissionHeatmap';

interface ProfileData {
  id: string;
  username: string;
  created_at: string;
  about_me: string | null;
  problems_solved: number;
  points: number;
  contests_written: number;
  avatarUrl: string;
}

interface UserProfileClientProps {
  profile: ProfileData;
  heatmapData: HeatmapDay[];
}

function formatMemberSince(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function UserProfileClient({ profile, heatmapData }: UserProfileClientProps) {
  const [avatarError, setAvatarError] = useState(false);
  const initial = profile.username.charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-xl font-semibold text-foreground font-mono">
        User {profile.username}
      </h1>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left sidebar */}
        <div className="w-48 flex-shrink-0 space-y-4">
          {/* Avatar */}
          <div className="glass-panel p-4 flex flex-col items-center">
            {!avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.username}'s avatar`}
                className="w-32 h-32 rounded-lg object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-brand-primary flex items-center justify-center text-white text-4xl font-semibold">
                {initial}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="glass-panel p-4 space-y-3">
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-foreground">{profile.problems_solved}</span> problems solved
            </p>

            <p className="text-sm text-text-muted">
              <span className="font-semibold text-foreground">{Math.round(profile.points)}</span> points
            </p>

            {/*
              `user_id` pins the exact account: the `user` filter is an unanchored
              ilike, so a link carrying only the handle shows `bobby`'s and
              `bobcat`'s submissions on `bob`'s profile. `user` is still passed so
              the destination's search box reads back the handle a human typed.
            */}
            <Link
              href={`/submissions?user_id=${encodeURIComponent(profile.id)}&user=${encodeURIComponent(profile.username)}`}
              className="block text-sm text-brand-primary hover:underline"
            >
              View submissions
            </Link>

            <hr className="border-border" />

            <p className="text-sm text-text-muted">
              <span className="font-semibold text-foreground">{profile.contests_written}</span> contests written
            </p>
            <div>
              <p className="text-xs text-text-muted">Member since</p>
              <p className="text-sm font-medium text-foreground">{formatMemberSince(profile.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* About section */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">About</h2>
            {profile.about_me ? (
              <MarkdownRenderer content={profile.about_me} />
            ) : (
              <p className="text-sm text-text-muted italic">This user hasn&apos;t written an about section yet.</p>
            )}
          </div>

          {/* Submission heatmap */}
          <SubmissionHeatmap
            data={heatmapData}
            accountCreatedAt={profile.created_at}
          />
        </div>
      </div>
    </div>
  );
}
