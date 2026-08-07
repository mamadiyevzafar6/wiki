const db = require('../config/database');

module.exports = {
  // Get all published programs with category and country info
  getAllPrograms: (limit = null) => {
    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug, 
             co.name as country_name, co.slug as country_slug, co.flag_icon_url
      FROM programs p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN countries co ON p.country_id = co.id
      WHERE p.is_published = 1
      ORDER BY p.created_at DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    
    return db.prepare(query).all();
  },

  // Get program by slug
  getProgramBySlug: (slug) => {
    return db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             co.name as country_name, co.slug as country_slug, co.flag_icon_url
      FROM programs p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN countries co ON p.country_id = co.id
      WHERE p.slug = ? AND p.is_published = 1
    `).get(slug);
  },

  // Get all categories
  getAllCategories: () => {
    return db.prepare('SELECT * FROM categories ORDER BY name').all();
  },

  // Get category by slug with programs
  getCategoryBySlug: (slug) => {
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
    if (!category) return null;
    
    const programs = db.prepare(`
      SELECT p.*, co.name as country_name, co.slug as country_slug, co.flag_icon_url
      FROM programs p
      LEFT JOIN countries co ON p.country_id = co.id
      WHERE p.category_id = ? AND p.is_published = 1
      ORDER BY p.created_at DESC
    `).all(category.id);
    
    return { ...category, programs };
  },

  // Get all countries
  getAllCountries: () => {
    return db.prepare('SELECT * FROM countries ORDER BY name').all();
  },

  // Get country by slug with programs
  getCountryBySlug: (slug) => {
    const country = db.prepare('SELECT * FROM countries WHERE slug = ?').get(slug);
    if (!country) return null;
    
    const programs = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM programs p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.country_id = ? AND p.is_published = 1
      ORDER BY p.created_at DESC
    `).all(country.id);
    
    return { ...country, programs };
  },

  // Search programs, categories, and countries
  search: (query) => {
    const searchTerm = `%${query}%`;
    
    const programs = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             co.name as country_name, co.slug as country_slug, co.flag_icon_url,
             'program' as type
      FROM programs p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN countries co ON p.country_id = co.id
      WHERE (p.title LIKE ? OR p.content LIKE ?) AND p.is_published = 1
      LIMIT 20
    `).all(searchTerm, searchTerm);

    const categories = db.prepare(`
      SELECT *, 'category' as type FROM categories
      WHERE name LIKE ? OR description LIKE ?
      LIMIT 10
    `).all(searchTerm, searchTerm);

    const countries = db.prepare(`
      SELECT *, 'country' as type FROM countries
      WHERE name LIKE ? OR description LIKE ?
      LIMIT 10
    `).all(searchTerm, searchTerm);

    return { programs, categories, countries };
  },

  // Get site settings
  getSettings: () => {
    const settings = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const setting of settings) {
      try {
        result[setting.key] = JSON.parse(setting.value);
      } catch (e) {
        result[setting.key] = setting.value;
      }
    }
    return result;
  },

  // Update setting
  updateSetting: (key, value) => {
    return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  },

  // CRUD for Programs (Admin)
  createProgram: (data) => {
    const { title, slug, content, deadline_date, category_id, country_id, is_published } = data;
    return db.prepare(`
      INSERT INTO programs (title, slug, content, deadline_date, category_id, country_id, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, content, deadline_date || null, category_id || null, country_id || null, is_published ? 1 : 0);
  },

  updateProgram: (id, data) => {
    const { title, slug, content, deadline_date, category_id, country_id, is_published } = data;
    return db.prepare(`
      UPDATE programs 
      SET title = ?, slug = ?, content = ?, deadline_date = ?, category_id = ?, country_id = ?, 
          is_published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, slug, content, deadline_date || null, category_id || null, country_id || null, is_published ? 1 : 0, id);
  },

  deleteProgram: (id) => {
    return db.prepare('DELETE FROM programs WHERE id = ?').run(id);
  },

  getProgramById: (id) => {
    return db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
  },

  getAllProgramsAdmin: () => {
    return db.prepare(`
      SELECT p.*, c.name as category_name, co.name as country_name
      FROM programs p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN countries co ON p.country_id = co.id
      ORDER BY p.created_at DESC
    `).all();
  },

  // CRUD for Categories (Admin)
  createCategory: (name, slug, description) => {
    return db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)').run(name, slug, description || null);
  },

  updateCategory: (id, name, slug, description) => {
    return db.prepare('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?').run(name, slug, description || null, id);
  },

  deleteCategory: (id) => {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },

  getCategoryById: (id) => {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  // CRUD for Countries (Admin)
  createCountry: (name, slug, flag_icon_url, description) => {
    return db.prepare('INSERT INTO countries (name, slug, flag_icon_url, description) VALUES (?, ?, ?, ?)').run(name, slug, flag_icon_url || null, description || null);
  },

  updateCountry: (id, name, slug, flag_icon_url, description) => {
    return db.prepare('UPDATE countries SET name = ?, slug = ?, flag_icon_url = ?, description = ? WHERE id = ?').run(name, slug, flag_icon_url || null, description || null, id);
  },

  deleteCountry: (id) => {
    return db.prepare('DELETE FROM countries WHERE id = ?').run(id);
  },

  getCountryById: (id) => {
    return db.prepare('SELECT * FROM countries WHERE id = ?').get(id);
  },

  // User management (Admin)
  getUserByUsername: (username) => {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  getUserById: (id) => {
    return db.prepare('SELECT id, username, role, must_change_password, created_at FROM users WHERE id = ?').get(id);
  },

  getAllUsers: () => {
    return db.prepare('SELECT id, username, role, must_change_password, created_at FROM users ORDER BY created_at DESC').all();
  },

  createUser: (username, password_hash, role) => {
    return db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, password_hash, role || 'admin');
  },

  updateUserPassword: (id, password_hash) => {
    return db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(password_hash, id);
  },

  deleteUser: (id) => {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  countUsers: () => {
    return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  }
};
