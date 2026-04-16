import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmModal — uses React Portal to render directly on document.body.
 * This bypasses all parent z-index/overflow issues, including in WebView apps.
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState(null);
 *
 *   // Trigger:
 *   setConfirmState({ message: "...", onConfirm: () => { ...delete logic...; setConfirmState(null); } });
 *
 *   // Render:
 *   <ConfirmModal
 *     isOpen={!!confirmState}
 *     message={confirmState?.message}
 *     onConfirm={confirmState?.onConfirm}
 *     onCancel={() => setConfirmState(null)}
 *   />
 */
const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, confirmLabel = 'DELETE', confirmColor = '#ff4757' }) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.88)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'flex-end',
                padding: '0',
                WebkitBackdropFilter: 'blur(6px)',
                backdropFilter: 'blur(6px)',
            }}
        >
            <div style={{
                width: '100%',
                background: '#111824',
                borderRadius: '24px 24px 0 0',
                padding: '28px 20px 40px',
                border: '1px solid rgba(255, 71, 87, 0.25)',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
                animation: 'slideUpSheet 0.25s ease-out',
            }}>
                {/* Warning Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'rgba(255,71,87,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <AlertTriangle size={22} color="#ff4757" />
                    </div>
                    <div>
                        <p style={{ fontWeight: '800', fontSize: '16px', marginBottom: '2px' }}>
                            Confirm Delete
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            This action cannot be undone
                        </p>
                    </div>
                </div>

                {/* Message */}
                <p style={{
                    color: '#ccc',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '28px',
                    paddingLeft: '4px'
                }}>
                    {message}
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '16px',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff',
                            border: '1px solid #2a2a3a',
                            borderRadius: '14px',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '16px',
                            background: confirmColor,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: '800',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                            boxShadow: `0 4px 20px ${confirmColor}40`,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUpSheet {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>,
        document.body   // <-- renders directly to body, bypasses all parent containers
    );
};

export default ConfirmModal;
