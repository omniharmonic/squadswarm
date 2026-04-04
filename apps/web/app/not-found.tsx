import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-accent-squad mb-4">404</h1>
        <p className="text-text-secondary text-lg mb-6">Page not found</p>
        <Link href="/" className="px-6 py-3 bg-accent-squad text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
          Go Home
        </Link>
      </div>
    </div>
  );
}
