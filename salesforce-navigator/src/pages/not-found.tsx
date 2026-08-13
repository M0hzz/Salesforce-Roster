import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="text-center py-16 space-y-2">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Link to="/" className="text-primary underline">Back to home</Link>
    </div>
  );
}
