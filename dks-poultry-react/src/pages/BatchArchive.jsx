import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Archive, Trash2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const showToast = (msg) => {
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.4s'; setTimeout(() => t.remove(), 400); }, 2500);
};

const BatchArchive = () => {
    const [archived, setArchived] = useState([]);
    const [confirmState, setConfirmState] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    useEffect(() => {
        const q = query(collection(db, 'chicks_backup'), orderBy('hatchDate', 'desc'));
        const unsub = onSnapshot(q, snap =>
            setArchived(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        return () => unsub();
    }, []);

    // Ensure valid page when data changes
    useEffect(() => {
        const totalPages = Math.ceil(archived.length / ITEMS_PER_PAGE) || 1;
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [archived, currentPage]);

    /* ---- Return batch to active Chicks Log ---- */
    const handleReturn = (batch) => {
        setConfirmState({
            message: `Return "${batch.cock} × ${batch.hen}" batch to the active Chicks Log?`,
            isReturn: true,
            onConfirm: async () => {
                const { id, ...batchData } = batch;           // strip archive doc id
                await addDoc(collection(db, 'chicks'), batchData); // restore to chicks
                await deleteDoc(doc(db, 'chicks_backup', id)); // remove from archive
                setConfirmState(null);
                showToast('✅ Batch returned to Chicks Log!');
            }
        });
    };

    /* ---- Permanently delete archived batch ---- */
    const handleDelete = (batch) => {
        setConfirmState({
            message: `Permanently delete "${batch.cock} × ${batch.hen}" batch? This cannot be undone.`,
            isReturn: false,
            onConfirm: async () => {
                await deleteDoc(doc(db, 'chicks_backup', batch.id));
                setConfirmState(null);
                showToast('🗑️ Batch deleted');
            }
        });
    };

    const VacTag = ({ date, done, label }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
            {done
                ? <CheckCircle size={13} color="#16a34a" />
                : <XCircle size={13} color="#ff4757" />}
            <span style={{ color: done ? '#16a34a' : '#ff4757', fontWeight: '700' }}>{label}</span>
            <span style={{ color: 'var(--text-muted)' }}>{date}</span>
        </div>
    );

    return (
        <div className="page-inner">
            <div className="section-header">
                <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Archive size={20} /> BATCH ARCHIVE
                </h1>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {archived.length} batches
                </span>
            </div>

            {/* Legend */}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                Tap <strong style={{ color: '#16a34a' }}>↩ Return</strong> to move a batch back to the active Chicks Log.
            </div>

            {archived.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <Archive size={48} style={{ opacity: 0.2, marginBottom: '16px', color: 'var(--accent-gold)' }} />
                    <p>No archived batches yet.</p>
                    <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.6 }}>
                        Archive active batches from the Chicks Log.
                    </p>
                </div>
            ) : (
                <div className="data-cards">
                    {(() => {
                        const totalPages = Math.ceil(archived.length / ITEMS_PER_PAGE) || 1;
                        const paginatedArchived = archived.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                        return (
                            <>
                                {paginatedArchived.map((b) => (
                                    <div key={b.id} className="data-card">
                                        {/* Batch Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '800', fontSize: '15px', marginBottom: '3px' }}>
                                                    🐓 {b.cock} × {b.hen}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Hatched: {b.hatchDate} &nbsp;·&nbsp;
                                                    <strong style={{ color: '#fff' }}>{b.count}</strong> chicks
                                                </p>
                                            </div>
                                            {/* Archive badge */}
                                            <span style={{
                                                fontSize: '10px', background: 'rgba(255,215,0,0.1)',
                                                color: 'var(--accent-gold)', padding: '4px 10px',
                                                borderRadius: '20px', fontWeight: '700'
                                            }}>
                                                ARCHIVED
                                            </span>
                                        </div>

                                        {/* Vaccination Status */}
                                        <div style={{
                                            display: 'flex', gap: '16px', flexWrap: 'wrap',
                                            padding: '10px 12px',
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: '10px', marginBottom: '14px'
                                        }}>
                                            <VacTag date={b.vac1} done={b.v1Done} label="Vac 1" />
                                            <VacTag date={b.vac2} done={b.v2Done} label="Vac 2" />
                                            <VacTag date={b.vac3} done={b.v3Done} label="Vac 3" />
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {/* RETURN TO ACTIVE */}
                                            <button
                                                onClick={() => handleReturn(b)}
                                                style={{
                                                    flex: 1,
                                                    padding: '11px 14px',
                                                    background: 'rgba(22,163,74,0.12)',
                                                    border: '1px solid rgba(22,163,74,0.35)',
                                                    color: '#16a34a',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    fontSize: '13px', fontWeight: '700',
                                                    fontFamily: 'Inter, sans-serif',
                                                }}
                                            >
                                                <RotateCcw size={15} />
                                                Return to Active
                                            </button>

                                            {/* DELETE */}
                                            <button
                                                onClick={() => handleDelete(b)}
                                                style={{
                                                    padding: '11px 16px',
                                                    background: 'rgba(255,71,87,0.08)',
                                                    border: '1px solid rgba(255,71,87,0.25)',
                                                    color: '#ff4757',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    fontSize: '13px', fontWeight: '600',
                                                    fontFamily: 'Inter, sans-serif',
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px', width: '100%' }}>
                                        <button 
                                            disabled={currentPage === 1} 
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: currentPage === 1 ? '#555' : 'var(--text-muted)' }}
                                        >
                                            PREV
                                        </button>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-gold)' }}>PAGE {currentPage} OF {totalPages}</span>
                                        <button 
                                            disabled={currentPage === totalPages} 
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: currentPage === totalPages ? '#555' : 'var(--text-muted)' }}
                                        >
                                            NEXT
                                        </button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            <div style={{ height: '20px' }} />

            {/* Portal Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmState}
                message={confirmState?.message}
                onConfirm={confirmState?.onConfirm}
                onCancel={() => setConfirmState(null)}
                confirmLabel={confirmState?.isReturn ? 'RETURN TO ACTIVE' : 'DELETE'}
                confirmColor={confirmState?.isReturn ? '#16a34a' : '#ff4757'}
            />
        </div>
    );
};

export default BatchArchive;
