import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { UserPlus, Trash2, Shield, Users, Key, Mail, User, CheckCircle2, Lock } from 'lucide-react';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import ConfirmModal from '../components/ConfirmModal';

const SUPER_ADMIN = "dibagar66@gmail.com";

const showToast = (msg) => {
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.4s'; setTimeout(() => t.remove(), 400); }, 2500);
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [confirmState, setConfirmState] = useState(null);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'allowed_users'), snap =>
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsub();
    }, []);

    /* ---- Add user ---- */
    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        let email = newEmail.trim().toLowerCase();
        if (!email.includes('@')) email += '@gmail.com';

        if (users.some(u => u.email === email)) {
            showToast('⚠️ This email already has access.');
            return;
        }

        if (newPassword.trim().length > 0 && newPassword.trim().length < 6) {
            showToast('⚠️ Password must be at least 6 characters.');
            return;
        }

        setAdding(true);
        let createdAuth = false;

        try {
            // If password provided, create Firebase Auth account using a secondary app
            // so it doesn't log the admin out
            if (newPassword.trim().length >= 6) {
                const tempName = `sec-${Date.now()}`;
                // avoid re-registering if same app already exists
                const existing = getApps().find(a => a.name === tempName);
                const secondaryApp = existing || initializeApp(firebaseConfig, tempName);
                const secondaryAuth = getAuth(secondaryApp);
                try {
                    await createUserWithEmailAndPassword(secondaryAuth, email, newPassword.trim());
                    createdAuth = true;
                } catch (authErr) {
                    if (authErr.code === 'auth/email-already-in-use') {
                        createdAuth = true; // already exists, still grant DB access
                    } else {
                        showToast(`❌ Auth Error: ${authErr.message}`);
                        await deleteApp(secondaryApp);
                        setAdding(false);
                        return;
                    }
                }
                await secondaryAuth.signOut().catch(() => {});
                await deleteApp(secondaryApp);
            }

            // Grant portal access via Firestore
            await setDoc(doc(db, 'allowed_users', email), {
                email,
                name: newName.trim() || email,
                authType: createdAuth ? 'email_password' : 'google',
                addedAt: new Date().toISOString(),
            });

            setNewName('');
            setNewEmail('');
            setNewPassword('');
            showToast(`✅ ${email} granted access!`);
        } catch (err) {
            console.error(err);
            showToast('❌ Failed to add user. Check console.');
        } finally {
            setAdding(false);
        }
    };

    /* ---- Revoke user ---- */
    const handleRemove = (id, email, isProtected) => {
        if (email === SUPER_ADMIN || isProtected) { showToast('⚠️ Super Admin cannot be revoked.'); return; }
        setConfirmState({
            message: `Revoke portal access for "${email}"?\n\nThey will be automatically signed out and blocked from accessing the portal.`,
            onConfirm: async () => {
                await deleteDoc(doc(db, 'allowed_users', email));
                setConfirmState(null);
                showToast('🔒 Access revoked. User will be signed out.');
            }
        });
    };

    const superAdmin = users.find(u => u.email === SUPER_ADMIN);
    const otherUsers = users.filter(u => u.email !== SUPER_ADMIN);

    return (
        <div className="page-inner" style={{ maxWidth: '700px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,215,0,0.2)' }}>
                    <Shield size={22} color="var(--accent-gold)" />
                </div>
                <div>
                    <h1 className="font-cinzel" style={{ fontSize: '18px', color: 'var(--accent-gold)' }}>USER MANAGEMENT</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Admin-only portal access control</p>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', marginTop: '16px' }}>
                <div className="glass" style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-gold)' }}>{users.length}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>TOTAL USERS</p>
                </div>
                <div className="glass" style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a' }}>{users.filter(u => u.authType === 'email_password').length}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>EMAIL LOGIN</p>
                </div>
                <div className="glass" style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa' }}>{users.filter(u => u.authType !== 'email_password').length}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>GOOGLE LOGIN</p>
                </div>
            </div>

            {/* Add User Form */}
            <div className="glass" style={{ padding: '24px', borderRadius: '18px', marginBottom: '24px', border: '1px solid rgba(255,215,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <UserPlus size={18} color="var(--accent-gold)" />
                    <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-gold)' }}>GRANT PORTAL ACCESS</h3>
                </div>

                <form onSubmit={handleAddUser}>
                    {/* Full Name */}
                    <div className="form-group">
                        <label>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={15} color="#555" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="Employee / Staff Name" style={{ paddingLeft: '40px' }} />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label>Email Address <span style={{ color: '#ff4757' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={15} color="#555" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                placeholder="user@gmail.com" style={{ paddingLeft: '40px' }} required />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label>Password <span style={{ color: 'var(--text-muted)', fontWeight: '400', textTransform: 'none', letterSpacing: '0' }}>(Optional — enables manual Email/Password login)</span></label>
                        <div style={{ position: 'relative' }}>
                            <Key size={15} color="#555" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters" style={{ paddingLeft: '40px', paddingRight: '44px' }} />
                            <button type="button" onClick={() => setShowPw(p => !p)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                                {showPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Hint */}
                    <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                        <p style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.7' }}>
                            📌 <strong style={{ color: 'var(--accent-gold)' }}>Without password:</strong> User can only log in via <strong>Sign in with Google</strong>.<br />
                            🔑 <strong style={{ color: '#16a34a' }}>With password:</strong> User gets a full Email + Password account — no Google required.
                        </p>
                    </div>

                    <button type="submit" disabled={adding} className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <UserPlus size={16} />
                        {adding ? 'CREATING ACCESS...' : 'GRANT ACCESS'}
                    </button>
                </form>
            </div>

            {/* Users List */}
            <div className="glass" style={{ borderRadius: '18px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={16} color="var(--accent-gold)" />
                        <h3 style={{ fontSize: '13px', fontWeight: '800' }}>AUTHORIZED USERS ({users.length})</h3>
                    </div>
                </div>

                {/* Super Admin Row */}
                {superAdmin && (
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,215,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,215,0,0.15)', border: '2px solid var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', color: 'var(--accent-gold)', flexShrink: 0 }}>
                                {((superAdmin.name || superAdmin.email || '?')[0] || '?').toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <p style={{ fontWeight: '700', fontSize: '14px' }}>{superAdmin.name || 'Super Admin'}</p>
                                    <span style={{ fontSize: '9px', background: 'var(--accent-gold)', color: '#000', padding: '2px 8px', borderRadius: '20px', fontWeight: '800' }}>SUPER ADMIN</span>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{superAdmin.email}</p>
                            </div>
                            <div style={{ fontSize: '11px', background: 'rgba(255,215,0,0.1)', color: 'var(--accent-gold)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Shield size={11} /> PROTECTED
                            </div>
                        </div>
                    </div>
                )}

                {otherUsers.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Users size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
                        <p>No other users added yet.</p>
                        <p style={{ fontSize: '12px', marginTop: '6px' }}>Use the form above to grant access.</p>
                    </div>
                ) : (
                    otherUsers.map((user, index) => {
                        const isEmailAuth = user.authType === 'email_password';
                        return (
                            <div key={user.id} style={{ padding: '16px 20px', borderBottom: index < otherUsers.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    {/* Avatar */}
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '2px solid #2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', color: 'var(--text-muted)', flexShrink: 0 }}>
                                        {((user.name || user.email || '?')[0] || '?').toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{user.name || 'User'}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                            background: isEmailAuth ? 'rgba(22,163,74,0.1)' : 'rgba(96,165,250,0.1)',
                                            color: isEmailAuth ? '#16a34a' : '#60a5fa',
                                            border: `1px solid ${isEmailAuth ? 'rgba(22,163,74,0.2)' : 'rgba(96,165,250,0.2)'}`
                                        }}>
                                            {isEmailAuth ? <><Lock size={9} /> EMAIL + PASSWORD</> : <><CheckCircle2 size={9} /> GOOGLE SIGN-IN</>}
                                        </span>
                                    </div>

                                    {/* Revoke button */}
                                    <button onClick={() => handleRemove(user.id, user.email, user.protected)}
                                        style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                                        <Trash2 size={13} /> Revoke
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{ height: '24px' }} />

            <ConfirmModal
                isOpen={!!confirmState}
                message={confirmState?.message}
                onConfirm={confirmState?.onConfirm}
                onCancel={() => setConfirmState(null)}
                confirmLabel="REVOKE ACCESS"
            />
        </div>
    );
};

export default UserManagement;
