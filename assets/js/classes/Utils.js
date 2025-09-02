// ===== Utility Functions =====

/**
 * Utility class containing helper functions
 */
class Utils {
  
  /**
   * Safely get element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null} DOM element or null
   */
  static getElementById(id) {
    try {
      return document.getElementById(id);
    } catch (error) {
      console.warn(`Element with ID '${id}' not found:`, error);
      return null;
    }
  }

  /**
   * Safely query selector
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (optional)
   * @returns {HTMLElement|null} DOM element or null
   */
  static querySelector(selector, parent = document) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn(`Element with selector '${selector}' not found:`, error);
      return null;
    }
  }

  /**
   * Safely query all selectors
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (optional)
   * @returns {NodeList} NodeList of elements
   */
  static querySelectorAll(selector, parent = document) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.warn(`Elements with selector '${selector}' not found:`, error);
      return [];
    }
  }

  /**
   * Create HTML element with attributes and content
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {string|HTMLElement} content - Element content
   * @returns {HTMLElement} Created element
   */
  static createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Set content
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    }
    
    return element;
  }

  /**
   * Add CSS class to element
   * @param {HTMLElement} element - Target element
   * @param {string} className - CSS class name
   */
  static addClass(element, className) {
    if (element && className) {
      element.classList.add(className);
    }
  }

  /**
   * Remove CSS class from element
   * @param {HTMLElement} element - Target element
   * @param {string} className - CSS class name
   */
  static removeClass(element, className) {
    if (element && className) {
      element.classList.remove(className);
    }
  }

  /**
   * Toggle CSS class on element
   * @param {HTMLElement} element - Target element
   * @param {string} className - CSS class name
   * @returns {boolean} True if class was added, false if removed
   */
  static toggleClass(element, className) {
    if (element && className) {
      return element.classList.toggle(className);
    }
    return false;
  }

  /**
   * Show loading state on element
   * @param {HTMLElement} element - Target element
   */
  static showLoading(element) {
    if (element) {
      this.addClass(element, 'loading');
      element.setAttribute('aria-busy', 'true');
    }
  }

  /**
   * Hide loading state on element
   * @param {HTMLElement} element - Target element
   */
  static hideLoading(element) {
    if (element) {
      this.removeClass(element, 'loading');
      element.setAttribute('aria-busy', 'false');
    }
  }

  /**
   * Sanitize HTML string to prevent XSS
   * @param {string} html - HTML string to sanitize
   * @returns {string} Sanitized HTML
   */
  static sanitizeHTML(html) {
    if (typeof html !== 'string') return '';
    
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHTML(text) {
    if (typeof text !== 'string') return '';
    
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
  }

  /**
   * Format number with thousand separators
   * @param {number} num - Number to format
   * @returns {string} Formatted number
   */
  static formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('th-TH');
  }

  /**
   * Format date to Thai format
   * @param {Date|string} date - Date to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted date string
   */
  static formatDate(date, options = {}) {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      
      const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
      };
      
      return dateObj.toLocaleDateString('th-TH', defaultOptions);
    } catch (error) {
      console.warn('Error formatting date:', error);
      return '';
    }
  }

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Sleep/delay function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get URL parameters
   * @returns {Object} URL parameters object
   */
  static getURLParams() {
    const params = {};
    const urlParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
    
    return params;
  }

  /**
   * Update URL without page reload
   * @param {Object} params - Parameters to update
   * @param {boolean} replaceState - Use replaceState instead of pushState
   */
  static updateURL(params, replaceState = false) {
    const url = new URL(window.location);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    
    const method = replaceState ? 'replaceState' : 'pushState';
    window.history[method]({}, '', url.toString());
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.warn('Failed to copy text:', error);
      return false;
    }
  }

  /**
   * Show notification/toast message
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error, info, warning)
   * @param {number} duration - Display duration in milliseconds
   */
  static showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = this.createElement('div', {
      className: `notification notification--${type}`,
      style: `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-white);
        padding: var(--spacing-4);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        border-left: 4px solid var(--color-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'});
        z-index: var(--z-toast);
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
      `
    }, this.escapeHTML(message));

    // Add to document
    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
  }

  /**
   * Check if device is mobile
   * @returns {boolean} True if mobile device
   */
  static isMobile() {
    return window.innerWidth <= 768;
  }

  /**
   * Check if device is tablet
   * @returns {boolean} True if tablet device
   */
  static isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }

  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  static generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Log info with context
   * @param {string} context - Info context
   * @param {string|Object} message - Info message or data
   * @param {Object} data - Additional data
   */
  static logInfo(context, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      message: typeof message === 'string' ? message : 'Info logged',
      ...(typeof message === 'object' ? message : {}),
      data,
      timestamp
    };
    
    console.log(`[${context}]`, logData);
    
    // Store in session storage for debugging
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      logs.push({ context, ...logData });
      // Keep only last 100 logs
      if (logs.length > 100) logs.splice(0, logs.length - 100);
      sessionStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Could not store log:', e);
    }
  }

  /**
   * Log error with context
   * @param {string} context - Error context
   * @param {Error} error - Error object
   * @param {Object} data - Additional data
   */
  static logError(context, error, data = {}) {
    const timestamp = new Date().toISOString();
    const errorData = {
      message: error.message,
      stack: error.stack,
      data,
      timestamp
    };
    
    console.error(`[${context}]`, errorData);
    
    // Store error logs
    try {
      const errorLogs = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errorLogs.push({ context, ...errorData });
      if (errorLogs.length > 50) errorLogs.splice(0, errorLogs.length - 50);
      sessionStorage.setItem('app_errors', JSON.stringify(errorLogs));
    } catch (e) {
      console.warn('Could not store error log:', e);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}