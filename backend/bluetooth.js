const { SerialPort } = require('serialport');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class BluetoothServer {
    constructor() {
        this.deviceId = uuidv4();
        this.port = null;
        this.connectedDevices = new Map();
        this.isScanning = false;
        
        // Initialize user in database
        db.createUser(this.deviceId);
    }

    async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.filter(port => port.pnpId?.includes('BTHENUM')); // Filter Bluetooth ports
        } catch (error) {
            console.error('Failed to list ports:', error);
            return [];
        }
    }

    async connect(portPath) {
        try {
            this.port = new SerialPort({
                path: portPath,
                baudRate: 9600,
                autoOpen: false
            });

            return new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) {
                        console.error('Error opening port:', err);
                        reject(err);
                        return;
                    }

                    console.log('Connected to port:', portPath);

                    this.port.on('data', (data) => {
                        this.handleData(data);
                    });

                    this.port.on('error', (err) => {
                        console.error('Port error:', err);
                    });

                    resolve(true);
                });
            });
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async handleData(data) {
        try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'PAYMENT') {
                const { amount, senderId, receiverId } = message;
                
                // Update balances
                await db.updateBalance(senderId, amount, false);
                await db.updateBalance(receiverId, amount, true);
                
                // Record transaction
                await db.createTransaction({
                    id: uuidv4(),
                    sender_id: senderId,
                    receiver_id: receiverId,
                    amount,
                    timestamp: new Date().toISOString()
                });
                
                // Send confirmation
                const confirmation = {
                    type: 'CONFIRMATION',
                    status: 'success',
                    transaction: message
                };
                
                this.sendData(confirmation);
            }
        } catch (error) {
            console.error('Failed to handle data:', error);
        }
    }

    async sendPayment(receiverId, amount) {
        if (!this.port || !this.port.isOpen) {
            throw new Error('Not connected to any device');
        }

        const transaction = {
            type: 'PAYMENT',
            amount,
            senderId: this.deviceId,
            receiverId
        };

        this.sendData(transaction);
    }

    sendData(data) {
        if (!this.port || !this.port.isOpen) {
            throw new Error('Not connected to any device');
        }

        const message = JSON.stringify(data);
        this.port.write(Buffer.from(message), (err) => {
            if (err) {
                console.error('Failed to send data:', err);
            }
        });
    }

    disconnect() {
        if (this.port && this.port.isOpen) {
            this.port.close((err) => {
                if (err) {
                    console.error('Error closing port:', err);
                } else {
                    console.log('Port closed successfully');
                }
            });
        }
    }
}

const server = new BluetoothServer();

// Handle cleanup on exit
process.on('SIGINT', () => {
    server.disconnect();
    process.exit();
});

module.exports = server;
