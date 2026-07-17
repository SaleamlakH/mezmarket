import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

export function ErrorPage() {
  const error = useRouteError();

  let title = 'Oops! Something went wrong';

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "This page doesn't exist" : `Error ${error.status}`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--bg) px-6 text-center">
      <p className="text-sm uppercase tracking-wide text-(--text-muted)">
        {isRouteErrorResponse(error) ? `Error ${error.status}` : 'Unexpected error'}
      </p>
      <h1 className="text-2xl font-semibold text-(--text)">{title}</h1>
      <div className="mt-2 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-(--border) bg-(--surface-primary) px-4 py-2 text-sm font-medium text-(--text) hover:bg-(--surface-secondary)"
        >
          Reload
        </button>
        <Link
          to="/"
          className="rounded-md bg-(--accent) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-hover)"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
