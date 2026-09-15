import type { Metadata } from 'next';
import { InboxManager } from '@/components/InboxManager';

export const metadata: Metadata = {
  title: 'My inbox',
  description: 'Get a link. Collect anonymous messages only you can decrypt.',
};

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <InboxManager />
    </div>
  );
}
