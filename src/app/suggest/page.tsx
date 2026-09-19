import type { Metadata } from 'next';
import { SuggestionBox } from '@/components/SuggestionBox';
import { Donate } from '@/components/Donate';

export const metadata: Metadata = {
  title: 'Suggestions',
  description: 'Tell us what would make VaultDrop better. Anonymously, like everything else here.',
};

export default function SuggestPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-[2rem] leading-tight text-chrome">Suggestions</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-body">
          What is missing, what is broken, or what made you hesitate. Anonymously, like everything
          else here &mdash; there is no contact field, because a suggestion box that collects an
          email address is a mailing list with extra steps.
        </p>
      </header>

      <div className="space-y-4">
        <SuggestionBox />
        <Donate />
      </div>
    </div>
  );
}
