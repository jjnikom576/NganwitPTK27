// ===== Main Landing Page Logic - Updated for Pre-load Cache =====

/**
 * Main application class for landing page
 * Now supports pre-loading with persistent cache
 */
class MainApp {

  constructor() {
    this.competitionManager = new CompetitionManager();
    this.isInitialized = false;
    this.elements = {};
  }

  /**
   * Handle navigation clicks (competition items, etc.)
   * @param {Event} event - Click event
   */
  handleNavigation(event) {
    const competitionItem = event.target.closest('.competition-item');

    if (competitionItem) {
      event.preventDefault();

      const competitionId = competitionItem.getAttribute('data-id');
      const competitionName = competitionItem.getAttribute('data-name') || 'การแข่งขัน';

      if (competitionId) {
        // Add click feedback
        Utils.addClass(competitionItem, 'clicked');
        setTimeout(() => {
          Utils.removeClass(competitionItem, 'clicked');
        }, 150);

        // Navigate to results page
        this.navigateToResults(competitionId, competitionName);
      }
    }
  }

  /**
   * Navigate to results page
   * @param {string} competitionId - Competition ID
   * @param {string} competitionName - Competition name for analytics
   */
  navigateToResults(competitionId, competitionName) {
    try {
      // Track navigation if analytics available
      if (typeof gtag !== 'undefined') {
        gtag('event', 'view_results', {
          event_category: 'navigation',
          event_label: competitionName,
          competition_id: competitionId
        });
      }

      // Navigate to results page
      const resultsUrl = `results.html?id=${encodeURIComponent(competitionId)}`;
      window.location.href = resultsUrl;

    } catch (error) {
      Utils.logError('MainApp.navigateToResults', error, { competitionId, competitionName });
      Utils.showNotification('ไม่สามารถเปิดหน้าผลการแข่งขันได้', 'error');
    }
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      this.bindElements();
      this.setupEventListeners();
      await this.loadData();
      this.isInitialized = true;
    } catch (error) {
      Utils.logError('MainApp.init', error);
      this.showError(CONFIG.ERRORS.API_ERROR);
    }
  }

  /**
   * Bind DOM elements
   */
  bindElements() {
    this.elements = {
      // Containers
      scienceContainer: Utils.getElementById('science-competitions'),
      academicContainer: Utils.getElementById('academic-competitions'), // Maps to gem
      statisticsSection: Utils.getElementById('statistics-section'),

      // Loading elements
      loadingOverlay: Utils.getElementById('loading-overlay'),

      // Error elements
      errorContainer: Utils.getElementById('error-container')
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window events
    window.addEventListener('load', () => {
      this.hideInitialLoading();
    });

    window.addEventListener('resize', Utils.throttle(() => {
      this.handleResize();
    }, 250));

    // Navigation events
    document.addEventListener('click', (event) => {
      this.handleNavigation(event);
    });

    // Error retry events
    document.addEventListener('click', (event) => {
      if (event.target.matches('.retry-button')) {
        this.retryLoad();
      }
    });
    
  }

  /**
   * Load competition data - UPDATED for cache-first approach
   */
  async loadData() {
    try {
      // Check if data is already in cache
      if (this.competitionManager.dataService.isCacheReady()) {
        console.log('🚀 Fast loading from cache...');
        this.showLoading('โหลดข้อมูลสำเร็จ');

        await this.competitionManager.initialize();
        this.renderCompetitions();
        this.hideLoading();

        Utils.showNotification(CONFIG.SUCCESS.CACHE_LOADED, 'success', 2000);
        return;
      }

      // Check localStorage cache
      console.log('💾 Checking localStorage cache...');
      this.showLoading('ตรวจสอบ cache ที่เก็บไว้...');

      if (this.competitionManager.dataService.loadFromLocalStorage()) {
        await this.competitionManager.initialize();
        this.renderCompetitions();
        this.hideLoading();

        Utils.showNotification('โหลดข้อมูลสำเร็จ', 'success', 2000);
        return;
      }

      // First time load - pre-load everything
      console.log('📡 First time loading - downloading all data...');
      this.showLoading('กำลังดาวน์โหลดข้อมูลครั้งแรก กรุณารอสักครู่...', true);

      // Initialize will trigger preloadAllData
      await this.competitionManager.initialize();

      // Get loading statistics
      const stats = this.competitionManager.getStatistics();
      const errors = this.competitionManager.getLoadingErrors();

      // Render competitions
      this.renderCompetitions();

      // Show appropriate messages based on loading results
      this.handleLoadingResults(stats, errors);

    } catch (error) {
      Utils.logError('MainApp.loadData', error);
      this.showError(error.message || CONFIG.ERRORS.API_ERROR);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Handle loading results and show appropriate messages
   * @param {Object} stats - Competition statistics
   * @param {Object} errors - Loading errors
   */
  handleLoadingResults(stats, errors) {
    const hasScience = stats.science > 0;
    const hasGem = stats.gem > 0;
    const hasErrors = errors.science || errors.gem;

    if (hasScience && hasGem) {
      // Both loaded successfully
      Utils.showNotification(CONFIG.SUCCESS.PRELOAD_COMPLETE, 'success', 3000);

      // Show cache info in development
      if (isDevelopment()) {
        const cacheStatus = this.competitionManager.getCacheStatus();
        console.log('🎉 Pre-load complete:', cacheStatus);
      }
    } else if (hasScience || hasGem) {
      // Partial success
      const loadedCategory = hasScience ? 'วิทยาศาสตร์' : 'เจียระไนเพชร';
      const failedCategory = hasScience ? 'เจียระไนเพชร' : 'วิทยาศาสตร์';
      Utils.showNotification(
        `โหลดข้อมูล${loadedCategory}สำเร็จ แต่ไม่สามารถโหลดข้อมูล${failedCategory}ได้`,
        'warning',
        4000
      );
    } else if (hasErrors) {
      // Complete failure
      this.showError('ไม่สามารถโหลดข้อมูลการแข่งขันได้');
    } else {
      // No data but no errors (empty)
      Utils.showNotification('ไม่มีข้อมูลการแข่งขันในขณะนี้', 'info');
    }
  }

  /**
   * Render competitions on the page
   */
  renderCompetitions() {
    const grouped = this.competitionManager.getCompetitionsGrouped();
    const errors = this.competitionManager.getLoadingErrors();

    // Render science competitions
    if (this.elements.scienceContainer) {
      if (errors.science) {
        this.renderErrorState(
          this.elements.scienceContainer,
          'ไม่สามารถโหลดข้อมูลการแข่งขันวิทยาศาสตร์ได้',
          'science'
        );
      } else {
        this.renderCategoryCompetitions(
          this.elements.scienceContainer,
          grouped.science,
          'science'
        );
      }
    }

    // Render academic (gem) competitions
    if (this.elements.academicContainer) {
      if (errors.gem) {
        this.renderErrorState(
          this.elements.academicContainer,
          'ไม่สามารถโหลดข้อมูลการแข่งขันเจียระไนเพชรได้',
          'gem'
        );
      } else {
        this.renderCategoryCompetitions(
          this.elements.academicContainer,
          grouped.gem, // Use gem data for academic section
          'gem'
        );
      }
    }

    // Add refresh button if needed - NEW
    this.addRefreshButton();
  }

  /**
   * Add refresh button to the page - NEW
   */
  // Add refresh button to the page - SIMPLIFIED (ใช้แบบ results)
  addRefreshButton() {
    // Only add if not already exists
    if (document.querySelector('.refresh-cache-button')) {
      return;
    }

    // Create refresh button - ใช้ onclick แบบเดียวกับ results
    const refreshButton = Utils.createElement('button', {
      className: 'refresh-cache-button',
      onclick: 'clearCacheAndReload()',
      title: 'รีเฟรชข้อมูลทั้งหมด',
      'aria-label': 'รีเฟรชข้อมูลทั้งหมด'
    });

    refreshButton.innerHTML = `
    <span>🔄</span>
    <span>รีเฟรชข้อมูล</span>
  `;

    // Add to header
    const header = document.querySelector('.header');
    if (header) {
      header.appendChild(refreshButton);
    }

    // Add basic styling - เหมือนเดิม
    refreshButton.style.cssText = `
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 10;
    transition: all 0.2s;
  `;

    // Add hover effect - เหมือนเดิม  
    refreshButton.addEventListener('mouseenter', () => {
      refreshButton.style.background = 'var(--color-primary-dark)';
      refreshButton.style.transform = 'translateY(-2px)';
    });

    refreshButton.addEventListener('mouseleave', () => {
      refreshButton.style.background = 'var(--color-primary)';
      refreshButton.style.transform = 'translateY(0)';
    });
  }

 

  /**
   * Render competitions for a specific category
   * @param {HTMLElement} container - Container element
   * @param {Array} competitions - Competitions array
   * @param {string} category - Category ID
   */
  renderCategoryCompetitions(container, competitions, category) {
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    if (!competitions || competitions.length === 0) {
      this.renderEmptyState(container, category);
      return;
    }

    // Create competition list
    const competitionList = Utils.createElement('ul', {
      className: 'competition-list',
      role: 'list'
    });

    competitions.forEach((competition, index) => {
      const listItem = this.createCompetitionItem(competition, category, index);
      competitionList.appendChild(listItem);
    });

    container.appendChild(competitionList);
  }

  /**
   * Create competition item element
   * @param {Object} competition - Competition data
   * @param {string} category - Category ID
   * @param {number} index - Item index for animation
   * @returns {HTMLElement} Competition item element
   */
  createCompetitionItem(competition, category, index = 0) {
    const listItem = Utils.createElement('li', {
      className: 'competition-item',
      dataset: {
        competitionId: competition.id,
        category: category
      },
      style: `animation-delay: ${index * 50}ms` // Stagger animation
    });

    const link = Utils.createElement('a', {
      className: 'competition-link',
      href: `results.html?id=${encodeURIComponent(competition.id)}`,
      dataset: {
        competitionId: competition.id
      },
      'aria-label': `ดูผลการแข่งขัน ${competition.name}`
    });

    const competitionInfo = Utils.createElement('div', {
      className: 'competition-info'
    });

    const leftContent = Utils.createElement('div', {
      className: 'competition-content'
    });

    // Competition icon and name
    const competitionHeader = Utils.createElement('div', {
      className: 'competition-header'
    });

    if (competition.icon) {
      const icon = Utils.createElement('span', {
        className: 'competition-icon'
      }, competition.icon);
      competitionHeader.appendChild(icon);
    }

    const competitionName = Utils.createElement('div', {
      className: 'competition-name'
    }, Utils.escapeHTML(competition.name));

    competitionHeader.appendChild(competitionName);
    leftContent.appendChild(competitionHeader);

    // Competition details
    const competitionDetails = Utils.createElement('div', {
      className: 'competition-details'
    });

    const competitionLevel = Utils.createElement('span', {
      className: 'competition-level'
    }, Utils.escapeHTML(competition.level || 'ทุกระดับ'));

    competitionDetails.appendChild(competitionLevel);

    // Participant count if available
    if (competition.participantCount > 0) {
      const participantCount = Utils.createElement('span', {
        className: 'participant-count'
      }, `${competition.participantCount} ผลงาน`);
      competitionDetails.appendChild(participantCount);
    }

    leftContent.appendChild(competitionDetails);

    // Right side - arrow
    const arrow = Utils.createElement('div', {
      className: 'competition-arrow',
      'aria-hidden': 'true'
    }, '→');

    competitionInfo.appendChild(leftContent);
    competitionInfo.appendChild(arrow);

    link.appendChild(competitionInfo);
    listItem.appendChild(link);

    return listItem;
  }

  /**
   * Render empty state for category
   * @param {HTMLElement} container - Container element
   * @param {string} category - Category ID
   */
  renderEmptyState(container, category) {
    const categoryConfig = getCategoryConfig(category);
    const categoryName = categoryConfig ? categoryConfig.name : 'หมวดนี้';

    const emptyState = Utils.createElement('div', {
      className: 'empty-state',
      role: 'status',
      'aria-live': 'polite'
    });

    emptyState.innerHTML = `
      <div class="empty-icon" aria-hidden="true">📋</div>
      <div class="empty-title">ยังไม่มีการแข่งขันใน${categoryName}</div>
      <div class="empty-description">รอการอัพเดตข้อมูลการแข่งขัน</div>
    `;

    container.appendChild(emptyState);
  }

  /**
   * Handle navigation clicks
   * @param {Event} event - Click event
   */
  handleNavigation(event) {
    const link = event.target.closest('a[data-competition-id]');
    if (!link) return;

    const competitionId = link.dataset.competitionId;
    if (!competitionId) return;

    // Add click feedback
    const item = link.closest('.competition-item');
    if (item) {
      Utils.addClass(item, 'clicked');

      setTimeout(() => {
        Utils.removeClass(item, 'clicked');
      }, 200);
    }

    // Analytics or tracking can be added here
    Utils.logInfo('Navigation', { competitionId, timestamp: new Date().toISOString() });
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Add responsive logic if needed
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  }

  /**
   * Show loading state - UPDATED
   * @param {string} message - Loading message
   * @param {boolean} showProgress - Show progress indicator
   */
  showLoading(message = 'กำลังโหลดข้อมูล...', showProgress = false) {
    // Update loading overlay message
    const loadingText = document.querySelector('.loader-text');
    if (loadingText) {
      loadingText.textContent = message;
    }

    // Show loading on containers
    [this.elements.scienceContainer, this.elements.academicContainer].forEach(container => {
      if (container) {
        this.renderLoadingState(container);
      }
    });

    // Add progress indicator for first-time load
    if (showProgress) {
      const loader = document.querySelector('.loader');
      if (loader && !loader.querySelector('.progress-info')) {
        const progressInfo = Utils.createElement('div', {
          className: 'progress-info'
        }, 'โหลดข้อมูลครั้งแรก อาจใช้เวลา 10-30 วินาที');

        progressInfo.style.cssText = `
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #666;
          text-align: center;
        `;

        loader.appendChild(progressInfo);
      }
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    // Loading states are cleared by renderCompetitions()
    // This method is kept for API consistency
  }

  /**
   * Hide initial page loading
   */
  hideInitialLoading() {
    if (this.elements.loadingOverlay) {
      Utils.addClass(this.elements.loadingOverlay, 'fade-out');

      setTimeout(() => {
        if (this.elements.loadingOverlay) {
          this.elements.loadingOverlay.style.display = 'none';
          this.elements.loadingOverlay.setAttribute('aria-hidden', 'true');
        }
      }, 300);
    }
  }

  /**
   * Render loading shimmer state
   * @param {HTMLElement} container - Container element
   */
  renderLoadingState(container) {
    if (!container) return;

    container.innerHTML = '';

    const shimmerList = Utils.createElement('ul', {
      className: 'competition-list loading',
      'aria-label': 'กำลังโหลดข้อมูล',
      'aria-busy': 'true'
    });

    // Create shimmer items
    for (let i = 0; i < CONFIG.UI.LOADING.SHIMMER_ROWS; i++) {
      const shimmerItem = Utils.createElement('li', {
        className: 'competition-item loading'
      });

      shimmerItem.innerHTML = `
        <div class="competition-link">
          <div class="competition-info">
            <div class="competition-content">
              <div class="competition-header">
                <div class="competition-name loading-shimmer" style="width: 70%;"></div>
              </div>
              <div class="competition-details">
                <div class="competition-level loading-shimmer" style="width: 40%;"></div>
              </div>
            </div>
            <div class="competition-arrow loading-shimmer" style="width: 20px;">→</div>
          </div>
        </div>
      `;

      shimmerList.appendChild(shimmerItem);
    }

    container.appendChild(shimmerList);
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message) {
    const errorMessage = message || CONFIG.ERRORS.API_ERROR;

    // Show error notification
    Utils.showNotification(errorMessage, 'error', 5000);

    // Render error state in containers that don't have data
    [this.elements.scienceContainer, this.elements.academicContainer].forEach(container => {
      if (container && (!container.querySelector('.competition-list') || container.querySelector('.loading'))) {
        this.renderErrorState(container, errorMessage);
      }
    });
  }

  /**
   * Render error state in container
   * @param {HTMLElement} container - Container element
   * @param {string} message - Error message
   * @param {string} category - Category for retry (optional)
   */
  renderErrorState(container, message, category = null) {
    if (!container) return;

    container.innerHTML = '';

    const errorState = Utils.createElement('div', {
      className: 'error-state',
      role: 'alert',
      'aria-live': 'assertive'
    });

    errorState.innerHTML = `
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <div class="error-title">เกิดข้อผิดพลาด</div>
      <div class="error-message">${Utils.escapeHTML(message)}</div>
      <button class="retry-button" data-category="${category || ''}">ลองอีกครั้ง</button>
    `;

    container.appendChild(errorState);
  }

  /**
   * Retry loading data
   * @param {string} category - Specific category to retry (optional)
   */
  async retryLoad(category = null) {
    try {
      if (category) {
        Utils.showNotification(`กำลังโหลดข้อมูล${category === 'science' ? 'วิทยาศาสตร์' : 'เจียระไนเพชร'}อีกครั้ง...`, 'info', 2000);
      } else {
        Utils.showNotification('กำลังโหลดข้อมูลอีกครั้ง...', 'info', 2000);
      }

      await this.loadData();
    } catch (error) {
      Utils.logError('MainApp.retryLoad', error);
      // Error handling is done in loadData()
    }
  }

  /**
   * Get application statistics
   * @returns {Object} App statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      competitionManager: this.competitionManager.getInfo(),
      competitions: this.competitionManager.getStatistics(),
      cacheStatus: this.competitionManager.getCacheStatus(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export data for debugging
   * @returns {Object} Debug data
   */
  getDebugData() {
    if (!isDevelopment()) {
      return { error: 'Debug data only available in development mode' };
    }

    return {
      ...this.getStats(),
      elements: Object.keys(this.elements),
      competitions: {
        all: this.competitionManager.getAllCompetitions(),
        grouped: this.competitionManager.getCompetitionsGrouped()
      },
      errors: this.competitionManager.getLoadingErrors(),
      globalCache: {
        isLoaded: GLOBAL_CACHE.isLoaded,
        competitionsCount: GLOBAL_CACHE.competitions ?
          (GLOBAL_CACHE.competitions.science.length + GLOBAL_CACHE.competitions.gem.length) : 0,
        resultsCount: GLOBAL_CACHE.results.size,
        lastUpdated: new Date(GLOBAL_CACHE.lastUpdated).toLocaleString('th-TH')
      }
    };
  }

  /**
   * Refresh all data
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      Utils.showNotification('กำลังรีเฟรชข้อมูล...', 'info', 2000);
      await this.competitionManager.refresh();
      this.renderCompetitions();
      Utils.showNotification('รีเฟรชข้อมูลสำเร็จ', 'success');
    } catch (error) {
      Utils.logError('MainApp.refresh', error);
      Utils.showNotification('ไม่สามารถรีเฟรชข้อมูลได้', 'error');
    }
  }

  /**
   * Destroy the application
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('click', this.handleNavigation);
    window.removeEventListener('resize', this.handleResize);

    // Clear data
    this.competitionManager = null;
    this.elements = {};
    this.isInitialized = false;

    Utils.logInfo('MainApp', 'Application destroyed');
  }
}

// ===== Application Initialization =====

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Create and initialize main app
    window.mainApp = new MainApp();
    await window.mainApp.init();

    // Add global error handler
    window.addEventListener('error', (event) => {
      Utils.logError('Global Error', event.error);
      Utils.showNotification('เกิดข้อผิดพลาดที่ไม่คาดคิด', 'error');
    });

    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      Utils.logError('Unhandled Promise Rejection', event.reason);
      Utils.showNotification('เกิดข้อผิดพลาดที่ไม่คาดคิด', 'error');
    });

    // Add keyboard shortcuts for development
    if (isDevelopment()) {
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'r':
              if (event.shiftKey) {
                event.preventDefault();
                window.mainApp.refresh();
              }
              break;
            case 'd':
              if (event.shiftKey) {
                event.preventDefault();
                console.log('Debug Data:', window.mainApp.getDebugData());
              }
              break;
            case 'c':
              if (event.shiftKey) {
                event.preventDefault();
                clearCacheAndReload();
              }
              break;
          }
        }
      });

      Utils.logInfo('Development Mode', 'Keyboard shortcuts: Ctrl+Shift+R (refresh), Ctrl+Shift+D (debug), Ctrl+Shift+C (clear cache)');
    }

    // Log cache status on startup
    console.log('🎉 App initialized successfully');
    if (isDevelopment()) {
      console.log('Cache Status:', window.mainApp.competitionManager.getCacheStatus());
    }

  } catch (error) {
    Utils.logError('App Initialization', error);
    Utils.showNotification(CONFIG.ERRORS.API_ERROR, 'error');

    // Show basic error page
    document.body.innerHTML = `
      <div style="text-align: center; padding: 2rem; font-family: 'Kanit', sans-serif;">
        <h1>เกิดข้อผิดพลาด</h1>
        <p>ไม่สามารถเริ่มต้นแอพลิเคชันได้</p>
        <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin: 0.5rem;">รีโหลดหน้า</button>
        <button onclick="clearCacheAndReload()" style="padding: 0.5rem 1rem; margin: 0.5rem;">ลบ cache และรีโหลด</button>
      </div>
    `;
  }
});

// ===== Export for debugging and testing =====

if (isDevelopment()) {
  // Export utilities and config for console access
  window.CONFIG = CONFIG;
  window.GLOBAL_CACHE = GLOBAL_CACHE;
  window.Utils = Utils;
  window.getAwardConfig = getAwardConfig;
  window.getCategoryConfig = getCategoryConfig;
  window.clearCacheAndReload = clearCacheAndReload;

  // Add console commands
  window.debugCommands = {
    stats: () => window.mainApp?.getStats(),
    debug: () => window.mainApp?.getDebugData(),
    refresh: () => window.mainApp?.refresh(),
    forceRefresh: () => window.mainApp?.forceRefresh(),
    competitions: () => window.mainApp?.competitionManager?.getAllCompetitions(),
    errors: () => window.mainApp?.competitionManager?.getLoadingErrors(),
    cacheStatus: () => window.mainApp?.competitionManager?.getCacheStatus(),
    clearCache: () => clearCacheAndReload()
  };

  console.log('🔧 Development mode active. Available commands:', Object.keys(window.debugCommands));
}