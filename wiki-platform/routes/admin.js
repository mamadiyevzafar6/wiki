const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const dbModel = require('../models/index');
const authMiddleware = require('../middleware/auth');
const { marked } = require('marked');

// CSRF token generation
function generateCsrfToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Generate slug from title
function generateSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login', {
    title: 'Вход в админку',
    csrfToken: generateCsrfToken(),
    error: null
  });
});

// Login POST
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.render('admin/login', {
        title: 'Вход в админку',
        csrfToken: generateCsrfToken(),
        error: 'Введите логин и пароль'
      });
    }
    
    const user = dbModel.getUserByUsername(username);
    if (!user) {
      return res.render('admin/login', {
        title: 'Вход в админку',
        csrfToken: generateCsrfToken(),
        error: 'Неверный логин или пароль'
      });
    }
    
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.render('admin/login', {
        title: 'Вход в админку',
        csrfToken: generateCsrfToken(),
        error: 'Неверный логин или пароль'
      });
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    
    if (user.must_change_password) {
      return res.redirect('/admin/change-password?first=true');
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('admin/login', {
      title: 'Вход в админку',
      csrfToken: generateCsrfToken(),
      error: 'Ошибка входа'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/admin/login');
  });
});

// Dashboard (protected)
router.get('/dashboard', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const programsCount = dbModel.getAllProgramsAdmin().length;
  const categoriesCount = dbModel.getAllCategories().length;
  const countriesCount = dbModel.getAllCountries().length;
  
  res.render('admin/dashboard', {
    title: 'Панель управления',
    user: { username: req.session.username, role: req.session.role },
    stats: { programsCount, categoriesCount, countriesCount },
    navbarLinks: settings.navbar_links || []
  });
});

// Change password page (for first login or manual)
router.get('/change-password', authMiddleware, (req, res) => {
  const isFirstLogin = req.query.first === 'true';
  res.render('admin/change-password', {
    title: isFirstLogin ? 'Смена пароля' : 'Изменить пароль',
    user: { username: req.session.username },
    csrfToken: generateCsrfToken(),
    isFirstLogin,
    error: null,
    success: null
  });
});

// Change password POST
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.session.userId;
    
    if (!new_password || new_password.length < 6) {
      return res.render('admin/change-password', {
        title: 'Смена пароля',
        user: { username: req.session.username },
        csrfToken: generateCsrfToken(),
        isFirstLogin: req.body.first === 'true',
        error: 'Пароль должен быть не менее 6 символов',
        success: null
      });
    }
    
    if (new_password !== confirm_password) {
      return res.render('admin/change-password', {
        title: 'Смена пароля',
        user: { username: req.session.username },
        csrfToken: generateCsrfToken(),
        isFirstLogin: req.body.first === 'true',
        error: 'Пароли не совпадают',
        success: null
      });
    }
    
    // If not first login, verify current password
    if (req.body.first !== 'true') {
      const user = dbModel.getUserById(userId);
      const fullUser = dbModel.getUserByUsername(user.username);
      const validCurrent = bcrypt.compareSync(current_password, fullUser.password_hash);
      
      if (!validCurrent) {
        return res.render('admin/change-password', {
          title: 'Смена пароля',
          user: { username: req.session.username },
          csrfToken: generateCsrfToken(),
          isFirstLogin: false,
          error: 'Неверный текущий пароль',
          success: null
        });
      }
    }
    
    const newPasswordHash = bcrypt.hashSync(new_password, 10);
    dbModel.updateUserPassword(userId, newPasswordHash);
    
    res.render('admin/change-password', {
      title: 'Смена пароля',
      user: { username: req.session.username },
      csrfToken: generateCsrfToken(),
      isFirstLogin: false,
      error: null,
      success: 'Пароль успешно изменен'
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.render('admin/change-password', {
      title: 'Смена пароля',
      user: { username: req.session.username },
      csrfToken: generateCsrfToken(),
      isFirstLogin: req.body.first === 'true',
      error: 'Ошибка при смене пароля',
      success: null
    });
  }
});

// Programs management
router.get('/programs', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const programs = dbModel.getAllProgramsAdmin();
  
  res.render('admin/programs', {
    title: 'Управление программами',
    user: { username: req.session.username },
    programs,
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken()
  });
});

router.get('/programs/new', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const categories = dbModel.getAllCategories();
  const countries = dbModel.getAllCountries();
  
  res.render('admin/program-form', {
    title: 'Новая программа',
    user: { username: req.session.username },
    program: null,
    categories,
    countries,
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken(),
    isEdit: false
  });
});

router.post('/programs', authMiddleware, (req, res) => {
  try {
    const { title, slug, content, deadline_date, category_id, country_id, is_published } = req.body;
    
    const finalSlug = slug || generateSlug(title);
    
    dbModel.createProgram({
      title,
      slug: finalSlug,
      content,
      deadline_date,
      category_id: category_id || null,
      country_id: country_id || null,
      is_published: is_published === 'on'
    });
    
    res.redirect('/admin/programs');
  } catch (err) {
    console.error('Create program error:', err);
    res.status(500).send('Error creating program');
  }
});

router.get('/programs/:id/edit', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const program = dbModel.getProgramById(req.params.id);
  const categories = dbModel.getAllCategories();
  const countries = dbModel.getAllCountries();
  
  if (!program) {
    return res.status(404).send('Program not found');
  }
  
  res.render('admin/program-form', {
    title: 'Редактировать программу',
    user: { username: req.session.username },
    program,
    categories,
    countries,
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken(),
    isEdit: true
  });
});

router.post('/programs/:id', authMiddleware, (req, res) => {
  try {
    const { title, slug, content, deadline_date, category_id, country_id, is_published } = req.body;
    
    dbModel.updateProgram(req.params.id, {
      title,
      slug: slug || generateSlug(title),
      content,
      deadline_date,
      category_id: category_id || null,
      country_id: country_id || null,
      is_published: is_published === 'on'
    });
    
    res.redirect('/admin/programs');
  } catch (err) {
    console.error('Update program error:', err);
    res.status(500).send('Error updating program');
  }
});

router.post('/programs/:id/delete', authMiddleware, (req, res) => {
  try {
    dbModel.deleteProgram(req.params.id);
    res.redirect('/admin/programs');
  } catch (err) {
    console.error('Delete program error:', err);
    res.status(500).send('Error deleting program');
  }
});

// Categories management
router.get('/categories', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const categories = dbModel.getAllCategories();
  
  res.render('admin/categories', {
    title: 'Управление категориями',
    user: { username: req.session.username },
    categories,
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken()
  });
});

router.post('/categories', authMiddleware, (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const finalSlug = slug || generateSlug(name);
    
    if (req.body.action === 'create') {
      dbModel.createCategory(name, finalSlug, description);
    } else if (req.body.action === 'update') {
      dbModel.updateCategory(req.body.id, name, finalSlug, description);
    } else if (req.body.action === 'delete') {
      dbModel.deleteCategory(req.body.id);
    }
    
    res.redirect('/admin/categories');
  } catch (err) {
    console.error('Category operation error:', err);
    res.status(500).send('Error');
  }
});

// Countries management
router.get('/countries', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const countries = dbModel.getAllCountries();
  
  res.render('admin/countries', {
    title: 'Управление странами',
    user: { username: req.session.username },
    countries,
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken()
  });
});

router.post('/countries', authMiddleware, (req, res) => {
  try {
    const { name, slug, flag_icon_url, description } = req.body;
    const finalSlug = slug || generateSlug(name);
    
    if (req.body.action === 'create') {
      dbModel.createCountry(name, finalSlug, flag_icon_url, description);
    } else if (req.body.action === 'update') {
      dbModel.updateCountry(req.body.id, name, finalSlug, flag_icon_url, description);
    } else if (req.body.action === 'delete') {
      dbModel.deleteCountry(req.body.id);
    }
    
    res.redirect('/admin/countries');
  } catch (err) {
    console.error('Country operation error:', err);
    res.status(500).send('Error');
  }
});

// Users management
router.get('/users', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  const users = dbModel.getAllUsers();
  
  res.render('admin/users', {
    title: 'Пользователи',
    user: { username: req.session.username },
    users,
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken()
  });
});

router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { action, id, username, password, role } = req.body;
    
    if (action === 'create') {
      if (!username || !password) {
        return res.status(400).send('Username and password required');
      }
      const passwordHash = bcrypt.hashSync(password, 10);
      dbModel.createUser(username, passwordHash, role || 'admin');
    } else if (action === 'delete') {
      // Prevent deleting last admin
      const userCount = dbModel.countUsers();
      if (userCount <= 1) {
        return res.status(400).send('Cannot delete the last user');
      }
      dbModel.deleteUser(id);
    }
    
    res.redirect('/admin/users');
  } catch (err) {
    console.error('User operation error:', err);
    res.status(500).send('Error');
  }
});

// Settings management
router.get('/settings', authMiddleware, (req, res) => {
  const settings = dbModel.getSettings();
  
  res.render('admin/settings', {
    title: 'Настройки сайта',
    user: { username: req.session.username },
    siteTitle: settings.site_title || 'Wiki Platform',
    navbarLinks: JSON.stringify(settings.navbar_links || [], null, 2),
    navbarLinks: settings.navbar_links || [],
    csrfToken: generateCsrfToken()
  });
});

router.post('/settings', authMiddleware, (req, res) => {
  try {
    const { site_title, navbar_links } = req.body;
    
    if (site_title) {
      dbModel.updateSetting('site_title', site_title);
    }
    
    if (navbar_links) {
      try {
        const links = JSON.parse(navbar_links);
        dbModel.updateSetting('navbar_links', links);
      } catch (e) {
        console.error('Invalid navbar_links JSON');
      }
    }
    
    res.redirect('/admin/settings');
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).send('Error updating settings');
  }
});

module.exports = router;
