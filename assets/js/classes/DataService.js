// ===== Data Service Class - Updated for Pre-load Cache =====

/**
 * DataService class handles all API interactions
 * Now supports pre-loading all data and persistent cache
 */
class DataService {
  
  constructor() {
    // API URLs for both categories
    this.scienceUrl = CONFIG.API.SCIENCE_URL;
    this.gemUrl = CONFIG.API.GEM_URL;
    this.timeout = CONFIG.API.TIMEOUT;
    this.retryConfig = CONFIG.API.RETRY;
    this.cache = new Map();
    this.cacheTimeout = CONFIG.CACHE.TIMEOUT;
    this.isPreloading = false;
  }

  /**
   * Pre-load ALL data at once - NEW
   * @returns {Promise<Object>} Pre-loaded data result
   */
  async preloadAllData() {
    if (this.isPreloading) {
      return { success: false, message: 'Already preloading' };
    }

    try {
      this.isPreloading = true;
      console.log('🚀 Starting pre-load all data...');

      // Step 1: Load all competitions
      const competitions = await this.fetchAllCompetitions();
      
      if (!competitions.science.length && !competitions.gem.length) {
        throw new Error('No competitions data loaded');
      }

      // Step 2: Pre-load all results
      const allResults = new Map();
      const allCompetitions = [...competitions.science, ...competitions.gem];
      
      console.log(`📊 Pre-loading results for ${allCompetitions.length} competitions...`);
      
      // Load results in parallel (but with some delay to avoid rate limiting)
      const resultPromises = allCompetitions.map(async (comp, index) => {
        try {
          // Add small delay to avoid overwhelming the API
          if (index > 0) {
            await Utils.sleep(200); // 200ms delay between requests
          }
          
          const results = await this.fetchResultsInternal(comp.id, comp.category);
          allResults.set(comp.id, results);
          console.log(`✅ Loaded results for: ${comp.name}`);
          return { id: comp.id, success: true };
        } catch (error) {
          console.warn(`⚠️ Failed to load results for ${comp.name}:`, error.message);
          allResults.set(comp.id, []); // Set empty array for failed loads
          return { id: comp.id, success: false, error: error.message };
        }
      });

      const resultsSummary = await Promise.all(resultPromises);
      const successCount = resultsSummary.filter(r => r.success).length;
      
      // Step 3: Store in global cache
      GLOBAL_CACHE.competitions = competitions;
      GLOBAL_CACHE.results = allResults;
      GLOBAL_CACHE.lastUpdated = Date.now();
      GLOBAL_CACHE.isLoaded = true;
      
      // Step 4: Save to localStorage
      this.saveToLocalStorage();
      
      console.log(`🎉 Pre-load complete! ${successCount}/${allCompetitions.length} competitions loaded`);
      
      return {
        success: true,
        competitions: competitions,
        results: allResults,
        summary: {
          total: allCompetitions.length,
          loaded: successCount,
          failed: allCompetitions.length - successCount
        }
      };
      
    } catch (error) {
      console.error('❌ Pre-load failed:', error);
      throw error;
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Save cache to localStorage - NEW
   */
  saveToLocalStorage() {
    try {
      const cacheData = {
        competitions: GLOBAL_CACHE.competitions,
        results: Object.fromEntries(GLOBAL_CACHE.results),
        lastUpdated: GLOBAL_CACHE.lastUpdated,
        version: CONFIG.APP.VERSION
      };
      
      localStorage.setItem(CONFIG.CACHE.PERSIST_KEY, JSON.stringify(cacheData));
      localStorage.setItem(CONFIG.CACHE.VERSION_KEY, CONFIG.APP.VERSION);
      
      console.log('💾 Cache saved to localStorage');
    } catch (error) {
      console.warn('Cannot save to localStorage:', error);
    }
  }

  /**
   * Load cache from localStorage - NEW
   * @returns {boolean} True if loaded successfully
   */
  loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem(CONFIG.CACHE.PERSIST_KEY);
      const cachedVersion = localStorage.getItem(CONFIG.CACHE.VERSION_KEY);
      
      if (!cached || cachedVersion !== CONFIG.APP.VERSION) {
        console.log('📦 No valid cache found in localStorage');
        return false;
      }
      
      const data = JSON.parse(cached);
      
      // Check if cache is still valid (within timeout)
      if (!data.lastUpdated || (Date.now() - data.lastUpdated) > this.cacheTimeout) {
        console.log('⏰ localStorage cache expired');
        return false;
      }
      
      // Restore global cache
      GLOBAL_CACHE.competitions = data.competitions;
      GLOBAL_CACHE.results = new Map(Object.entries(data.results || {}));
      GLOBAL_CACHE.lastUpdated = data.lastUpdated;
      GLOBAL_CACHE.isLoaded = true;
      
      console.log('✅ Cache loaded from localStorage');
      return true;
      
    } catch (error) {
      console.warn('Cannot load from localStorage:', error);
      return false;
    }
  }

  /**
   * Check if data is available in cache - NEW
   * @returns {boolean} True if cache is ready
   */
  isCacheReady() {
    return GLOBAL_CACHE.isLoaded && isCacheValid();
  }

  /**
   * Fetch results from cache or API
   * @param {string} competitionId - Competition ID
   * @param {string} category - Competition category (science/gem)
   * @returns {Promise<Array>} Results array
   */
  async fetchResults(competitionId, category = 'science') {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    // Try cache first
    if (GLOBAL_CACHE.results.has(competitionId)) {
      console.log(`📋 Results for ${competitionId} loaded from cache`);
      return GLOBAL_CACHE.results.get(competitionId);
    }

    // Fallback to API if not in cache
    return await this.fetchResultsInternal(competitionId, category);
  }

  /**
   * Internal method to fetch results from API
   * @param {string} competitionId - Competition ID  
   * @param {string} category - Competition category
   * @returns {Promise<Array>} Results array
   */
  async fetchResultsInternal(competitionId, category = 'science') {
    const cacheKey = `results_${competitionId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const apiUrl = this.getApiUrl(category);
      const params = {
        action: 'getResults',
        id: competitionId
      };
      
      const results = await this.simpleJSONP(apiUrl, params);
      
      // Cache results
      this.setCache(cacheKey, results);
      
      return results;
    } catch (error) {
      Utils.logError('DataService.fetchResultsInternal', error, { competitionId, category });
      throw new Error(`ไม่สามารถโหลดผลการแข่งขัน ${competitionId} ได้: ${error.message}`);
    }
  }

  /**
   * Get API URL by category
   * @param {string} category - Category (science/gem)
   * @returns {string} API URL
   */
  getApiUrl(category) {
    if (category === 'science') {
      return this.scienceUrl;
    } else if (category === 'gem' || category === 'academic') {
      return this.gemUrl;
    }
    return this.scienceUrl; // Default
  }

  /**
   * Simple JSONP request (like working project)
   * @param {string} url - Request URL  
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} Response data
   */
  async simpleJSONP(url, params = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      const cleanup = () => {
        try {
          delete window[callbackName];
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      };
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(CONFIG.ERRORS.TIMEOUT));
      }, this.timeout);

      // Create callback function
      window[callbackName] = (response) => {
        clearTimeout(timeoutId);
        cleanup();
        
        if (response && response.success) {
          resolve(response.data || []);
        } else {
          reject(new Error(response?.error || CONFIG.ERRORS.API_ERROR));
        }
      };

      // Create and append script
      const script = document.createElement('script');
      const urlParams = new URLSearchParams({
        ...params,
        callback: callbackName,
        t: Date.now()
      });
      
      script.src = `${url}?${urlParams}`;
      script.async = true;
      
      script.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error(CONFIG.ERRORS.NETWORK));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Fetch science competitions data
   * @returns {Promise<Array>} Science competitions array
   */
  async fetchScienceCompetitions() {
    try {
      const url = this.scienceUrl;
      const params = { action: 'getCompetitions' };
      
      // Use simple JSONP like working project
      if (CONFIG.MOCK.ENABLED) {
        return await this.request(url, params);
      } else {
        return await this.simpleJSONP(url, params);
      }
    } catch (error) {
      Utils.logError('DataService.fetchScienceCompetitions', error);
      throw new Error(CONFIG.ERRORS.SCIENCE_LOAD_FAILED || 'ไม่สามารถโหลดรายการการแข่งขันวิทยาศาสตร์ได้');
    }
  }

  /**
   * Fetch gem competitions data
   * @returns {Promise<Array>} Gem competitions array
   */
  async fetchGemCompetitions() {
    try {
      const url = this.gemUrl;
      const params = { action: 'getCompetitions' };
      
      // Use simple JSONP like working project
      if (CONFIG.MOCK.ENABLED) {
        return await this.request(url, params);
      } else {
        return await this.simpleJSONP(url, params);
      }
    } catch (error) {
      Utils.logError('DataService.fetchGemCompetitions', error);
      throw new Error(CONFIG.ERRORS.GEM_LOAD_FAILED || 'ไม่สามารถโหลดรายการการแข่งขันเจียระไนเพชรได้');
    }
  }

  /**
   * Fetch all competitions data
   * @returns {Promise<Object>} Object containing both science and gem competitions
   */
  async fetchAllCompetitions() {
    try {
      const [scienceCompetitions, gemCompetitions] = await Promise.allSettled([
        this.fetchScienceCompetitions(),
        this.fetchGemCompetitions()
      ]);

      return {
        science: scienceCompetitions.status === 'fulfilled' ? scienceCompetitions.value : [],
        gem: gemCompetitions.status === 'fulfilled' ? gemCompetitions.value : [],
        errors: {
          science: scienceCompetitions.status === 'rejected' ? scienceCompetitions.reason : null,
          gem: gemCompetitions.status === 'rejected' ? gemCompetitions.reason : null
        }
      };
    } catch (error) {
      Utils.logError('DataService.fetchAllCompetitions', error);
      throw error;
    }
  }

  /**
   * Fetch statistics data (legacy)
   * @returns {Promise<Array>} Statistics array
   */
  async fetchStatistics() {
    try {
      // For now, use science URL for statistics
      const url = this.scienceUrl;
      const params = { action: 'getStatistics' };
      
      // Use simple JSONP like working project
      if (CONFIG.MOCK.ENABLED) {
        return await this.request(url, params);
      } else {
        return await this.simpleJSONP(url, params);
      }
    } catch (error) {
      Utils.logError('DataService.fetchStatistics', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async request(url, options = {}) {
    const { MAX_ATTEMPTS, DELAY } = this.retryConfig;
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.makeRequest(url, options);
        return response;
      } catch (error) {
        lastError = error;
        Utils.logError('DataService.request', error, { url, attempt });
        
        if (attempt < MAX_ATTEMPTS) {
          await Utils.sleep(DELAY * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Make actual HTTP request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(url, options = {}) {
    // Check cache first
    const cacheKey = `${url}?${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Use mock data only when explicitly enabled
    if (CONFIG.MOCK.ENABLED) {
      const mockResponse = await this.getMockResponse(url, options);
      this.setCache(cacheKey, mockResponse);
      return mockResponse;
    }

    // Make real API request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || CONFIG.ERRORS.API_ERROR);
      }

      this.setCache(cacheKey, data.data);
      return data.data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(CONFIG.ERRORS.TIMEOUT);
      }
      
      throw error;
    }
  }

  /**
   * Get mock response for development
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Mock response data
   */
  async getMockResponse(url, options) {
    // Simulate API delay
    await Utils.sleep(CONFIG.MOCK.DELAY);

    const urlObj = new URL(url, window.location.origin);
    const action = urlObj.searchParams.get('action') || options.action;
    const id = urlObj.searchParams.get('id') || options.id;

    // Determine category from URL
    const isScience = url.includes('science') || url === this.scienceUrl;
    const isGem = url.includes('gem') || url === this.gemUrl;

    switch (action) {
      case 'getCompetitions':
        if (isScience) return this.getMockScienceCompetitions();
        if (isGem) return this.getMockGemCompetitions();
        return this.getMockCompetitions(); // Fallback
      
      case 'getResults':
        return this.getMockResults(id);
      
      case CONFIG.API.ENDPOINTS.STATISTICS:
        return this.getMockStatistics();
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Get mock science competitions data
   * @returns {Array} Mock science competitions array
   */
  getMockScienceCompetitions() {
    return CONFIG.MOCK.SCIENCE_COMPETITIONS;
  }

  /**
   * Get mock gem competitions data
   * @returns {Array} Mock gem competitions array
   */
  getMockGemCompetitions() {
    return CONFIG.MOCK.GEM_COMPETITIONS;
  }

  /**
   * Get mock competitions data (legacy fallback)
   * @returns {Array} Mock competitions array
   */
  getMockCompetitions() {
    return [...this.getMockScienceCompetitions(), ...this.getMockGemCompetitions()];
  }

  /**
   * Get mock results data
   * @param {string} competitionId - Competition ID
   * @returns {Array} Mock results array
   */
  getMockResults(competitionId) {
    if (!competitionId) {
      throw new Error(CONFIG.ERRORS.COMPETITION_NOT_FOUND);
    }

    // Generate mock results based on competition ID
    const mockResults = [
      {
        rank: 1,
        level: 'ประถมศึกษา',
        type: 'ทักษะเต็มรูป',
        award: 'ชนะเลิศ',
        school: 'ค่ายลูกเสือบ้านโป่ง',
        participants: '-',
        coach: '-',
        certificate_url: 'https://www.canva.com/design/DAGxb5NjWlQ/Hn2mK-ImumJxC0v_qJnZAw/edit'
      },
      {
        rank: 2,
        level: 'ทั่วไป',
        type: 'พร้อมลอย',
        award: 'ชนะเลิศ',
        school: 'บ้านคาวิทยา',
        participants: '-',
        coach: '-',
        certificate_url: 'https://www.canva.com/design/DAGxb5NjWlQ/Hn2mK-ImumJxC0v_qJnZAw/edit'
      },
      {
        rank: 3,
        level: '',
        type: '',
        award: 'รองชนะเลิศอันดับ 1',
        school: 'ปากท่อพิทยาคม',
        participants: '-',
        coach: '-',
        certificate_url: 'https://www.canva.com/design/DAGxb5NjWlQ/Hn2mK-ImumJxC0v_qJnZAw/edit'
      },
      {
        rank: 4,
        level: '',
        type: '',
        award: 'รองชนะเลิศอันดับ 2',
        school: 'วัดหลักสี่ฯ',
        participants: '-',
        coach: '-',
        certificate_url: 'https://www.canva.com/design/DAGxb5NjWlQ/Hn2mK-ImumJxC0v_qJnZAw/edit'
      }
    ];

    return mockResults;
  }

  /**
   * Get mock statistics data
   * @returns {Array} Mock statistics array
   */
  getMockStatistics() {
    return [];
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached data or null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Remove expired cache
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data to cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    clearGlobalCache();
    try {
      localStorage.removeItem(CONFIG.CACHE.PERSIST_KEY);
      localStorage.removeItem(CONFIG.CACHE.VERSION_KEY);
    } catch (error) {
      console.warn('Cannot clear localStorage:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      globalCache: {
        isLoaded: GLOBAL_CACHE.isLoaded,
        lastUpdated: GLOBAL_CACHE.lastUpdated,
        competitionsCount: GLOBAL_CACHE.competitions ? 
          (GLOBAL_CACHE.competitions.science.length + GLOBAL_CACHE.competitions.gem.length) : 0,
        resultsCount: GLOBAL_CACHE.results.size
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataService;
}