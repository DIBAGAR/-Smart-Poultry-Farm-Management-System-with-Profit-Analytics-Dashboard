import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, isAuthorized, isSuperAdmin, loading } = useAuth();
    const location = useLocation();

    // If a user is logged into Firebase but NOT in allowed_users (revoked),
    // forcefully sign them out so they land back on /login cleanly.
    useEffect(() => {
        if (!loading && user && !isAuthorized) {
            signOut(auth).catch(err => console.error('Force sign-out error:', err));
        }
    }, [loading, user, isAuthorized]);

    if (loading) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0a0f1d', color: '#ffd700', fontFamily: 'Cinzel, serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                    <h2>VERIFYING SESSION</h2>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Revoked user — show brief message, auto-signout effect above will redirect them to /login
    if (!isAuthorized) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0a0f1d', padding: '24px', textAlign: 'center'
            }}>
                <div style={{ maxWidth: '340px' }}>
                    <div style={{ fontSize: '52px', marginBottom: '16px' }}>🚫</div>
                    <h1 style={{ color: '#ff4757', fontSize: '18px', marginBottom: '10px', fontFamily: 'Cinzel, serif' }}>
                        ACCESS REVOKED
                    </h1>
                    <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>
                        Your account access has been removed by the administrator.
                    </p>
                    <p style={{ color: '#555', fontSize: '12px' }}>
                        Signing you out automatically…
                    </p>
                </div>
            </div>
        );
    }

    if (adminOnly && !isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
