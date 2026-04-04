'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSidebar } from './SidebarContext';

const navItems = [
  { href: '/', label: 'Profit & Loss', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}`}>
      {/* Brand & Toggle */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">SKI</div>
        <div className="sidebar-logo-text-wrap">
          <div className="sidebar-logo-text">SKI Analytics</div>
          <div className="sidebar-logo-sub">Business Intelligence</div>
        </div>
        <button 
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link${isActive ? ' active' : ''}`}
              title={isCollapsed ? label : ""}
            >
              <Icon size={16} className="nav-link-icon" />
              <span className="nav-link-text">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-info">
          <RefreshCw size={11} className="nav-link-icon" />
          <span className="sidebar-footer-text">Data: Jan – Feb 2026</span>
        </div>
        <div className="sidebar-footer-secondary sidebar-footer-text">SKi Company · local.db</div>
      </div>
    </aside>
  );
}
