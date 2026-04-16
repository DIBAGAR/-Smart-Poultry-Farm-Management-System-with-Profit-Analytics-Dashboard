import React from 'react';
import FinancialLedger from '../components/FinancialLedger';

const FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'price', label: 'Total Price (₹)', type: 'number', required: true },
];

const Medicine = () => (
    <FinancialLedger
        collectionName="medicine"
        title="MEDICINE LOG"
        fields={FIELDS}
        color="#e67e22"
    />
);

export default Medicine;
