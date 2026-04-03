import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import UnderDevelopmentOverlay from '@/components/layout/UnderDevelopmentOverlay';

export const metadata: Metadata = {
  title: 'SKI Analytics Dashboard',
  description: 'Business intelligence dashboard for SKi Company — sales, inventory, P&L',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <SidebarProvider>
          <div className="app-shell">
            <Sidebar />
            <div className="main-content">
              <UnderDevelopmentOverlay />
              {children}
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
