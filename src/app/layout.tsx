
import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is globally available if needed, or keep per-page

export const metadata: Metadata = {
  title: 'EmotionAI',
  description: 'Real-time emotion insights powered by AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`font-sans antialiased`}>
        {children}
        {/* Toaster can be here or at page level. If most pages use toast, here is fine. 
            The current page.tsx includes it, which is also acceptable for a single-page focus.
            For consistency, if the app grows, having it here would be better.
            However, the user's scaffold already has a Toaster component that relies on a hook,
            so placing <Toaster /> in page.tsx where useToast is called is idiomatic for shadcn.
            Let's keep it in page.tsx as per the current page structure.
        */}
      </body>
    </html>
  );
}
