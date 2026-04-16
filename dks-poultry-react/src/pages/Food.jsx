import React from 'react';
import FinancialLedger from '../components/FinancialLedger';

const FIELDS = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'price', label: 'Total Price (₹)', type: 'number', required: true },
];

const Food = () => (
    <FinancialLedger
        collectionName="food"
        title="FEED LOG"
        fields={FIELDS}
        color="#9b59b6"
    />
);

export default Food;
