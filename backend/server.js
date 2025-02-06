const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store connected devices
const connectedDevices = new Map();
const deviceId = uuidv4(); // Current device ID

console.log('Current Device ID:', deviceId);

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Device connected');

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'REGISTER':
                    // Register the device
                    connectedDevices.set(message.deviceId, ws);
                    ws.deviceId = message.deviceId;
                    console.log('Device registered:', message.deviceId);
                    
                    // Initialize user if needed
                    await db.createUser(message.deviceId);
                    
                    ws.send(JSON.stringify({
                        type: 'REGISTERED',
                        status: 'success'
                    }));
                    break;

                case 'PAYMENT':
                    const { senderId, receiverId, amount } = message;
                    const sender = await db.getUser(senderId);
                    
                    if (!sender || sender.balance < amount) {
                        ws.send(JSON.stringify({
                            type: 'PAYMENT_RESPONSE',
                            status: 'error',
                            error: 'Insufficient balance'
                        }));
                        return;
                    }

                    // Update balances
                    await db.updateBalance(senderId, amount, false); // Deduct from sender
                    await db.updateBalance(receiverId, amount, true); // Add to receiver

                    // Record transaction
                    const transactionId = uuidv4();
                    await db.createTransaction({
                        id: transactionId,
                        sender_id: senderId,
                        receiver_id: receiverId,
                        amount: amount,
                        timestamp: new Date().toISOString()
                    });

                    // Notify both sender and receiver
                    ws.send(JSON.stringify({
                        type: 'PAYMENT_RESPONSE',
                        status: 'success',
                        transactionId
                    }));

                    const receiverWs = connectedDevices.get(receiverId);
                    if (receiverWs) {
                        receiverWs.send(JSON.stringify({
                            type: 'PAYMENT_RECEIVED',
                            senderId,
                            amount,
                            transactionId
                        }));
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                error: error.message
            }));
        }
    });

    ws.on('close', () => {
        if (ws.deviceId) {
            connectedDevices.delete(ws.deviceId);
            console.log('Device disconnected:', ws.deviceId);
        }
    });
});

// REST API endpoints
app.get('/device-id', (req, res) => {
    res.json({ deviceId });
});

app.get('/balance', async (req, res) => {
    try {
        const balance = await db.getBalance(deviceId);
        res.json({ balance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/transactions', async (req, res) => {
    try {
        const transactions = await db.getTransactions(deviceId);
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/connected-devices', (req, res) => {
    const devices = Array.from(connectedDevices.keys()).filter(id => id !== deviceId);
    res.json({ devices });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
