import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center sm:px-6">
      <p className="text-3xl" aria-hidden="true">
        🕳
      </p>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-pretty leading-relaxed text-chalk-dim">
        This page does not exist, or whatever was here has already expired.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/wall" className="btn-primary">
          Read the Wall
        </Link>
        <Link href="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
