import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';

const EDITABLE_KEYS = ['date', 'medicine', 'product', 'item', 'qty', 'price', 'totalAmount', 'paidAmount', 'party', 'weight'];

const EditRecord = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const coll = searchParams.get('coll');
    const navigate = useNavigate();
    const [fields, setFields] = useState([]);
    const [formData, setFormData] = useState({});
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id || !coll) return;
        (async () => {
            const snap = await getDoc(doc(db, coll, id));
            if (snap.exists()) {
                const d = snap.data();
                const existing = EDITABLE_KEYS.filter(k => d[k] !== undefined);
                setFields(existing);
                const initial = {};
                existing.forEach(k => { initial[k] = d[k]; });
                setFormData(initial);

                if (d.items && Array.isArray(d.items)) {
                    setItems(d.items);
                }
            }
            setLoading(false);
        })();
    }, [id, coll]);

    const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const updated = { ...formData };
        if (items !== null) {
            updated.items = items.map(it => ({
                ...it,
                qty: it.qty ? parseFloat(it.qty) : '',
                weight: it.weight ? parseFloat(it.weight) : ''
            }));
        }
        ['price', 'totalAmount', 'paidAmount', 'qty', 'weight'].forEach(k => {
            if (updated[k] !== undefined) updated[k] = parseFloat(updated[k]);
        });
        if (updated.totalAmount && updated.paidAmount) {
            updated.dueAmount = (updated.totalAmount - updated.paidAmount).toFixed(2);
        }
        await updateDoc(doc(db, coll, id), updated);
        setSaving(false);
        navigate(`/${coll}`);
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            Loading record...
        </div>
    );

    return (
        <div className="page-inner">
            <button
                onClick={() => navigate(-1)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '24px', fontSize: '14px', padding: '0' }}
            >
                <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                Back
            </button>

            <h1 className="section-title" style={{ marginBottom: '4px' }}>EDIT RECORD</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '24px' }}>
                Collection: <strong style={{ color: 'var(--accent-gold)' }}>{coll?.toUpperCase()}</strong>
            </p>

            <div className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <form onSubmit={handleSubmit}>
                    {fields.map(key => (
                        <div className="form-group" key={key}>
                            <label>{key.toUpperCase()}</label>
                            <input
                                type={key === 'date' ? 'date' : typeof formData[key] === 'number' ? 'number' : 'text'}
                                name={key}
                                value={formData[key] || ''}
                                onChange={handleChange}
                                step="any"
                                required
                                placeholder={key}
                            />
                        </div>
                    ))}
                    
                    {/* Items Array Edit UI */}
                    {items !== null && (
                        <div style={{ marginTop: '16px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '10px' }}>ITEMS / PRODUCTS</p>
                            {items.map((it, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input type="text" placeholder="Item Name" value={it.name || ''} onChange={e => {
                                            const newItems = [...items]; newItems[idx].name = e.target.value; setItems(newItems);
                                        }} required />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input type="number" placeholder="Qty" value={it.qty || ''} onChange={e => {
                                            const newItems = [...items]; newItems[idx].qty = e.target.value; setItems(newItems);
                                        }} step="any" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <input type="number" placeholder="Wt(kg)" value={it.weight || ''} onChange={e => {
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
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        <Save size={18} />
                        {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditRecord;
