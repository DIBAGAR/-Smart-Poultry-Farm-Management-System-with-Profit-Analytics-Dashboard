import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Egg, TrendingUp, ShoppingCart, MoreHorizontal } from 'lucide-react';

const NAV_ITEMS = [
    { name: 'Home',     icon: LayoutDashboard, path: '/',        end: true },
    { name: 'Chicks',   icon: Egg,             path: '/chicks',  end: false },
    { name: 'Sales',    icon: TrendingUp,      path: '/sales',   end: false },
    { name: 'Purchase', icon: ShoppingCart,    path: '/purchase',end: false },
    { name: 'More',     icon: MoreHorizontal,  path: '/more',    end: false },
];

const BottomNav = () => (
    <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '60px',
        background: 'rgba(8, 12, 24, 0.98)',
        borderTop: '1px solid rgba(255,215,0,0.12)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 1000,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
        {NAV_ITEMS.map(item => (
            <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                style={({ isActive }) => ({
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    gap: '3px',
                    textDecoration: 'none',
                    color: isActive ? 'var(--accent-gold)' : '#4a5568',
                    position: 'relative',
                    transition: 'color 0.2s',
                    WebkitTapHighlightColor: 'transparent',
                })}
            >
                {({ isActive }) => (
                    <>
                        {isActive && (
                            <span style={{
                                position: 'absolute', top: 0, left: '50%',
                                transform: 'translateX(-50%)',
                                width: '28px', height: '2px',
                                background: 'var(--accent-gold)',
                                borderRadius: '0 0 4px 4px',
                            }} />
                        )}
                        <item.icon
                            size={21}
                            strokeWidth={isActive ? 2.5 : 1.8}
                            style={{ transition: 'transform 0.2s', transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
                        />
                        <span style={{
                            fontSize: '9px',
                            fontWeight: isActive ? '800' : '500',
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                        }}>
                            {item.name}
                        </span>
                    </>
                )}
            </NavLink>
        ))}
    </nav>
);

export default BottomNav;
