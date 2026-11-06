import React, { useState, useEffect, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context } from '../..';
import { getNotifications, markAllAsRead } from '../../http/notificationsAPI';
import NotificationItem from './NotificationItem';
import { Button, Card, Badge } from '../ui/UIComponents';

export default function NotificationsPage() {
    const { notification, user } = useContext(Context);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Фильтры
    const [type, setType] = useState('user'); // 'user' | 'staff'
    const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 30;

    const isStaff = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'ADMINISTRATOR', 'TOP_LEVEL_ADMINISTRATOR', 'MODERATOR'].includes(user.user?.status);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {
                type,
                limit,
                offset: (page - 1) * limit
            };

            if (filter === 'unread') params.is_read = false;
            if (filter === 'read') params.is_read = true;

            const res = await getNotifications(params);
            setItems(res.data || []);
            setTotal(res.meta?.total || 0);
        } catch (e) {
            console.error('Ошибка загрузки уведомлений:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [type, filter, page]);

    // Сбрасываем страницу при смене фильтров
    useEffect(() => {
        setPage(1);
    }, [type, filter]);

    const handleMarkAllRead = async () => {
        await markAllAsRead(type);
        notification.handleReadAll(type);
        loadData();
    };

    const handleItemRead = async (id) => {
        await notification.markAsRead(id);
        // Обновляем локально без перезагрузки
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
        ));
    };

    // 🎨 Группировка уведомлений по датам
    const groupedItems = useMemo(() => {
        const groups = {
            today: { label: 'Сегодня', icon: 'fa-calendar-day', color: '#6366f1', items: [] },
            yesterday: { label: 'Вчера', icon: 'fa-calendar-minus', color: '#8b5cf6', items: [] },
            thisWeek: { label: 'На этой неделе', icon: 'fa-calendar-week', color: '#a78bfa', items: [] },
            earlier: { label: 'Ранее', icon: 'fa-calendar', color: '#94a3b8', items: [] }
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        items.forEach(item => {
            const itemDate = new Date(item.created_at);
            const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

            if (itemDay.getTime() === today.getTime()) {
                groups.today.items.push(item);
            } else if (itemDay.getTime() === yesterday.getTime()) {
                groups.yesterday.items.push(item);
            } else if (itemDay > weekAgo) {
                groups.thisWeek.items.push(item);
            } else {
                groups.earlier.items.push(item);
            }
        });

        return groups;
    }, [items]);

    // Статистика
    const unreadCount = notification.unreadCounts[type] || 0;
    const hasAnyItems = items.length > 0;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
            {/* === ШАПКА СО СТАТИСТИКОЙ === */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <i className="fa-solid fa-bell" style={{ color: '#6366f1' }} />
                            Центр уведомлений
                        </h1>
                        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
                            Все важные события и оповещения в одном месте
                        </p>
                    </div>

                    {hasAnyItems && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            icon="fa-check-double"
                            style={{ height: 40 }}
                        >
                            Отметить все как прочитанные
                        </Button>
                    )}
                </div>

                {/* Карточки статистики */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-inbox" style={{ color: '#818cf8', fontSize: 18 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                                Всего
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
                                {total.toLocaleString('ru-RU')}
                            </div>
                        </div>
                    </Card>

                    <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-circle-dot" style={{ color: '#f87171', fontSize: 18 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                                Непрочитано
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: unreadCount > 0 ? '#f87171' : '#4ade80' }}>
                                {unreadCount}
                            </div>
                        </div>
                    </Card>

                    <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-circle-check" style={{ color: '#4ade80', fontSize: 18 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                                Прочитано
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
                                {Math.max(0, total - unreadCount).toLocaleString('ru-RU')}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* === ПАНЕЛЬ ФИЛЬТРОВ === */}
            <Card style={{ padding: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Тип уведомлений (только для стаффа) */}
                    {isStaff && (
                        <div style={{ display: 'flex', gap: 6, padding: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                            <button
                                onClick={() => setType('user')}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: 'none',
                                    background: type === 'user' ? 'rgba(99,102,241,0.2)' : 'transparent',
                                    color: type === 'user' ? '#a5b4fc' : '#94a3b8',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fa-solid fa-user" style={{ fontSize: 12 }} />
                                Личные
                            </button>
                            <button
                                onClick={() => setType('staff')}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: 'none',
                                    background: type === 'staff' ? 'rgba(245,158,11,0.2)' : 'transparent',
                                    color: type === 'staff' ? '#fbbf24' : '#94a3b8',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <i className="fa-solid fa-briefcase" style={{ fontSize: 12 }} />
                                Рабочие
                            </button>
                        </div>
                    )}

                    {/* Разделитель */}
                    {isStaff && <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />}

                    {/* Фильтр по статусу */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => setFilter('all')}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none',
                                background: filter === 'all' ? 'rgba(99,102,241,0.15)' : 'transparent',
                                color: filter === 'all' ? '#a5b4fc' : '#94a3b8',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                                border: filter === 'all' ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <i className="fa-solid fa-list" style={{ fontSize: 11 }} />
                            Все
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none',
                                background: filter === 'unread' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                color: filter === 'unread' ? '#f87171' : '#94a3b8',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                                border: filter === 'unread' ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <i className="fa-solid fa-circle-dot" style={{ fontSize: 11 }} />
                            Непрочитанные
                            {unreadCount > 0 && (
                                <span style={{
                                    padding: '1px 6px', borderRadius: 10,
                                    background: 'rgba(239,68,68,0.3)', fontSize: 10, fontWeight: 700
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setFilter('read')}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none',
                                background: filter === 'read' ? 'rgba(34,197,94,0.15)' : 'transparent',
                                color: filter === 'read' ? '#4ade80' : '#94a3b8',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                                border: filter === 'read' ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }} />
                            Прочитанные
                        </button>
                    </div>
                </div>
            </Card>

            {/* === ОСНОВНОЙ КОНТЕНТ === */}
            {loading ? (
                <Card style={{ textAlign: 'center', padding: 60 }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 32, color: '#6366f1', marginBottom: 16 }} />
                    <div style={{ color: '#94a3b8', fontSize: 14 }}>Загрузка уведомлений...</div>
                </Card>
            ) : !hasAnyItems ? (
                <Card style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <i className="fa-regular fa-bell-slash" style={{ fontSize: 32, color: '#6366f1' }} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                        {filter === 'unread' ? 'Все прочитано!' : 'Уведомлений пока нет'}
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 400, margin: '0 auto' }}>
                        {filter === 'unread'
                            ? 'У вас нет непрочитанных уведомлений. Отличная работа!'
                            : 'Здесь будут отображаться все важные события и оповещения системы.'}
                    </p>
                    {filter !== 'all' && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setFilter('all')}
                            style={{ marginTop: 20 }}
                        >
                            Показать все уведомления
                        </Button>
                    )}
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* Группировка по датам */}
                    {Object.entries(groupedItems).map(([key, group]) => {
                        if (group.items.length === 0) return null;

                        return (
                            <div key={key}>
                                {/* Заголовок группы */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    marginBottom: 16, paddingBottom: 12,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: `${group.color}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <i className={`fa-solid ${group.icon}`} style={{ color: group.color, fontSize: 14 }} />
                                    </div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                                        {group.label}
                                    </h3>
                                    <Badge variant="default" style={{ fontSize: 11, padding: '2px 8px' }}>
                                        {group.items.length}
                                    </Badge>
                                </div>

                                {/* Сетка уведомлений */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
                                    gap: 12
                                }}>
                                    <AnimatePresence>
                                        {group.items.map((item, idx) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: idx * 0.02 }}
                                            >
                                                <NotificationItem
                                                    notification={item}
                                                    onClick={() => handleItemRead(item.id)}
                                                    isDropdown={false}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* === ПАГИНАЦИЯ === */}
            {total > limit && (
                <Card style={{
                    marginTop: 32, padding: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 12
                }}>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                        Показано <strong style={{ color: '#f1f5f9' }}>{items.length}</strong> из{' '}
                        <strong style={{ color: '#f1f5f9' }}>{total}</strong> уведомлений
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            icon="fa-chevron-left"
                        >
                            Назад
                        </Button>

                        <div style={{
                            display: 'flex', gap: 4, alignItems: 'center',
                            padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8
                        }}>
                            <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 14 }}>{page}</span>
                            <span style={{ color: '#64748b', fontSize: 12 }}>из</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{Math.ceil(total / limit)}</span>
                        </div>

                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={page * limit >= total}
                            onClick={() => setPage(p => p + 1)}
                            icon="fa-chevron-right"
                        >
                            Вперед
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}