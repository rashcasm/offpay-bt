import { config } from './config.js';

export function validateTransaction(amount) {
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
    }
    if (amount < config.MIN_TRANSACTION) {
        throw new Error(`Amount must be at least ₹${config.MIN_TRANSACTION}`);
    }
    if (amount > config.MAX_TRANSACTION) {
        throw new Error(`Amount cannot exceed ₹${config.MAX_TRANSACTION}`);
    }
    return true;
}

export function generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatTransaction(tx) {
    return {
        ...tx,
        amount: Number(tx.amount),
        timestamp: tx.timestamp || new Date().toISOString(),
        status: tx.status || 'pending'
    };
}

export const handleDatabaseError = (error, functionName) => {
    console.error(`Database error in ${functionName}:`, error);
    throw error;
};

export async function retryOperation(operation, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
    throw lastError;
}
