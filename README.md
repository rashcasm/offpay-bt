# Offline UPI Transaction App

A Bluetooth-enabled offline UPI transaction app that allows money transfers between devices without internet connectivity.

## System Architecture

The system consists of three components:
1. **Device 1 (Sender)**: React frontend + Local SQLite DB running on port 3001
2. **Device 2 (Receiver)**: React frontend + Local SQLite DB running on port 3002
3. **Device 3 (Central Server)**: Express backend + Central SQLite DB running on port 3000

## Transaction Flow

```
┌─────────────┐                  ┌─────────────┐
│  Device 1   │                  │  Device 2   │
│  (Sender)   │◄──Bluetooth──►│  (Receiver) │
│  Port 3001  │                  │  Port 3002  │
└──────┬──────┘                  └──────┬──────┘
       │                                │
       │                                │
┌──────▼──────┐                  ┌──────▼──────┐
│   Local DB   │                  │   Local DB   │
│(device_1.db) │                  │(device_2.db) │
└──────┬──────┘                  └──────┬──────┘
       │                                │
       │         ┌──────────┐          │
       │         │ Device 3 │          │
       └────────►│ Central  ├◄─────────┘
                 │ Server   │
                 │Port 3000 │
                 └──────────┘
```

### Offline Transaction Steps:
1. Device 1 initiates money transfer via frontend
2. Bluetooth connection established between devices
3. Transaction data sent from Device 1 to Device 2
4. Both devices update their local SQLite databases
5. Transaction marked as 'unsynced' in both DBs
6. When internet becomes available, both devices sync with central server
7. After successful sync, transactions marked as 'synced'

## Setup Instructions

### 1. Backend Setup

First, install backend dependencies:
```bash
cd backend
npm install
```

Start the three servers in separate terminals:

a. Central Server (Device 3):
```bash
npm run central
# Runs on http://localhost:3000
```

b. Device 1 Server:
```bash
npm run device1
# Runs on http://localhost:3001
```

c. Device 2 Server:
```bash
npm run device2
# Runs on http://localhost:3002
```

### 2. Frontend Setup

Install frontend dependencies:
```bash
cd frontend
npm install
```

Start two frontend instances for Device 1 and 2:

a. Device 1 Frontend:
```bash
PORT=5173 npm run dev
# Runs on http://localhost:5173
```

b. Device 2 Frontend:
```bash
PORT=5174 npm run dev
# Runs on http://localhost:5174
```

## Testing the App

1. **Initial Setup**:
   - Open Device 1 frontend on http://localhost:5173
   - Open Device 2 frontend on http://localhost:5174
   - Each device starts with ₹1000 initial balance

2. **Making a Transaction**:
   - On Device 1:
     1. Click "Connect Device" to initiate Bluetooth
     2. Select Device 2 from the Bluetooth device list
     3. Enter amount (e.g., ₹100)
     4. Click "Send Money"
   
   - On Device 2:
     1. Transaction will be automatically received
     2. Balance will update (+₹100)
     3. Transaction appears in history as 'unsynced'

3. **Syncing with Central Server**:
   - When internet is available:
     1. Transactions automatically sync with central server
     2. Transaction status changes to 'synced'
     3. Central database updated with new balances

## API Endpoints

### Local Device APIs (3001/3002)
- `GET /api/balance` - Get local wallet balance
- `GET /api/transactions` - Get transaction history
- `POST /api/process-transaction` - Process Bluetooth transaction
- `POST /api/sync` - Sync with central server

### Central Server APIs (3000)
- `POST /api/sync` - Receive and process device syncs
- `GET /api/balance/:deviceId` - Get device balance

## Development Notes

- Uses Web Bluetooth API (Chrome/Edge browsers only)
- SQLite for local and central storage
- Offline-first architecture
- Real device IDs should be used in production
- Add proper security measures before production use

## Troubleshooting

1. **Bluetooth Connection Issues**:
   - Ensure Bluetooth is enabled on both devices
   - Use Chrome or Edge browser
   - Check browser Bluetooth permissions

2. **Database Issues**:
   - Delete `.db` files to reset databases
   - Restart servers to reinitialize DBs

3. **Sync Issues**:
   - Verify central server is running
   - Check internet connectivity
   - Restart local servers if needed
