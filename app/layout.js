import './globals.css';
import { Figtree } from 'next/font/google';
import { PortalProvider } from '@/components/PortalProvider';
import Header from '@/components/Header';

const figtree = Figtree({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Durkan Regen | Competency Portal',
  description: 'Staff competency, experience and Building Safety Act evidence for Durkan Regen'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body className={figtree.className}>
        <PortalProvider>
          <Header />
          <main className="page">{children}</main>
        </PortalProvider>
      </body>
    </html>
  );
}
