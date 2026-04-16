import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Download, Filter, Trash2, Edit2, Plus, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';

/* ---- Toast ---- */
const showToast = (msg) => {
    const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.4s'; setTimeout(() => t.remove(), 400); }, 2500);
};

const FinancialLedger = ({ collectionName, title, fields, color }) => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchText, setSearchText] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('all');
    const [formData, setFormData] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [confirmState, setConfirmState] = useState(null);  // { message, onConfirm }
    const [items, setItems] = useState([{ name: '', qty: '', weight: '' }]);
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    const isSimple = collectionName === 'food' || collectionName === 'medicine';

    /* ---- Live data ---- */
    useEffect(() => {
        const q = query(collection(db, collectionName), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setData(items);
            setFilteredData(items);
        });
        return () => unsub();
    }, [collectionName]);

    // Ensure valid page when data changes
    useEffect(() => {
        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [filteredData, currentPage]);

    /* ---- Add record ---- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const entry = { ...formData, items, createdAt: Date.now() };
        if (entry.totalAmount && entry.paidAmount) {
            entry.dueAmount = (parseFloat(entry.totalAmount) - parseFloat(entry.paidAmount)).toFixed(2);
        }
        await addDoc(collection(db, collectionName), entry);
        e.target.reset();
        setFormData({});
        setItems([{ name: '', qty: '', weight: '' }]);
        setShowForm(false);
        showToast('✅ Record saved!');
    };

    /* ---- Filter ---- */
    const handleFilter = () => {
        let fd = [...data];
        
        // Date check
        if ((fromDate && !toDate) || (!fromDate && toDate)) {
            showToast('⚠️ Select both dates or clear them'); 
            return;
        }
        if (fromDate && toDate) {
            fd = fd.filter(d => d.date >= fromDate && d.date <= toDate);
        }

        // Text check
        if (searchText) {
            const lower = searchText.toLowerCase();
            fd = fd.filter(d => {
                const label = getLabel(d).toLowerCase();
                const party = (d.party || '').toLowerCase();
                return label.includes(lower) || party.includes(lower);
            });
        }

        // Due check
        if (!isSimple && paymentStatus !== 'all') {
            fd = fd.filter(d => {
                const total = parseFloat(d.price || d.totalAmount || 0);
                const paid = parseFloat(d.paidAmount || 0);
                const due = total - paid;
                if (paymentStatus === 'due') return due > 0;
                if (paymentStatus === 'paid') return due <= 0;
                return true;
            });
        }

        setFilteredData(fd);
        setCurrentPage(1);
        setShowFilter(false);
    };
    
    const resetFilter = () => { 
        setFromDate(''); setToDate(''); setSearchText(''); setPaymentStatus('all'); setFilteredData(data); setShowFilter(false); setCurrentPage(1); 
    };

    /* ---- Delete (portal confirm) ---- */
    const handleDelete = (id, label) => {
        setConfirmState({
            message: `Delete "${label}"? This record will be permanently removed.`,
            onConfirm: async () => {
                await deleteDoc(doc(db, collectionName, id));
                setConfirmState(null);
                showToast('🗑️ Record deleted');
            }
        });
    };

    /* ---- Excel Export ---- */
    const exportToExcel = () => {
        const rows = filteredData.map((item, i) => {
            const total = parseFloat(item.price || item.totalAmount || 0);
            const paid = parseFloat(item.paidAmount || 0);
            
            const itemsStr = item.items && item.items.length > 0 
                ? item.items.map(it => `${it.name} (Qty:${it.qty || 0}, Wt:${it.weight || 0}kg)`).join(' | ')
                : item.medicine || item.product || item.item || '---';

            const row = { '#': i + 1, Date: item.date, Item: itemsStr, Total: `₹${total.toFixed(2)}` };
            
            if (!item.items && item.qty !== undefined) row.Qty = item.qty;
            if (!item.items && item.weight !== undefined) row.Weight = item.weight;
            if (item.party !== undefined) row.Party = item.party;
            if (!isSimple) { row.Paid = `₹${paid.toFixed(2)}`; row.Due = `₹${(total - paid).toFixed(2)}`; }
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${collectionName}_Report.xlsx`);
    };

    /* ---- Totals (live — exact original logic) ---- */
    let tPrice = 0, tDue = 0;
    filteredData.forEach(d => {
        const total = parseFloat(d.price || d.totalAmount || 0);
        tPrice += total;
        if (!isSimple) tDue += (total - parseFloat(d.paidAmount || 0));
    });

    const fmt = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const getLabel = (item) => {
        if (item.items && item.items.length > 0) {
            return item.items[0].name + (item.items.length > 1 ? ` & ${item.items.length - 1} more` : '');
        }
        return item.medicine || item.product || item.item || '---';
    };

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
    const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="page-inner">

            {/* Header */}
            <div className="section-header">
                <h1 className="section-title" style={{ color: color || 'var(--accent-gold)', fontSize: '20px' }}>{title}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowFilter(f => !f)} className="btn btn-outline" style={{ padding: '10px 14px' }}>
                        <Filter size={15} />
                    </button>
                    <button onClick={exportToExcel} className="btn btn-outline" style={{ padding: '10px 14px' }}>
                        <Download size={15} />
                    </button>
                    <button onClick={() => setShowForm(f => !f)} className="btn btn-primary" style={{ padding: '10px 14px', background: color }}>
                        {showForm ? <X size={15} /> : <Plus size={15} />}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                <div className="glass" style={{ padding: '16px 20px', borderRadius: '14px', minWidth: '160px', flexShrink: 0 }}>
                    <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: '700', letterSpacing: '1px' }}>TOTAL</p>
                    <p style={{ fontSize: '22px', fontWeight: '800', color: color || 'var(--accent-gold)' }}>{fmt(tPrice)}</p>
                </div>
                {!isSimple && (
                    <div className="glass" style={{ padding: '16px 20px', borderRadius: '14px', minWidth: '160px', flexShrink: 0, borderLeft: '3px solid #ff4757' }}>
                        <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: '700', letterSpacing: '1px' }}>TOTAL DUE</p>
                        <p style={{ fontSize: '22px', fontWeight: '800', color: '#ff4757' }}>{fmt(tDue)}</p>
                    </div>
                )}
            </div>

            {/* Filter Panel */}
            {showFilter && (
                <div className="glass animate-fade" style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Search (Item / Customer)</label>
                        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Type name..." />
                    </div>
                    {!isSimple && (
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label>Payment Status</label>
                            <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={{ width: '100%' }}>
                                <option value="all">All (Paid & Due)</option>
                                <option value="paid">Fully Paid Only</option>
                                <option value="due">Unpaid / Due Only</option>
                            </select>
                        </div>
                    )}
                    <div className="form-grid" style={{ marginBottom: '12px' }}>
                        <div className="form-group"><label>From Date</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
                        <div className="form-group"><label>To Date</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleFilter} className="btn btn-primary" style={{ flex: 1 }}>APPLY FILTERS</button>
                        <button onClick={resetFilter} className="btn btn-outline" style={{ flex: 1 }}>RESET</button>
                    </div>
                </div>
            )}

            {/* Add Form */}
            {showForm && (
                <div className="glass animate-fade" style={{ padding: '20px', borderRadius: '16px', marginBottom: '16px', border: `1px solid ${color}44` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px', color: color }}>NEW ENTRY</span>
                        <X size={18} color="var(--text-muted)" onClick={() => setShowForm(false)} style={{ cursor: 'pointer' }} />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            {fields.map(field => (
                                <div className="form-group" key={field.name}>
                                    <label>{field.label}</label>
                                    <input type={field.type || 'text'} name={field.name} placeholder={field.label}
                                        onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))}
                                        required={field.required} step="any" />
                                </div>
                            ))}
                        </div>

                        {/* Dynamic Items Array */}
                        <div style={{ marginTop: '16px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '10px' }}>ITEMS / PRODUCTS</p>
                            {items.map((it, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input type="text" placeholder="Item Name" value={it.name} onChange={e => {
                                            const newItems = [...items]; newItems[idx].name = e.target.value; setItems(newItems);
                                        }} required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input type="number" placeholder="Qty" value={it.qty} onChange={e => {
                                            const newItems = [...items]; newItems[idx].qty = e.target.value; setItems(newItems);
                                        }} step="any" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input type="number" placeholder="Wt(kg)" value={it.weight} onChange={e => {
                                            const newItems = [...items]; newItems[idx].weight = e.target.value; setItems(newItems);
                                        }} step="any" />
                                    </div>
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                            style={{ background: 'rgba(255,71,87,0.1)', border: 'none', color: '#ff4757', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => setItems([...items, { name: '', qty: '', weight: '' }])}
                                className="btn btn-outline" style={{ width: '100%', fontSize: '12px', marginTop: '6px', borderStyle: 'dashed' }}>
                                + ADD ANOTHER ITEM
                            </button>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', background: color || 'var(--accent-gold)' }}>
                            SAVE RECORD
                        </button>
                    </form>
                </div>
            )}

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600' }}>{filteredData.length} RECORDS</p>

            {/* Record Cards */}
            <div className="data-cards">
                {paginatedData.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '32px', marginBottom: '12px' }}>📋</p>
                        <p>No records. Tap <strong style={{ color: 'var(--accent-gold)' }}>+</strong> to add one.</p>
                    </div>
                )}

                {paginatedData.map((item) => {
                    const total = parseFloat(item.price || item.totalAmount || 0);
                    const paid = parseFloat(item.paidAmount || 0);
                    const due = total - paid;
                    const label = getLabel(item);
                    const hasDue = !isSimple && due > 0;

                    return (
                        <div key={item.id} className="data-card" style={{
                            borderLeft: hasDue ? '3px solid #ff4757' : `3px solid ${color || 'transparent'}`,
                            background: hasDue ? 'rgba(255,71,87,0.05)' : ''
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                                    {/* For Sales/Purchase: headline is customer name. For Food/Medicine: headline is item name */}
                                    <p style={{ fontWeight: '800', fontSize: '17px', marginBottom: '4px', color: isSimple ? '#fff' : (item.party ? '#a29bfe' : 'var(--text-muted)') }}>
                                        {isSimple ? label : (item.party || 'Unknown Customer')}
                                    </p>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>{item.date}</p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p style={{ fontWeight: '800', fontSize: '17px', color: color || 'var(--accent-gold)' }}>₹{total.toFixed(2)}</p>
                                    {!isSimple && due > 0 && (
                                        <p style={{ fontSize: '12px', color: '#ff4757', fontWeight: '700' }}>Due: ₹{due.toFixed(2)}</p>
                                    )}
                                </div>
                            </div>

                            {/* Inner Items List (Handles both new array format and legacy single items) */}
                            {(() => {
                                const renderItems = item.items && item.items.length > 0 
                                    ? item.items 
                                    : (item.medicine || item.product || item.item || item.qty || item.weight) 
                                        ? [{ name: item.medicine || item.product || item.item || 'Standard Item', qty: item.qty, weight: item.weight }]
                                        : [];

                                if (renderItems.length === 0) return null;

                                return (
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '12px', 
                                        padding: '10px 14px', 
                                        marginBottom: '14px' 
                                    }}>
                                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1.5px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                            {isSimple ? 'DETAILS' : 'PRODUCTS INCLUDED'}
                                        </p>
                                        {renderItems.map((it, idx) => (
                                            <div key={idx} style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                padding: '8px 0',
                                                borderBottom: idx === renderItems.length - 1 ? 'none' : '1px dashed rgba(255,255,255,0.05)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color || 'var(--accent-gold)' }} />
                                                    <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{it.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    {it.qty && (
                                                        <span style={{ 
                                                            background: 'rgba(255,255,255,0.08)', 
                                                            color: '#e2e8f0', 
                                                            fontSize: '11px', 
                                                            padding: '3px 8px', 
                                                            borderRadius: '6px',
                                                            fontWeight: '600'
                                                        }}>Qty: {it.qty}</span>
                                                    )}
                                                    {it.weight && (
                                                        <span style={{ 
                                                            background: 'rgba(255,255,255,0.08)', 
                                                            color: '#e2e8f0', 
                                                            fontSize: '11px', 
                                                            padding: '3px 8px', 
                                                            borderRadius: '6px',
                                                            fontWeight: '600'
                                                        }}>{it.weight} kg</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Tags for old records or extra info */}
                            {!isSimple && paid > 0 && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '11px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>Paid: ₹{paid.toFixed(2)}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => navigate(`/edit?id=${item.id}&coll=${collectionName}`)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}
                                >
                                    <Edit2 size={13} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id, label)}
                                    style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: '#ff4757', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
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

            <div style={{ height: '20px' }} />

            {/* Portal Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmState}
                message={confirmState?.message}
                onConfirm={confirmState?.onConfirm}
                onCancel={() => setConfirmState(null)}
            />
        </div>
    );
};

export default FinancialLedger;
