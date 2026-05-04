const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const db = new sqlite3.Database(path.join(dataDir, 'social_media.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '/images/default-avatar.svg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  )`);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
  secret: 'social-connect-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.toLowerCase());
    if (extOk && mimeOk) cb(null, true);
    else cb(new Error('Only image/video files are allowed'));
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  if (req.session.userId) {
    res.locals.currentUser = await get('SELECT id, name, username, email, bio, avatar FROM users WHERE id = ?', [req.session.userId]);
  }
  next();
});

async function getPosts(currentUserId, whereClause = '', params = []) {
  const posts = await all(`
    SELECT p.*, u.name, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
      EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) AS liked_by_me
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `, [currentUserId || 0, ...params]);

  for (const post of posts) {
    post.comments = await all(`
      SELECT c.*, u.name, u.username, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? ORDER BY c.created_at ASC
    `, [post.id]);
    post.tagList = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  }
  return posts;
}

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/feed');
  res.render('index', { title: 'SocialConnect' });
});

app.get('/register', (req, res) => res.render('register', { title: 'Register', error: null }));

app.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.render('register', { title: 'Register', error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.render('register', { title: 'Register', error: 'Password must be at least 6 characters' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await run('INSERT INTO users(name, username, email, password) VALUES (?, ?, ?, ?)', [name, username.toLowerCase(), email.toLowerCase(), hashed]);
    req.session.userId = result.lastID;
    res.redirect('/feed');
  } catch (err) {
    res.render('register', { title: 'Register', error: 'Username or email already exists' });
  }
});

app.get('/login', (req, res) => res.render('login', { title: 'Login', error: null }));

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await get('SELECT * FROM users WHERE email = ? OR username = ?', [email.toLowerCase(), email.toLowerCase()]);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { title: 'Login', error: 'Invalid login details' });
  }
  req.session.userId = user.id;
  res.redirect('/feed');
});

app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/feed', requireLogin, async (req, res) => {
  const tag = req.query.tag;
  const posts = tag
    ? await getPosts(req.session.userId, 'WHERE p.tags LIKE ?', [`%${tag}%`])
    : await getPosts(req.session.userId);
  res.render('feed', { title: 'Feed', posts, selectedTag: tag || '' });
});

app.post('/posts', requireLogin, upload.single('media'), async (req, res) => {
  const { content, tags } = req.body;
  if (!content || content.trim().length === 0) return res.redirect('/feed');
  let mediaUrl = null;
  let mediaType = null;
  if (req.file) {
    mediaUrl = '/uploads/' + req.file.filename;
    mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  }
  const cleanTags = (tags || '').split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).join(',');
  await run('INSERT INTO posts(user_id, content, media_url, media_type, tags) VALUES (?, ?, ?, ?, ?)', [req.session.userId, content.trim(), mediaUrl, mediaType, cleanTags]);
  res.redirect('/feed');
});

app.post('/posts/:id/like', requireLogin, async (req, res) => {
  const postId = req.params.id;
  const existing = await get('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [req.session.userId, postId]);
  if (existing) await run('DELETE FROM likes WHERE id = ?', [existing.id]);
  else await run('INSERT INTO likes(user_id, post_id) VALUES (?, ?)', [req.session.userId, postId]);
  res.redirect(req.get('referer') || '/feed');
});

app.post('/posts/:id/comment', requireLogin, async (req, res) => {
  const comment = (req.body.comment || '').trim();
  if (comment) await run('INSERT INTO comments(user_id, post_id, comment) VALUES (?, ?, ?)', [req.session.userId, req.params.id, comment]);
  res.redirect(req.get('referer') || '/feed');
});

app.post('/posts/:id/delete', requireLogin, async (req, res) => {
  const post = await get('SELECT * FROM posts WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (post) {
    await run('DELETE FROM comments WHERE post_id = ?', [post.id]);
    await run('DELETE FROM likes WHERE post_id = ?', [post.id]);
    await run('DELETE FROM posts WHERE id = ?', [post.id]);
  }
  res.redirect('/feed');
});

app.get('/profile/:username', requireLogin, async (req, res) => {
  const user = await get('SELECT id, name, username, email, bio, avatar, created_at FROM users WHERE username = ?', [req.params.username.toLowerCase()]);
  if (!user) return res.status(404).send('User not found');
  const posts = await getPosts(req.session.userId, 'WHERE p.user_id = ?', [user.id]);
  res.render('profile', { title: user.name, profileUser: user, posts });
});

app.get('/settings', requireLogin, async (req, res) => {
  res.render('settings', { title: 'Edit Profile', error: null, success: null });
});

app.post('/settings', requireLogin, upload.single('avatar'), async (req, res) => {
  try {
    const { name, bio } = req.body;
    let avatar = res.locals.currentUser.avatar;
    if (req.file) avatar = '/uploads/' + req.file.filename;
    await run('UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?', [name, bio || '', avatar, req.session.userId]);
    res.render('settings', { title: 'Edit Profile', error: null, success: 'Profile updated successfully' });
  } catch (err) {
    res.render('settings', { title: 'Edit Profile', error: 'Something went wrong', success: null });
  }
});

app.get('/explore', requireLogin, async (req, res) => {
  const q = (req.query.q || '').trim();
  let users = [];
  let posts = [];
  if (q) {
    users = await all('SELECT id, name, username, avatar, bio FROM users WHERE name LIKE ? OR username LIKE ? LIMIT 10', [`%${q}%`, `%${q}%`]);
    posts = await getPosts(req.session.userId, 'WHERE p.content LIKE ? OR p.tags LIKE ?', [`%${q}%`, `%${q}%`]);
  }
  res.render('explore', { title: 'Explore', q, users, posts });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).send(err.message || 'Something went wrong');
});

app.listen(PORT, () => console.log(`SocialConnect running at http://localhost:${PORT}`));
