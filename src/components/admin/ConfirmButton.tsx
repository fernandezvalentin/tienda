"use client";

import type { ComponentProps } from "react";

/** Botón submit que pide confirmación antes de enviar el formulario. */
export function ConfirmButton({
  message = "¿Seguro?",
  ...props
}: ComponentProps<"button"> & { message?: string }) {
  return (
    <button
      {...props}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
        props.onClick?.(e);
      }}
    />
  );
}
