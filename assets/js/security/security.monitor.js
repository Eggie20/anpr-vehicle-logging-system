/**
 * Security Monitor
 * CCTV monitoring and security guard functionality
 * Matches reference guard design
 */

const SecurityMonitor = {
  dutyStartTime: null,
  dutyTimerInterval: null,
  selectedCamera: 1,
  shiftDuration: 8 * 60 * 60 * 1000, // 8 hours in ms
  soundEnabled: true,

  /**
   * Initialize security monitor
   */
  init() {
    console.log('[SecurityMonitor] Initializing...');
    this.startDutyTimer();
    this.bindEvents();
    
    // Update time periodically
    setInterval(() => this.updateTimestamp(), 1000);
  },

  /**
   * Start duty timer (countdown from 8 hours)
   */
  startDutyTimer() {
    const stored = localStorage.getItem('duty_start_time');
    this.dutyStartTime = stored ? new Date(stored) : new Date();
    
    if (!stored) {
      localStorage.setItem('duty_start_time', this.dutyStartTime.toISOString());
    }
    
    this.dutyTimerInterval = setInterval(() => this.updateDutyTimer(), 1000);
    this.updateDutyTimer();
  },

  /**
   * Update duty timer display (countdown)
   */
  updateDutyTimer() {
    const now = new Date();
    const elapsed = now - this.dutyStartTime;
    const remaining = Math.max(0, this.shiftDuration - elapsed);
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    const timeStr = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
    
    const timerValue = document.getElementById('dutyTimerValue');
    const timerContainer = document.getElementById('dutyTimer');
    
    if (timerValue) timerValue.textContent = timeStr;
    
    // Warning at 30 minutes remaining
    if (hours === 0 && minutes <= 30 && minutes > 0) {
      timerContainer?.classList.add('warning');
      timerValue?.style.setProperty('color', '#ffc107');
    }
    
    // Critical at 0 - end of shift
    if (remaining === 0) {
      timerContainer?.classList.add('critical');
      timerValue?.style.setProperty('color', '#dc3545');
      this.showEndOfShiftModal();
    }
  },

  /**
   * Update the IP address timestamp display
   */
  updateTimestamp() {
    const ipEl = document.querySelector('.ip-address');
    if (ipEl) {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false });
      ipEl.textContent = `IP: 192.168.1.101 | ${time}`;
    }
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Camera thumbnails
    document.querySelectorAll('.camera-thumbnail').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const cameraId = thumb.dataset.cam;
        this.selectCamera(cameraId, thumb);
      });
    });

    // Simulate detection dropdown
    const simulateBtn = document.getElementById('simulateBtn');
    const dropdown = document.getElementById('detectionDropdown');
    
    if (simulateBtn && dropdown) {
      simulateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        dropdown.classList.toggle('show');
      });
      
      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const type = item.dataset.type;
          if (type === 'clear') {
            this.clearDetection();
          } else {
            this.simulateDetection(type);
          }
          dropdown.classList.add('hidden');
          dropdown.classList.remove('show');
        });
      });
      
      // Close dropdown on outside click
      document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('show');
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme || 'default';
        const themes = ['default', 'light', 'dark'];
        const nextIndex = (themes.indexOf(current) + 1) % themes.length;
        const next = themes[nextIndex];
        document.documentElement.dataset.theme = next;
        localStorage.setItem('security_theme', next);
        themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
      });
      
      // Load saved theme
      const savedTheme = localStorage.getItem('security_theme');
      if (savedTheme) {
        document.documentElement.dataset.theme = savedTheme;
        themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';
      }
    }

    // Sound toggle
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        soundToggle.classList.toggle('muted', !this.soundEnabled);
      });
    }

    // Fullscreen
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          this.logout();
        }
      });
    }

    // Modal buttons
    document.getElementById('confirmEndShift')?.addEventListener('click', () => {
      this.endShift();
    });

    document.getElementById('requestOvertimeBtn')?.addEventListener('click', () => {
      this.requestOvertime();
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('open');
        }
      });
    });

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal-backdrop')?.classList.remove('open');
      });
    });
  },

  /**
   * Select a camera to view
   */
  selectCamera(cameraId, element) {
    this.selectedCamera = cameraId;
    
    // Update thumbnail active states
    document.querySelectorAll('.camera-thumbnail').forEach(thumb => {
      thumb.classList.remove('active');
    });
    element?.classList.add('active');
    
    // Camera data
    const cameras = {
      '1': { name: 'Gate A - Main Entrance', ip: '192.168.1.101' },
      '2': { name: 'Gate B - Side Entrance', ip: '192.168.1.102' },
      '3': { name: 'Parking A - Faculty', ip: '192.168.1.103' },
      '4': { name: 'Parking B - Student', ip: '192.168.1.104' }
    };
    
    const camera = cameras[cameraId] || cameras['1'];
    
    // Update main display
    const titleEl = document.getElementById('mainCamTitle');
    const subtextEl = document.querySelector('.placeholder-subtext');
    
    if (titleEl) titleEl.textContent = camera.name;
    if (subtextEl) subtextEl.textContent = camera.name;
    
    console.log('[SecurityMonitor] Selected camera:', cameraId, camera.name);
  },

  /**
   * Simulate a vehicle detection
   */
  simulateDetection(type) {
    const detectionTypes = {
      'unregistered': { title: 'Unregistered Vehicle', desc: 'Plate ABC 1234 not found in database', class: '' },
      'multiple': { title: 'Multiple Vehicles', desc: '3 vehicles detected in single frame', class: 'warning' },
      'unauthorized': { title: 'Unauthorized User', desc: 'Driver ID mismatch for vehicle DEF 5678', class: '' },
      'exception': { title: 'Exception Granted', desc: 'Visitor pass validated for XYZ 9012', class: 'success' },
      'verification': { title: 'Verification Required', desc: 'Manual check needed for plate GHI 3456', class: 'info' }
    };
    
    const detection = detectionTypes[type];
    if (!detection) return;
    
    // Add to notification list
    this.addNotification(detection);
    
    // Show popup
    this.showPopup(detection);
    
    // Increment vehicle count
    this.incrementVehicleCount('car');
    
    console.log('[SecurityMonitor] Detection simulated:', type);
  },

  /**
   * Add notification to feed
   */
  addNotification(notification) {
    const feedList = document.getElementById('notificationList');
    if (!feedList) return;
    
    const item = document.createElement('div');
    item.className = `notification-item ${notification.class} fade-in`;
    item.innerHTML = `
      <div class="notif-icon">${notification.class === 'success' ? '✓' : '⚠'}</div>
      <div class="notif-content">
        <div class="notif-title">${notification.title}</div>
        <div class="notif-desc">${notification.desc}</div>
      </div>
      <div class="notif-time">Just now</div>
    `;
    
    feedList.insertBefore(item, feedList.firstChild);
    feedList.scrollLeft = 0;
  },

  /**
   * Show popup notification
   */
  showPopup(notification) {
    const container = document.getElementById('popupContainer');
    if (!container) return;
    
    const popup = document.createElement('div');
    popup.className = `detection-popup ${notification.class}`;
    popup.innerHTML = `
      <div style="font-size: 1.5rem;">${notification.class === 'success' ? '✅' : '⚠️'}</div>
      <div>
        <div style="font-weight: 600;">${notification.title}</div>
        <div style="font-size: 0.8rem; opacity: 0.8;">${notification.desc}</div>
      </div>
    `;
    
    container.appendChild(popup);
    
    // Remove after 5 seconds
    setTimeout(() => {
      popup.style.animation = 'fadeOut 0.4s forwards';
      setTimeout(() => popup.remove(), 400);
    }, 5000);
  },

  /**
   * Clear detection overlay
   */
  clearDetection() {
    const overlay = document.getElementById('detectionOverlay');
    if (overlay) overlay.innerHTML = '';
    console.log('[SecurityMonitor] Detection cleared');
  },

  /**
   * Increment vehicle count
   */
  incrementVehicleCount(type) {
    const countEl = document.getElementById(`count-${type}`);
    if (countEl) {
      const current = parseInt(countEl.textContent) || 0;
      countEl.textContent = current + 1;
    }
    
    const incEl = document.getElementById(`inc-${type}`);
    if (incEl) {
      const match = incEl.textContent.match(/↑ (\d+)/);
      const current = match ? parseInt(match[1]) : 0;
      incEl.textContent = `↑ ${current + 1} in last min`;
    }
  },

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    const container = document.querySelector('.app-container');
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container?.requestFullscreen?.();
    }
  },

  /**
   * Show end of shift modal
   */
  showEndOfShiftModal() {
    const modal = document.getElementById('endShiftModal');
    const modalTime = document.getElementById('modalDutyTime');
    
    if (modalTime) {
      const elapsed = new Date() - this.dutyStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      modalTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    modal?.classList.add('open');
  },

  /**
   * End shift
   */
  endShift() {
    clearInterval(this.dutyTimerInterval);
    localStorage.removeItem('duty_start_time');
    alert('Shift ended. Thank you for your service!');
    window.location.href = '../../index.html';
  },

  /**
   * Request overtime
   */
  requestOvertime() {
    const modal = document.getElementById('endShiftModal');
    modal?.classList.remove('open');
    
    // Extend shift by 2 hours
    this.shiftDuration += 2 * 60 * 60 * 1000;
    alert('Overtime approved. Extended by 2 hours.');
  },

  /**
   * Logout
   */
  logout() {
    clearInterval(this.dutyTimerInterval);
    localStorage.removeItem('duty_start_time');
    window.location.href = '../../index.html';
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  SecurityMonitor.init();
});
