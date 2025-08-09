// server/create_db.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database(__dirname + '/data.db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const username = 'Elkin';
const plain = '990680240MR';
const saltRounds = 12;

// Inserta o actualiza usuario
const row = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (row) {
  console.log('Usuario ya existe:', username);
} else {
  const hash = bcrypt.hashSync(plain, saltRounds);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?,?)').run(username, hash);
  console.log('Usuario creado:', username);
}
db.close();
