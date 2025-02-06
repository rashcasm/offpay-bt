import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  const [deviceId, setDeviceId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transferAmount, setTransferAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');

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

  const scanPorts = async () => {
    try {
      setStatus('scanning');
      const response = await fetch(`${API_URL}/bluetooth/ports`);
      const data = await response.json();
      setAvailablePorts(data.ports);
      setStatus(data.ports.length > 0 ? 'ports-found' : 'no-ports');
    } catch (error) {
      console.error('Failed to scan ports:', error);
      setStatus('error');
    }
  };

  const connectToPort = async (portPath) => {
    try {
      setStatus('connecting');
      const response = await fetch(`${API_URL}/bluetooth/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portPath })
      });

      if (!response.ok) {
        throw new Error('Failed to connect');
      }

      setStatus('connected');
      setSelectedPort(portPath);
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('error');
      alert('Failed to connect: ' + error.message);
    }
  };

  const disconnect = async () => {
    try {
      await fetch(`${API_URL}/bluetooth/disconnect`, {
        method: 'POST'
      });
      setStatus('disconnected');
      setSelectedPort('');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const sendMoney = async () => {
    if (!transferAmount || status !== 'connected') {
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
          receiverId: selectedPort,
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
        {status === 'disconnected' && (
          <button onClick={scanPorts} className="bluetooth-btn">
            Scan for Devices
          </button>
        )}

        {status === 'scanning' && (
          <div className="status-message">Scanning for devices...</div>
        )}

        {status === 'ports-found' && (
          <div className="ports-list">
            <h3>Available Devices:</h3>
            {availablePorts.map((port) => (
              <button
                key={port.path}
                onClick={() => connectToPort(port.path)}
                className="port-btn"
              >
                {port.friendlyName || port.path}
              </button>
            ))}
          </div>
        )}

        {status === 'connecting' && (
          <div className="status-message">Connecting...</div>
        )}

        {status === 'connected' && (
          <>
            <div className="connected-status">
              <span className="connected-indicator">●</span> Connected to device
              <button onClick={disconnect} className="disconnect-btn">
                Disconnect
              </button>
            </div>

            <div className="transfer-section">
              <h2>Send Money</h2>
              <div className="transfer-form">
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="amount-input"
                />
                <button 
                  onClick={sendMoney}
                  className="send-btn"
                  disabled={!transferAmount}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="error-message">
            Failed to connect. Please try again.
            <button onClick={() => setStatus('disconnected')} className="retry-btn">
              Retry
            </button>
          </div>
        )}
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
