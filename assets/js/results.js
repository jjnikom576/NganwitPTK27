// ===== Results Page Logic - Updated for Real Data Structure =====

/**
 * ResultsApp class handles the results page functionality
 * Displays competition results from Google Sheets with proper column mapping
 */
class ResultsApp {
  constructor() {
    this.competitionManager = new CompetitionManager();
    this.competitionId = null;
    this.competition = null;
    this.results = [];
    this.elements = {};
    this.isLoading = false;
  }

  /**
   * Initialize the results app
   */
  async init() {
    try {
      this.bindElements();
      this.setupEventListeners();
      this.getCompetitionId();

      if (!this.competitionId) {
        this.showError('ไม่พบรหัสการแข่งขันที่ต้องการ');
        return;
      }

      await this.loadData();
    } catch (error) {
      Utils.logError('ResultsApp.init', error);
      this.showError(error.message || CONFIG.ERRORS.API_ERROR);
    }
  }

  
  /**
   * Bind DOM elements
   */
  bindElements() {
    this.elements = {
      loadingOverlay: Utils.getElementById('loading-overlay'),
      competitionTitle: Utils.getElementById('competition-title'),
      competitionInfo: Utils.getElementById('competition-info'),
      resultsContainer: Utils.getElementById('results-container'),
      summarySection: Utils.getElementById('summary-section'),
      errorContainer: Utils.getElementById('error-container'),
      tableNote: Utils.querySelector('.table-note')
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window load event
    window.addEventListener('load', () => {
      this.hideInitialLoading();
    });

    // Resize handler
    window.addEventListener('resize', Utils.throttle(() => {
      this.handleResize();
    }, 250));

    // Certificate link clicks
    document.addEventListener('click', (event) => {
      this.handleCertificateClick(event);
    });

    // Back button for navigation
    const backButton = Utils.querySelector('.back-button');
    if (backButton) {
      backButton.addEventListener('click', (event) => {
        // Add click feedback
        event.currentTarget.style.transform = 'scale(0.98)';
        setTimeout(() => {
          event.currentTarget.style.transform = '';
        }, 100);
      });
    }
  }

  /**
   * Get competition ID from URL parameters
   */
  getCompetitionId() {
    const urlParams = Utils.getURLParams();
    this.competitionId = urlParams.id || null;
  }

  /**
   * Load competition data and results
   */
  async loadData() {
    try {
      this.showLoading();

      // Initialize competition manager
      await this.competitionManager.initialize();

      // Get competition info
      this.competition = this.competitionManager.getCompetitionById(this.competitionId);

      if (!this.competition) {
        throw new Error(CONFIG.ERRORS.COMPETITION_NOT_FOUND);
      }

      // Load results
      this.results = await this.competitionManager.loadResults(this.competitionId);

      // Render everything
      this.renderCompetitionInfo();
      this.renderResults();
      this.renderSummary();

      // Show success message
      Utils.showNotification(CONFIG.SUCCESS.RESULTS_LOADED, 'success');

    } catch (error) {
      Utils.logError('ResultsApp.loadData', error);
      this.showError(error.message || CONFIG.ERRORS.API_ERROR);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render competition information in header
   */
  renderCompetitionInfo() {
    if (!this.competition) return;

    // Update page title
    document.title = `ผลการแข่งขัน${this.competition.name} - งานวิทย์ 27`;

    // Update competition title
    if (this.elements.competitionTitle) {
      this.elements.competitionTitle.textContent = this.competition.name;
    }

    // Create info badges
    if (this.elements.competitionInfo) {
      const categoryConfig = getCategoryConfig(this.competition.category);

      const badges = [
        {
          text: this.competition.level || 'ไม่ระบุระดับ',
          class: 'level',
          icon: '🎓'
        },
        {
          text: categoryConfig ? categoryConfig.name : this.competition.category,
          class: 'category',
          icon: categoryConfig ? categoryConfig.icon : '📋'
        },
        {
          text: `${this.results.length} ผลงาน`,
          class: 'count',
          icon: '👥'
        }
      ];

      this.elements.competitionInfo.innerHTML = badges.map(badge =>
        `<span class="info-badge ${badge.class}">
          <span class="badge-icon">${badge.icon}</span>
          <span class="badge-text">${Utils.escapeHTML(badge.text)}</span>
         </span>`
      ).join('');
    }
  }

  /**
   * Render results table or empty state
   */
  renderResults() {
    if (!this.elements.resultsContainer) return;

    if (!this.results || this.results.length === 0) {
      this.renderEmptyResults();
      return;
    }

    const table = this.createResultsTable();
    this.elements.resultsContainer.innerHTML = '';
    this.elements.resultsContainer.appendChild(table);

    // Show mobile note if needed
    this.handleResize();
  }

  /**
   * Create and return the results table
   */
  createResultsTable() {
    const table = Utils.createElement('table', {
      className: 'results-table',
      'aria-label': `ตารางผลการแข่งขัน ${this.competition.name}`
    });

    // Create header
    const thead = this.createTableHeader();
    table.appendChild(thead);

    // Create body
    const tbody = this.createTableBody();
    table.appendChild(tbody);

    return table;
  }

  /**
   * Create table header for display (8 columns)
   */
  createTableHeader() {
    const thead = Utils.createElement('thead');
    const headerRow = Utils.createElement('tr');

    const headers = [
      { text: 'ลำดับ', class: 'rank-header', width: '60px' },
      { text: 'ระดับ', class: 'level-header', width: '120px' },
      { text: 'ประเภท', class: 'type-header', width: '100px' },
      { text: 'รางวัล', class: 'award-header', width: '150px' },
      { text: 'โรงเรียน', class: 'school-header', width: '200px' },
      { text: 'ผู้เข้าแข่งขัน', class: 'participants-header', width: '150px' },
      { text: 'ผู้ฝึกซ้อม', class: 'coach-header', width: '120px' },
      { text: 'เกียรติบัตร', class: 'certificate-header', width: '120px' }
    ];

    headers.forEach(header => {
      const th = Utils.createElement('th', {
        className: header.class,
        style: header.width ? `width: ${header.width}` : ''
      }, header.text);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    return thead;
  }


  /**
   * Create table body with all result rows
   */
  createTableBody() {
    const tbody = Utils.createElement('tbody');
    const levelOrder = ['ประถมศึกษา', 'มัธยมศึกษาตอนต้น', 'มัธยมศึกษาตอนปลาย', 'ทั่วไป', ''];

    const toIndex = (lvl) => {
      const key = normalizeLevelKey(lvl);
      const idx = levelOrder.indexOf(key);
      return idx === -1 ? Number.POSITIVE_INFINITY : idx; // ไม่รู้จัก → ไปท้าย
    };

    const sorted = this.results.slice().sort((a, b) => {
      const laRaw = this.getFieldValue(a, ['ระดับ', 'level'], '');
      const lbRaw = this.getFieldValue(b, ['ระดับ', 'level'], '');
      const ia = toIndex(laRaw);
      const ib = toIndex(lbRaw);
      if (ia !== ib) return ia - ib;

      // ถ้าช่วงชั้นเท่ากัน ให้เรียงตาม "ลำดับที่" จากชีต (ถ้าไม่มีให้ไปท้าย)
      const ra = Number(this.getFieldValue(a, ['ลำดับที่', 'rank'], Number.POSITIVE_INFINITY));
      const rb = Number(this.getFieldValue(b, ['ลำดับที่', 'rank'], Number.POSITIVE_INFINITY));
      return ra - rb;
    });

    let prevLevelKey = null;
    sorted.forEach((result, i) => {
      const levelRaw = this.getFieldValue(result, ['ระดับ', 'level'], '');
      const levelKey = normalizeLevelKey(levelRaw);

      if (levelKey !== prevLevelKey) {
        const group = Utils.createElement('tr', { className: 'group-row' });
        const th = Utils.createElement('th', { colspan: '8', className: 'group-header' },
          `ช่วงชั้น: ${Utils.escapeHTML(levelKey || 'ไม่ระบุ')}`);
        group.appendChild(th);
        tbody.appendChild(group);
        prevLevelKey = levelKey;
      }

      const row = this.createResultRow(result, i + 1);
      row.dataset.level = levelKey || '';
      tbody.appendChild(row);
    });

    return tbody;
  }


  /**
   * Create individual result row mapping Google Sheets columns
   */
  createResultRow(result, rowNumber) {
    const row = Utils.createElement('tr', {
      'data-competition-id': result.competitionId,
      'data-row-index': rowNumber
    });

    // 1. ลำดับที่ (Rank) - จาก Google Sheets หรือ row number
    const rankValue = this.getFieldValue(result, ['ลำดับที่', 'rank'], '-');
    const rankCell = Utils.createElement('td', { className: 'rank-cell' }, String(rankValue));
    row.appendChild(rankCell);


    // 2. ระดับ (Level) - จาก column ระดับ
    const levelValue = this.getFieldValue(result, ['ระดับ', 'level'], '-');
    const levelCell = Utils.createElement('td', {
      className: 'level-cell',
      title: levelValue
    });
    levelCell.innerHTML = `<span class="level-badge">${Utils.escapeHTML(levelValue)}</span>`;
    row.appendChild(levelCell);

    // 3. ประเภท (Type) - จาก column ประเภท
    const typeValue = this.getFieldValue(result, ['ประเภท', 'type'], '-');
    const typeCell = Utils.createElement('td', {
      className: 'type-cell',
      title: typeValue
    });
    typeCell.innerHTML = `<span class="type-badge">${Utils.escapeHTML(typeValue)}</span>`;
    row.appendChild(typeCell);

    // 4. รางวัล (Award) - จาก column รางวัล
    const awardValue = this.getFieldValue(result, ['รางวัล', 'award'], '-');
    const awardCell = this.createAwardCell(awardValue);
    row.appendChild(awardCell);

    // 5. โรงเรียน (School) - จาก column โรงเรียน
    const schoolValue = this.getFieldValue(result, ['โรงเรียน', 'school'], '-');
    const schoolCell = Utils.createElement('td', {
      className: 'school-cell',
      title: schoolValue
    }, Utils.escapeHTML(schoolValue));
    row.appendChild(schoolCell);

    // 6. ผู้เข้าแข่งขัน (Participants) - ใส่ "-" สำหรับอัพเดตทีหลัง
    const participantsCell = Utils.createElement('td', {
      className: 'participants-cell',
      title: 'อัพเดตทีหลัง'
    });
    participantsCell.innerHTML = '<span class="placeholder-text">-</span>';
    row.appendChild(participantsCell);

    // 7. ผู้ฝึกซ้อม (Coach) - ใส่ "-" สำหรับอัพเดตทีหลัง
    const coachCell = Utils.createElement('td', {
      className: 'coach-cell',
      title: 'อัพเดตทีหลัง'
    });
    coachCell.innerHTML = '<span class="placeholder-text">-</span>';
    row.appendChild(coachCell);

    // 8. เกียรติบัตร (Certificate) - จาก column ดาวโหลดน์เกียรติบัตร
    const certificateCell = this.createCertificateCell(result);
    row.appendChild(certificateCell);

    return row;
  }

  /**
   * Get field value with multiple possible keys (Thai/English)
   */
  getFieldValue(result, possibleKeys, defaultValue = '-') {
    for (const key of possibleKeys) {
      if (result[key] !== undefined && result[key] !== null && result[key] !== '') {
        return result[key];
      }
    }
    return defaultValue;
  }

  /**
   * Create award cell with proper styling and icons
   */
  createAwardCell(awardValue) {
    const awardConfig = getAwardConfig(awardValue);
    const awardClass = awardConfig ? awardConfig.id : 'participant';

    const awardCell = Utils.createElement('td', {
      className: `award-cell ${awardClass}`,
      title: awardValue
    });

    // Add award icon and text
    const awardIcon = awardConfig ? awardConfig.icon : '🏅';
    awardCell.innerHTML = `
      <div class="award-content">
        <span class="award-icon">${awardIcon}</span>
        <span class="award-text">${Utils.escapeHTML(awardValue)}</span>
      </div>
    `;

    return awardCell;
  }

  /**
   * Create certificate cell with download link
   */
  createCertificateCell(result) {
    const certificateCell = Utils.createElement('td', {
      className: 'certificate-cell'
    });

    // Try different possible column names for certificate URL
    const certificateUrl = this.getFieldValue(result, [
      'ดาวโหลดน์เกียรติบัตร',
      'ดาวโหลดเกียรติบัตร',
      'certificate_url',
      'certificateUrl'
    ], '');

    if (certificateUrl && certificateUrl.trim() && certificateUrl !== '-') {
      const link = Utils.createElement('a', {
        href: certificateUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'certificate-link',
        'aria-label': `ดาวโหลดเกียรติบัตร`,
        title: 'คลิกเพื่อดาวโหลดเกียรติบัตร'
      });

      link.innerHTML = `
        <span class="certificate-icon">📥</span>
        <span class="certificate-text">ดาวโหลด</span>
      `;

      certificateCell.appendChild(link);
    } else {
      const disabledSpan = Utils.createElement('span', {
        className: 'certificate-link disabled',
        'aria-label': 'ไม่มีเกียรติบัตร',
        title: 'ยังไม่มีเกียรติบัตร'
      });

      disabledSpan.innerHTML = `
        <span class="certificate-icon">-</span>
        <span class="certificate-text">ไม่มี</span>
      `;

      certificateCell.appendChild(disabledSpan);
    }

    return certificateCell;
  }

  /**
   * Render empty results state
   */
  renderEmptyResults() {
    const emptyState = Utils.createElement('div', {
      className: 'empty-state',
      role: 'status',
      'aria-live': 'polite'
    });

    emptyState.innerHTML = `
      <div class="empty-icon">📋</div>
      <div class="empty-title">ยังไม่มีผลการแข่งขัน</div>
      <div class="empty-description">
        ผลการแข่งขัน "${Utils.escapeHTML(this.competition?.name || 'การแข่งขันนี้')}" 
        ยังไม่ถูกประกาศ กรุณาติดตามข่าวสารอีกครั้ง
      </div>
      <button class="retry-button" onclick="location.reload()">
        รีเฟรชหน้า
      </button>
    `;

    this.elements.resultsContainer.innerHTML = '';
    this.elements.resultsContainer.appendChild(emptyState);
  }

  /**
   * Render summary cards
   */
  renderSummary() {
    return; // ไม่ใช้ เพราะดูมันรก

    if (!this.elements.summarySection || !this.results.length) return;

    const summary = this.calculateSummary();
    const summaryCards = [];

    // Total participants card
    summaryCards.push(`
      <div class="summary-card total">
        <div class="summary-number">${summary.total}</div>
        <div class="summary-label">ผลงานทั้งหมด</div>
      </div>
    `);

    // Award-specific cards
    Object.entries(summary.byAward)
      .sort(([, a], [, b]) => b - a) // Sort by count descending
      .forEach(([award, count]) => {
        const awardConfig = getAwardConfig(award);
        const awardClass = awardConfig ? awardConfig.id : 'participant';

        summaryCards.push(`
          <div class="summary-card award-summary ${awardClass}">
            <div class="summary-number">${count}</div>
            <div class="summary-label">
              <span class="award-icon">${awardConfig ? awardConfig.icon : '🏅'}</span>
              ${Utils.escapeHTML(award)}
            </div>
          </div>
        `);
      });

    this.elements.summarySection.innerHTML = summaryCards.join('');
    this.elements.summarySection.style.display = 'grid';
  }

  /**
   * Calculate results summary
   */
  calculateSummary() {
    const summary = {
      total: this.results.length,
      byAward: {},
      byLevel: {},
      byType: {},
      bySchool: {}
    };

    this.results.forEach(result => {
      // Count by award
      const award = this.getFieldValue(result, ['รางวัล', 'award'], 'ไม่ระบุ');
      if (award && award !== '-') {
        summary.byAward[award] = (summary.byAward[award] || 0) + 1;
      }

      // Count by level
      const level = this.getFieldValue(result, ['ระดับ', 'level'], 'ไม่ระบุ');
      if (level && level !== '-') {
        summary.byLevel[level] = (summary.byLevel[level] || 0) + 1;
      }

      // Count by type
      const type = this.getFieldValue(result, ['ประเภท', 'type'], 'ไม่ระบุ');
      if (type && type !== '-') {
        summary.byType[type] = (summary.byType[type] || 0) + 1;
      }

      // Count by school
      const school = this.getFieldValue(result, ['โรงเรียน', 'school'], 'ไม่ระบุ');
      if (school && school !== '-') {
        summary.bySchool[school] = (summary.bySchool[school] || 0) + 1;
      }
    });

    return summary;
  }

  /**
   * Handle certificate link clicks
   */
  handleCertificateClick(event) {
    const link = event.target.closest('.certificate-link');
    if (!link || link.classList.contains('disabled')) return;

    // Add click feedback
    Utils.addClass(link, 'clicked');
    setTimeout(() => {
      Utils.removeClass(link, 'clicked');
    }, 200);

    // Track click (if analytics available)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'certificate_download', {
        event_category: 'engagement',
        event_label: this.competition?.name || 'unknown_competition'
      });
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (!this.elements.tableNote) return;

    // Show/hide mobile note based on screen size
    const isMobile = Utils.isMobile();
    this.elements.tableNote.style.display = isMobile ? 'block' : 'none';
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.isLoading = true;

    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = 'flex';
      this.elements.loadingOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.isLoading = false;

    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.style.display = 'none';
      this.elements.loadingOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Hide initial loading with fade effect
   */
  hideInitialLoading() {
    if (this.elements.loadingOverlay) {
      Utils.addClass(this.elements.loadingOverlay, 'fade-out');
      setTimeout(() => {
        this.hideLoading();
      }, 300);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.hideLoading();

    // Show notification
    Utils.showNotification(message, 'error', 5000);

    // Update error container
    if (this.elements.errorContainer) {
      this.elements.errorContainer.innerHTML = `
        <div class="error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-title">เกิดข้อผิดพลาด</div>
          <div class="error-description">${Utils.escapeHTML(message)}</div>
          <button class="retry-button" onclick="location.reload()">
            ลองอีกครั้ง
          </button>
          <a href="index.html" class="back-link">
            กลับหน้าแรก
          </a>
        </div>
      `;
      this.elements.errorContainer.style.display = 'block';
    }
  }

  /**
   * Get current app state for debugging
   */
  getState() {
    return {
      competitionId: this.competitionId,
      competition: this.competition,
      resultsCount: this.results.length,
      isLoading: this.isLoading,
      managerInfo: this.competitionManager.getInfo()
    };
  }
}

// ===== Helper Functions =====

/**
 * Format field values for display
 */
function formatFieldValue(value, fieldType = 'text') {
  if (!value || value === '' || value === null || value === undefined) {
    return '-';
  }

  const stringValue = String(value).trim();
  if (stringValue === '') return '-';

  switch (fieldType) {
    case 'level':
      return formatLevel(stringValue);
    case 'type':
      return formatType(stringValue);
    case 'award':
      return formatAward(stringValue);
    case 'school':
      return formatSchool(stringValue);
    default:
      return stringValue;
  }
}

/**
 * Format education level
 */
function formatLevel(level) {
  const levelMap = {
    'ประถมศึกษา': 'ป.',
    'ประถม': 'ป.',
    'มัธยมศึกษาตอนต้น': 'ม.ต้น',
    'มัธยมต้น': 'ม.ต้น',
    'มัธยมศึกษาตอนปลาย': 'ม.ปลาย',
    'มัธยมปลาย': 'ม.ปลาย',
    'ทั่วไป': 'ทั่วไป'
  };

  return levelMap[level] || level;
}

/**
 * Format competition type
 */
function formatType(type) {
  return type; // Keep as-is for now
}

/**
 * Format award name
 */
function formatAward(award) {
  return award; // Keep as-is, handled by getAwardConfig
}

/**
 * Format school name
 */
function formatSchool(school) {
  // Remove common prefixes/suffixes for display
  return school
    .replace(/^โรงเรียน/g, '')
    .replace(/ราษฎร์อุปถัมภ์$/g, 'ราษฎร์ฯ')
    .replace(/วิทยาคม$/g, 'วิทยาคม')
    .trim();
}

/**
 * Check if certificate URL is valid
 */
function isValidCertificateUrl(url) {
  if (!url || url.trim() === '' || url === '-') return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get award display info
 */
function getAwardDisplayInfo(awardName) {
  const config = getAwardConfig(awardName);
  return {
    name: awardName,
    icon: config ? config.icon : '🏅',
    color: config ? config.color : '#95a5a6',
    rank: config ? config.rank : 999
  };
}

// ===== Initialize App =====

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Create global results app instance
    window.resultsApp = new ResultsApp();
    await window.resultsApp.init();
  } catch (error) {
    Utils.logError('Results App Initialization', error);
    Utils.showNotification(CONFIG.ERRORS.API_ERROR, 'error');

    // Show basic error page if initialization fails
    document.body.innerHTML = `
      <div class="container">
        <div class="error-container">
          <div class="error-message">
            <div class="error-icon">⚠️</div>
            <div class="error-title">ไม่สามารถโหลดหน้าผลการแข่งขันได้</div>
            <div class="error-description">${error.message}</div>
            <button onclick="location.reload()" class="retry-button">ลองอีกครั้ง</button>
            <a href="index.html" class="back-link">กลับหน้าแรก</a>
          </div>
        </div>
      </div>
    `;
  }
});

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ResultsApp,
    formatFieldValue,
    isValidCertificateUrl,
    getAwardDisplayInfo
  };
}

function normalizeLevelKey(raw) {
  const s = (raw ?? '').toString().trim();
  const map = {
    'ประถม': 'ประถมศึกษา',
    'ประถมศึกษา': 'ประถมศึกษา',
    'มัธยมต้น': 'มัธยมศึกษาตอนต้น',
    'มัธยมศึกษาตอนต้น': 'มัธยมศึกษาตอนต้น',
    'มัธยมปลาย': 'มัธยมศึกษาตอนปลาย',
    'มัธยมศึกษาตอนปลาย': 'มัธยมศึกษาตอนปลาย',
    'ทั่วไป': 'ทั่วไป'
  };
  return map[s] ?? s; // ถ้าไม่รู้จักก็คืนค่าเดิม
}
