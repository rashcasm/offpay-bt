export const config = {
    // Server ports
    CENTRAL_PORT: process.env.CENTRAL_PORT || 3000,
    DEVICE1_PORT: process.env.DEVICE1_PORT || 3001,
    DEVICE2_PORT: process.env.DEVICE2_PORT || 3002,
    
    // Database paths
    DB_PATH: {
        CENTRAL: 'central.db',
        DEVICE1: './device_1.db',
        DEVICE2: './device_2.db'
    },
    
    // Initial wallet balance
    INITIAL_BALANCE: 1000,
    
    // Transaction limits
    MIN_TRANSACTION: 1,
    MAX_TRANSACTION: 10000,
    
    // Sync settings
    AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
    
    // Bluetooth settings
    BLUETOOTH_SERVICE_UUID: '0000180a-0000-1000-8000-00805f9b34fb',
    BLUETOOTH_CHARACTERISTIC_UUID: '00002a56-0000-1000-8000-00805f9b34fb'
};
