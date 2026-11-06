import { makeAutoObservable, runInAction } from "mobx";
import {
    getMyNotificationSettings,
    updateMyNotificationSettings,
    getNotifications,
    getUnreadCounts,
    markAsRead as markAsReadAPI,
    markAllAsRead as markAllAsReadAPI
} from "../http/notificationsAPI";

const TOAST_DURATION = 5000;
const RECENT_LIMIT = 5;

export default class NotificationStore {
    _unreadCounts = { user: 0, staff: 0, total: 0 };
    _recentNotifications = [];
    _toasts = [];
    _settings = [];
    _loading = false;

    constructor() {
        // makeAutoObservable автоматически делает все методы actions, а поля observable
        makeAutoObservable(this);
    }

    get unreadCounts() { return this._unreadCounts; }
    get recentNotifications() { return this._recentNotifications; }
    get toasts() { return this._toasts; }
    get settings() { return this._settings; }
    get loading() { return this._loading; }

    async loadInitialData() {
        if (this._loading) return;
        runInAction(() => { this._loading = true; });
        try {
            const [countsRes, recentRes, settingsRes] = await Promise.all([
                getUnreadCounts(),
                getNotifications({ limit: RECENT_LIMIT }),
                getMyNotificationSettings()
            ]);
            runInAction(() => {
                this._unreadCounts = countsRes || { user: 0, staff: 0, total: 0 };
                this._recentNotifications = recentRes?.data || [];
                this._settings = settingsRes || [];
            });
        } catch (e) {
            console.error('❌ Ошибка загрузки уведомлений:', e);
        } finally {
            runInAction(() => { this._loading = false; });
        }
    }

    handleNewNotification(notification) {
        runInAction(() => {
            const type = notification.type || 'user';
            const code = notification.groupCode || notification.group_code;

            this._unreadCounts[type] = (this._unreadCounts[type] || 0) + 1;
            this._unreadCounts.total = (this._unreadCounts.total || 0) + 1;

            this._recentNotifications.unshift({ ...notification, groupCode: code });
            if (this._recentNotifications.length > RECENT_LIMIT) {
                this._recentNotifications = this._recentNotifications.slice(0, RECENT_LIMIT);
            }

            this._addToast(notification);
        });
        this._playSound(notification);
    }

    handleReadNotification(notificationId) {
        runInAction(() => {
            const idx = this._recentNotifications.findIndex(n => n.id === notificationId);
            if (idx !== -1) {
                this._recentNotifications[idx].is_read = true;
                this._recentNotifications[idx].read_at = new Date().toISOString();

                if (!this._recentNotifications[idx]._wasCountedAsRead) {
                    const type = this._recentNotifications[idx].type || 'user';
                    this._unreadCounts[type] = Math.max(0, (this._unreadCounts[type] || 0) - 1);
                    this._unreadCounts.total = Math.max(0, (this._unreadCounts.total || 0) - 1);
                    this._recentNotifications[idx]._wasCountedAsRead = true;
                }
            }
        });
    }

    handleReadAll(type) {
        runInAction(() => {
            this._recentNotifications.forEach(n => {
                if (!type || n.type === type) {
                    n.is_read = true;
                    n.read_at = new Date().toISOString();
                    n._wasCountedAsRead = true;
                }
            });
            if (type) {
                this._unreadCounts[type] = 0;
                const otherType = type === 'user' ? 'staff' : 'user';
                this._unreadCounts.total = this._unreadCounts[otherType];
            } else {
                this._unreadCounts = { user: 0, staff: 0, total: 0 };
            }
        });
    }

    handleSettingsChanged() {
        this.loadInitialData();
    }

    async markAsRead(notificationId) {
        try {
            await markAsReadAPI(notificationId);
            this.handleReadNotification(notificationId);
        } catch (e) { console.error('Ошибка markAsRead:', e); }
    }

    async markAllAsRead(type) {
        try {
            await markAllAsReadAPI(type);
            this.handleReadAll(type);
        } catch (e) { console.error('Ошибка markAllAsRead:', e); }
    }

    _addToast(notification) {
        const toastId = `toast_${Date.now()}_${Math.random()}`;
        runInAction(() => {
            this._toasts.push({ id: toastId, ...notification });
        });

        // Автоудаление через TOAST_DURATION
        setTimeout(() => {
            this.removeToast(toastId);
        }, TOAST_DURATION);
    }

    // ЯВНЫЙ ПУБЛИЧНЫЙ МЕТОД ДЛЯ УДАЛЕНИЯ TOAST (чтобы MobX точно его видел)
    removeToast(toastId) {
        runInAction(() => {
            this._toasts = this._toasts.filter(t => t.id !== toastId);
        });
    }

    _playSound(notification) {
        const code = notification.groupCode || notification.group_code;
        const groupSettings = this._settings.find(g => g.code === code);
        if (!groupSettings) return;

        const channelSettings = groupSettings.channels?.find(ch => ch.channel_code === 'web');
        if (!channelSettings || !channelSettings.user_sound) return;

        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => { });
        } catch (e) { }
    }
}