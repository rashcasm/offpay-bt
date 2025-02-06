const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Initialize database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        balance REAL DEFAULT 1000
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        receiver_id TEXT,
        amount REAL,
        timestamp TEXT,
        status TEXT DEFAULT 'completed'
    )`);
});

function getUser(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createUser(id) {
    return new Promise((resolve, reject) => {
        db.run('INSERT OR IGNORE INTO users (id) VALUES (?)', [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function updateBalance(id, amount, isCredit = true) {
    return new Promise((resolve, reject) => {
        const operation = isCredit ? '+' : '-';
        db.run(
            `UPDATE users SET balance = balance ${operation} ? WHERE id = ?`,
            [Math.abs(amount), id],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function getBalance(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT balance FROM users WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.balance : 0);
        });
    });
}

function createTransaction(transaction) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO transactions (id, sender_id, receiver_id, amount, timestamp) VALUES (?, ?, ?, ?, ?)',
            [transaction.id, transaction.sender_id, transaction.receiver_id, transaction.amount, transaction.timestamp],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function getTransactions(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM transactions WHERE sender_id = ? OR receiver_id = ? ORDER BY timestamp DESC',
            [userId, userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

module.exports = {
    getUser,
    createUser,
    updateBalance,
    getBalance,
    createTransaction,
    getTransactions
};
