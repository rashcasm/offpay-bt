import express from 'express';
import cors from 'cors';
import { initializeLocalDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize local database
let deviceId = process.env.DEVICE_ID || 'device1';
const localDb = initializeLocalDb(deviceId);

// Get local balance
app.get('/api/balance', (req, res) => {
    try {
        const wallet = localDb.prepare('SELECT * FROM wallet WHERE id = ?').get(deviceId);
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get local transactions
app.get('/api/transactions', (req, res) => {
    try {
        const transactions = localDb.prepare('SELECT * FROM offline_transactions ORDER BY timestamp DESC').all();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process local transaction (received via Bluetooth)
app.post('/api/process-transaction', (req, res) => {
    const { transaction } = req.body;
    
    const processTransaction = localDb.transaction(() => {
        // Check if sender
        if (transaction.sender_id === deviceId) {
            const wallet = localDb.prepare('SELECT balance FROM wallet WHERE id = ?').get(deviceId);
            if (wallet.balance < transaction.amount) {
                throw new Error('Insufficient balance');
            }
            // Deduct amount
            localDb.prepare('UPDATE wallet SET balance = balance - ? WHERE id = ?')
                .run(transaction.amount, deviceId);
        } else {
            // Add amount if receiver
            localDb.prepare('UPDATE wallet SET balance = balance + ? WHERE id = ?')
                .run(transaction.amount, deviceId);
        }

        // Store transaction
        localDb.prepare(`
            INSERT INTO offline_transactions 
            (id, sender_id, receiver_id, amount, timestamp, synced)
            VALUES (?, ?, ?, ?, ?, 0)
        `).run(
            transaction.id,
            transaction.sender_id,
            transaction.receiver_id,
            transaction.amount,
            transaction.timestamp
        );
    });

    try {
        processTransaction();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Try to sync with central server
app.post('/api/sync', async (req, res) => {
    try {
        // Get unsynced transactions
        const unsyncedTransactions = localDb.prepare(
            'SELECT * FROM offline_transactions WHERE synced = 0'
        ).all();

        if (unsyncedTransactions.length === 0) {
            return res.json({ message: 'No transactions to sync' });
        }

        // Try to sync with central server
        try {
            const response = await fetch('http://localhost:3000/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    transactions: unsyncedTransactions
                })
            });

            if (response.ok) {
                // Mark transactions as synced
                localDb.prepare(`
                    UPDATE offline_transactions SET synced = 1 
                    WHERE id IN (${unsyncedTransactions.map(() => '?').join(',')})
                `).run(...unsyncedTransactions.map(tx => tx.id));

                res.json({ success: true, synced: unsyncedTransactions.length });
            } else {
                throw new Error('Failed to sync with central server');
            }
        } catch (error) {
            // If central server is unreachable, just return success=false
            res.json({ success: false, error: 'Central server unreachable' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Local device server (${deviceId}) running on port ${PORT}`);
});
