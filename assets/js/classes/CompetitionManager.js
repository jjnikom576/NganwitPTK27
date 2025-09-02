// ===== Competition Manager Class - Updated for Pre-load Cache =====

/**
 * CompetitionManager class handles competition data processing and management
 * Now uses pre-loaded cache for instant access
 */
class CompetitionManager {

  constructor() {
    this.dataService = new DataService();
    this.competitions = {
      science: [],
      gem: [],
      all: []
    };
    this.results = new Map();
    this.isLoading = false;
    this.errors = {
      science: null,
      gem: null
    };
    this.isInitialized = false;
  }

  /**
   * Initialize the competition manager - UPDATED
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.isLoading = true;

      // Check if global cache is already loaded and valid
      if (this.dataService.isCacheReady()) {
        console.log('🚀 Loading from global cache...');
        this.loadFromGlobalCache();
        this.isInitialized = true;
        return;
      }

      // Try to load from localStorage first
      if (this.dataService.loadFromLocalStorage()) {
        console.log('💾 Loading from localStorage cache...');
        this.loadFromGlobalCache();
        this.isInitialized = true;
        return;
      }

      // If no cache available, pre-load everything
      console.log('📡 No cache found, pre-loading all data...');
      await this.preloadAllData();
      this.isInitialized = true;

    } catch (error) {
      Utils.logError('CompetitionManager.initialize', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Pre-load all data using DataService - NEW
   * @returns {Promise<void>}
   */
  async preloadAllData() {
    try {
      const result = await this.dataService.preloadAllData();
      
      if (result.success) {
        this.loadFromGlobalCache();
        console.log(`✅ Pre-load successful: ${result.summary.loaded}/${result.summary.total} competitions`);
      } else {
        throw new Error('Pre-load failed');
      }
      
    } catch (error) {
      Utils.logError('CompetitionManager.preloadAllData', error);
      // Try to load competitions only (without results) as fallback
      await this.loadAllCompetitions();
    }
  }

  /**
   * Load data from global cache - NEW
   */
  loadFromGlobalCache() {
    if (!GLOBAL_CACHE.isLoaded || !GLOBAL_CACHE.competitions) {
      throw new Error('Global cache is not ready');
    }

    // Load competitions from global cache
    this.competitions.science = this.processCompetitions(GLOBAL_CACHE.competitions.science || [], 'science');
    this.competitions.gem = this.processCompetitions(GLOBAL_CACHE.competitions.gem || [], 'gem');
    this.competitions.all = [...this.competitions.science, ...this.competitions.gem];

    // Load errors from global cache
    this.errors = GLOBAL_CACHE.competitions.errors || { science: null, gem: null };

    console.log(`📊 Loaded from cache: ${this.competitions.science.length} science + ${this.competitions.gem.length} gem competitions`);
  }

  /**
   * Load all competitions from both APIs - UPDATED (fallback only)
   * @returns {Promise<void>}
   */
  async loadAllCompetitions() {
    try {
      const result = await this.dataService.fetchAllCompetitions();

      // Store competitions by category
      this.competitions.science = this.processCompetitions(result.science || [], 'science');
      this.competitions.gem = this.processCompetitions(result.gem || [], 'gem');

      // Store all competitions combined
      this.competitions.all = [...this.competitions.science, ...this.competitions.gem];

      // Store any errors
      this.errors = result.errors || { science: null, gem: null };

    } catch (error) {
      Utils.logError('CompetitionManager.loadAllCompetitions', error);
      throw new Error(CONFIG.ERRORS.API_ERROR);
    }
  }

  /**
   * Process and validate competitions data
   * @param {Array} rawCompetitions - Raw competitions data
   * @param {string} category - Competition category
   * @returns {Array} Processed competitions
   */
  processCompetitions(rawCompetitions, category) {
    const keepSheetOrder = true; // ← ตั้งค่าโหมดได้

    const items = rawCompetitions
      .filter(c => this.validateCompetition(c))
      .map((c, idx) => this.normalizeCompetition({ ...c, __orderIndex: idx }, category));

    if (keepSheetOrder) return items;

    return items.sort((a, b) => {
      if (a.participantCount !== b.participantCount) {
        return (b.participantCount || 0) - (a.participantCount || 0);
      }
      return a.name.localeCompare(b.name, 'th');
    });
  }

  /**
   * Validate competition data structure
   * @param {Object} competition - Competition object
   * @returns {boolean} True if valid
   */
  validateCompetition(competition) {
    const required = ['id', 'name'];
    const isValid = required.every(field =>
      competition.hasOwnProperty(field) &&
      competition[field] !== null &&
      competition[field] !== undefined &&
      competition[field] !== ''
    );

    if (!isValid) {
      Utils.logError('CompetitionManager.validateCompetition', 'Invalid competition', competition);
    }

    return isValid;
  }

  /**
   * Normalize competition data
   * @param {Object} competition - Competition object
   * @param {string} category - Competition category
   * @returns {Object} Normalized competition
   */
  normalizeCompetition(competition, category) {
    return {
      id: String(competition.id).trim(),
      name: String(competition.name).trim(),
      category: category || String(competition.category || 'science').toLowerCase().trim(),
      level: competition.level ? String(competition.level).trim() : 'ทุกระดับ',
      status: String(competition.status || 'completed').toLowerCase().trim(),
      description: competition.description ? String(competition.description).trim() : '',
      participantCount: parseInt(competition.participantCount) || 0,
      icon: competition.icon || this.getDefaultIcon(category),
      date: competition.date || null,
      orderIndex: typeof competition.__orderIndex === 'number' ? competition.__orderIndex : undefined
    };
  }

  /**
   * Get default icon for category
   * @param {string} category - Competition category
   * @returns {string} Default icon
   */
  getDefaultIcon(category) {
    return category === 'gem' ? '💎' : '🔬';
  }

  /**
   * Get all competitions
   * @returns {Array} All competitions
   */
  getAllCompetitions() {
    return [...this.competitions.all];
  }

  /**
   * Get competitions by category
   * @param {string} category - Category ID (science/gem/academic)
   * @returns {Array} Filtered competitions
   */
  getCompetitionsByCategory(category) {
    if (!category) return [];

    const normalizedCategory = category.toLowerCase().trim();

    // Map academic to gem for backward compatibility
    if (normalizedCategory === 'academic') {
      return [...this.competitions.gem];
    }

    return [...(this.competitions[normalizedCategory] || [])];
  }

  /**
   * Get competition by ID
   * @param {string} competitionId - Competition ID
   * @returns {Object|null} Competition object or null
   */
  getCompetitionById(competitionId) {
    if (!competitionId) return null;

    const normalizedId = String(competitionId).trim();
    return this.competitions.all.find(comp => comp.id === normalizedId) || null;
  }

  /**
   * Get competitions grouped by category
   * @returns {Object} Competitions grouped by category
   */
  getCompetitionsGrouped() {
    return {
      science: [...this.competitions.science],
      gem: [...this.competitions.gem],
      // For backward compatibility
      academic: [...this.competitions.gem]
    };
  }

  /**
   * Load results for specific competition - UPDATED
   * @param {string} competitionId - Competition ID
   * @returns {Promise<Array>} Results array
   */
  async loadResults(competitionId) {
    if (!competitionId) {
      throw new Error(CONFIG.ERRORS.COMPETITION_NOT_FOUND);
    }

    // Check if already loaded in memory
    if (this.results.has(competitionId)) {
      return this.results.get(competitionId);
    }

    // Check global cache first (from pre-load)
    if (GLOBAL_CACHE.results.has(competitionId)) {
      const cachedResults = GLOBAL_CACHE.results.get(competitionId);
      const processedResults = this.processResults(cachedResults, competitionId);
      
      // Store in local memory for faster access
      this.results.set(competitionId, processedResults);
      
      console.log(`📋 Results for ${competitionId} loaded from global cache`);
      return processedResults;
    }

    // Fallback: fetch from API if not in cache
    try {
      // Find competition to determine category
      const competition = this.getCompetitionById(competitionId);
      if (!competition) {
        throw new Error(CONFIG.ERRORS.COMPETITION_NOT_FOUND);
      }

      console.log(`📡 Fetching results for ${competitionId} from API (not in cache)`);
      
      // Fetch results with correct category
      const rawResults = await this.dataService.fetchResults(competitionId, competition.category);
      const processedResults = this.processResults(rawResults, competitionId);

      // Cache results both locally and globally
      this.results.set(competitionId, processedResults);
      GLOBAL_CACHE.results.set(competitionId, rawResults);

      return processedResults;
    } catch (error) {
      Utils.logError('CompetitionManager.loadResults', error, { competitionId });
      throw error;
    }
  }

  /**
   * Process and validate results data
   * @param {Array} rawResults - Raw results data
   * @param {string} competitionId - Competition ID
   * @returns {Array} Processed results
   */
  processResults(rawResults, competitionId) {
    if (!Array.isArray(rawResults)) {
      Utils.logError('CompetitionManager.processResults', 'Invalid results format', { rawResults, competitionId });
      return [];
    }

    return rawResults
      .filter(result => this.validateResult(result))
      .map(result => this.normalizeResult(result, competitionId))
      .sort((a, b) => this.compareResults(a, b));
  }

  /**
   * Validate result data structure
   * @param {Object} result - Result object
   * @returns {boolean} True if valid
   */
  validateResult(result) {
    const school = result.school ?? result['โรงเรียน'];
    const award = result.award ?? result['รางวัล'];
    const hasSchool = school && String(school).trim() !== '';
    const hasAward = award && String(award).trim() !== '';
    return hasSchool || hasAward;
  }

  /**
   * Normalize result data
   * @param {Object} result - Result object
   * @param {string} competitionId - Competition ID
   * @returns {Object} Normalized result
   */
  normalizeResult(result, competitionId) {
    const level = result.level ?? result['ระดับ'] ?? '';
    const type = result.type ?? result['ประเภท'] ?? '';
    const award = result.award ?? result['รางวัล'] ?? '';
    const school = result.school ?? result['โรงเรียน'] ?? '';
    const certTh = result['ดาวโหลดน์เกียรติบัตร'] ?? result['ดาวโหลดเกียรติบัตร'] ?? '';
    const certEn = result.certificate_url ?? result.certificateUrl ?? '';

    return {
      competitionId,
      rank: (() => {
        const raw = (result['ลำดับที่'] ?? result.rank ?? '');
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) ? n : null;
      })(),
      level: String(level).trim(),
      type: String(type).trim(),
      award: String(award).trim(),
      school: String(school).trim(),
      participants: result.participants ? String(result.participants).trim() : '-',
      coach: result.coach ? String(result.coach).trim() : '-',
      certificateUrl: String(certEn || certTh || '').trim(),
      projectTitle: result.project_title ? String(result.project_title).trim() : '',
      notes: result.notes ? String(result.notes).trim() : ''
    };
  }

  /**
   * Compare results for sorting
   * @param {Object} a - First result
   * @param {Object} b - Second result
   * @returns {number} Comparison result
   */
  compareResults(a, b) {
    const toNum = v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY; // ไม่มีลำดับ → ไปท้าย
    };

    // ✅ เรียงตาม "ลำดับ" จาก API ก่อน
    const ra = toNum(a.rank ?? a['ลำดับที่']);
    const rb = toNum(b.rank ?? b['ลำดับที่']);
    if (ra !== rb) return ra - rb;

    // รองลงมา: รางวัล (ถ้าลำดับเท่ากัน)
    const A = getAwardConfig(a.award);
    const B = getAwardConfig(b.award);
    if (A && B && A.rank !== B.rank) return A.rank - B.rank;
    if (A && !B) return -1;
    if (!A && B) return 1;

    // สุดท้าย: โรงเรียน (กันกรณีทุกอย่างเท่ากัน)
    return (a.school || '').localeCompare((b.school || ''), 'th');
  }

  /**
   * Get results summary for competition
   * @param {string} competitionId - Competition ID
   * @returns {Promise<Object>} Results summary
   */
  async getResultsSummary(competitionId) {
    try {
      const results = await this.loadResults(competitionId);

      const summary = {
        total: results.length,
        byAward: {},
        byLevel: {},
        hasErrors: false
      };

      // Count by award type
      results.forEach(result => {
        if (result.award) {
          const award = result.award;
          summary.byAward[award] = (summary.byAward[award] || 0) + 1;
        }

        if (result.level) {
          const level = result.level;
          summary.byLevel[level] = (summary.byLevel[level] || 0) + 1;
        }
      });

      return summary;
    } catch (error) {
      Utils.logError('CompetitionManager.getResultsSummary', error, { competitionId });
      return {
        total: 0,
        byAward: {},
        byLevel: {},
        hasErrors: true,
        error: error.message
      };
    }
  }

  /**
   * Search competitions by name
   * @param {string} query - Search query
   * @param {string} category - Category filter (optional)
   * @returns {Array} Matching competitions
   */
  searchCompetitions(query, category = null) {
    let competitions = this.getAllCompetitions();

    // Filter by category if specified
    if (category) {
      competitions = this.getCompetitionsByCategory(category);
    }

    // Filter by query
    if (!query || query.trim() === '') {
      return competitions;
    }

    const normalizedQuery = query.toLowerCase().trim();

    return competitions.filter(competition =>
      competition.name.toLowerCase().includes(normalizedQuery) ||
      competition.description.toLowerCase().includes(normalizedQuery) ||
      competition.level.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Get statistics about competitions
   * @returns {Object} Competition statistics
   */
  getStatistics() {
    const stats = {
      total: this.competitions.all.length,
      science: this.competitions.science.length,
      gem: this.competitions.gem.length,
      byCategory: {
        science: this.competitions.science.length,
        gem: this.competitions.gem.length
      },
      byLevel: {},
      byStatus: {},
      errors: { ...this.errors },
      hasErrors: !!(this.errors.science || this.errors.gem)
    };

    // Count by level and status
    this.competitions.all.forEach(competition => {
      // Count by level
      const level = competition.level || 'ไม่ระบุ';
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;

      // Count by status
      const status = competition.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear cached results
   * @param {string} competitionId - Competition ID (optional, clears all if not provided)
   */
  clearResultsCache(competitionId = null) {
    if (competitionId) {
      this.results.delete(competitionId);
    } else {
      this.results.clear();
    }
  }

  /**
   * Refresh competitions data - UPDATED
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      this.isLoading = true;
      this.isInitialized = false;
      
      // Clear all caches
      this.clearResultsCache();
      this.dataService.clearCache();
      
      // Force pre-load everything again
      console.log('🔄 Force refreshing all data...');
      await this.preloadAllData();
      
      this.isInitialized = true;
      
    } catch (error) {
      Utils.logError('CompetitionManager.refresh', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if manager is currently loading
   * @returns {boolean} True if loading
   */
  getLoadingState() {
    return this.isLoading;
  }

  /**
   * Get manager information - UPDATED
   * @returns {Object} Manager info
   */
  getInfo() {
    return {
      competitionsCount: {
        total: this.competitions.all.length,
        science: this.competitions.science.length,
        gem: this.competitions.gem.length
      },
      cachedResultsCount: this.results.size,
      isLoading: this.isLoading,
      isInitialized: this.isInitialized,
      hasErrors: !!(this.errors.science || this.errors.gem),
      errors: { ...this.errors },
      dataServiceStats: this.dataService.getCacheStats(),
      globalCacheStats: {
        isLoaded: GLOBAL_CACHE.isLoaded,
        lastUpdated: GLOBAL_CACHE.lastUpdated,
        cacheAge: GLOBAL_CACHE.lastUpdated ? Date.now() - GLOBAL_CACHE.lastUpdated : null
      }
    };
  }

  /**
   * Check if competitions are loaded successfully
   * @param {string} category - Category to check (optional)
   * @returns {boolean} True if loaded successfully
   */
  isLoaded(category = null) {
    if (!category) {
      return this.competitions.all.length > 0;
    }

    if (category === 'academic') category = 'gem'; // Map academic to gem

    return this.competitions[category] && this.competitions[category].length > 0;
  }

  /**
   * Get loading errors
   * @returns {Object} Loading errors
   */
  getLoadingErrors() {
    return { ...this.errors };
  }

  /**
   * Check if initialized - NEW
   * @returns {boolean} True if initialized
   */
  isReady() {
    return this.isInitialized && !this.isLoading;
  }

  /**
   * Get cache status - NEW
   * @returns {Object} Cache status info
   */
  getCacheStatus() {
    return {
      globalCache: {
        isLoaded: GLOBAL_CACHE.isLoaded,
        isValid: isCacheValid(),
        lastUpdated: GLOBAL_CACHE.lastUpdated,
        competitionsCount: GLOBAL_CACHE.competitions ? 
          (GLOBAL_CACHE.competitions.science.length + GLOBAL_CACHE.competitions.gem.length) : 0,
        resultsCount: GLOBAL_CACHE.results.size
      },
      localStorage: {
        hasCache: !!localStorage.getItem(CONFIG.CACHE.PERSIST_KEY),
        version: localStorage.getItem(CONFIG.CACHE.VERSION_KEY)
      },
      memory: {
        competitionsLoaded: this.competitions.all.length,
        resultsLoaded: this.results.size
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompetitionManager;
}