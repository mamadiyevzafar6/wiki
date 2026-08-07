const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/database');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'wiki-platform-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  const settings = require('./models/index').getSettings();
  res.status(404).render('error', {
    title: 'Страница не найдена',
    navbarLinks: settings.navbar_links || [],
    message: 'Запрошенная страница не существует'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const settings = require('./models/index').getSettings();
  res.status(500).render('error', {
    title: 'Ошибка',
    navbarLinks: settings.navbar_links || [],
    message: 'Произошла ошибка при обработке запроса'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
});

module.exports = app;
