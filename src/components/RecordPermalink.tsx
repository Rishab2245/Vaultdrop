'use client';

import { useEffect, useState } from 'react';
import { getGhost, ghostHeaders } from '@/lib/ghost';
import { LockedRecord, type LockedSecret } from './LockedRecord';
import { SecretCard, type WallSecret } from './SecretCard';
import { CommentThread } from './CommentThread';
import { ShareRecord } from './ShareRecord';

/**
 * One record, on its own page.
 *
 * The server renders every sealed record sealed, because it cannot know who is
 * asking. This re-asks as the viewer's own ghost, so somebody who has already
 * paid for this record sees it open rather than being invited to buy it twice.
 */
export function RecordPermalink({
  secret: initial,
  commentsLocked,
  commentCount,
}: {
  secret: WallSecret & LockedSecret;
  commentsLocked: boolean;
  commentCount: number;
}) {
  const [secret, setSecret] = useState(initial);

  useEffect(() => {
    const identity = getGhost();
    if (!identity || !initial.isLocked) return;

    let cancelled = false;
    fetch(`/api/wall/${initial.id}`, { headers: ghostHeaders(identity) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.secret) return;
        setSecret((prev) => ({ ...prev, ...data.secret }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [initial.id, initial.isLocked]);

  const sealed = secret.isLocked && !secret.unlocked;

  return (
    <div className="space-y-2">
      {sealed ? (
        <LockedRecord secret={secret as LockedSecret} />
      ) : (
        <SecretCard secret={secret as WallSecret} />
      )}

      <ShareRecord secret={secret} />

      <CommentThread
        secretId={secret.id}
        locked={commentsLocked}
        initialCount={commentCount}
      />
    </div>
  );
}
