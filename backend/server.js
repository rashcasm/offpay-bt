const express = require('express');
const cors = require('cors');
const db = require('./db');
const bluetooth = require('./bluetooth');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize user
app.post('/api/users', async (req, res) => {
    try {
        const { id } = req.body;
        await db.createUser(id);
        res.json({ message: 'User initialized' });
    } catch (error) {
        console.error('Error initializing user:', error);
        res.status(500).json({ error: 'Failed to initialize user' });
    }
});

// Get balance
app.get('/api/balance/:id', async (req, res) => {
    try {
        const balance = await db.getBalance(req.params.id);
        res.json({ balance });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

// Process transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const transaction = req.body;
        const sender = await db.getUser(transaction.sender_id);
        
        if (!sender || sender.balance < transaction.amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Update balances
        await db.updateBalance(transaction.sender_id, transaction.amount, false);
        await db.updateBalance(transaction.receiver_id, transaction.amount, true);
        
        // Record transaction
        await db.createTransaction(transaction);
        
        res.json({ message: 'Transaction processed' });
    } catch (error) {
        console.error('Error processing transaction:', error);
        res.status(500).json({ error: 'Failed to process transaction' });
    }
});

// Get transactions
app.get('/api/transactions/:id', async (req, res) => {
    try {
        const transactions = await db.getTransactions(req.params.id);
        res.json(transactions);
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Get current device ID
app.get('/device-id', (req, res) => {
    res.json({ deviceId: bluetooth.deviceId });
});

// Get balance
app.get('/balance', async (req, res) => {
    try {
        const balance = await db.getBalance(bluetooth.deviceId);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List available Bluetooth ports
app.get('/bluetooth/ports', async (req, res) => {
    try {
        const ports = await bluetooth.listPorts();
        res.json({ ports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Connect to a Bluetooth port
app.post('/bluetooth/connect', async (req, res) => {
    try {
        const { portPath } = req.body;
        await bluetooth.connect(portPath);
        res.json({ status: 'connected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Disconnect Bluetooth
app.post('/bluetooth/disconnect', (req, res) => {
    try {
        bluetooth.disconnect();
        res.json({ status: 'disconnected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send payment
app.post('/send', async (req, res) => {
    const { receiverId, amount } = req.body;
    
    try {
        await bluetooth.sendPayment(receiverId, amount);
        res.json({ status: 'payment sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transaction history
app.get('/transactions', async (req, res) => {
    try {
        const transactions = await db.getTransactions(bluetooth.deviceId);
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
