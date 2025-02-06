import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [balance, setBalance] = useState(1000);
  const [transferAmount, setTransferAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState('disconnected');

  const connectDevice = () => {
    setStatus('connected');
  };

  const disconnectDevice = () => {
    setStatus('disconnected');
  };

  const sendMoney = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance!');
      return;
    }

    // Update balance
    setBalance(prev => prev - amount);

    // Add transaction to history
    const newTransaction = {
      id: Date.now(),
      type: 'sent',
      amount: amount,
      receiver: 'yash-dharme',
      timestamp: new Date().toISOString()
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setTransferAmount('');
    alert('Payment successful!');
  };

  return (
    <div className="container">
      <h1>OffPay-Local</h1>
      
      <div className="device-info">
        <p>Your Device ID: <strong>my-device</strong></p>
      </div>

      <div className="balance-card">
        <h2>Balance</h2>
        <p className="balance">₹{balance.toFixed(2)}</p>
      </div>

      <div className="connection-section">
        {status === 'disconnected' ? (
          <button onClick={connectDevice} className="connect-btn">
            Connect Device
          </button>
        ) : (
          <div className="connected-section">
            <div className="connected-status">
              <span className="connected-indicator">●</span> 
              Connected to: yash-dharme
              <button onClick={disconnectDevice} className="disconnect-btn">
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
          </div>
        )}
      </div>

      <div className="transactions">
        <h2>Recent Transactions</h2>
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div key={tx.id} className="transaction-item">
              <div className="transaction-type">
                Sent
              </div>
              <div className="transaction-amount">
                ₹{tx.amount.toFixed(2)}
              </div>
              <div className="transaction-party">
                To: {tx.receiver}
              </div>
              <div className="transaction-time">
                {new Date(tx.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="no-transactions">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
