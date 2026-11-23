import Form from "next/form";

export function SearchBox() {
  return (
    <Form action="/productos" className="relative w-full max-w-md">
      <input
        name="q"
        type="search"
        placeholder="Buscar productos…"
        className="input pl-9"
        aria-label="Buscar productos"
      />
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
    </Form>
  );
}
