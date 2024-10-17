const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

// Create database
const db = new sqlite3.Database('./database/users.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the users database.');
});

// Create users table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  balance INTEGER DEFAULT 50, -- 50 ksh bonus
  deposited INTEGER DEFAULT 0
)`);

// Route to create a new account
app.post('/api/register', (req, res) => {
  const { username } = req.body;
  db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Registration failed' });
    }
    res.status(201).json({ message: 'Account created successfully', bonus: 50, id: this.lastID });
  });
});

// Deposit route
app.post('/api/deposit', (req, res) => {
  const { userId, amount } = req.body;
  if (amount < 50) {
    return res.status(400).json({ message: 'Minimum deposit is 50 KSH' });
  }
  db.run('UPDATE users SET balance = balance + ?, deposited = deposited + ? WHERE id = ?', [amount, amount, userId], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Deposit failed' });
    }
    res.status(200).json({ message: 'Deposit successful' });
  });
});

// Withdraw route
app.post('/api/withdraw', (req, res) => {
  const { userId, amount, mpesaNumber } = req.body;
  if (amount < 100) {
    return res.status(400).json({ message: 'Minimum withdrawal is 100 KSH' });
  }
  if (!mpesaNumber.startsWith('07')) {
    return res.status(400).json({ message: 'Invalid M-Pesa number' });
  }

  db.get('SELECT balance, deposited FROM users WHERE id = ?', [userId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (row.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    if (row.deposited < 50) {
      return res.status(400).json({ message: 'You must deposit at least 50 KSH to withdraw the bonus' });
    }

    db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Withdrawal failed' });
      }
      res.status(200).json({ message: 'Withdrawal successful' });
    });
  });
});

// Invite route
app.post('/api/invite', (req, res) => {
  const { inviterId } = req.body;
  db.run('UPDATE users SET balance = balance + 1 WHERE id = ?', [inviterId], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to add invite bonus' });
    }
    res.status(200).json({ message: 'Invite bonus added' });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
