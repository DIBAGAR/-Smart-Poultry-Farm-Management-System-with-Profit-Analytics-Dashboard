import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const { user, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Show loading while auth state is being determined
    if (authLoading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1d', color: '#ffd700' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
                <p style={{ fontWeight: '700', letterSpacing: '2px' }}>LOADING...</p>
            </div>
        </div>
    );

    // Redirect as soon as user is signed in — ProtectedRoute handles authorization
    if (user) return <Navigate to="/" replace />;

    /* ---- Google Sign-In ---- */
    const handleGoogle = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
            // onAuthStateChanged in AuthContext fires → user set → this component re-renders → Navigate to /
        } catch (err) {
            if (
                err.code === 'auth/popup-blocked' ||
                err.code === 'auth/operation-not-supported-in-this-environment' ||
                err.code === 'auth/cancelled-popup-request'
            ) {
                // Popup blocked by WebView — fall back to redirect flow
                try {
                    await signInWithRedirect(auth, googleProvider);
                    return; // page will reload, no further code
                } catch {
                    setError('Sign-in failed. Check your internet connection.');
                }
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign-in cancelled. Please try again.');
            } else if (err.code === 'auth/unauthorized-domain') {
                setError("Domain not authorized. Go to Firebase Console → Authentication → Settings → Authorized domains and add this domain.");
            } else {
                setError(err.message || 'Google sign-in failed.');
            }
            setLoading(false);
        }
    };

    /* ---- Email/Password Sign-In ---- */
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password.trim()) { setError('Enter email and password.'); return; }
        setLoading(true);
        try {
            let loginEmail = email.trim().toLowerCase();
            if (!loginEmail.includes('@')) loginEmail += '@gmail.com';
            await signInWithEmailAndPassword(auth, loginEmail, password);
        } catch (err) {
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Check and try again.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Wrong password.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait and try again.');
            } else {
                setError(err.message || 'Login failed.');
            }
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-dark)',
            padding: '24px',
        }}>
            <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>

                {/* Logo */}
                <img src="/logo.jpg" alt="DKS Poultry"
                    style={{
                        width: '90px', height: '90px', borderRadius: '50%',
                        border: '3px solid var(--accent-gold)', objectFit: 'cover',
                        marginBottom: '20px', boxShadow: '0 0 30px rgba(255,215,0,0.15)',
                    }}
                    onError={e => { e.target.style.display = 'none'; }}
                />

                <h1 className="font-cinzel" style={{ fontSize: '24px', color: 'var(--accent-gold)', marginBottom: '4px' }}>
                    DKS POULTRY
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '4px', marginBottom: '32px' }}>
                    MANAGEMENT SYSTEM
                </p>

                {/* Login Card */}
                <div className="glass" style={{
                    padding: '28px 22px',
                    borderRadius: '22px',
                    border: '1px solid rgba(255,215,0,0.1)',
                }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '24px' }}>SIGN IN</p>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
                            borderRadius: '10px', padding: '10px 14px', marginBottom: '18px',
                            fontSize: '13px', color: '#ff4757', textAlign: 'left',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Google Sign-In */}
                    <button
                        onClick={handleGoogle}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '15px 20px', borderRadius: '14px',
                            border: '1px solid #333', background: '#fff', color: '#222',
                            fontSize: '14px', fontWeight: '700',
                            cursor: loading ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            fontFamily: 'Inter, sans-serif',
                            opacity: loading ? 0.6 : 1, marginBottom: '24px',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        {loading ? 'PLEASE WAIT...' : 'SIGN IN WITH GOOGLE'}
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ flex: 1, height: '1px', background: '#2a2a3a' }} />
                        <span style={{ fontSize: '11px', color: '#555', fontWeight: '600' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: '#2a2a3a' }} />
                    </div>

                    {/* Email / Password */}
                    <form onSubmit={handleEmailLogin}>
                        <div className="form-group">
                            <label>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} color="#555" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@gmail.com" style={{ paddingLeft: '42px' }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} color="#555" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={{ paddingLeft: '42px', paddingRight: '48px' }} />
                                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <Lock size={16} />
                            {loading ? 'SIGNING IN...' : 'SIGN IN'}
                        </button>
                    </form>

                    <p style={{ fontSize: '11px', color: '#444', marginTop: '20px', lineHeight: '1.5' }}>
                        Only authorized accounts can access this portal.
                    </p>
                </div>

                <p style={{ fontSize: '10px', color: '#333', marginTop: '28px', letterSpacing: '1px' }}>
                    DKS POULTRY © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default Login;
