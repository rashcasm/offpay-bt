const { bluetooth } = require('web-bluetooth');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// Custom UUIDs for our service and characteristic
const SERVICE_UUID = '00001234-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00005678-0000-1000-8000-00805f9b34fb';

class BluetoothServer {
    constructor() {
        this.deviceId = uuidv4();
        this.connectedDevices = new Map();
        
        // Initialize user in database
        db.createUser(this.deviceId);
    }

    async requestDevice() {
        try {
            const device = await bluetooth.requestDevice({
                filters: [{ services: [SERVICE_UUID] }]
            });

            device.addEventListener('gattserverdisconnected', () => {
                console.log(`Device ${device.id} disconnected`);
                this.connectedDevices.delete(device.id);
            });

            return device;
        } catch (error) {
            console.error('Error requesting device:', error);
            throw error;
        }
    }

    async connect(device) {
        try {
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(SERVICE_UUID);
            const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

            // Set up notification handling
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleTransaction(device.id, event.target.value);
            });

            this.connectedDevices.set(device.id, {
                device,
                characteristic
            });

            console.log(`Connected to device: ${device.id}`);
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async handleTransaction(senderId, value) {
        try {
            const transaction = JSON.parse(new TextDecoder().decode(value));
            
            if (transaction.type === 'PAYMENT') {
                const { amount, receiverId } = transaction;
                
                // Update sender's balance
                await db.updateBalance(senderId, amount, false);
                // Update receiver's balance
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
                    transaction: transaction
                };
                
                const device = this.connectedDevices.get(senderId);
                if (device) {
                    const encoder = new TextEncoder();
                    await device.characteristic.writeValue(encoder.encode(JSON.stringify(confirmation)));
                }
            }
        } catch (error) {
            console.error('Failed to handle transaction:', error);
        }
    }

    async sendPayment(receiverId, amount) {
        const device = this.connectedDevices.get(receiverId);
        if (!device) {
            throw new Error('Receiver not connected');
        }

        const transaction = {
            type: 'PAYMENT',
            amount,
            senderId: this.deviceId,
            receiverId
        };

        const encoder = new TextEncoder();
        await device.characteristic.writeValue(encoder.encode(JSON.stringify(transaction)));
    }

    async disconnect(deviceId) {
        const device = this.connectedDevices.get(deviceId);
        if (device) {
            await device.device.gatt.disconnect();
            this.connectedDevices.delete(deviceId);
        }
    }

    async disconnectAll() {
        for (const [deviceId] of this.connectedDevices) {
            await this.disconnect(deviceId);
        }
    }
}

const server = new BluetoothServer();

// Handle cleanup on exit
process.on('SIGINT', async () => {
    await server.disconnectAll();
    process.exit();
});

module.exports = server;
