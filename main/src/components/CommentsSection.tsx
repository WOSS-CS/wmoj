'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { toast } from '@/components/ui/Toast';
import { Comment } from '@/types/comment';

/**
 * Mirrors the live `comments_body_check` constraint
 * (`char_length(body) between 1 and 10000`). Without this the 10 001st
 * character came back as Postgres 23514 and the button just... did nothing.
 */
const COMMENT_MAX_LENGTH = 10000;

function validateCommentBody(body: string): string | null {
    const trimmed = body.trim();
    if (trimmed.length < 1) return 'Comment cannot be empty.';
    if (trimmed.length > COMMENT_MAX_LENGTH) {
        return `Comment is too long (${trimmed.length} / ${COMMENT_MAX_LENGTH} characters).`;
    }
    return null;
}

function errorMessage(e: unknown, fallback: string): string {
    if (e instanceof Error && e.message) return e.message;
    if (typeof e === 'object' && e !== null && 'message' in e) {
        const m = (e as { message?: unknown }).message;
        if (typeof m === 'string' && m) return m;
    }
    return fallback;
}

interface CommentsSectionProps {
  problemId: string;
  initialComments: Comment[];
}

interface CommentNode extends Comment {
  children: CommentNode[];
}

function formatCommentDate(isoString: string): string {
  const d = new Date(isoString);
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
}

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default function CommentsSection({ problemId, initialComments }: CommentsSectionProps) {
  const { user, profile, userRole } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map());
  const [newCommentBody, setNewCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const authPromptDismissedRef = useRef(false);

  /**
   * Open the sign-in prompt from a FOCUS event.
   *
   * AuthPromptModal now restores focus to whatever was focused when it opened —
   * which, for the comment box, is the very textarea whose onFocus opened it.
   * Without this one-tick guard, dismissing the prompt refocuses the textarea,
   * refires onFocus and reopens the prompt: an inescapable loop.
   */
  function requestAuthFromFocus() {
    if (user || authPromptDismissedRef.current) return;
    setShowAuthPrompt(true);
  }

  function closeAuthPrompt() {
    authPromptDismissedRef.current = true;
    setShowAuthPrompt(false);
    // Focus restoration happens synchronously in the modal's effect cleanup, so
    // a macrotask is enough to re-arm the prompt for the next deliberate focus.
    setTimeout(() => { authPromptDismissedRef.current = false; }, 0);
  }

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  // Key on the SET of comment ids, not on `comments` itself: every vote rewrites
  // a score and so replaces the array, and refetching (and overwriting) the
  // user's votes on each optimistic click would stomp the very state the click
  // just set. A sorted id string changes only when a comment is added or removed.
  const commentIdsKey = useMemo(
    () => comments.map(c => c.id).sort().join(','),
    [comments],
  );

  useEffect(() => {
    if (!user || !commentIdsKey) return;
    supabase
      .from('comment_votes')
      .select('comment_id, value')
      .eq('user_id', user.id)
      .in('comment_id', commentIdsKey.split(','))
      .then(({ data }) => {
        if (data) {
          const votes = new Map<string, number>();
          data.forEach(v => votes.set(v.comment_id, v.value));
          setUserVotes(votes);
        }
      });
  }, [user, commentIdsKey]);

  async function handleVote(commentId: string, direction: 1 | -1) {
    if (!user) { setShowAuthPrompt(true); return; }
    if (pendingVotes.has(commentId)) return;
    setPendingVotes(prev => new Set(prev).add(commentId));

    const currentVote = userVotes.get(commentId);

    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      let scoreDelta = 0;
      if (currentVote === direction) {
        scoreDelta = -direction;
      } else if (currentVote) {
        scoreDelta = direction * 2;
      } else {
        scoreDelta = direction;
      }
      return { ...c, score: c.score + scoreDelta };
    }));

    setUserVotes(prev => {
      const next = new Map(prev);
      if (currentVote === direction) {
        next.delete(commentId);
      } else {
        next.set(commentId, direction);
      }
      return next;
    });

    const rollback = () => {
      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        let scoreDelta = 0;
        if (currentVote === direction) {
          scoreDelta = direction;
        } else if (currentVote) {
          scoreDelta = -(direction * 2);
        } else {
          scoreDelta = -direction;
        }
        return { ...c, score: c.score + scoreDelta };
      }));
      setUserVotes(prev => {
        const next = new Map(prev);
        if (currentVote) {
          next.set(commentId, currentVote);
        } else {
          next.delete(commentId);
        }
        return next;
      });
    };

    try {
      let dbError = null;
      // The UPDATE and DELETE below carry `.select()` deliberately: keyed writes
      // that match zero rows (RLS filtered them, the row was removed in another
      // tab, or the vote was re-pointed at a different comment) resolve with
      // `error: null`, so without it a desync commits locally, the
      // update_comment_score trigger never fires, and the number on screen is
      // one no reload will ever reproduce.
      //
      // Note the UPDATE writes `value` only, never `comment_id`. Re-pointing a
      // vote row corrupts the old comment's stored score permanently (the
      // trigger rescores only new.comment_id); the durable fix is a DB-side
      // BEFORE UPDATE guard, which is not in this file's reach.
      let rowsAffected = 1;
      if (currentVote === direction) {
        const { data, error } = await supabase
          .from('comment_votes').delete()
          .eq('comment_id', commentId).eq('user_id', user.id)
          .select('comment_id');
        dbError = error;
        rowsAffected = data?.length ?? 0;
      } else if (currentVote) {
        const { data, error } = await supabase
          .from('comment_votes').update({ value: direction })
          .eq('comment_id', commentId).eq('user_id', user.id)
          .select('comment_id');
        dbError = error;
        rowsAffected = data?.length ?? 0;
      } else {
        const { error } = await supabase
          .from('comment_votes')
          .insert({ comment_id: commentId, user_id: user.id, value: direction });
        dbError = error;
      }

      if (dbError) {
        rollback();
        toast.error('Vote failed', errorMessage(dbError, 'Please try again.'));
      } else if (rowsAffected === 0) {
        rollback();
        toast.error('Vote is out of date', 'Refreshing this comment from the server.');
        await resyncComment(commentId);
      }
    } catch (e) {
      rollback();
      toast.error('Vote failed', errorMessage(e, 'Please try again.'));
    } finally {
      setPendingVotes(prev => { const next = new Set(prev); next.delete(commentId); return next; });
    }
  }

  /** Pull one comment's authoritative score and this user's vote back from the server. */
  async function resyncComment(commentId: string) {
    try {
      const { data: row } = await supabase
        .from('comments').select('score').eq('id', commentId).maybeSingle();

      if (!row) {
        // The comment itself is gone — drop it (and its replies) locally.
        setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
        return;
      }
      setComments(prev => prev.map(c => (c.id === commentId ? { ...c, score: row.score } : c)));

      if (!user) return;
      const { data: vote } = await supabase
        .from('comment_votes').select('value')
        .eq('comment_id', commentId).eq('user_id', user.id).maybeSingle();
      setUserVotes(prev => {
        const next = new Map(prev);
        if (vote) next.set(commentId, vote.value);
        else next.delete(commentId);
        return next;
      });
    } catch {
      // Best effort — the toast already told the user their vote didn't stick.
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setShowAuthPrompt(true); return; }
    if (isSubmitting) return;

    const invalid = validateCommentBody(newCommentBody);
    if (invalid) { toast.error('Comment not posted', invalid); return; }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ problem_id: problemId, user_id: user.id, body: newCommentBody.trim() })
        .select('id, problem_id, user_id, parent_id, body, score, created_at, updated_at')
        .single();

      if (error || !data) {
        toast.error('Comment not posted', errorMessage(error, 'Please try again.'));
        return;
      }

      const newComment: Comment = {
        ...data,
        parent_id: null,
        username: profile?.username || 'Unknown',
        avatar_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar`,
      };
      setComments(prev => [...prev, newComment]);
      setNewCommentBody('');
    } catch (err) {
      toast.error('Comment not posted', errorMessage(err, 'Please try again.'));
    } finally {
      // finally, not a trailing call: a rejected await used to leave
      // isSubmitting stuck true and the button disabled until a full reload.
      setIsSubmitting(false);
    }
  }

  async function handleSubmitReply(parentId: string) {
    if (!user) { setShowAuthPrompt(true); return; }
    if (isSubmitting) return;

    const invalid = validateCommentBody(replyBody);
    if (invalid) { toast.error('Reply not posted', invalid); return; }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ problem_id: problemId, user_id: user.id, body: replyBody.trim(), parent_id: parentId })
        .select('id, problem_id, user_id, parent_id, body, score, created_at, updated_at')
        .single();

      if (error || !data) {
        toast.error('Reply not posted', errorMessage(error, 'Please try again.'));
        return;
      }

      const newComment: Comment = {
        ...data,
        parent_id: parentId,
        username: profile?.username || 'Unknown',
        avatar_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar`,
      };
      setComments(prev => [...prev, newComment]);
      setReplyBody('');
      setReplyingTo(null);
    } catch (err) {
      toast.error('Reply not posted', errorMessage(err, 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      // `.select('id')` again: a DELETE that RLS filters to zero rows still
      // resolves with error: null, so without it the whole thread vanished from
      // the UI and silently came back on the next refresh.
      const { data, error } = await supabase
        .from('comments').delete().eq('id', commentId).select('id');

      if (error) {
        toast.error('Delete failed', errorMessage(error, 'Please try again.'));
        return;
      }
      if (!data || data.length === 0) {
        toast.error('Delete failed', 'The comment was not removed — it may already be gone, or you may no longer have permission.');
        return;
      }

      // Collect this comment and all descendants (DB cascades, client must match)
      const toRemove = new Set<string>([commentId]);
      let added = true;
      while (added) {
        added = false;
        for (const c of comments) {
          if (c.parent_id && toRemove.has(c.parent_id) && !toRemove.has(c.id)) {
            toRemove.add(c.id);
            added = true;
          }
        }
      }
      setComments(prev => prev.filter(c => !toRemove.has(c.id)));
      if (replyingTo && toRemove.has(replyingTo)) {
        setReplyingTo(null);
        setReplyBody('');
      }
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Delete failed', errorMessage(err, 'Please try again.'));
    }
  }

  function renderComment(node: CommentNode) {
    const voteValue = userVotes.get(node.id);
    return (
      <div key={node.id}>
        <div className="flex gap-3 py-4 border-b border-border">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <button
              type="button"
              onClick={() => handleVote(node.id, 1)}
              className={`transition-colors ${voteValue === 1 ? 'text-brand-primary' : 'text-text-muted hover:text-brand-primary'}`}
              aria-label="Upvote"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-8 8h16z" />
              </svg>
            </button>
            <span className="text-xs font-mono font-medium text-foreground">{node.score}</span>
            <button
              type="button"
              onClick={() => handleVote(node.id, -1)}
              className={`transition-colors ${voteValue === -1 ? 'text-error' : 'text-text-muted hover:text-error'}`}
              aria-label="Downvote"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20l-8-8h16z" />
              </svg>
            </button>
          </div>

          {/* Avatar */}
          <Link href={`/users/${node.username}`} className="flex-shrink-0">
            {avatarErrors.has(node.id) ? (
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {node.username.charAt(0).toUpperCase()}
              </div>
            ) : (
              // Plain <img>, not next/image: Supabase storage is not registered
              // in next.config's images.remotePatterns and this is a fixed 32px
              // thumbnail beside a link that already names the user.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.avatar_url}
                alt=""
                aria-hidden="true"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                onError={() => setAvatarErrors(prev => new Set(prev).add(node.id))}
              />
            )}
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <Link href={`/users/${node.username}`} className="font-semibold text-brand-primary hover:underline">
                {node.username}
              </Link>
              <span className="text-text-muted">commented on {formatCommentDate(node.created_at)}</span>
            </div>
            <p className="text-sm text-foreground mt-1.5 whitespace-pre-wrap">{node.body}</p>
            <button
              type="button"
              onClick={() => {
                if (!user) { setShowAuthPrompt(true); return; }
                setReplyingTo(replyingTo === node.id ? null : node.id);
                setReplyBody('');
              }}
              className="text-xs text-text-muted hover:text-brand-primary mt-1.5 transition-colors"
            >
              Reply
            </button>
          </div>

          {/* Manager-only delete button */}
          {userRole === 'manager' && (
            <button
              type="button"
              onClick={() => handleDeleteComment(node.id)}
              className="flex-shrink-0 text-text-muted hover:text-error transition-colors p-1 self-start"
              aria-label="Delete comment"
              title="Delete comment"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>

        {/* Inline reply form */}
        {replyingTo === node.id && (
          <div className="pl-10 py-3 border-b border-border">
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder={`Reply to ${node.username}...`}
              aria-label={`Reply to ${node.username}`}
              maxLength={COMMENT_MAX_LENGTH}
              className="w-full bg-surface-2 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-text-muted resize-y min-h-[60px]"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setReplyingTo(null); setReplyBody(''); }}
                className="text-sm text-text-muted hover:text-foreground transition-colors px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitReply(node.id)}
                disabled={isSubmitting}
                className="bg-brand-primary text-white text-sm font-medium rounded-lg px-4 py-1.5 hover:bg-brand-secondary transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Reply'}
              </button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {node.children.length > 0 && (
          <div className="pl-10 border-l border-border ml-4">
            {node.children.map(child => renderComment(child))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel overflow-hidden mt-6">
        {/* Header */}
        <div className="bg-surface-2 px-4 py-3 border-b border-border flex items-center gap-2">
          <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-foreground">Comments</h2>
        </div>

        <div className="p-4">
          {/* Top-level comment form */}
          <form onSubmit={handleSubmitComment} className="mb-4">
            <textarea
              value={newCommentBody}
              onChange={e => setNewCommentBody(e.target.value)}
              onFocus={requestAuthFromFocus}
              placeholder="Leave a comment..."
              aria-label="Leave a comment"
              maxLength={COMMENT_MAX_LENGTH}
              className="w-full bg-surface-2 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-text-muted resize-y min-h-[80px]"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={() => { if (!user) setShowAuthPrompt(true); }}
                className="bg-brand-primary text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-secondary transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Comment'}
              </button>
            </div>
          </form>

          {/* Comment tree */}
          {comments.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div>
              {commentTree.map(node => renderComment(node))}
            </div>
          )}
        </div>
      </div>

      {showAuthPrompt && (
        <AuthPromptModal
          message="You must be logged in to interact with comments."
          onClose={closeAuthPrompt}
        />
      )}
    </>
  );
}
