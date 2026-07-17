import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--bg) px-6 text-center">
      <p className="text-7xl font-bold text-(--accent)">404</p>
      <h1 className="text-2xl font-semibold text-(--text)">Page not found</h1>
      <p className="max-w-sm text-md text-(--text-muted)">
        The link may be broken, or the page may have moved.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-hover)"
      >
        Back to home
      </Link>
    </div>
  );
}
