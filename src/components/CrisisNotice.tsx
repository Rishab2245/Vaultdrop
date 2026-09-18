'use client';

import { CRISIS_RESOURCES, type CrisisSignal } from '@/lib/crisis';

/**
 * Shown when someone writes something that reads like crisis.
 *
 * It never blocks posting and it has no dismiss-and-continue gate. Silencing
 * someone who says they want to die teaches them this is one more place that
 * will not listen, so the record still files - this simply sits beside it.
 *
 * Amber rather than red on purpose. This is not an error and the person reading
 * it has not done anything wrong.
 */
export function CrisisNotice({ signal }: { signal: CrisisSignal }) {
  return (
    <aside
      className="border border-amber"
      role="note"
      aria-label="Support resources"
    >
      <div className="flex items-center justify-between border-b border-amber/40 bg-panel px-2 py-1">
        <span className="text-2xs uppercase tracking-[0.13em] text-amber">
          You do not have to do this alone
        </span>
      </div>

      <div className="p-3">
        <p className="font-serif text-read leading-relaxed text-chrome">{signal.message}</p>

        <ul className="mt-4 space-y-2.5">
          {CRISIS_RESOURCES.map((resource) => (
            <li key={resource.name} className="border-l border-hairline pl-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xs uppercase tracking-[0.1em] text-label">
                  {resource.region}
                </span>
                {resource.href ? (
                  <a
                    href={resource.href}
                    target={resource.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer noopener"
                    className="text-base text-amber no-underline hover:underline"
                  >
                    {resource.name} &middot; {resource.contact}
                  </a>
                ) : (
                  <span className="text-base text-chrome">
                    {resource.name} &middot; {resource.contact}
                  </span>
                )}
              </div>
              {resource.note && (
                <p className="mt-0.5 text-sm text-label">{resource.note}</p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-label">
          Nothing is being blocked and nothing has been reported. You can still file what you
          wrote.
        </p>
      </div>
    </aside>
  );
}
