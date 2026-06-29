import Link from 'next/link';

export const metadata = {
  title: 'Page Not Found - TypeCheck'
};

function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-panel" aria-labelledby="not-found-title">
        <div className="not-found-brand">
          <img src="/logo.png" alt="" aria-hidden="true" />
          <span>TypeCheck</span>
        </div>

        <p className="eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>
          This route is not part of the typing course. Head back to the test and
          keep your rhythm going.
        </p>

        <Link className="not-found-action" href="/">
          Back to typing test
        </Link>
      </section>
    </main>
  );
}

export default NotFound;
