import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Archive, ShoppingCart, Wrench, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

/* ---------- helpers ---------- */
const addDays = (d, i) => { const r = new Date(d); r.setDate(r.getDate() + i); return r.toISOString().split('T')[0]; };
const today = () => new Date().toISOString().split('T')[0];

const showToast = (msg) => {
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.4s'; setTimeout(() => t.remove(), 400); }, 2500);
};

/* --------- BOTTOM SHEET --------- */
const Sheet = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div className="portal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="portal-sheet animate-fade">
                <div className="portal-handle" />
                <div className="portal-header">
                    <span>{title}</span>
                    <X size={20} onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
                </div>
                <div className="portal-body">{children}</div>
            </div>
        </div>
    );
};

/* --------- INPUT --------- */
const Field = ({ label, ...props }) => (
    <div className="form-group">
        <label>{label}</label>
        <input {...props} placeholder={label} />
    </div>
);

/* ========== MAIN COMPONENT ========== */
const ChicksLog = () => {
    const [batches, setBatches] = useState([]);
    const [males, setMales] = useState([]);
    const [females, setFemales] = useState([]);

    // Sheets
    const [newBatch, setNewBatch] = useState({ hatchDate: '', cockName: '', henName: '', count: '' });
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [buyBackSheet, setBuyBackSheet] = useState(null);
    const [jobWorkSheet, setJobWorkSheet] = useState(null);
    const [breederSheet, setBreederSheet] = useState(null);
    const [bbRecords, setBbRecords] = useState([]);
    const [jwData, setJwData] = useState(null);
    const [jwId, setJwId] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm }

    /* live data */
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    useEffect(() => {
        const u1 = onSnapshot(query(collection(db, 'chicks'), orderBy('hatchDate', 'desc')),
            s => setBatches(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const u2 = onSnapshot(collection(db, 'parents_male'), s => setMales(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const u3 = onSnapshot(collection(db, 'parents_female'), s => setFemales(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { u1(); u2(); u3(); };
    }, []);

    // Ensure valid page when data changes
    useEffect(() => {
        const totalPages = Math.ceil(batches.length / ITEMS_PER_PAGE) || 1;
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [batches, currentPage]);

    /* ---- Launch batch ---- */
    const launchBatch = async (e) => {
        e.preventDefault();
        const { hatchDate, cockName, henName, count } = newBatch;
        await addDoc(collection(db, 'chicks'), {
            hatchDate, cock: cockName, hen: henName, count: Number(count),
            vac1: addDays(hatchDate, 7), v1Done: false,
            vac2: addDays(hatchDate, 14), v2Done: false,
            vac3: addDays(hatchDate, 21), v3Done: false,
            buyBackIds: [], jobWorkId: null, createdAt: new Date().toISOString()
        });
        setNewBatch({ hatchDate: '', cockName: '', henName: '', count: '' });
        setShowBatchForm(false);
        showToast('✅ Batch launched!');
    };

    /* ---- Toggle vac ---- */
    // Desktop: onDoubleClick fires once after browser detects two clicks → toggle directly
    const toggleVac = (batchId, n, cur) => {
        const u = {}; u[`v${n}Done`] = !cur;
        updateDoc(doc(db, 'chicks', batchId), u);
        showToast(!cur ? '✅ Vaccine marked done' : '🔄 Reset');
    };

    // Mobile: onTouchEnd fires on every tap → use timing trick to detect double-tap
    const lastTap = useRef({});
    const handleVacTap = (batchId, n, cur) => {
        const now = Date.now();
        const key = `${batchId}-${n}`;
        if (now - (lastTap.current[key] || 0) < 350) {
            toggleVac(batchId, n, cur);
        }
        lastTap.current[key] = now;
    };

    /* ---- Archive / Delete ---- */
    const archiveBatch = (id, data) => {
        setConfirmAction({
            message: 'Move this batch to archive?',
            onConfirm: async () => {
                const { id: _, ...rest } = data;
                await addDoc(collection(db, 'chicks_backup'), rest);
                await deleteDoc(doc(db, 'chicks', id));
                setConfirmAction(null);
                showToast('📁 Archived');
            }
        });
    };
    const deleteBatch = (id) => {
        setConfirmAction({
            message: 'Permanently delete this batch? This cannot be undone.',
            onConfirm: async () => {
                await deleteDoc(doc(db, 'chicks', id));
                setConfirmAction(null);
                showToast('🗑️ Deleted');
            }
        });
    };

    /* ---- Add parent (photo) ---- */
    const [pendingParent, setPendingParent] = useState(null); // { gender, imgData }
    const [parentNameInput, setParentNameInput] = useState('');

    const addParent = (gender) => {
        const fi = document.createElement('input');
        fi.type = 'file'; fi.accept = 'image/*';
        fi.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setPendingParent({ gender, imgData: reader.result });
                setParentNameInput('');
            };
        };
        fi.click();
    };

    const saveParent = async () => {
        if (!parentNameInput.trim() || !pendingParent) return;
        const col = pendingParent.gender === 'male' ? 'parents_male' : 'parents_female';
        await addDoc(collection(db, col), { name: parentNameInput.trim(), imgData: pendingParent.imgData });
        setPendingParent(null);
        setParentNameInput('');
        showToast('✅ Breeder saved!');
    };

    /* ---- Open breeder info ---- */
    const openBreeder = (id, name, img, gender) => setBreederSheet({ id, name, img, gender });
    const deleteBreeder = () => {
        setConfirmAction({
            message: `Remove ${breederSheet.name} from breeders?`,
            onConfirm: async () => {
                const col = breederSheet.gender === 'male' ? 'parents_male' : 'parents_female';
                await deleteDoc(doc(db, col, breederSheet.id));
                setBreederSheet(null);
                setConfirmAction(null);
                showToast('🗑️ Removed');
            }
        });
    };

    /* ---- Buy Back ---- */
    const openBuyBack = async (batchId) => {
        setBuyBackSheet(batchId);
        const snap = await getDoc(doc(db, 'chicks', batchId));
        const ids = snap.data().buyBackIds || [];
        const records = [];
        for (const id of ids) {
            const s = await getDoc(doc(db, 'purchase', id));
            if (s.exists()) records.push({ id, ...s.data() });
        }
        setBbRecords(records);
    };

    const saveBuyBack = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            batchId: buyBackSheet,
            date: fd.get('date'), 
            items: [{ name: fd.get('product'), qty: fd.get('qty'), weight: fd.get('weight') }],
            party: fd.get('party'),
            totalAmount: Number(fd.get('total')), paidAmount: Number(fd.get('paid'))
        };
        const ref = await addDoc(collection(db, 'purchase'), payload);
        const pS = await getDoc(doc(db, 'chicks', buyBackSheet));
        const ids = [...(pS.data().buyBackIds || []), ref.id];
        await updateDoc(doc(db, 'chicks', buyBackSheet), { buyBackIds: ids });
        e.target.reset(); showToast('✅ Recorded');
        openBuyBack(buyBackSheet);
    };

    /* ---- Job Work ---- */
    const openJobWork = async (batchId) => {
        const snap = await getDoc(doc(db, 'chicks', batchId));
        const p = snap.data();
        if (p.jobWorkId) {
            const s = await getDoc(doc(db, 'sales', p.jobWorkId));
            if (s.exists()) { setJwData(s.data()); setJwId(p.jobWorkId); }
        } else { setJwData(null); setJwId(null); }
        setJobWorkSheet(batchId);
    };

    const saveJobWork = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            batchId: jobWorkSheet,
            date: fd.get('date'), 
            items: [{ name: fd.get('product'), qty: fd.get('qty'), weight: fd.get('weight') }],
            party: fd.get('party'),
            totalAmount: Number(fd.get('total')), paidAmount: Number(fd.get('paid'))
        };
        if (jwId) { await updateDoc(doc(db, 'sales', jwId), payload); }
        else {
            const ref = await addDoc(collection(db, 'sales'), payload);
            await updateDoc(doc(db, 'chicks', jobWorkSheet), { jobWorkId: ref.id });
        }
        setJobWorkSheet(null); showToast('✅ Synced to Sales');
    };

    /* ---- Vac badge ---- */
    const VacBadge = ({ batchId, date, done, n }) => {
        const t = today();
        const bg = done ? '#16a34a' : date < t ? '#ff4757' : date === t ? '#3498db' : '#f39c12';
        const label = done ? '✓' : date === t ? 'TODAY' : date < t ? 'LATE' : 'PENDING';
        return (
            <button
                className="vac-btn"
                onDoubleClick={() => toggleVac(batchId, n, done)}
                onTouchEnd={() => handleVacTap(batchId, n, done)}
                style={{ background: bg, color: 'white' }}
                title={`Double-tap to toggle Vac ${n}`}
            >
                {label}
            </button>
        );
    };

    /* ============================
       RENDER
    ============================ */
    return (
        <div className="page-inner">
            {/* Header */}
            <div className="section-header">
                <h1 className="section-title">CHICKS LOG</h1>
                <button className="btn btn-primary" style={{ padding: '10px 16px' }} onClick={() => setShowBatchForm(true)}>
                    <Plus size={18} />
                </button>
            </div>

            {/* === BREEDERS === */}
            <div className="glass" style={{ padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', color: '#ff6b6b', fontWeight: '800', letterSpacing: '1.5px', marginBottom: '12px' }}>MALES (COCKS)</p>
                <div className="breeder-row">
                    <div>
                        <button className="breeder-add" onClick={() => addParent('male')}>+</button>
                        <p className="breeder-name">Add</p>
                    </div>
                    {males.map(m => (
                        <div key={m.id} className="breeder-item">
                            <div className="breeder-avatar" onDoubleClick={() => openBreeder(m.id, m.name, m.imgData, 'male')}
                                onTouchEnd={(e) => {
                                    const now = Date.now();
                                    if (now - (e.currentTarget._lt || 0) < 350) openBreeder(m.id, m.name, m.imgData, 'male');
                                    e.currentTarget._lt = now;
                                }}>
                                <img src={m.imgData} alt={m.name} />
                            </div>
                            <p className="breeder-name">{m.name}</p>
                        </div>
                    ))}
                </div>

                <p style={{ fontSize: '10px', color: '#a29bfe', fontWeight: '800', letterSpacing: '1.5px', margin: '18px 0 12px' }}>FEMALES (HENS)</p>
                <div className="breeder-row">
                    <div>
                        <button className="breeder-add" onClick={() => addParent('female')}>+</button>
                        <p className="breeder-name">Add</p>
                    </div>
                    {females.map(f => (
                        <div key={f.id} className="breeder-item">
                            <div className="breeder-avatar" onDoubleClick={() => openBreeder(f.id, f.name, f.imgData, 'female')}
                                onTouchEnd={(e) => {
                                    const now = Date.now();
                                    if (now - (e.currentTarget._lt || 0) < 350) openBreeder(f.id, f.name, f.imgData, 'female');
                                    e.currentTarget._lt = now;
                                }}>
                                <img src={f.imgData} alt={f.name} />
                            </div>
                            <p className="breeder-name">{f.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* === BATCH CARDS === */}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '12px', letterSpacing: '1px' }}>
                {batches.length} ACTIVE BATCHES
            </p>

            {batches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '40px', marginBottom: '12px' }}>🐣</p>
                    <p>No batches yet. Tap <strong>+</strong> to launch one.</p>
                </div>
            )}

            <div className="data-cards">
                {(() => {
                    const totalPages = Math.ceil(batches.length / ITEMS_PER_PAGE) || 1;
                    const paginatedBatches = batches.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                    return (
                        <>
                            {paginatedBatches.map(b => {
                                const t = today();
                                const hasLateVac = (!b.v1Done && b.vac1 < t) || (!b.v2Done && b.vac2 < t) || (!b.v3Done && b.vac3 < t);
                                const hasTodayVac = (!b.v1Done && b.vac1 === t) || (!b.v2Done && b.vac2 === t) || (!b.v3Done && b.vac3 === t);
                                return (
                                    <div key={b.id} className="data-card" style={{ borderLeft: `3px solid ${hasLateVac ? '#ff4757' : hasTodayVac ? '#3498db' : '#16a34a'}` }}>
                                        {/* Batch Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '800', fontSize: '16px', marginBottom: '2px' }}>
                                                    🐓 {b.cock} × {b.hen}
                                                </p>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Hatched: {b.hatchDate} &nbsp;|&nbsp; <strong style={{ color: '#fff' }}>{b.count}</strong> chicks
                                                </p>
                                            </div>
                                            {hasLateVac && <span style={{ fontSize: '10px', background: '#ff475720', color: '#ff4757', padding: '4px 8px', borderRadius: '20px', fontWeight: '700' }}>OVERDUE</span>}
                                            {hasTodayVac && !hasLateVac && <span style={{ fontSize: '10px', background: '#3498db20', color: '#3498db', padding: '4px 8px', borderRadius: '20px', fontWeight: '700' }}>TODAY 📩</span>}
                                        </div>

                                        {/* Vaccines Row */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginRight: '4px' }}>VACCINES:</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{b.vac1}</span>
                                                <VacBadge batchId={b.id} date={b.vac1} done={b.v1Done} n={1} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{b.vac2}</span>
                                                <VacBadge batchId={b.id} date={b.vac2} done={b.v2Done} n={2} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{b.vac3}</span>
                                                <VacBadge batchId={b.id} date={b.vac3} done={b.v3Done} n={3} />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => openBuyBack(b.id)} className="btn btn-outline" style={{ flex: 1, minWidth: '80px', padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', borderColor: b.buyBackIds?.length ? 'var(--accent-gold)' : '#333', color: b.buyBackIds?.length ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                                <ShoppingCart size={13} /> Buy Back
                                            </button>
                                            <button onClick={() => openJobWork(b.id)} className="btn btn-outline" style={{ flex: 1, minWidth: '80px', padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', borderColor: b.jobWorkId ? 'var(--accent-gold)' : '#333', color: b.jobWorkId ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                                                <Wrench size={13} /> Job Work
                                            </button>
                                            <button onClick={() => archiveBatch(b.id, b)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid #333', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                                                <Archive size={14} />
                                            </button>
                                            <button onClick={() => deleteBatch(b.id)} style={{ padding: '8px 12px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#ff4757', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            
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

            {/* === SHEET: NEW BATCH === */}
            <Sheet open={showBatchForm} onClose={() => setShowBatchForm(false)} title="LAUNCH NEW BATCH">
                <form onSubmit={launchBatch}>
                    <Field label="Hatch Date" type="date" value={newBatch.hatchDate} onChange={e => setNewBatch(p => ({ ...p, hatchDate: e.target.value }))} required />
                    <div className="form-group">
                        <label>Cock (Male)</label>
                        <select value={newBatch.cockName} onChange={e => setNewBatch(p => ({ ...p, cockName: e.target.value }))} required>
                            <option value="">Select Cock</option>
                            {males.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Hen (Female)</label>
                        <select value={newBatch.henName} onChange={e => setNewBatch(p => ({ ...p, henName: e.target.value }))} required>
                            <option value="">Select Hen</option>
                            {females.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                        </select>
                    </div>
                    <Field label="Chick Count" type="number" value={newBatch.count} onChange={e => setNewBatch(p => ({ ...p, count: e.target.value }))} required />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>🚀 LAUNCH BATCH</button>
                </form>
            </Sheet>

            {/* === SHEET: BREEDER INFO === */}
            <Sheet open={!!breederSheet} onClose={() => setBreederSheet(null)} title="BREEDER INFO">
                {breederSheet && (
                    <div style={{ textAlign: 'center' }}>
                        <img src={breederSheet.img} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)', marginBottom: '16px' }} />
                        <p style={{ fontWeight: '800', fontSize: '18px', marginBottom: '20px' }}>{breederSheet.name}</p>
                        <button onClick={deleteBreeder} className="btn" style={{ width: '100%', background: 'rgba(255,71,87,0.1)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.2)' }}>
                            <Trash2 size={16} style={{ marginRight: '8px' }} /> REMOVE BREEDER
                        </button>
                    </div>
                )}
            </Sheet>

            {/* === SHEET: BUY BACK === */}
            <Sheet open={!!buyBackSheet} onClose={() => { setBuyBackSheet(null); setBbRecords([]); }} title="BUY BACK LEDGER">
                {/* existing records */}
                {bbRecords.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        {bbRecords.map(r => (
                            <div key={r.id} className="data-card" style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontWeight: '700' }}>{r.items && r.items[0] ? r.items[0].name : r.product}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.date} — {r.party}</p>
                                        <p style={{ fontSize: '12px' }}>{r.items && r.items[0] ? r.items[0].weight : r.weight}kg</p>
                                    </div>
                                    <p style={{ fontWeight: '800', color: 'var(--accent-gold)' }}>₹{r.totalAmount}</p>
                                </div>
                            </div>
                        ))}
                        <hr style={{ borderColor: '#222', margin: '16px 0' }} />
                    </div>
                )}
                <p style={{ color: 'var(--accent-gold)', fontWeight: '700', marginBottom: '12px', fontSize: '13px' }}>ADD PURCHASE RECORD</p>
                <form onSubmit={saveBuyBack}>
                    <Field label="Date" name="date" type="date" defaultValue={today()} required />
                    <Field label="Product" name="product" required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Field label="Qty" name="qty" type="number" />
                        <Field label="Weight (kg)" name="weight" type="number" />
                    </div>
                    <Field label="Supplier" name="party" required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Field label="Total ₹" name="total" type="number" required />
                        <Field label="Paid ₹" name="paid" type="number" required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>SAVE TO PURCHASE LOG</button>
                </form>
            </Sheet>

            {/* === SHEET: JOB WORK === */}
            <Sheet open={!!jobWorkSheet} onClose={() => setJobWorkSheet(null)} title="JOB WORK / SALES SYNC">
                <form onSubmit={saveJobWork} key={jobWorkSheet}>
                    <Field label="Date" name="date" type="date" defaultValue={jwData?.date || today()} required />
                    <Field label="Product" name="product" defaultValue={jwData?.items?.[0]?.name || jwData?.product || ''} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Field label="Qty" name="qty" type="number" defaultValue={jwData?.items?.[0]?.qty || jwData?.qty || ''} />
                        <Field label="Weight (kg)" name="weight" type="number" defaultValue={jwData?.items?.[0]?.weight || jwData?.weight || ''} />
                    </div>
                    <Field label="Customer" name="party" defaultValue={jwData?.party || ''} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Field label="Total ₹" name="total" type="number" defaultValue={jwData?.totalAmount || ''} required />
                        <Field label="Paid ₹" name="paid" type="number" defaultValue={jwData?.paidAmount || ''} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                        {jwId ? 'UPDATE & SYNC' : 'SAVE & SYNC TO SALES'}
                    </button>
                </form>
            </Sheet>

            {/* === SHEET: ADD PARENT NAME (replaces window.prompt) === */}
            <Sheet open={!!pendingParent} onClose={() => setPendingParent(null)} title="NAME THIS BREEDER">
                {pendingParent && (
                    <div style={{ textAlign: 'center' }}>
                        <img src={pendingParent.imgData} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-gold)', marginBottom: '16px' }} />
                        <div className="form-group">
                            <label>Unique Name</label>
                            <input
                                type="text"
                                value={parentNameInput}
                                onChange={e => setParentNameInput(e.target.value)}
                                placeholder={`Enter ${pendingParent.gender === 'male' ? 'cock' : 'hen'} name`}
                                autoFocus
                            />
                        </div>
                        <button onClick={saveParent} className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                            SAVE BREEDER
                        </button>
                    </div>
                )}
            </Sheet>

            {/* === PORTAL CONFIRM MODAL === */}
            <ConfirmModal
                isOpen={!!confirmAction}
                message={confirmAction?.message}
                onConfirm={confirmAction?.onConfirm}
                onCancel={() => setConfirmAction(null)}
            />

            <div style={{ height: '20px' }} />
        </div>
    );
};

export default ChicksLog;
