import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="container page">
      <h1 className="page-title">Page not found</h1>
      <p className="muted">The page you are looking for does not exist.</p>
      <Link to="/" className="button">
        Back to home
      </Link>
    </div>
  );
}
