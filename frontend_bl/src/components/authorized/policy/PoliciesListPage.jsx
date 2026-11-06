import React, { useEffect, useState, useMemo, useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../../..";
import { PageHeader, Card, Badge, Input, Select, EmptyState } from "../../ui/UIComponents"; // Путь к вашей UI библиотеке
import { fatchPolicy } from "../../../http/policyAPI";

// Утилиты
function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function timeAgo(dateString) {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин. назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч. назад`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} дн. назад`;
    return date.toLocaleDateString('ru-RU');
}

function PoliciesListPage() {
    const { user } = useContext(Context);
    const [policies, setPolicies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('updated_at');

    const isDev = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(user?.user?.status);

    useEffect(() => {
        setIsLoading(true);
        fatchPolicy()
            .then((result) => {
                if (result !== 'err') setPolicies(result || []);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filteredAndSortedPolicies = useMemo(() => {
        let filtered = policies || [];

        // Фильтрация по поиску
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name?.toLowerCase().includes(query) ||
                stripHtml(p.text)?.toLowerCase().includes(query)
            );
        }

        // Сортировка
        filtered.sort((a, b) => {
            if (sortBy === 'updated_at') return new Date(b.updated_at) - new Date(a.updated_at);
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'priority') return (b.display_priority || 5) - (a.display_priority || 5);
            return 0;
        });

        return filtered;
    }, [policies, searchQuery, sortBy]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* <Card style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <Input
                            icon="fa-solid fa-magnifying-glass"
                            placeholder="Поиск по названию или тексту..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto', minWidth: 200 }}>
                        <option value="updated_at">Сначала новые</option>
                        <option value="name">По алфавиту</option>
                        <option value="priority">По приоритету</option>
                    </Select>
                </div>
            </Card> */}

            {isLoading ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} />
                </div>
            ) : filteredAndSortedPolicies.length === 0 ? (
                <Card>
                    <EmptyState
                        icon="fa-solid fa-file-shield"
                        title="Политики не найдены"
                        description={searchQuery ? "Попробуйте изменить поисковый запрос" : "Обратитесь к администратору для добавления документов."}
                    />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {filteredAndSortedPolicies.map((item) => (
                        <Link to={`/policies/${item.type}`} style={{ textDecoration: 'none' }} key={item.id || item.type}>
                            <Card hoverable padding={24} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0, flex: 1, lineHeight: 1.3 }}>{item.name}</h3>
                                    <Badge variant="info" icon="fa-solid fa-code-branch">v{item.version}</Badge>
                                </div>

                                {item.text && (
                                    <div style={{
                                        fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16, flex: 1,
                                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                    }}>
                                        {stripHtml(item.text)}
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fa-solid fa-regular fa-clock" /> {timeAgo(item.updated_at)}
                                    </span>
                                    {item.target_user_types && item.target_user_types.length > 0 && isDev && (
                                        <Badge variant="purple" icon="fa-solid fa-users" title={item.target_user_types.join(', ')}>
                                            {item.target_user_types.length} ролей
                                        </Badge>
                                    )}
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PoliciesListPage;