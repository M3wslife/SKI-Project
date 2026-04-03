'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Construction, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function UnderDevelopmentOverlay() {
  const pathname = usePathname();
  const router = useRouter();

  // Only show overlay if NOT on whitelisted pages
  if (pathname === '/profit-and-loss') {
    return null;
  }

  return (
    <div className="dev-overlay">
      <div className="dev-message-card">
        <div className="dev-badge">Alpha Access</div>
        <div className="dev-icon-wrap">
          <Construction size={32} />
        </div>
        <h2 className="dev-title">Module Under Construction</h2>
        <p className="dev-description">
          This section is currently being optimized for SKI strategic goals. 
          Please use the <strong>Profit & Loss</strong> dashboard for current business intelligence.
        </p>

        <div className="dev-actions">
          <Link href="/profit-and-loss" className="btn btn-primary dev-btn">
            <FileText size={16} />
            Back to Profit & Loss
          </Link>
          <button onClick={() => router.back()} className="btn btn-ghost dev-btn">
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
