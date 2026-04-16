import React from 'react';
import FinancialLedger from '../components/FinancialLedger';

const FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'party', label: 'Supplier', required: true },
    { name: 'totalAmount', label: 'Total (₹)', type: 'number', required: true },
    { name: 'paidAmount', label: 'Paid (₹)', type: 'number', required: true },
];

const Purchase = () => (
    <FinancialLedger
        collectionName="purchase"
        title="PURCHASE LOG"
        fields={FIELDS}
        color="#3498db"
    />
);

export default Purchase;
