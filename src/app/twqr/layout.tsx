import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function TwqrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
