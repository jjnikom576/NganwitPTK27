// ===== Configuration & Constants - Updated for Dual APIs =====

/**
 * Global Cache for all data - NEW
 */
const GLOBAL_CACHE = {
  competitions: null,
  results: new Map(),
  lastUpdated: null,
  isLoaded: false,
  version: '2.0.0'
};

/**
 * Application Configuration
 */
/**
 * Application Configuration - Updated with Certificate API
 */
const CONFIG = {
  // ===== API Configuration =====
  API: {
    // Google Apps Script URLs (แยกกัน)
    SCIENCE_URL: 'https://script.google.com/macros/s/AKfycbxWyESyMxTu6WmnvF82xkdlEtUKeoacylcqXhBZv6f756BcYdzgosqk23SzkQoLRGP5PQ/exec',
    GEM_URL: 'https://script.google.com/macros/s/AKfycbwZ2OOojlO_f2CIlIZ9sejLlJWJlN1_7XXP787GT6K7iRN6v2181Hn-_Q4wWFXTN7aHRQ/exec',
    CERTIFICATE_URL: 'https://script.google.com/macros/s/AKfycbxMuIPAr4GL0L3j6qyH75fl_pbeVGotmP2pALoi6w-xNZWXJRBsadJyt880NxMKgGJULA/exec', // ← ใส่ URL ใหม่
    
    // Legacy BASE_URL for backward compatibility
    BASE_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec',
    
    // API Endpoints
    ENDPOINTS: {
      COMPETITIONS: 'getCompetitions',
      RESULTS: 'getResults', 
      STATISTICS: 'getStatistics',
      CERTIFICATE: 'getCertificate'
    },
    
    // Request timeout (milliseconds)
    TIMEOUT: 15000,
    
    // Retry configuration
    RETRY: {
      MAX_ATTEMPTS: 3,
      DELAY: 1000
    }
  },

  // ===== Cache Configuration - UPDATED =====
  CACHE: {
    TIMEOUT: 60 * 60 * 1000, // 1 ชั่วโมง (เดิม 10 นาที)
    PERSIST_KEY: 'nganwit_cache_v2',
    VERSION_KEY: 'nganwit_version'
  },

  // ===== Application Settings =====
  APP: {
    NAME: 'งานวิทย์ 27 และกิจกรรมเจียระไนเพชรวิชาการ',
    VERSION: '2.0.0',
    AUTHOR: 'NganwitPTK27',
    
    // Page titles
    PAGES: {
      MAIN: 'งานวิทย์ 27 และ กิจกรรมเจียระไนเพชรวิชาการ',
      RESULTS: 'ผลการแข่งขัน - งานวิทย์ 27',
      STATISTICS: 'สถิติการสมัคร - งานวิทย์ 27'
    }
  },

  // ===== Categories =====
  CATEGORIES: {
    SCIENCE: {
      id: 'science',
      name: 'กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี',
      icon: '🔬',
      color: '#74b9ff',
      description: 'การแข่งขันในกลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี'
    },
    GEM: {
      id: 'gem',
      name: 'กิจกรรมเจียระไนเพชรวิชาการ',
      icon: '💎',
      color: '#ff6b6b',
      description: 'กิจกรรมการแข่งขันเจียระไนเพชรวิชาการ'
    },
    // Legacy academic mapping
    ACADEMIC: {
      id: 'academic',
      name: 'กิจกรรมเจียระไนเพชรวิชาการ',
      icon: '💎',
      color: '#ff6b6b',
      description: 'กิจกรรมการแข่งขันเจียระไนเพชรวิชาการ'
    }
  },

  // ===== Award Types =====
  AWARDS: {
    CHAMPION: {
      id: 'champion',
      name: 'ชนะเลิศ',
      rank: 1,
      color: '#d4af37',
      icon: '🥇'
    },
    FIRST_RUNNER: {
      id: 'first-runner',
      name: 'รองชนะเลิศอันดับ 1',
      rank: 2,
      color: '#c0c0c0',
      icon: '🥈'
    },
    SECOND_RUNNER: {
      id: 'second-runner', 
      name: 'รองชนะเลิศอันดับ 2',
      rank: 3,
      color: '#cd7f32',
      icon: '🥉'
    },
    THIRD_RUNNER: {
      id: 'third-runner', 
      name: 'รองชนะเลิศอันดับ 3',
      rank: 4,
      color: '#8b4513',
      icon: '🏆'
    },
    HONORABLE: {
      id: 'honorable',
      name: 'ชมเชย',
      rank: 5,
      color: '#3498db',
      icon: '🏅'
    },
    PARTICIPANT: {
      id: 'participant',
      name: 'เข้าร่วม',
      rank: 6,
      color: '#95a5a6',
      icon: '🎖️'
    }
  },

  // ===== Education Levels =====
  LEVELS: {
    PRIMARY_LOW: 'ป.1-3',
    PRIMARY_HIGH: 'ป.4-6', 
    JUNIOR_HIGH: 'ม.1-3',
    SENIOR_HIGH: 'ม.4-6',
    MIXED: 'ผสม'
  },

  // ===== UI Settings =====
  UI: {
    // Animation durations (milliseconds)
    ANIMATION: {
      FAST: 150,
      NORMAL: 250,
      SLOW: 500
    },
    
    // Loading states
    LOADING: {
      MIN_DURATION: 500, // Minimum loading time for UX
      SHIMMER_ROWS: 5    // Number of shimmer rows to show
    },
    
    // Pagination
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 50,
      MAX_PAGE_SIZE: 100
    }
  },

  // ===== Mock Data Settings (for development) =====
  MOCK: {
    ENABLED: false, // Set to false when connecting to real API
    DELAY: 800,    // Simulated API delay
    
    // Mock certificate URL - เพิ่มใหม่
    CERTIFICATE_URL: 'https://www.canva.com/design/sample-certificate/edit',
    
    // Mock science competitions data
    SCIENCE_COMPETITIONS: [
      {
        id: 'rov_esport',
        name: 'ROV-eSport',
        category: 'science',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 25,
        description: 'การแข่งขัน ROV และ e-Sports เพื่อพัฒนาทักษะเทคโนโลยี',
        icon: '🎮'
      },
      {
        id: 'science_show',
        name: 'SCIENCE SHOW',
        category: 'science',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 14,
        description: 'การแสดงและนำเสนอผลงานทางวิทยาศาสตร์',
        icon: '🔬'
      },
      {
        id: 'rocket_water_bottle',
        name: 'จรวดขวดน้ำ ประเภทแม่นยำ',
        category: 'science',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 22,
        description: 'การประกวดจรวดขวดน้ำ ประเภทยิงให้แม่นยำเข้าเป้า',
        icon: '🚀'
      },
      {
        id: 'balloon_ready_fly',
        name: 'บอลลูนอากาศร้อน ประเภทพร้อมลอย',
        category: 'science',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 10,
        description: 'การประกวดบอลลูนอากาศร้อน แบบพร้อมลอย',
        icon: '🎈'
      },
      {
        id: 'glider_rubber_band',
        name: 'เครื่องร่อน ประเภทยิงยาง',
        category: 'science',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 5,
        description: 'การประกวดเครื่องร่อน ใช้ยางยิงเป็นพลังงาน',
        icon: '✈️'
      }
    ],
    
    // Mock gem competitions data
    GEM_COMPETITIONS: [
      {
        id: 'thai_handwriting',
        name: 'คัดลายมือสื่อภาษาไทย',
        category: 'gem',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 26,
        description: 'การประกวดคัดลายมือภาษาไทยเพื่อส่งเสริมการเขียนอักษรไทย',
        icon: '✍️'
      },
      {
        id: 'essay_writing',
        name: 'เรียงความ',
        category: 'gem',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 10,
        description: 'การประกวดเรียงความภาษาไทยในหัวข้อต่างๆ',
        icon: '📝'
      },
      {
        id: 'math_calculation',
        name: 'การแข่งขันคิดเลขเร็ว',
        category: 'gem',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 9,
        description: 'การแข่งขันคิดเลขเร็วเพื่อพัฒนาทักษะคณิตศาสตร์',
        icon: '🔢'
      },
      {
        id: 'science_drawing',
        name: 'วาดภาพทางวิทยาศาสตร์',
        category: 'gem',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 9,
        description: 'การประกวดวาดภาพเพื่อสื่อสารความรู้ทางวิทยาศาสตร์',
        icon: '🎨'
      },
      {
        id: 'english_storytelling',
        name: 'การแข่งขันการเล่านิทาน ภาษาอังกฤษ (Story telling)',
        category: 'gem',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 8,
        description: 'การประกวดเล่านิทานภาษาอังกฤษ',
        icon: '🗣️'
      },
      {
        id: 'thai_etiquette',
        name: 'การแข่งขันมารยาทไทย',
        category: 'gem',
        level: 'ทุกระดับ',
        status: 'completed',
        participantCount: 5,
        description: 'การประกวดมารยาทและวัฒนธรรมไทย',
        icon: '🙏'
      }
    ],
    
    // Legacy mock competitions data (for backward compatibility)
    COMPETITIONS: [
      {
        id: 'comp_001',
        name: 'การประดิษฐ์คิดค้นทางวิทยาศาสตร์',
        category: 'science',
        level: 'ป.4-6',
        status: 'completed',
        description: 'การประดิษฐ์สิ่งของใหม่เพื่อแก้ปัญหาในชีวิตประจำวัน',
        date: '2024-01-15'
      },
      {
        id: 'comp_002',
        name: 'โครงงานวิทยาศาสตร์',
        category: 'science',
        level: 'ม.1-3',
        status: 'completed',
        description: 'การทำโครงงานวิจัยทางวิทยาศาสตร์',
        date: '2024-01-16'
      },
      {
        id: 'comp_003',
        name: 'การแข่งขันคณิตศาสตร์',
        category: 'academic',
        level: 'ม.4-6',
        status: 'completed',
        description: 'การแข่งขันแก้ปัญหาทางคณิตศาสตร์',
        date: '2024-01-17'
      },
      {
        id: 'comp_004',
        name: 'การแข่งขันภาษาไทย',
        category: 'academic',
        level: 'ป.4-6',
        status: 'completed',
        description: 'การแข่งขันใช้ภาษาไทย',
        date: '2024-01-18'
      }
    ]
  },

  // ===== Error Messages =====
  ERRORS: {
    NETWORK: 'ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาลองอีกครั้ง',
    API_ERROR: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
    NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
    TIMEOUT: 'หมดเวลาการเชื่อมต่อ กรุณาลองอีกครั้ง',
    INVALID_DATA: 'ข้อมูลไม่ถูกต้อง',
    COMPETITION_NOT_FOUND: 'ไม่พบการแข่งขันที่ต้องการ',
    SCIENCE_LOAD_FAILED: 'ไม่สามารถโหลดรายการการแข่งขันวิทยาศาสตร์ได้',
    GEM_LOAD_FAILED: 'ไม่สามารถโหลดรายการการแข่งขันเจียระไนเพชรได้',
    CERTIFICATE_LOAD_FAILED: 'ไม่สามารถโหลดลิงค์เกียรติบัตรได้'  // ← เพิ่มใหม่
  },

  // ===== Success Messages =====
  SUCCESS: {
    DATA_LOADED: 'โหลดข้อมูลสำเร็จ',
    RESULTS_LOADED: 'โหลดผลการแข่งขันสำเร็จ',
    SCIENCE_LOADED: 'โหลดรายการการแข่งขันวิทยาศาสตร์สำเร็จ',
    GEM_LOADED: 'โหลดรายการการแข่งขันเจียระไนเพชรสำเร็จ',
    CACHE_LOADED: 'โหลดข้อมูลสำเร็จ',
    PRELOAD_COMPLETE: 'โหลดข้อมูลสำเร็จ',
    CERTIFICATE_LOADED: 'โหลดลิงค์เกียรติบัตรสำเร็จ'  // ← เพิ่มใหม่
  }
};

/**
 * Global Cache Helper Functions - NEW
 */
function isCacheValid() {
  return GLOBAL_CACHE.isLoaded && 
         GLOBAL_CACHE.lastUpdated && 
         (Date.now() - GLOBAL_CACHE.lastUpdated) < CONFIG.CACHE.TIMEOUT;
}

function clearGlobalCache() {
  GLOBAL_CACHE.competitions = null;
  GLOBAL_CACHE.results.clear();
  GLOBAL_CACHE.lastUpdated = null;
  GLOBAL_CACHE.isLoaded = false;
}

/**
 * Force refresh cache and reload page
 */
function clearCacheAndReload() {
  try {
    localStorage.removeItem(CONFIG.CACHE.PERSIST_KEY);
    localStorage.removeItem(CONFIG.CACHE.VERSION_KEY);
    clearGlobalCache();
    location.reload();
  } catch (error) {
    console.warn('Error clearing cache:', error);
    location.reload();
  }
}

/**
 * Utility function to get award config by name
 * @param {string} awardName - Award name in Thai
 * @returns {Object|null} Award configuration
 */
function getAwardConfig(awardName) {
  if (!awardName) return null;
  
  const awardMap = {
    'ชนะเลิศ': CONFIG.AWARDS.CHAMPION,
    'รองชนะเลิศอันดับ 1': CONFIG.AWARDS.FIRST_RUNNER,
    'รองชนะเลิศอันดับ1': CONFIG.AWARDS.FIRST_RUNNER,
    'รองชนะเลิศอันดับ 2': CONFIG.AWARDS.SECOND_RUNNER,
    'รองชนะเลิศอันดับ2': CONFIG.AWARDS.SECOND_RUNNER,
    'รองชนะเลิศอันดับ 3': CONFIG.AWARDS.THIRD_RUNNER,
    'รองชนะเลิศอันดับ3': CONFIG.AWARDS.THIRD_RUNNER,
    'ชมเชย': CONFIG.AWARDS.HONORABLE,
    'เข้าร่วม': CONFIG.AWARDS.PARTICIPANT
  };
  
  return awardMap[awardName] || CONFIG.AWARDS.PARTICIPANT;
}

/**
 * Utility function to get category config by id
 * @param {string} categoryId - Category ID
 * @returns {Object|null} Category configuration
 */
function getCategoryConfig(categoryId) {
  if (!categoryId) return null;
  
  const normalizedId = categoryId.toLowerCase();
  
  // Map academic to gem for backward compatibility
  if (normalizedId === 'academic') {
    return CONFIG.CATEGORIES.GEM;
  }
  
  return CONFIG.CATEGORIES[categoryId.toUpperCase()] || null;
}

/**
 * Check if app is in development mode
 * @returns {boolean} True if in development mode
 */
function isDevelopment() {
  return location.hostname === 'localhost' || 
         location.hostname === '127.0.0.1' || 
         location.protocol === 'file:';
}

/**
 * Get API URL by category
 * @param {string} category - Category ('science' or 'gem')
 * @returns {string} API URL
 */
function getAPIUrl(category) {
  if (category === 'science') {
    return CONFIG.API.SCIENCE_URL;
  } else if (category === 'gem' || category === 'academic') {
    return CONFIG.API.GEM_URL;
  }
  
  // Fallback to base URL
  return CONFIG.API.BASE_URL;
}

/**
 * Detect competition category from name
 * @param {string} name - Competition name
 * @returns {string} Category ('science' or 'gem')
 */
function detectCompetitionCategory(name) {
  if (!name) return 'science';
  
  const lowerName = name.toLowerCase();
  
  const scienceKeywords = [
    'วิทยาศาสตร์', 'science', 'จรวด', 'บอลลูน', 'เครื่องร่อน', 'เครื่องบิน', 
    'rov', 'esport', 'e-sport', 'พร้อมลอย', 'ทักษะเต็มรูป', 'ยิงยาง', 
    'ร่อนนาน', 'พลังยาง', 'บินนาน', '3d', 'ปล่อยอิสระ', 'แม่นยำ', 'show'
  ];
  
  const gemKeywords = [
    'เจียระไน', 'คัดลายมือ', 'เรียงความ', 'คิดเลข', 'วาดภาพ', 'นิทาน', 
    'มารยาท', 'ภาษาไทย', 'ภาษาอังกฤษ', 'story telling', 'storytelling'
  ];
  
  if (scienceKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
    return 'science';
  } else if (gemKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
    return 'gem';
  }
  
  return 'science'; // Default to science
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    CONFIG, 
    GLOBAL_CACHE,
    getAwardConfig, 
    getCategoryConfig, 
    isDevelopment, 
    getAPIUrl, 
    detectCompetitionCategory,
    isCacheValid,
    clearGlobalCache,
    clearCacheAndReload
  };
}