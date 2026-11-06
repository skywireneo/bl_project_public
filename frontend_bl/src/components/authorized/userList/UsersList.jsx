import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserCard from './UserCard';
import CreateUserModal from './CreateUserModal';
import { PageHeader, Button, Card, Input, EmptyState } from '../../ui/UIComponents';
import { fatchUsers } from '../../../http/userAPI';

function UsersList() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [totalUsers, setTotalUsers] = useState(0);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const roleLabels = { all: 'Все', admin: 'Админы', manager: 'Менеджеры', operator: 'Операторы', viewer: 'Наблюдатели' };

    useEffect(() => {
        loadUsers();
        if (page !== 1) setPage(1);
    }, [roleFilter]);

    useEffect(() => {
        loadUsers();
    }, [page]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fatchUsers(limit, page, roleFilter);
            const payload = response[0];
            const userList = Array.isArray(payload) ? payload : (response[1] || []);
            setUsers(userList);
            setTotalUsers(payload?.total || payload?.count || userList.length);
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserCreated = async () => {
        setIsModalOpen(false);
        await loadUsers();
    };

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        const s = search.toLowerCase();
        return users.filter(u =>
            u.login?.toLowerCase().includes(s) ||
            (u.name && u.name.toLowerCase().includes(s))
        );
    }, [users, search]);

    const totalPages = Math.ceil(totalUsers / limit);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <PageHeader
                title="Пользователи"
                subtitle={`Всего в системе: ${totalUsers}`}
                actions={
                    <Button icon="fa-solid fa-plus" variant="primary" onClick={() => setIsModalOpen(true)}>
                        Новый пользователь
                    </Button>
                }
            />

            <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1 }}>
                <Card style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                            <Input
                                icon="fa-solid fa-magnifying-glass"
                                placeholder="Поиск по логину или имени..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {Object.entries(roleLabels).map(([key, label]) => (
                                <Button
                                    key={key}
                                    size="sm"
                                    variant={roleFilter === key ? 'primary' : 'secondary'}
                                    onClick={() => setRoleFilter(key)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {isLoading ? (
                        <Card style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, marginBottom: 12 }} />
                            <div>Загрузка пользователей...</div>
                        </Card>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <UserCard key={user.id || user.user_id} user={user} />
                                ))
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Card>
                                        <EmptyState
                                            icon="fa-solid fa-users-slash"
                                            title="Пользователи не найдены"
                                            description="Попробуйте изменить параметры поиска или фильтры"
                                            action={
                                                <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setRoleFilter('all'); }}>
                                                    Сбросить фильтры
                                                </Button>
                                            }
                                        />
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>

                {totalPages > 1 && !isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
                        <Button size="sm" variant="secondary" icon="fa-solid fa-chevron-left" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Назад</Button>
                        <span style={{ fontSize: 14, color: '#94a3b8' }}>Страница {page} из {totalPages}</span>
                        <Button size="sm" variant="secondary" icon="fa-solid fa-chevron-right" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Вперед</Button>
                    </div>
                )}
            </div>

            <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUserCreated={handleUserCreated} />
        </div>
    );
}

export default UsersList;