// Live search functionality
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  if (searchInput && searchResults) {
    let debounceTimer;
    
    searchInput.addEventListener('input', function() {
      const query = this.value.trim();
      
      clearTimeout(debounceTimer);
      
      if (query.length < 2) {
        searchResults.classList.remove('active');
        return;
      }
      
      debounceTimer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          
          renderSearchResults(data);
        } catch (error) {
          console.error('Search error:', error);
        }
      }, 300);
    });
    
    function renderSearchResults(data) {
      let html = '';
      
      // Programs
      if (data.programs && data.programs.length > 0) {
        data.programs.forEach(program => {
          html += `
            <div class="search-result-item">
              <span class="search-result-type">Программа</span>
              <a href="/program/${program.slug}">${escapeHtml(program.title)}</a>
            </div>
          `;
        });
      }
      
      // Categories
      if (data.categories && data.categories.length > 0) {
        data.categories.forEach(category => {
          html += `
            <div class="search-result-item">
              <span class="search-result-type">Категория</span>
              <a href="/category/${category.slug}">${escapeHtml(category.name)}</a>
            </div>
          `;
        });
      }
      
      // Countries
      if (data.countries && data.countries.length > 0) {
        data.countries.forEach(country => {
          html += `
            <div class="search-result-item">
              <span class="search-result-type">Страна</span>
              <a href="/country/${country.slug}">${country.flag_icon_url || ''} ${escapeHtml(country.name)}</a>
            </div>
          `;
        });
      }
      
      if (html === '') {
        html = '<div class="search-result-item">Ничего не найдено</div>';
      }
      
      searchResults.innerHTML = html;
      searchResults.classList.add('active');
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });
  }
});
