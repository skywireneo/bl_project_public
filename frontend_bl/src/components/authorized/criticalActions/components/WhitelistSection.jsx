import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, Alert } from '../../../ui/UIComponents';
import { getWhitelist, updateWhitelist } from '../../../../http/criticalActionsAPI';
import WhitelistCard from './WhitelistCard';

const WhitelistSection = ({ onLogUpdate, onOpenInfo, onOpenWafInfo }) => {
    const isMountedRef = useRef(true);
    const [whitelistMode, setWhitelistMode] = useState('interactive');
    const initialWhitelistState = { logins: null, statuses: null, tokens: null, ip_blacklist: null, ip_whitelist: null, ua_blacklist: null, honeypot_paths: null, banned_tokens: null };
    const [whitelistData, setWhitelistData] = useState(initialWhitelistState);
    const [whitelistLoading, setWhitelistLoading] = useState({ logins: false, statuses: false, tokens: false, ip_blacklist: false, ip_whitelist: false, ua_blacklist: false, honeypot_paths: false, banned_tokens: false });
    const [whitelistEditing, setWhitelistEditing] = useState(null);
    const [whitelistTempItems, setWhitelistTempItems] = useState([]);
    const [whitelistBulkText, setWhitelistBulkText] = useState('');
    const [whitelistError, setWhitelistError] = useState(null);
    const [whitelistSuccess, setWhitelistSuccess] = useState(null);
    const [generateTokenCount, setGenerateTokenCount] = useState(1);

    const loadWhitelist = useCallback(async (listType) => {
        try {
            setWhitelistLoading(prev => ({ ...prev, [listType]: true }));
            setWhitelistError(null);
            const result = await getWhitelist(listType);
            if (!isMountedRef.current) return;
            if (result.success) setWhitelistData(prev => ({ ...prev, [listType]: result.items || [] }));
            else setWhitelistError(`Ошибка загрузки ${listType}: ${result.message}`);
        } catch (err) { if (isMountedRef.current) setWhitelistError(`Ошибка загрузки ${listType}: ${err.message}`); }
        finally { if (isMountedRef.current) setWhitelistLoading(prev => ({ ...prev, [listType]: false })); }
    }, []);

    const startEditingWhitelist = useCallback((listType) => {
        const items = whitelistData[listType] || [];
        setWhitelistEditing(listType); setWhitelistTempItems([...items]); setWhitelistBulkText(items.join('\n')); setWhitelistError(null); setWhitelistSuccess(null);
    }, [whitelistData]);

    const cancelEditingWhitelist = useCallback(() => { setWhitelistEditing(null); setWhitelistTempItems([]); setWhitelistBulkText(''); setWhitelistError(null); setWhitelistSuccess(null); }, []);

    const saveWhitelist = useCallback(async () => {
        if (!whitelistEditing) return;
        try {
            setWhitelistError(null); setWhitelistSuccess(null);
            let itemsToSave = whitelistMode === 'bulk' ? whitelistBulkText.split('\n').map(i => i.trim()).filter(i => i.length > 0) : whitelistTempItems.filter(i => i.trim() !== '');
            if (whitelistEditing === 'tokens') {
                for (const item of itemsToSave) { if (item.length < 10 || item.length > 20) { setWhitelistError(`Токен "${item}" должен содержать от 10 до 20 символов`); return; } }
            }
            const result = await updateWhitelist(whitelistEditing, itemsToSave);
            if (!isMountedRef.current) return;
            if (result.success) {
                setWhitelistData(prev => ({ ...prev, [whitelistEditing]: itemsToSave }));
                setWhitelistSuccess(result.message || `Список ${whitelistEditing} обновлён`);
                cancelEditingWhitelist();
                if (onLogUpdate) onLogUpdate(); // Обновляем логи в главном файле
            } else setWhitelistError(result.message || 'Ошибка сохранения');
        } catch (err) { if (isMountedRef.current) setWhitelistError(`Ошибка сохранения: ${err.message}`); }
    }, [whitelistEditing, whitelistMode, whitelistBulkText, whitelistTempItems, cancelEditingWhitelist, onLogUpdate]);

    const addWhitelistItem = useCallback(() => setWhitelistTempItems(prev => [...prev, '']), []);
    const removeWhitelistItem = useCallback((index) => setWhitelistTempItems(prev => prev.filter((_, i) => i !== index)), []);
    const updateWhitelistItem = useCallback((index, value) => setWhitelistTempItems(prev => { const n = [...prev]; n[index] = value; return n; }), []);
    const generateTokens = useCallback((count) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; const newTokens = [];
        for (let i = 0; i < count; i++) { let t = ''; for (let j = 0; j < 15; j++) t += chars.charAt(Math.floor(Math.random() * chars.length)); newTokens.push(t); }
        setWhitelistTempItems(prev => [...prev, ...newTokens]); setGenerateTokenCount(1);
    }, []);

    const lists = [
        { type: 'logins', title: 'Логины', icon: 'fa-user-shield', color: '#8b5cf6' }, { type: 'statuses', title: 'Статусы', icon: 'fa-id-badge', color: '#f59e0b' },
        { type: 'tokens', title: 'Токены', icon: 'fa-key', color: '#ef4444' }, { type: 'ip_blacklist', title: 'IP Черный список', icon: 'fa-ban', color: '#dc2626' },
        { type: 'ip_whitelist', title: 'IP Белый список', icon: 'fa-shield-check', color: '#10b981' }, { type: 'ua_blacklist', title: 'User-Agent Боты', icon: 'fa-robot', color: '#f59e0b' },
        { type: 'honeypot_paths', title: 'Honeypot Пути', icon: 'fa-spider', color: '#8b5cf6' }, { type: 'banned_tokens', title: 'Отозванные Токены', icon: 'fa-file-circle-xmark', color: '#64748b' }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
            <Card padding={24} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)' }}><i className="fa-solid fa-list-check" /></div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Управление списками доступа и WAF</h3>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94a3b8' }}>Логины, токены, IP-адреса и правила фильтрации трафика</p>
                        </div>
                    </div>

                    {/* ДОБАВЛЕНЫ КНОПКИ ОТКРЫТИЯ МОДАЛОК */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button variant="ghost" size="sm" onClick={onOpenInfo} icon="fa-circle-info">Тех. работы</Button>
                        <Button variant="primary" size="sm" onClick={onOpenWafInfo} icon="fa-book-open">Инструкция WAF</Button>

                        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>

                        {/* <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                                <Button variant={whitelistMode === 'interactive' ? 'primary' : 'ghost'} size="sm" onClick={() => setWhitelistMode('interactive')} icon="fa-pen-to-square">Интерактивный</Button>
                                <Button variant={whitelistMode === 'bulk' ? 'primary' : 'ghost'} size="sm" onClick={() => setWhitelistMode('bulk')} icon="fa-file-lines">Общий текст</Button>
                            </div> */}
                    </div>
                </div>
                {whitelistError && <Alert variant="error" title="Ошибка" onClose={() => setWhitelistError(null)} style={{ marginBottom: 16 }}>{whitelistError}</Alert>}
                {whitelistSuccess && <Alert variant="success" title="Успешно" onClose={() => setWhitelistSuccess(null)} style={{ marginBottom: 16 }}>{whitelistSuccess}</Alert>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
                    {lists.map((list, idx) => (
                        <WhitelistCard key={list.type} listType={list.type} title={list.title} icon={list.icon} color={list.color} data={whitelistData[list.type]} loading={whitelistLoading[list.type]} isEditing={whitelistEditing === list.type} tempItems={whitelistTempItems} bulkText={whitelistBulkText} mode={whitelistMode} onLoad={() => loadWhitelist(list.type)} onEdit={() => startEditingWhitelist(list.type)} onCancel={cancelEditingWhitelist} onSave={saveWhitelist} onAddItem={addWhitelistItem} onRemoveItem={removeWhitelistItem} onUpdateItem={updateWhitelistItem} onBulkTextChange={setWhitelistBulkText} onGenerateTokens={generateTokens} generateTokenCount={generateTokenCount} onGenerateCountChange={setGenerateTokenCount} delay={idx * 0.1} />
                    ))}
                </div>
            </Card>
        </motion.div>
    );
};
export default WhitelistSection;