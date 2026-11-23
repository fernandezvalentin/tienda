import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <h1 className="mt-4 text-xl font-semibold">No encontramos esta página</h1>
      <Link href="/" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
