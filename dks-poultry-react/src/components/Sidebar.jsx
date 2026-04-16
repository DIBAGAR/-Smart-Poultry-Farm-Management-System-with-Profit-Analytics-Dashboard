import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Egg, 
    Archive, 
    TrendingUp, 
    ShoppingCart, 
    Stethoscope, 
    Wheat, 
    Users, 
    LogOut 
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { isSuperAdmin } = useAuth();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/', section: 'GENERAL' },
        { name: 'Chicks Log', icon: Egg, path: '/chicks', section: 'PRODUCTION' },
        { name: 'Batch Archive', icon: Archive, path: '/archive', section: 'PRODUCTION' },
        { name: 'Sales Log', icon: TrendingUp, path: '/sales', section: 'FINANCIALS' },
        { name: 'Purchase Log', icon: ShoppingCart, path: '/purchase', section: 'FINANCIALS' },
        { name: 'Medicine', icon: Stethoscope, path: '/medicine', section: 'FINANCIALS' },
        { name: 'Feed Log', icon: Wheat, path: '/food', section: 'FINANCIALS' },
    ];

    if (isSuperAdmin) {
        menuItems.push({ name: 'User Management', icon: Users, path: '/users', section: 'ADMIN' });
    }

    const sections = ['GENERAL', 'PRODUCTION', 'FINANCIALS', 'ADMIN'];

    const handleLogout = () => {
        signOut(auth);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="mobile-overlay"
                    onClick={toggleSidebar}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 40,
                        backdropFilter: 'blur(4px)'
                    }}
                />
            )}

            <aside className={`sidebar glass ${isOpen ? 'active' : ''}`} style={{
                position: 'fixed',
                top: 0,
                left: isOpen ? 0 : '-280px',
                width: 'var(--sidebar-width)',
                height: '100vh',
                zIndex: 50,
                transition: 'left 0.3s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        border: '2px solid var(--accent-gold)',
                        margin: '0 auto 12px',
                        overflow: 'hidden',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)'
                    }}>
                        <img src="/logo.jpg" alt="DKS Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://via.placeholder.com/80?text=DKS'} />
                    </div>
                    <h2 className="font-cinzel" style={{ fontSize: '16px', color: '#fff' }}>DKS POULTRY</h2>
                    <p style={{ fontSize: '10px', color: 'var(--accent-gold)', letterSpacing: '2px', marginTop: '4px' }}>MANAGEMENT</p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '5px' }}>
                    {sections.map(section => {
                        const items = menuItems.filter(item => item.section === section);
                        if (items.length === 0) return null;

                        return (
                            <div key={section} style={{ marginBottom: '24px' }}>
                                <p style={{ 
                                    fontSize: '10px', 
                                    color: 'var(--accent-gold)', 
                                    opacity: 0.6, 
                                    marginBottom: '12px',
                                    letterSpacing: '1.5px',
                                    fontWeight: '800'
                                }}>{section}</p>
                                
                                {items.map(item => (
                                    <NavLink 
                                        key={item.path} 
                                        to={item.path}
                                        onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                                        style={({isActive}) => ({
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            color: isActive ? 'var(--accent-gold)' : '#b4b4b4',
                                            textDecoration: 'none',
                                            marginBottom: '4px',
                                            fontSize: '14px',
                                            fontWeight: isActive ? '600' : '400',
                                            background: isActive ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                                            transition: '0.2s'
                                        })}
                                    >
                                        <item.icon size={18} style={{ marginRight: '12px' }} />
                                        {item.name}
                                    </NavLink>
                                ))}
                            </div>
                        );
                    })}
                </div>

                <button 
                    onClick={handleLogout}
                    className="btn"
                    style={{
                        background: 'rgba(255, 71, 87, 0.1)',
                        color: 'var(--accent-danger)',
                        border: '1px solid rgba(255, 71, 87, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '14px',
                        width: '100%',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700'
                    }}
                >
                    <LogOut size={18} style={{ marginRight: '10px' }} />
                    LOGOUT SESSION
                </button>
            </aside>

            <style>{`
                @media (min-width: 1024px) {
                    .sidebar { left: 0 !important; }
                    .mobile-overlay { display: none !important; }
                }
            `}</style>
        </>
    );
};

export default Sidebar;
