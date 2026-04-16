import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, ShoppingCart, Stethoscope, Wheat, ChevronRight, ChevronLeft, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dashboard = () => {
    const [totals, setTotals] = useState({ sales: 0, purchase: 0, medicine: 0, food: 0 });
    const [chartData, setChartData] = useState([]);
    const [allRawData, setAllRawData] = useState({ sales: [], purchase: [], medicine: [], food: [] });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [yearlyData, setYearlyData] = useState([]);

    // Build the yearly monthly breakdown whenever raw data or year changes
    useEffect(() => {
        const monthly = MONTHS.map((mon, i) => {
            const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
            const sum = (arr) => arr
                .filter(d => (d.date || '').startsWith(monthKey))
                .reduce((a, d) => a + Number(d.totalAmount || d.price || 0), 0);

            const s = sum(allRawData.sales);
            const p = sum(allRawData.purchase);
            const m = sum(allRawData.medicine);
            const f = sum(allRawData.food);
            const profit = s - (p + m + f);
            return { month: mon, Sales: s, Purchase: p, Medicine: m, Feed: f, Profit: profit };
        });
        setYearlyData(monthly);
    }, [allRawData, selectedYear]);

    useEffect(() => {
        const raw = { sales: [], purchase: [], medicine: [], food: [] };

        const updateTrend = () => {
            const dateMap = {};
            const add = (docs, type) => docs.forEach(d => {
                const date = d.date; if (!date) return;
                const val = Number(d.totalAmount || d.price || 0);
                if (!dateMap[date]) dateMap[date] = { date, income: 0, expense: 0 };
                if (type === 'sales') dateMap[date].income += val;
                else dateMap[date].expense += val;
            });
            add(raw.sales, 'sales');
            add(raw.purchase, 'purchase');
            add(raw.medicine, 'medicine');
            add(raw.food, 'food');
            const sorted = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
            setChartData(sorted.slice(-30));
        };

        const unsubs = ['sales', 'purchase', 'medicine', 'food'].map(col =>
            onSnapshot(collection(db, col), snap => {
                const total = snap.docs.reduce((acc, d) => acc + Number(d.data().totalAmount || d.data().price || 0), 0);
                setTotals(prev => ({ ...prev, [col]: total }));
                raw[col] = snap.docs.map(d => d.data());
                setAllRawData({ ...raw });
                updateTrend();
            })
        );
        return () => unsubs.forEach(u => u());
    }, []);

    const netProfit = totals.sales - (totals.purchase + totals.medicine + totals.food);
    const stats = [
        { name: 'Sales Revenue', value: totals.sales, icon: TrendingUp, path: '/sales', color: '#00d1b2', bg: 'rgba(0,209,178,0.1)' },
        { name: 'Purchase Cost', value: totals.purchase, icon: ShoppingCart, path: '/purchase', color: '#3498db', bg: 'rgba(52,152,219,0.1)' },
        { name: 'Medicine', value: totals.medicine, icon: Stethoscope, path: '/medicine', color: '#e67e22', bg: 'rgba(230,126,34,0.1)' },
        { name: 'Feed Cost', value: totals.food, icon: Wheat, path: '/food', color: '#9b59b6', bg: 'rgba(155,89,182,0.1)' },
    ];

    const fmt = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const fmtShort = (n) => {
        const abs = Math.abs(n);
        if (abs >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (abs >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
        return `₹${n}`;
    };

    const yearlyHasData = yearlyData.some(m => m.Sales > 0 || m.Purchase > 0 || m.Medicine > 0 || m.Feed > 0);
    const yearlyProfit = yearlyData.reduce((a, m) => a + m.Profit, 0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div style={{ background: '#111824', border: '1px solid #333', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
                <p style={{ color: 'var(--accent-gold)', fontWeight: '800', marginBottom: '6px' }}>{label}</p>
                {payload.map((p, i) => (
                    <div key={i} style={{ color: p.color, marginBottom: '2px' }}>
                        {p.name}: {fmtShort(p.value)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="page-inner">

            {/* Header */}
            <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
                <img src="/logo.jpg" alt="Logo"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--accent-gold)', objectFit: 'cover', marginBottom: '12px' }}
                    onError={e => e.target.src = 'https://via.placeholder.com/80?text=DKS'}
                />
                <h1 className="font-cinzel" style={{ fontSize: '22px', marginBottom: '4px' }}>DKS POULTRY</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '3px' }}>MANAGEMENT SYSTEM</p>
            </div>

            {/* Net Profit Card */}
            <div className="glass" style={{
                padding: '24px', borderRadius: '20px', marginBottom: '20px',
                textAlign: 'center',
                border: `1px solid rgba(${netProfit >= 0 ? '22,163,74' : '255,71,87'},0.3)`,
                background: `rgba(${netProfit >= 0 ? '22,163,74' : '255,71,87'},0.05)`,
            }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '2px', marginBottom: '12px' }}>
                    ALL-TIME NET PROFIT / LOSS
                </p>
                <h2 style={{ fontSize: '42px', fontWeight: '800', color: netProfit >= 0 ? '#16a34a' : '#ff4757', lineHeight: 1.1 }}>
                    {fmt(netProfit)}
                </h2>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                    {netProfit >= 0 ? '📈 Profitable overall' : '📉 Running at a loss'}
                </p>
            </div>

            {/* ═══ YEARLY BREAKDOWN CHART ═══ */}
            <div className="glass" style={{ borderRadius: '18px', marginBottom: '20px', overflow: 'hidden' }}>
                {/* Chart Header with Year Nav */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>YEARLY BREAKDOWN</p>
                        <p style={{ fontSize: '12px', marginTop: '2px' }}>
                            <span style={{ color: yearlyProfit >= 0 ? '#16a34a' : '#ff4757', fontWeight: '800' }}>
                                {yearlyProfit >= 0 ? '📈 ' : '📉 '}{fmtShort(yearlyProfit)}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> {yearlyProfit >= 0 ? 'Profit' : 'Loss'} in {selectedYear}</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setSelectedYear(y => y - 1)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: '800', color: 'var(--accent-gold)', fontSize: '16px', minWidth: '52px', textAlign: 'center' }}>{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)}
                            disabled={selectedYear >= new Date().getFullYear()}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: selectedYear >= new Date().getFullYear() ? '#444' : '#fff', width: '34px', height: '34px', borderRadius: '8px', cursor: selectedYear >= new Date().getFullYear() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div style={{ padding: '12px 20px 0', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Sales', color: '#00d1b2' },
                        { label: 'Purchase', color: '#3498db' },
                        { label: 'Medicine', color: '#e67e22' },
                        { label: 'Feed', color: '#9b59b6' },
                        { label: 'Profit', color: '#ffd700' },
                    ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
                            <span style={{ fontSize: '10px', color: '#aaa', fontWeight: '600' }}>{l.label}</span>
                        </div>
                    ))}
                </div>

                {yearlyHasData ? (
                    <div style={{ height: '240px', width: '100%', paddingTop: '10px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearlyData} margin={{ top: 4, right: 12, left: 4, bottom: 0 }} barCategoryGap="20%">
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={v => fmtShort(v)} tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} width={42} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
                                <Bar dataKey="Sales" stackId="a" fill="#00d1b2" radius={[0, 0, 0, 0]} maxBarSize={18} />
                                <Bar dataKey="Purchase" stackId="b" fill="#3498db" maxBarSize={18} />
                                <Bar dataKey="Medicine" stackId="b" fill="#e67e22" maxBarSize={18} />
                                <Bar dataKey="Feed" stackId="b" fill="#9b59b6" maxBarSize={18} />
                                <Bar dataKey="Profit" fill="transparent" maxBarSize={18}>
                                    {yearlyData.map((entry, index) => (
                                        <Cell key={index} fill={entry.Profit >= 0 ? 'rgba(255,215,0,0.7)' : 'rgba(255,71,87,0.7)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '28px', marginBottom: '8px' }}>📊</p>
                        <p style={{ fontSize: '13px' }}>No data for {selectedYear}</p>
                    </div>
                )}

                {/* Month summary at bottom */}
                {yearlyHasData && (
                    <div style={{ padding: '10px 20px 16px', display: 'flex', gap: '12px', overflowX: 'auto' }}>
                        {(['Sales', 'Purchase', 'Medicine', 'Feed']).map((key, i) => {
                            const colors = ['#00d1b2', '#3498db', '#e67e22', '#9b59b6'];
                            const total = yearlyData.reduce((a, m) => a + m[key], 0);
                            return (
                                <div key={key} style={{ flexShrink: 0, background: `rgba(${colors[i].slice(1).match(/../g).map(h => parseInt(h, 16)).join(',')},0.08)`, borderRadius: '10px', padding: '8px 14px', border: `1px solid ${colors[i]}30` }}>
                                    <p style={{ fontSize: '9px', color: colors[i], fontWeight: '800', letterSpacing: '1px' }}>{key.toUpperCase()}</p>
                                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{fmtShort(total)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Daily Trend Graph */}
            {chartData.length > 0 && (
                <div className="glass" style={{ padding: '20px 20px 10px 0', borderRadius: '16px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px', marginBottom: '16px', paddingLeft: '20px' }}>
                        INCOME VS EXPENSE (LAST 30 ENTRIES)
                    </p>
                    <div style={{ height: '180px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ff4757" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} minTickGap={20} />
                                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }} />
                                <Area type="monotone" name="Income" dataKey="income" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" name="Expense" dataKey="expense" stroke="#ff4757" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: '20px' }}>
                {stats.map(stat => (
                    <Link key={stat.name} to={stat.path} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <stat.icon size={18} color={stat.color} />
                            </div>
                            <ChevronRight size={14} color="var(--text-muted)" />
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '4px' }}>{stat.name.toUpperCase()}</p>
                        <p style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>{fmt(stat.value)}</p>
                    </Link>
                ))}
            </div>

            {/* Farm Status */}
            <div className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <Activity size={16} color="var(--accent-gold)" />
                    <span className="font-cinzel" style={{ fontSize: '13px', color: 'var(--accent-gold)' }}>FARM STATUS</span>
                </div>
                <div style={{ borderLeft: '3px solid var(--accent-gold)', paddingLeft: '14px' }}>
                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-main)', opacity: 0.85 }}>
                        <strong>Batch:</strong> Monitoring growth rate &amp; FCR live.<br />
                        <strong>Sync:</strong> All ledger data synced to Google Cloud.
                    </p>
                </div>
                <div style={{ marginTop: '14px', fontSize: '10px', color: 'var(--accent-gold)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', background: 'var(--accent-gold)', borderRadius: '50%' }} />
                    LIVE DATA ACTIVE
                </div>
            </div>

            <div style={{ height: '20px' }} />
        </div>
    );
};

export default Dashboard;
