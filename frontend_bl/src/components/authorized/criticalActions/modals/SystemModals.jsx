import React from 'react';
import { Modal, Button } from '../../../ui/UIComponents';

export const NotificationModal = ({ isOpen, type, message, onClose }) => (
    <Modal open={isOpen} onClose={onClose} title={type === 'success' ? 'Успешно' : 'Ошибка'} size="sm">
        <div>
            <div style={{ background: type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className={type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'} style={{ color: type === 'success' ? '#10b981' : '#ef4444', fontSize: 24 }} />
                <div style={{ color: type === 'success' ? '#34d399' : '#fca5a5', fontSize: 14, lineHeight: 1.5 }}>{message}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant={type === 'success' ? 'success' : 'danger'} onClick={onClose} icon="fa-check">Понятно</Button></div>
        </div>
    </Modal>
);

// ============================================================================
// МОДАЛКА: ИНФОРМАЦИЯ О СПИСКАХ ДОСТУПА (Тех. работы)
// ============================================================================
export const WhitelistInfoModal = ({ open, onClose }) => (
    <Modal open={open} onClose={onClose} title="Управление списками доступа (Тех. работы)" size="lg">
        <div style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: 14 }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Что такое списки доступа?</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>Списки доступа позволяют гибко управлять правами пользователей на доступ к системе в различных режимах, включая периоды технического обслуживания.</p>
            </div>
            <div style={{ marginBottom: 16, padding: 16, background: 'rgba(139, 92, 246, 0.08)', borderRadius: 10, borderLeft: '3px solid #8b5cf6' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: '#a5b4fc' }}><i className="fa-solid fa-user-shield" style={{ marginRight: 8 }} />Логины и Статусы</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>Пользователи, чьи логины или статусы (например, DEVELOPER) добавлены в эти списки, могут входить в систему даже во время технических работ.</p>
            </div>
            <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, borderLeft: '3px solid #ef4444' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: '#f87171' }}><i className="fa-solid fa-key" style={{ marginRight: 8 }} />Токены доступа</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#cbd5e1' }}>Специальные ключи (10-20 символов), которые позволяют получить доступ к системе в обход тех работ. Добавьте токен в URL: <code style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4, color: '#fca5a5' }}>?access_key=ВАШ_ТОКЕН</code></p>
            </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Button variant="primary" onClick={onClose} icon="fa-check">Понятно</Button>
        </div>
    </Modal>
);

// ============================================================================
// МОДАЛКА: ПОДРОБНАЯ ИНСТРУКЦИЯ ПО WAF НАСТРОЙКАМ (ПОЛНАЯ ВЕРСИЯ)
// ============================================================================
export const WafSettingsInfoModal = ({ open, onClose }) => (
    <Modal open={open} onClose={onClose} title="📘 Энциклопедия настроек WAF и Безопасности" size="lg">
        <div style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: 14, maxHeight: '75vh', overflowY: 'auto', paddingRight: 12 }}>
            {/* ВСТУПЛЕНИЕ */}
            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 18, fontWeight: 700, color: '#34d399' }}><i className="fa-solid fa-shield-halved" style={{ marginRight: 8 }} /> Как работает наша защита?</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>
                    Наш WAF (Web Application Firewall) перехватывает <strong>каждый запрос</strong> ещё до того, как он дойдёт до базы данных или основного сервера.
                    Все настройки применяются <strong>мгновенно</strong> (в течение миллисекунд после сохранения).
                    <br /><br />
                    <strong style={{ color: '#fbbf24' }}> Важное правило:</strong> Локальные IP-адреса (127.0.0.1, 192.168.x.x, 10.x.x.x) автоматически игнорируют Гео-блокировку и Черные списки, чтобы вы не заблокировали сами себя при тестировании.
                </p>
            </div>

            {/* 1. IP ЧЕРНЫЙ СПИСОК */}
            <div style={{ marginBottom: 24, padding: 18, background: 'rgba(220, 38, 38, 0.08)', borderRadius: 12, borderLeft: '4px solid #dc2626' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#f87171' }}><i className="fa-solid fa-ban" style={{ marginRight: 8 }} /> 1. IP Черный список (Блокировка)</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#cbd5e1' }}>Если IP-адрес пользователя совпадает с этим списком, он мгновенно получает ошибку <strong>423 (Ресурс заблокирован)</strong>. Поддерживаются как одиночные IP, так и целые подсети (CIDR).</p>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 14, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#fca5a5', marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#94a3b8', marginBottom: 8, fontFamily: 'sans-serif', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Форматы записи (каждый с новой строки):</div>
                    <div style={{ marginBottom: 6 }}><span style={{ color: '#34d399' }}>192.168.1.100</span><span style={{ color: '#64748b', marginLeft: 10 }}>// Одиночный IPv4 адрес</span></div>
                    <div style={{ marginBottom: 6 }}><span style={{ color: '#34d399' }}>2001:db8::1</span><span style={{ color: '#64748b', marginLeft: 10 }}>// Одиночный IPv6 адрес</span></div>
                    <div style={{ marginBottom: 6 }}><span style={{ color: '#34d399' }}>10.0.0.0/24</span><span style={{ color: '#64748b', marginLeft: 10 }}>// Подсеть (все IP от 10.0.0.0 до 10.0.0.255)</span></div>
                </div>
            </div>

            {/* 2. IP БЕЛЫЙ СПИСОК */}
            <div style={{ marginBottom: 24, padding: 18, background: 'rgba(16, 185, 129, 0.08)', borderRadius: 12, borderLeft: '4px solid #10b981' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#34d399' }}><i className="fa-solid fa-shield-check" style={{ marginRight: 8 }} /> 2. IP Белый список (Исключения)</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#cbd5e1' }}>IP-адреса из этого списка обладают <strong>высшим приоритетом</strong>. Они <strong>полностью игнорируют</strong> проверки Черного списка, Гео-блокировки и User-Agent.<br /><br /><strong style={{ color: '#fbbf24' }}> Внимание:</strong> Белый список <u>НЕ обходит</u> режим "Технических работ". Для обхода тех. работ используйте Токены или Логины.</p>
            </div>

            {/* 3. USER-AGENT БОТЫ */}
            <div style={{ marginBottom: 24, padding: 18, background: 'rgba(245, 158, 11, 0.08)', borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#fbbf24' }}><i className="fa-solid fa-robot" style={{ marginRight: 8 }} /> 3. User-Agent Боты (Фильтр программ)</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#cbd5e1' }}>Если заголовок содержит указанное слово (регистр не важен), запрос блокируется с ошибкой <strong>403 (Доступ запрещён)</strong>.</p>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 14, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#fcd34d', marginBottom: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#94a3b8', marginBottom: 8, fontFamily: 'sans-serif', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Рекомендуемый список для копирования:</div>
                    python-requests<br />curl/<br />wget/<br />Go-http-client<br />nikto<br />sqlmap<br />nmap<br />masscan
                </div>
            </div>

            {/* 4. HONEYPOT ПУТИ */}
            <div style={{ marginBottom: 24, padding: 18, background: 'rgba(139, 92, 246, 0.08)', borderRadius: 12, borderLeft: '4px solid #8b5cf6' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#a5b4fc' }}><i className="fa-solid fa-spider" style={{ marginRight: 8 }} /> 4. Honeypot Пути (Ловушки для хакеров)</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#cbd5e1' }}>Это "приманки". Обычный пользователь никогда не попытается открыть файл <code>/.env</code> или <code>/wp-admin</code>. Если кто-то пытается открыть этот URL, его IP-адрес <strong>мгновенно и автоматически</strong> добавляется в Черный список.</p>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 14, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#c4b5fd', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#94a3b8', marginBottom: 8, fontFamily: 'sans-serif', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Скопируйте и вставьте этот список:</div>
                    /.env<br />/.git/config<br />/.git/HEAD<br />/.aws/credentials<br />/wp-admin<br />/wp-login.php<br />/phpmyadmin<br />/admin<br />/backup.sql
                </div>
            </div>

            {/* 5. ОТОЗВАННЫЕ ТОКЕНЫ */}
            <div style={{ marginBottom: 24, padding: 18, background: 'rgba(100, 116, 139, 0.08)', borderRadius: 12, borderLeft: '4px solid #64748b' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#94a3b8' }}><i className="fa-solid fa-file-circle-xmark" style={{ marginRight: 8 }} /> 5. Отозванные Токены (JWT)</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1' }}>Если вы подозреваете, что токен конкретного пользователя украден или скомпрометирован, вы можете вставить его полный текст (длинную строку) сюда. Система заблокирует любой запрос с этим токеном (ошибка 423), даже если срок его действия ещё не истёк.</p>
            </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Button variant="primary" onClick={onClose} icon="fa-check">Всё понятно, закрыть</Button>
        </div>
    </Modal>
);