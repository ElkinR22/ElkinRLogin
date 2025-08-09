// server/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

const db = new Database(path.join(__dirname,'data.db'));

const app = express();

// Security middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiter (protege endpoints sensibles)
const limiter = rateLimit({
  windowMs: 60*1000, // 1 minuto
  max: 20
});
app.use('/api/', limiter);

// Session (HTTP-only cookie)
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: __dirname }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8 // 8 horas
  }
}));

// Servir front
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API ---
// login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({error:'Datos incompletos'});
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if(!row) return res.status(401).json({error:'Credenciales inválidas'});
  const ok = bcrypt.compareSync(password, row.password_hash);
  if(!ok) return res.status(401).json({error:'Credenciales inválidas'});
  req.session.user = { id: row.id, username: row.username };
  return res.json({ok:true, user: row.username});
});

// logout
app.post('/api/logout', (req,res) => {
  req.session.destroy(()=> res.json({ok:true}));
});

// get current user
app.get('/api/me', (req,res) => {
  if(req.session.user) return res.json({user: req.session.user});
  return res.status(401).json({error:'No autorizado'});
});

// messages (protected)
function requireAuth(req,res,next){
  if(req.session && req.session.user) return next();
  return res.status(401).json({error:'No autorizado'});
}

app.get('/api/messages', requireAuth, (req,res) => {
  const msgs = db.prepare('SELECT id,user,text,created_at FROM messages ORDER BY id ASC').all();
  res.json({messages: msgs});
});

app.post('/api/messages', requireAuth, (req,res) => {
  const text = (req.body.text || '').toString().trim();
  if(!text) return res.status(400).json({error:'Mensaje vacío'});
  db.prepare('INSERT INTO messages (user,text) VALUES (?,?)').run(req.session.user.username, text);
  res.json({ok:true});
});

// Fallback to index
app.get('*', (req,res) => {
  res.sendFile(path.join(__dirname,'..','public','index.html'));
});

app.listen(PORT, () => console.log('Server running on http://localhost:'+PORT));
