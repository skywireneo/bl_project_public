import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../../ui/UIComponents';
import SecurityStatusBanner from './SecurityStatusBanner';
import SecuritySettings from './SecuritySettings';
import PasswordChangeForm from './PasswordChangeForm';
import SecondaryPasswordManager from './SecondaryPasswordManager';
import DevicesAndSessions from './DevicesAndSessions';
import SecurityTimeline from './SecurityTimeline';

export default function SecurityDashboard({ userData, displayUser, currentUserId, currentUserStatus }) {
    const [activeSubTab, setActiveSubTab] = useState('auth');

    const subTabs = [
        { key: 'auth', label: 'Аутентификация', icon: 'fa-solid fa-lock', count: null },
        { key: 'devices', label: 'Устройства и сессии', icon: 'fa-solid fa-laptop', count: displayUser?.sessions?.length || null },
        { key: 'timeline', label: 'Журнал событий', icon: 'fa-solid fa-clock-rotate-left', count: null },
    ];

    return (
        <div>
            {/* Статус-баннер безопасности */}
            <SecurityStatusBanner />

            {/* Суб-табы */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto',
                paddingBottom: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                padding: 6, border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {subTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSubTab(tab.key)}
                        style={{
                            padding: '10px 14px', borderRadius: 8, border: 'none',
                            background: activeSubTab === tab.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: activeSubTab === tab.key ? '#e2e8f0' : '#94a3b8',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                        }}
                    >
                        <i className={tab.icon} style={{ fontSize: 12 }} />
                        {tab.label}
                        {tab.count !== null && (
                            <span style={{
                                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                background: activeSubTab === tab.key ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                                color: activeSubTab === tab.key ? '#a5b4fc' : '#64748b'
                            }}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Контент выбранной суб-вкладки */}
            <motion.div
                key={activeSubTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeSubTab === 'auth' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <PasswordChangeForm
                            targetUser={userData}
                            currentUserId={currentUserId}
                            currentUserStatus={currentUserStatus}
                        />
                        <SecondaryPasswordManager
                            targetUser={userData}
                            currentUserId={currentUserId}
                            currentUserStatus={currentUserStatus}
                        />
                        <SecuritySettings />
                    </div>
                )}

                {activeSubTab === 'devices' && (
                    <DevicesAndSessions
                        userId={userData?.user_id}
                        currentUserId={currentUserId}
                        currentUserStatus={currentUserStatus}
                        currentLogin={userData?.login}
                    />
                )}

                {activeSubTab === 'timeline' && (
                    <SecurityTimeline userId={userData?.user_id} />
                )}
            </motion.div>
        </div>
    );
}