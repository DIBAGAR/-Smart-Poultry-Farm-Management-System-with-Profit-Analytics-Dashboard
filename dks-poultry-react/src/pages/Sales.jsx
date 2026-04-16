import React from 'react';
import FinancialLedger from '../components/FinancialLedger';

const FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'party', label: 'Customer', required: true },
    { name: 'totalAmount', label: 'Total (₹)', type: 'number', required: true },
    { name: 'paidAmount', label: 'Paid (₹)', type: 'number', required: true },
];

const Sales = () => (
    <FinancialLedger
        collectionName="sales"
        title="SALES LOG"
        fields={FIELDS}
        color="#00d1b2"
    />
);

export default Sales;
