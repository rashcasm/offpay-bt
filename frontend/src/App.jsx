import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  const [deviceId, setDeviceId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [receiverId, setReceiverId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [connectedDevice, setConnectedDevice] = useState(null);

  // Get device ID and initialize data
  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const response = await fetch(`${API_URL}/device-id`);
        const data = await response.json();
        setDeviceId(data.deviceId);
      } catch (error) {
        console.error('Failed to get device ID:', error);
      }
    };

    fetchDeviceId();
  }, []);

  // Fetch balance and transactions when deviceId changes
  useEffect(() => {
    if (deviceId) {
      fetchBalance();
      fetchTransactions();
    }
  }, [deviceId]);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${API_URL}/balance`);
      const data = await response.json();
      setBalance(data.balance);
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/transactions`);
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  };

  const connectBluetooth = async () => {
    try {
      setStatus('connecting');
      
      // Request Bluetooth device with our custom service
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['00001234-0000-1000-8000-00805f9b34fb'] }]
      });

      // Connect to the device
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('00001234-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00005678-0000-1000-8000-00805f9b34fb');

      // Set up notifications
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleBluetoothData);

      setConnectedDevice({ device, characteristic });
      setStatus('connected');
      setReceiverId(device.id);

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        setConnectedDevice(null);
        setReceiverId('');
      });

    } catch (error) {
      console.error('Bluetooth error:', error);
      setStatus('error');
      alert('Failed to connect: ' + error.message);
    }
  };

  const handleBluetoothData = async (event) => {
    const value = event.target.value;
    const decoder = new TextDecoder();
    const data = JSON.parse(decoder.decode(value));
    
    if (data.type === 'CONFIRMATION') {
      // Transaction confirmed, refresh data
      fetchBalance();
      fetchTransactions();
    }
  };

  const sendMoney = async () => {
    if (!transferAmount || !connectedDevice) {
      alert('Please connect to a device and enter an amount');
      return;
    }
    
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance!');
      return;
    }

    try {
      await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: receiverId,
          amount: amount
        })
      });

      setTransferAmount('');
      fetchBalance();
      fetchTransactions();
    } catch (error) {
      console.error('Send money error:', error);
      alert('Transaction failed: ' + error.message);
    }
  };

  return (
    <div className="container">
      <h1>OffPay-Bluetooth</h1>
      
      <div className="device-info">
        <p>Your Device ID: <strong>{deviceId || 'Loading...'}</strong></p>
      </div>

      <div className="balance-card">
        <h2>Balance</h2>
        <p className="balance">₹{balance.toFixed(2)}</p>
      </div>

      <div className="bluetooth-section">
        <button 
          onClick={connectBluetooth}
          className={`bluetooth-btn ${status === 'connected' ? 'connected' : ''}`}
          disabled={status === 'connecting'}
        >
          {status === 'connecting' ? 'Connecting...' :
           status === 'connected' ? 'Connected' : 'Connect Device'}
        </button>
        <p className="status">Status: {status}</p>
        {status === 'connected' && (
          <p className="connected-device">Connected to: {receiverId}</p>
        )}
      </div>

      <div className="transfer-section">
        <h2>Send Money</h2>
        <div className="transfer-form">
          <input
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={!connectedDevice}
          />
          <button 
            onClick={sendMoney}
            disabled={!connectedDevice || !transferAmount}
          >
            Send
          </button>
        </div>
      </div>

      <div className="transactions">
        <h2>Recent Transactions</h2>
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div key={tx.id} className="transaction-item">
              <div className="transaction-type">
                {tx.sender_id === deviceId ? 'Sent' : 'Received'}
              </div>
              <div className="transaction-amount">
                ₹{tx.amount.toFixed(2)}
              </div>
              <div className="transaction-party">
                {tx.sender_id === deviceId ? 
                  `To: ${tx.receiver_id}` : 
                  `From: ${tx.sender_id}`}
              </div>
              <div className="transaction-time">
                {new Date(tx.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
