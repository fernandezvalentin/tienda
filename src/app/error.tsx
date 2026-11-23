"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-sm text-zinc-600">Probá nuevamente en unos segundos.</p>
      <button onClick={reset} className="btn-primary mt-6">Reintentar</button>
    </div>
  );
}
