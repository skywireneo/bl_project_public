import React, { useState, useEffect } from 'react';
import { Card } from '../../../ui/UIComponents';
import { getSecuritySettings } from '../../../../http/userAPI';

const StatusItem = ({ enabled, label, icon, color }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: enabled ? `${color}10` : 'rgba(100,116,139,0.05)',
        borderRadius: 8,
        border: `1px solid ${enabled ? `${color}30` : 'rgba(100,116,139,0.15)'}`,
        transition: 'all 0.2s'
    }}>
        <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: enabled ? `${color}20` : 'rgba(100,116,139,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <i className={`fa-solid ${icon}`} style={{ color: enabled ? color : '#64748b', fontSize: 12 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{label}</div>
            <div style={{ fontSize: 10, color: enabled ? color : '#64748b', fontWeight: 500 }}>
                {enabled ? 'Активно' : 'Не активно'}
            </div>
        </div>
        <i className={`fa-solid ${enabled ? 'fa-circle-check' : 'fa-circle-xmark'}`}
            style={{ color: enabled ? color : '#64748b', fontSize: 12 }} />
    </div>
);

export default function SecurityStatusBanner() {
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getSecuritySettings()
            .then(data => { setSettings(data); setIsLoading(false); })
            .catch(err => { console.error(err); setIsLoading(false); });
    }, []);

    if (isLoading || !settings) {
        return (
            <Card style={{ marginBottom: 16, padding: 20 }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 20, marginBottom: 8, display: 'block' }} />
                    <div style={{ fontSize: 12 }}>Загрузка статуса безопасности...</div>
                </div>
            </Card>
        );
    }

    return (
        <Card style={{ marginBottom: 16, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(16,185,129,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className="fa-solid fa-shield-halved" style={{ color: '#10b981', fontSize: 18 }} />
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Статус безопасности</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Общая оценка защищённости аккаунта</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <StatusItem enabled={true} label="Пароль установлен" icon="fa-key" color="#6366f1" />
                <StatusItem enabled={settings.totp_enabled} label="2FA (TOTP)" icon="fa-mobile-screen" color="#3b82f6" />
                <StatusItem enabled={settings.has_seed} label="Сид-фраза" icon="fa-seedling" color="#10b981" />
                <StatusItem enabled={settings.backup_codes_remaining > 0} label="Аварийные коды" icon="fa-key" color="#f59e0b" />
            </div>
        </Card>
    );
}