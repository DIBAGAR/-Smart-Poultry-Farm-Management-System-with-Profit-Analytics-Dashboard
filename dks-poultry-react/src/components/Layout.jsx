import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>

            {/* Desktop Sidebar — hidden on mobile */}
            <div className="desktop-sidebar">
                <Sidebar isOpen={true} toggleSidebar={toggleSidebar} />
            </div>

            {/* Mobile Sidebar Drawer */}
            <div className="mobile-only">
                {isSidebarOpen && (
                    <div
                        onClick={toggleSidebar}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 40
                        }}
                    />
                )}
                <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            </div>

            {/* Main Content */}
            <main className="main-content">
                {/* Top bar — mobile only */}
                <header className="mobile-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/logo.jpg" alt="DKS"
                            style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid var(--accent-gold)', objectFit: 'cover' }}
                            onError={e => e.target.src = 'https://via.placeholder.com/34?text=D'}
                        />
                        <span className="font-cinzel" style={{ fontSize: '14px', color: 'var(--accent-gold)', letterSpacing: '1px' }}>DKS POULTRY</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#16a34a' }}>
                        <span style={{ width: '7px', height: '7px', background: '#16a34a', borderRadius: '50%', boxShadow: '0 0 6px #16a34a' }} />
                        LIVE
                    </div>
                </header>

                {/* Desktop top bar */}
                <header className="desktop-topbar">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h2 className="font-cinzel" style={{ fontSize: '14px', color: 'var(--accent-gold)' }}>Online Session</h2>
                        <span style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%', marginLeft: '10px', boxShadow: '0 0 10px #16a34a' }} />
                    </div>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>D</div>
                </header>

                {/* Page content */}
                <div className="page-content animate-fade">
                    {children}
                </div>
            </main>

            {/* Bottom nav — mobile only */}
            <div className="mobile-only">
                <BottomNav />
            </div>

            <style>{`
                /* Mobile: < 768px */
                .desktop-sidebar { display: none; }
                .mobile-only { display: block; }
                .mobile-topbar {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 12px 16px; background: rgba(10,15,29,0.95);
                    border-bottom: 1px solid rgba(255,215,0,0.1);
                    position: sticky; top: 0; z-index: 30;
                    backdrop-filter: blur(10px);
                }
                .desktop-topbar { display: none; }
                .main-content {
                    flex: 1;
                    min-height: 100vh;
                    overflow-x: hidden;
                    padding-bottom: 80px;
                }
                .page-content { padding: 16px; }

                /* Desktop & Large Tablets: >= 1024px */
                @media (min-width: 1024px) {
                    .desktop-sidebar { display: block; }
                    .mobile-only { display: none !important; }
                    .mobile-topbar { display: none; }
                    .desktop-topbar {
                        display: flex; align-items: center; justify-content: space-between;
                        padding: 24px 40px; margin-bottom: 8px;
                    }
                    .main-content { margin-left: var(--sidebar-width); padding-bottom: 40px; }
                    .page-content { padding: 0 32px 32px; }
                }
            `}</style>
        </div>
    );
};

export default Layout;
