import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// ✅ ONLY the permanent super admin is hardcoded.
// All other users MUST exist in Firestore allowed_users to gain access.
const SUPER_ADMIN = "dibagar66@gmail.com";

export const AuthProvider = ({ children }) => {
    const [user, setUser]               = useState(undefined);
    const [allowedEmails, setAllowedEmails] = useState([SUPER_ADMIN]);
    const [usersLoaded, setUsersLoaded] = useState(false);
    const firestoreUnsubRef = useRef(null);
    const timeoutRef        = useRef(null);

    useEffect(() => {
        // Handle redirect result for WebView/Mobile compatibility
        getRedirectResult(auth).catch(err => {
            console.error("[Auth] Redirect Error:", err);
        });

        const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser ?? null);

            // Cancel any previous Firestore listener
            if (firestoreUnsubRef.current) {
                firestoreUnsubRef.current();
                firestoreUnsubRef.current = null;
            }
            clearTimeout(timeoutRef.current);

            if (firebaseUser) {
                // Safety timeout fallback — only allows super admin if Firestore is slow
                timeoutRef.current = setTimeout(() => {
                    setAllowedEmails([SUPER_ADMIN]);
                    setUsersLoaded(true);
                }, 5000);

                // Ensure super admin is always in allowed_users so they can't be locked out
                if (firebaseUser.email?.toLowerCase() === SUPER_ADMIN) {
                    setDoc(doc(db, 'allowed_users', SUPER_ADMIN), {
                        email: SUPER_ADMIN,
                        name: 'Super Admin',
                        authType: 'google',
                        protected: true,
                        addedAt: new Date().toISOString(),
                    }, { merge: true }).catch(() => {}); // silent — runs once on super admin login
                }

                firestoreUnsubRef.current = onSnapshot(
                    collection(db, 'allowed_users'),
                    (snapshot) => {
                        clearTimeout(timeoutRef.current);
                        const emails = snapshot.docs
                            .map(d => (d.data().email || '').trim().toLowerCase())
                            .filter(Boolean);

                        // Super admin is ALWAYS allowed, regardless of Firestore contents
                        const finalList = emails.includes(SUPER_ADMIN)
                            ? emails
                            : [SUPER_ADMIN, ...emails];

                        setAllowedEmails(finalList);
                        setUsersLoaded(true);
                    },
                    (error) => {
                        clearTimeout(timeoutRef.current);
                        console.warn('[Auth] allowed_users error:', error.code);
                        // On Firestore failure, only super admin retains access — all others blocked
                        setAllowedEmails([SUPER_ADMIN]);
                        setUsersLoaded(true);
                    }
                );
            } else {
                // No user signed in
                setAllowedEmails([SUPER_ADMIN]);
                setUsersLoaded(true);
            }
        });

        return () => {
            unsubAuth();
            if (firestoreUnsubRef.current) firestoreUnsubRef.current();
            clearTimeout(timeoutRef.current);
        };
    }, []);

    const authChecked  = user !== undefined;
    const loading      = !authChecked || !usersLoaded;
    const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN;
    const userEmail    = user?.email?.trim()?.toLowerCase() || '';

    // Super admin is ALWAYS authorized, others must be in live Firestore list
    const isAuthorized = !loading && !!user && (
        isSuperAdmin ||
        allowedEmails.includes(userEmail)
    );

    return (
        <AuthContext.Provider value={{ user, loading, isSuperAdmin, isAuthorized, allowedEmails }}>
            {children}
        </AuthContext.Provider>
    );
};
