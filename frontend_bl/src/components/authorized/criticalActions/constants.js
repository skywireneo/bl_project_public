export const CATEGORIES = {
    database: { id: 'database', title: 'База данных', icon: 'fa-solid fa-database', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
    security: { id: 'security', title: 'Безопасность', icon: 'fa-solid fa-shield-halved', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
    system: { id: 'system', title: 'Система', icon: 'fa-solid fa-gears', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
    chats: { id: 'chats', title: 'Чаты', icon: 'fa-solid fa-comments', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' }
};

export const SEVERITY_STYLES = {
    2: { variant: 'danger', label: 'Высокий', color: '#ef4444', icon: 'fa-bolt' },
    1: { variant: 'warning', label: 'Средний', color: '#f59e0b', icon: 'fa-triangle-exclamation' },
    0: { variant: 'info', label: 'Низкий', color: '#3b82f6', icon: 'fa-check' }
};