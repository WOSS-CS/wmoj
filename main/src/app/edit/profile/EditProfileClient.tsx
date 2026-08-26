'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';

function EditProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const [aboutMe, setAboutMe] = useState('');
  const [seededProfileId, setSeededProfileId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Cache-buster: fixed for the lifetime of the mount, and only moves when an
  // upload actually replaces the object — so the avatar no longer re-fetches and
  // flickers on every background token refresh.
  const [avatarVersion, setAvatarVersion] = useState<number>(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed the editor ONCE per account, not on every `profile` identity change.
  // AuthContext re-runs its setup (and so calls setProfile) on TOKEN_REFRESHED and
  // USER_UPDATED — roughly hourly and on tab re-focus — and an effect keyed on
  // `profile` would silently throw away whatever the user had typed since.
  if (profile && profile.id !== seededProfileId) {
    setSeededProfileId(profile.id);
    setAboutMe(profile.about_me || '');
  }

  const avatarUrl = user
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar?t=${avatarVersion}`
    : null;

  const initial = profile?.username?.charAt(0).toUpperCase() || '?';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file', 'Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Please select an image under 5MB.');
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/avatar`, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;

      // Refresh avatar display with cache-bust
      setAvatarVersion(Date.now());
      setAvatarError(false);
      toast.success('Avatar updated successfully');
    } catch (err) {
      toast.error('Upload failed', err instanceof Error ? err.message : 'Failed to upload avatar.');
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ about_me: aboutMe || null })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-foreground font-mono">Edit Profile</h1>

      {/* Avatar section */}
      <div className="glass-panel p-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Profile Picture</h2>
        <div className="flex items-center gap-5">
          <button
            onClick={handleAvatarClick}
            disabled={uploading}
            className="relative group"
            type="button"
          >
            {avatarUrl && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Your avatar"
                className="w-24 h-24 rounded-lg object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-brand-primary flex items-center justify-center text-white text-3xl font-semibold">
                {initial}
              </div>
            )}
            <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <div>
            <p className="text-sm text-foreground font-medium">Click to change your avatar</p>
            <p className="text-xs text-text-muted mt-1">JPG, PNG, or GIF. Max 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* About Me section */}
      <div className="glass-panel p-6">
        <MarkdownEditor
          value={aboutMe}
          onChange={setAboutMe}
          placeholder="Write something about yourself... Markdown is supported!"
          height={300}
          label="About Me"
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default function EditProfileClient() {
  return (
    <AuthGuard requireAuth allowAuthenticated>
      <EditProfileForm />
    </AuthGuard>
  );
}
