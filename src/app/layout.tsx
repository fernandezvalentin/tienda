import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: s.name, template: `%s | ${s.name}` },
    description: s.description ?? s.tagline ?? undefined,
    openGraph: { siteName: s.name, type: "website" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const brandStyle = { "--brand": settings.primary_color } as CSSProperties;

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans" style={brandStyle}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
