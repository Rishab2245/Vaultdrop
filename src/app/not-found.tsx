import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center sm:px-6">
      <p className="text-3xl" aria-hidden="true">
        🕳
      </p>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 leading-relaxed text-body">
        This page does not exist, or whatever was here has already expired.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/wall" className="cmd-primary">
          Read the Wall
        </Link>
        <Link href="/" className="cmd">
          Go home
        </Link>
      </div>
    </div>
  );
}
