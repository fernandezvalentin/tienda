import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
