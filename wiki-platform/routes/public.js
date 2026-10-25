const express = require('express');
const router = express.Router();
const dbModel = require('../models/index');
const { marked } = require('marked');

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

// Home page
router.get('/', (req, res) => {
  const settings = dbModel.getSettings();
  const programs = dbModel.getAllPrograms(10);
  const categories = dbModel.getAllCategories();
  const countries = dbModel.getAllCountries();
  
  // Parse markdown for content preview
  programs.forEach(p => {
    if (p.content) {
      p.contentPreview = marked.parse(p.content.substring(0, 300) + '...');
    }
  });
  
  res.render('index', {
    title: settings.site_title || 'Wiki Platform',
    navbarLinks: settings.navbar_links || [],
    programs,
    categories,
    countries
  });
});

// Search API (live search)
router.get('/api/search', (req, res) => {
  const query = req.query.q || '';
  if (query.length < 2) {
    return res.json({ programs: [], categories: [], countries: [] });
  }
  
  const results = dbModel.search(query);
  res.json(results);
});

// Search results page
router.get('/search', (req, res) => {
  const query = req.query.q || '';
  const settings = dbModel.getSettings();
  
  let results = { programs: [], categories: [], countries: [] };
  if (query.length >= 2) {
    results = dbModel.search(query);
  }
  
  res.render('search', {
    title: `Поиск: ${escapeHtml(query)}`,
    navbarLinks: settings.navbar_links || [],
    query: escapeHtml(query),
    results
  });
});

// Categories list
router.get('/categories', (req, res) => {
  const settings = dbModel.getSettings();
  const categories = dbModel.getAllCategories();
  
  res.render('categories', {
    title: 'Категории',
    navbarLinks: settings.navbar_links || [],
    categories
  });
});

// Single category page
router.get('/category/:slug', (req, res) => {
  const settings = dbModel.getSettings();
  const category = dbModel.getCategoryBySlug(req.params.slug);
  
  if (!category) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      navbarLinks: settings.navbar_links || [],
      message: 'Категория не найдена'
    });
  }
  
  res.render('category', {
    title: category.name,
    navbarLinks: settings.navbar_links || [],
    category
  });
});

// Countries list
router.get('/countries', (req, res) => {
  const settings = dbModel.getSettings();
  const countries = dbModel.getAllCountries();
  
  res.render('countries', {
    title: 'Страны',
    navbarLinks: settings.navbar_links || [],
    countries
  });
});

// Single country page
router.get('/country/:slug', (req, res) => {
  const settings = dbModel.getSettings();
  const country = dbModel.getCountryBySlug(req.params.slug);
  
  if (!country) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      navbarLinks: settings.navbar_links || [],
      message: 'Страна не найдена'
    });
  }
  
  res.render('country', {
    title: country.name,
    navbarLinks: settings.navbar_links || [],
    country
  });
});

// Single program page
router.get('/program/:slug', (req, res) => {
  const settings = dbModel.getSettings();
  const program = dbModel.getProgramBySlug(req.params.slug);
  
  if (!program) {
    return res.status(404).render('error', {
      title: 'Не найдено',
      navbarLinks: settings.navbar_links || [],
      message: 'Программа не найдена'
    });
  }
  
  // Parse markdown content safely
  let htmlContent = '';
  if (program.content) {
    htmlContent = marked.parse(program.content);
  }
  
  res.render('program', {
    title: program.title,
    navbarLinks: settings.navbar_links || [],
    program,
    htmlContent
  });
});

// About page
router.get('/about', (req, res) => {
  const settings = dbModel.getSettings();
  res.render('about', {
    title: 'О проекте',
    navbarLinks: settings.navbar_links || []
  });
});

module.exports = router;
