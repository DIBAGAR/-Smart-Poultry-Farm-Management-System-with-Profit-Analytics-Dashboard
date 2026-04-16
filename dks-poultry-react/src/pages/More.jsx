import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Wheat, Archive, Users, ChevronRight, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

const More = () => {
    const { isSuperAdmin, user } = useAuth();

    const menuItems = [
        { label: 'Medicine', sub: 'Medical expenses log', icon: Stethoscope, path: '/medicine', color: '#e67e22', bg: 'rgba(230,126,34,0.1)' },
        { label: 'Feed Log', sub: 'Nutrition & feed expenses', icon: Wheat, path: '/food', color: '#9b59b6', bg: 'rgba(155,89,182,0.1)' },
        { label: 'Batch Archive', sub: 'View archived batches', icon: Archive, path: '/archive', color: 'var(--accent-gold)', bg: 'rgba(255,215,0,0.08)' },
    ];

    if (isSuperAdmin) {
        menuItems.push({ label: 'User Management', sub: 'Add / remove portal access', icon: Users, path: '/users', color: '#3498db', bg: 'rgba(52,152,219,0.1)' });
    }

    return (
        <div className="page-inner">
            <h1 className="section-title" style={{ marginBottom: '6px' }}>MORE</h1>
            {user && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>{user.email}</p>}

            <div className="data-cards" style={{ gap: '10px' }}>
                {menuItems.map(item => (
                    <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                        <div className="data-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 16px' }}>
                            <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <item.icon size={22} color={item.color} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '2px' }}>{item.label}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.sub}</p>
                            </div>
                            <ChevronRight size={18} color="#444" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* App Info */}
            <div className="glass" style={{ padding: '16px 20px', borderRadius: '16px', marginTop: '24px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>VERSION</p>
                <p style={{ fontSize: '13px', fontWeight: '600' }}>DKS Poultry Management v2.0</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Built with React + Firebase</p>
            </div>

            {/* Logout */}
            <button
                onClick={() => signOut(auth)}
                className="btn"
                style={{
                    width: '100%', marginTop: '16px',
                    background: 'rgba(255,71,87,0.08)',
                    color: '#ff4757',
                    border: '1px solid rgba(255,71,87,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
            >
                <LogOut size={18} />
                LOGOUT SESSION
            </button>

            <div style={{ height: '20px' }} />
        </div>
    );
};

export default More;
