/**
 * HetEx Logistics - Unified Notification & Alert Manager
 * Provides:
 * - Interactive Notification Center dropdown inside the topbar bell (🔔)
 * - Persistent notification list stored per role (seller / admin)
 * - In-App floating toast notifications on the browser screen
 * - Native Browser Desktop Push Notifications (HTML5 Web Notifications API)
 * - Quick filter, mark-all-read, and direct in-page tab routing
 */
(function (window) {
  'use strict';

  var ROLE = 'seller'; // 'seller' or 'admin'
  var STORAGE_KEY = 'hetex_notifications_seller';
  var notifications = [];

  function getStorageKey() {
    return 'hetex_notifications_' + ROLE;
  }

  function getSeedNotifications(role) {
    var now = Date.now();
    if (role === 'admin') {
      return [
        {
          id: 'adm_notif_1',
          title: '⚖️ Weight Dispute Escalation',
          message: 'Seller HET000002 raised weight variance dispute on DTDC Priority AWB HTX982736193.',
          type: 'warning',
          tab: 'orders',
          time: new Date(now - 1000 * 60 * 25).toISOString(),
          unread: true
        },
        {
          id: 'adm_notif_2',
          title: '💳 Wallet Recharge Approval',
          message: 'Seller Zuberia One submitted prepaid wallet recharge proof for ₹5,000.00.',
          type: 'info',
          tab: 'recharges',
          time: new Date(now - 1000 * 60 * 90).toISOString(),
          unread: true
        },
        {
          id: 'adm_notif_3',
          title: '🚚 Courier Partner Gateway Sync',
          message: 'Shipmozo live rate-calculator gateway healthy: 23 active carrier routes synced.',
          type: 'success',
          tab: 'couriers',
          time: new Date(now - 1000 * 3600 * 4).toISOString(),
          unread: false
        },
        {
          id: 'adm_notif_4',
          title: '🎫 Priority Support Ticket',
          message: 'New support ticket #tkt_init_101 assigned to Operations Desk.',
          type: 'info',
          tab: 'tickets',
          time: new Date(now - 1000 * 3600 * 8).toISOString(),
          unread: false
        }
      ];
    }

    return [
      {
        id: 'user_notif_1',
        title: '⚖️ Weight Discrepancy Scanned',
        message: 'Carrier hub reported 0.60 kg dead weight variance on order HTX-ORD-1002. Action required within 48 hours.',
        type: 'warning',
        tab: 'weight-disputes',
        time: new Date(now - 1000 * 60 * 35).toISOString(),
        unread: true
      },
      {
        id: 'user_notif_2',
        title: '📦 Shipment Manifested & Ready',
        message: 'AWB HTX982736192 generated via Delhivery Surface. Pickup scheduled from Gurugram warehouse.',
        type: 'info',
        tab: 'orders',
        time: new Date(now - 1000 * 60 * 110).toISOString(),
        unread: true
      },
      {
        id: 'user_notif_3',
        title: '💳 Wallet Recharge Credited',
        message: 'Recharge of ₹2,000.00 successfully credited to your HetEx prepaid wallet.',
        type: 'success',
        tab: 'wallet',
        time: new Date(now - 1000 * 3600 * 14).toISOString(),
        unread: false
      },
      {
        id: 'user_notif_4',
        title: '🎫 Support Ticket Update',
        message: 'Ticket #tkt_init_101: Operations Desk confirmed courier driver assigned for scheduled pickup.',
        type: 'info',
        tab: 'tickets',
        time: new Date(now - 1000 * 3600 * 26).toISOString(),
        unread: false
      }
    ];
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(getStorageKey());
      if (raw) {
        notifications = JSON.parse(raw);
      } else {
        notifications = getSeedNotifications(ROLE);
        saveToStorage();
      }
    } catch (e) {
      notifications = getSeedNotifications(ROLE);
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(notifications));
    } catch (e) {}
  }

  function timeAgo(dateString) {
    try {
      var diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      if (diff < 172800) return 'Yesterday';
      return Math.floor(diff / 86400) + 'd ago';
    } catch (e) {
      return 'Recent';
    }
  }

  // Native Browser Notification Request & Display
  function requestBrowserPermission(callback) {
    if (!('Notification' in window)) {
      if (typeof callback === 'function') callback(false);
      return;
    }
    if (Notification.permission === 'granted') {
      if (typeof callback === 'function') callback(true);
      return;
    }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function (permission) {
        var granted = permission === 'granted';
        updatePermissionBanner();
        if (typeof callback === 'function') callback(granted);
      });
    }
  }

  function triggerBrowserNotification(title, message) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        var cleanTitle = title.replace(/[^\w\s\-\:₹\.]/gi, '').trim() || 'HetEx Logistics Alert';
        var notif = new Notification(cleanTitle, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'hetex-' + Date.now()
        });
        notif.onclick = function () {
          window.focus();
          notif.close();
        };
      } catch (e) {}
    }
  }

  // Update Bell Badge and Red Dot in Topbar
  function updateBellUI() {
    var unreadCount = notifications.filter(function (n) { return n.unread; }).length;
    var dot = document.getElementById('notifBellDot');
    var badge = document.getElementById('notifCountBadge');

    if (dot) {
      dot.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function updatePermissionBanner() {
    var banner = document.getElementById('notifPermBanner');
    if (!banner) return;
    if (!('Notification' in window)) {
      banner.style.display = 'none';
      return;
    }
    if (Notification.permission === 'granted') {
      banner.innerHTML = '<span style="color: #16a34a; font-weight: 700;">🔔 Browser Push Alerts: Enabled</span>';
    } else {
      banner.innerHTML = '<span style="color: #64748b;">Browser Alerts:</span> ' +
        '<button type="button" onclick="window.HetExNotifications.enableBrowserPush()" style="background: #2563eb; color: #fff; border: none; border-radius: 4px; padding: 2px 7px; font-size: 0.7rem; font-weight: 700; cursor: pointer;">Enable on Browser</button>';
    }
  }

  // Render Dropdown Content
  function renderDropdown() {
    var panel = document.getElementById('notificationDropdownMenu');
    if (!panel) return;

    var unreadCount = notifications.filter(function (n) { return n.unread; }).length;

    var itemsHtml = '';
    if (notifications.length === 0) {
      itemsHtml = '<div style="text-align: center; padding: 2rem 1rem; color: #64748b;">' +
        '<div style="font-size: 1.75rem; margin-bottom: 0.35rem;">✨</div>' +
        '<div style="font-weight: 700; color: #0f172a; font-size: 0.875rem;">All caught up!</div>' +
        '<div style="font-size: 0.75rem; margin-top: 0.2rem;">You have no notifications or alerts right now.</div>' +
      '</div>';
    } else {
      itemsHtml = notifications.map(function (n) {
        var iconBg = '#eff6ff';
        var iconColor = '#2563eb';
        var iconSymbol = 'ℹ️';

        if (n.type === 'warning') {
          iconBg = '#fef3c7';
          iconColor = '#b45309';
          iconSymbol = '⚠️';
        } else if (n.type === 'success') {
          iconBg = '#dcfce7';
          iconColor = '#15803d';
          iconSymbol = '✅';
        } else if (n.type === 'danger' || n.type === 'error') {
          iconBg = '#fee2e2';
          iconColor = '#b91c1c';
          iconSymbol = '❌';
        }

        var unreadClass = n.unread ? 'background: #f8fafc; border-left: 3px solid #2563eb;' : 'background: #ffffff;';

        return '<div class="notif-item" onclick="window.HetExNotifications.handleItemClick(\'' + n.id + '\', \'' + (n.tab || '') + '\')" style="' + unreadClass + ' padding: 0.75rem 0.85rem; border-bottom: 1px solid #f1f5f9; display: flex; gap: 0.65rem; align-items: flex-start; cursor: pointer; transition: background 0.15s ease;">' +
          '<div style="width: 28px; height: 28px; border-radius: 50%; background: ' + iconBg + '; color: ' + iconColor + '; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; flex-shrink: 0; margin-top: 2px;">' + iconSymbol + '</div>' +
          '<div style="flex: 1; min-width: 0;">' +
            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">' +
              '<h5 style="font-size: 0.8125rem; font-weight: 700; color: #0f172a; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + n.title + '</h5>' +
              '<span style="font-size: 0.6875rem; color: #94a3b8; margin-left: 0.5rem; flex-shrink: 0;">' + timeAgo(n.time) + '</span>' +
            '</div>' +
            '<p style="font-size: 0.75rem; color: #475569; margin: 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">' + n.message + '</p>' +
            (n.tab ? '<div style="font-size: 0.6875rem; color: #2563eb; font-weight: 700; margin-top: 0.35rem;">View in ' + n.tab.replace('-', ' ').toUpperCase() + ' →</div>' : '') +
          '</div>' +
          (n.unread ? '<div style="width: 7px; height: 7px; border-radius: 50%; background: #2563eb; flex-shrink: 0; margin-top: 6px;"></div>' : '') +
        '</div>';
      }).join('');
    }

    panel.innerHTML = 
      '<div style="padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">' +
        '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
          '<span style="font-weight: 800; font-size: 0.875rem; color: #0f172a;">Notifications & Alerts</span>' +
          (unreadCount > 0 ? '<span style="background: #eff6ff; color: #2563eb; font-size: 0.6875rem; font-weight: 800; padding: 1px 6px; border-radius: 999px;">' + unreadCount + ' NEW</span>' : '') +
        '</div>' +
        '<div style="display: flex; gap: 0.4rem;">' +
          (unreadCount > 0 ? '<button type="button" onclick="window.HetExNotifications.markAllRead()" style="background: none; border: none; font-size: 0.725rem; color: #2563eb; font-weight: 600; cursor: pointer;">Mark read</button>' : '') +
          '<button type="button" onclick="window.HetExNotifications.clearAll()" style="background: none; border: none; font-size: 0.725rem; color: #94a3b8; font-weight: 600; cursor: pointer;">Clear</button>' +
        '</div>' +
      '</div>' +
      '<div id="notifPermBanner" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.35rem 1rem; font-size: 0.725rem; display: flex; justify-content: space-between; align-items: center;">' +
      '</div>' +
      '<div style="max-height: 340px; overflow-y: auto;">' +
        itemsHtml +
      '</div>' +
      '<div style="padding: 0.5rem 1rem; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">' +
        '<span style="font-size: 0.6875rem; color: #64748b; font-weight: 600;">⚡ Real-time alerts synchronized with live logistics events</span>' +
      '</div>';

    updatePermissionBanner();
  }

  // Public Interface
  var manager = {
    init: function (role) {
      ROLE = role || 'seller';
      loadFromStorage();
      updateBellUI();

      // Close dropdown when clicking outside
      document.addEventListener('click', function (e) {
        var wrapper = document.querySelector('.notification-bell-wrapper');
        var panel = document.getElementById('notificationDropdownMenu');
        if (panel && panel.style.display !== 'none') {
          if (wrapper && !wrapper.contains(e.target)) {
            panel.style.display = 'none';
          }
        }
      });
    },

    toggleDropdown: function () {
      var panel = document.getElementById('notificationDropdownMenu');
      if (!panel) return;
      if (panel.style.display === 'none' || panel.style.display === '') {
        renderDropdown();
        panel.style.display = 'block';
      } else {
        panel.style.display = 'none';
      }
    },

    closeDropdown: function () {
      var panel = document.getElementById('notificationDropdownMenu');
      if (panel) panel.style.display = 'none';
    },

    add: function (opts) {
      var notif = {
        id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        title: opts.title || 'HetEx Notification',
        message: opts.message || '',
        type: opts.type || 'info',
        tab: opts.tab || null,
        time: new Date().toISOString(),
        unread: true
      };

      notifications.unshift(notif);
      if (notifications.length > 50) notifications.pop();
      saveToStorage();
      updateBellUI();

      // 1. Show in-app screen toast
      if (typeof window.showToast === 'function') {
        window.showToast(notif.message, notif.type);
      } else if (typeof window.showAdminToast === 'function') {
        window.showAdminToast(notif.message, notif.type);
      }

      // 2. Trigger native OS / browser notification
      triggerBrowserNotification(notif.title, notif.message);

      // Re-render if dropdown is currently open
      var panel = document.getElementById('notificationDropdownMenu');
      if (panel && panel.style.display !== 'none') {
        renderDropdown();
      }
    },

    handleItemClick: function (id, tab) {
      var target = notifications.find(function (n) { return n.id === id; });
      if (target) {
        target.unread = false;
        saveToStorage();
        updateBellUI();
      }
      manager.closeDropdown();

      if (tab) {
        if (typeof window.switchTab === 'function') {
          window.switchTab(tab);
        } else if (typeof window.switchAdminTab === 'function') {
          var btn = document.querySelector('[onclick*="' + tab + '"]');
          window.switchAdminTab(tab, btn);
        }
      }
    },

    markAllRead: function () {
      notifications.forEach(function (n) { n.unread = false; });
      saveToStorage();
      updateBellUI();
      renderDropdown();
    },

    clearAll: function () {
      notifications = [];
      saveToStorage();
      updateBellUI();
      renderDropdown();
    },

    enableBrowserPush: function () {
      requestBrowserPermission(function (granted) {
        if (granted) {
          triggerBrowserNotification('HetEx Logistics', 'Browser notifications enabled successfully!');
          if (typeof window.showToast === 'function') {
            window.showToast('Browser notifications enabled successfully!', 'success');
          }
        }
        updatePermissionBanner();
      });
    }
  };

  window.HetExNotifications = manager;

})(window);
