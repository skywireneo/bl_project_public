import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Badge, Button } from '../../ui/UIComponents';

const roleLabels = { admin: 'Администратор', manager: 'Менеджер', operator: 'Оператор', viewer: 'Наблюдатель' };
const roleVariants = { admin: 'danger', manager: 'warning', operator: 'info', viewer: 'success' };

function UserCard({ user }) {
    const navigate = useNavigate();

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Card hoverable padding="16px 20px">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <Avatar name={user.login} size={48} variant={user.role === 'admin' ? 'danger' : 'default'} />

                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{user.name || user.login}</span>
                            <Badge variant={roleVariants[user.role] || 'default'}>{user.status_code_name}</Badge>
                            <Badge variant='neutral'>{user.status_text}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span><i className="fa-solid fa-at" style={{ marginRight: 4 }} />{user.login}</span>
                            {user.email && <span><i className="fa-solid fa-envelope" style={{ marginRight: 4 }} />{user.email}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                            size="sm"
                            variant="primary"
                            icon="fa-solid fa-arrow-right"
                            iconPosition="right"
                            onClick={() => navigate(`/users/${user.login}`)}
                        >
                            Перейти
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

export default UserCard;