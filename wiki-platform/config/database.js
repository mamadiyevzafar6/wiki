const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'wiki.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    must_change_password BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS countries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    flag_icon_url TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT,
    deadline_date DATE,
    category_id INTEGER,
    country_id INTEGER,
    is_published BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_programs_category ON programs(category_id);
  CREATE INDEX IF NOT EXISTS idx_programs_country ON programs(country_id);
  CREATE INDEX IF NOT EXISTS idx_programs_published ON programs(is_published);
  CREATE INDEX IF NOT EXISTS idx_programs_slug ON programs(slug);
`);

// Create default admin if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const defaultPassword = 'admin123';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);
  
  db.prepare(`
    INSERT INTO users (username, password_hash, role, must_change_password)
    VALUES (?, ?, ?, ?)
  `).run('admin', passwordHash, 'superadmin', 1);
  
  console.log('Default admin created: username=admin, password=admin123');
}

// Initialize default settings if not exist
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const defaultSettings = [
    ['site_title', JSON.stringify('Wiki Competitions Platform')],
    ['navbar_links', JSON.stringify([
      { label: 'Главная', href: '/' },
      { label: 'Категории', href: '/categories' },
      { label: 'Страны', href: '/countries' },
      { label: 'О проекте', href: '/about' }
    ])]
  ];
  
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }
  
  console.log('Default settings initialized');
}

// Seed some initial data if categories are empty
const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (catCount.count === 0) {
  const categories = [
    { name: 'Хакатоны', slug: 'hackathons', description: 'Соревнования по программированию' },
    { name: 'Гранты', slug: 'grants', description: 'Финансовая поддержка проектов' },
    { name: 'Стипендии', slug: 'scholarships', description: 'Образовательные стипендии' },
    { name: 'Конкурсы', slug: 'contests', description: 'Интеллектуальные конкурсы' }
  ];
  
  const insertCategory = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)');
  for (const cat of categories) {
    insertCategory.run(cat.name, cat.slug, cat.description);
  }
  
  console.log('Default categories seeded');
}

const countryCount = db.prepare('SELECT COUNT(*) as count FROM countries').get();
if (countryCount.count === 0) {
  const countries = [
    { name: 'США', slug: 'usa', flag_icon_url: '🇺🇸', description: 'Соединенные Штаты Америки' },
    { name: 'Великобритания', slug: 'uk', flag_icon_url: '🇬🇧', description: 'Соединенное Королевство' },
    { name: 'Германия', slug: 'germany', flag_icon_url: '🇩🇪', description: 'Федеративная Республика Германия' },
    { name: 'Россия', slug: 'russia', flag_icon_url: '🇷🇺', description: 'Российская Федерация' },
    { name: 'Международные', slug: 'international', flag_icon_url: '🌍', description: 'Международные программы' }
  ];
  
  const insertCountry = db.prepare('INSERT INTO countries (name, slug, flag_icon_url, description) VALUES (?, ?, ?, ?)');
  for (const country of countries) {
    insertCountry.run(country.name, country.slug, country.flag_icon_url, country.description);
  }
  
  console.log('Default countries seeded');
}

module.exports = db;
