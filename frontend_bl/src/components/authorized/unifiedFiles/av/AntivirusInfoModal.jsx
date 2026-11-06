import React from 'react';
import { motion } from 'framer-motion';

function AntivirusInfoModal({ onClose }) {
    // Общие стили
    const sectionStyle = {
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: '1px solid rgba(255,255,255,0.06)'
    };

    const titleStyle = {
        fontSize: 16,
        fontWeight: 700,
        color: '#e2e8f0',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 10,
        borderBottom: '2px solid rgba(99,102,241,0.3)'
    };

    const textStyle = {
        fontSize: 14,
        color: '#cbd5e1',
        lineHeight: 1.7,
        marginBottom: 14,
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        borderLeft: '4px solid #6366f1'
    };

    const smallTextStyle = {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
        lineHeight: 1.5
    };

    const codeStyle = {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#a5b4fc',
        background: 'rgba(99,102,241,0.15)',
        padding: '3px 8px',
        borderRadius: 4
    };

    const badgeStyle = (bg, color) => ({
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color: color,
        gap: 6
    });

    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
        marginTop: 16,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 10,
        overflow: 'hidden'
    };

    const thStyle = {
        padding: '12px 14px',
        textAlign: 'left',
        background: 'rgba(99,102,241,0.1)',
        color: '#a5b4fc',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    };

    const tdStyle = {
        padding: '12px 14px',
        color: '#e2e8f0',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.9)',
                backdropFilter: 'blur(15px)',
                zIndex: 4000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 960,
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
                }}
            >
                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.5)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-book-open" style={{ color: '#fff', fontSize: 18 }} />
                        </div>
                        <div>
                            <h5 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                                Как работает антивирус
                            </h5>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                Полное руководство по системе проверки
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)', border: 'none',
                            color: '#f87171', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14
                        }}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Тело */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                    {/* Раздел 1: Вердикты */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-gavel" style={{ color: '#6366f1' }} />
                            1. Что такое вердикт?
                        </div>
                        <div style={textStyle}>
                            <strong style={{ color: '#f1f5f9' }}>Вердикт</strong> — окончательный приговор файлу, который выносит антивирус после проверки.
                            Вердикт влияет на то, будет ли файл загружен в систему или заблокирован.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
                            <div style={{
                                padding: 14,
                                background: 'rgba(34,197,94,0.08)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                borderRadius: 10,
                                borderLeft: '4px solid #22c55e'
                            }}>
                                <div style={badgeStyle('rgba(34,197,94,0.2)', '#22c55e')}>
                                    <i className="fa-solid fa-circle-check" /> CLEAN
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 8 }}>Безопасен</div>
                                <div style={smallTextStyle}>Файл не содержит угроз</div>
                            </div>

                            <div style={{
                                padding: 14,
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.3)',
                                borderRadius: 10,
                                borderLeft: '4px solid #f59e0b'
                            }}>
                                <div style={badgeStyle('rgba(245,158,11,0.2)', '#f59e0b')}>
                                    <i className="fa-solid fa-exclamation-circle" /> SUSPICIOUS
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 8 }}>Подозрительный</div>
                                <div style={smallTextStyle}>Странные паттерны, но не точно</div>
                            </div>

                            <div style={{
                                padding: 14,
                                background: 'rgba(249,115,22,0.08)',
                                border: '1px solid rgba(249,115,22,0.3)',
                                borderRadius: 10,
                                borderLeft: '4px solid #f97316'
                            }}>
                                <div style={badgeStyle('rgba(249,115,22,0.2)', '#f97316')}>
                                    <i className="fa-solid fa-triangle-exclamation" /> LIKELY_MALICIOUS
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 8 }}>Скорее всего заражён</div>
                                <div style={smallTextStyle}>Высокая вероятность вредоносного кода</div>
                            </div>

                            <div style={{
                                padding: 14,
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 10,
                                borderLeft: '4px solid #ef4444'
                            }}>
                                <div style={badgeStyle('rgba(239,68,68,0.2)', '#ef4444')}>
                                    <i className="fa-solid fa-skull-crossbones" /> MALICIOUS
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 8 }}>Вредоносный</div>
                                <div style={smallTextStyle}>Точно вирус, malware или веб-шелл</div>
                            </div>
                        </div>
                    </div>

                    {/* Раздел 2: Уверенность */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-chart-line" style={{ color: '#6366f1' }} />
                            2. Что такое уверенность (confidence)?
                        </div>
                        <div style={textStyle}>
                            <strong style={{ color: '#f1f5f9' }}>Уверенность</strong> — число от 0 до 100%, которое показывает,
                            насколько антивирус уверен в своём вердикте.
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                            {[
                                { range: '90-100%', title: 'Очень высокая', desc: 'Антивирус почти уверен. Надёжный результат.', color: '#22c55e' },
                                { range: '60-89%', title: 'Хорошая', desc: 'Антивирус довольно уверен. Можно доверять.', color: '#3b82f6' },
                                { range: '40-59%', title: 'Средняя', desc: 'Антивирус не уверен. Лучше проверить вручную.', color: '#f59e0b' },
                                { range: '0-39%', title: 'Низкая', desc: 'Антивирус почти не уверен. Результат неточный.', color: '#ef4444' }
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '12px 16px',
                                    background: `${item.color}10`,
                                    border: `1px solid ${item.color}30`,
                                    borderRadius: 8
                                }}>
                                    <span style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: item.color,
                                        fontFamily: 'monospace',
                                        minWidth: 70
                                    }}>
                                        {item.range}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.title}</div>
                                        <div style={smallTextStyle}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 3: Таблица вердиктов */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-table" style={{ color: '#6366f1' }} />
                            3. Таблица: вердикты и уверенность
                        </div>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Вердикт</th>
                                    <th style={thStyle}>Уверенность</th>
                                    <th style={thStyle}>Что это значит</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { v: 'CLEAN', c: '#22c55e', conf: '95-100%', desc: 'Файл безопасен. Нет признаков угрозы.' },
                                    { v: 'SUSPICIOUS', c: '#f59e0b', conf: '30-60%', desc: 'Странности есть, но может быть нормальный код.' },
                                    { v: 'LIKELY_MALICIOUS', c: '#f97316', conf: '65-80%', desc: 'Много признаков угрозы.' },
                                    { v: 'MALICIOUS', c: '#ef4444', conf: '90-100%', desc: 'Точно вредоносный. Явный вирусный код.' },
                                    { v: 'TIMEOUT', c: '#94a3b8', conf: '30%', desc: 'Проверка не успела завершиться.' }
                                ].map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={tdStyle}>
                                            <span style={badgeStyle(`${row.c}20`, row.c)}>{row.v}</span>
                                        </td>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{row.conf}</td>
                                        <td style={tdStyle}>{row.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Раздел 4: Когда снижается уверенность */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-arrow-trend-down" style={{ color: '#f59e0b' }} />
                            4. Когда уверенность снижается?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { icon: 'fa-clock', color: '#ef4444', title: 'Таймаут', desc: 'Файл проверялся слишком долго и был остановлен.' },
                                { icon: 'fa-file', color: '#94a3b8', title: 'Неизвестный тип файла', desc: 'Антивирус не смог определить тип файла.' },
                                { icon: 'fa-code', color: '#3b82f6', title: 'Мало сработавших правил', desc: 'Мало доказательств — антивирус снижает уверенность.' },
                                { icon: 'fa-circle-check', color: '#22c55e', title: 'Изображения без признаков', desc: 'Для чистых изображений уверенность повышается до 100%.' }
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: '12px 14px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                    borderLeft: `3px solid ${item.color}`
                                }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: `${item.color}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 14 }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.title}</div>
                                        <div style={smallTextStyle}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 5: Проверки */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-magnifying-glass-chart" style={{ color: '#6366f1' }} />
                            5. Какие проверки делает антивирус?
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
                            {[
                                { icon: 'fa-fingerprint', color: '#6366f1', title: '1. Проверка хеша', desc: 'SHA-256 хеш сравнивается с базой известных вирусов.', weight: '+100 баллов' },
                                { icon: 'fa-signature', color: '#ef4444', title: '2. Сигнатурный анализ', desc: 'Поиск известных паттернов: веб-шеллы, reverse shell.', weight: '+40-100 баллов' },
                                { icon: 'fa-chart-column', color: '#f59e0b', title: '3. Анализ энтропии', desc: 'Высокая энтропия = сжатые/зашифрованные данные.', weight: '+10-25 баллов' },
                                { icon: 'fa-code', color: '#3b82f6', title: '4. AST-анализ (JS)', desc: 'Поиск опасных паттернов: eval, Function constructor.', weight: '+40-100 баллов' },
                                { icon: 'fa-layer-group', color: '#22c55e', title: '5. Multi-stage detection', desc: 'Поиск многоэтапных загрузчиков: decode+decrypt+eval.', weight: '+60-100 баллов' },
                                { icon: 'fa-link', color: '#94a3b8', title: '6. Проверка цепочек', desc: 'Комбинации опасных действий: decode+eval, download+execute.', weight: '+25-45 баллов' },
                                { icon: 'fa-box-archive', color: '#475569', title: '7. Проверка архивов', desc: 'Сканирование ZIP, RAR, 7z. Проверка на zip-bomb.', weight: '+50-100 баллов' },
                                { icon: 'fa-shield-check', color: '#6366f1', title: '8. Проверка типа файла', desc: 'Соответствие содержимого расширению. PHP с картинкой = подозрительно.', weight: '+30-100 баллов' }
                            ].map((check, idx) => (
                                <div key={idx} style={{
                                    padding: 14,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 8,
                                            background: `${check.color}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <i className={`fa-solid ${check.icon}`} style={{ color: check.color, fontSize: 13 }} />
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{check.title}</div>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 }}>
                                        {check.desc}
                                    </div>
                                    <div style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: check.color,
                                        background: `${check.color}15`,
                                        padding: '3px 8px',
                                        borderRadius: 4,
                                        display: 'inline-block'
                                    }}>
                                        {check.weight}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 6: Score */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-bullseye" style={{ color: '#6366f1' }} />
                            6. Что такое балл опасности (score)?
                        </div>
                        <div style={textStyle}>
                            <strong style={{ color: '#f1f5f9' }}>Score</strong> — число от 0 до 100, показывающее насколько файл подозрителен.
                            Чем выше, тем больше признаков угрозы.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 14 }}>
                            {[
                                { range: '0-29', title: 'Безопасно', desc: 'Нет значимых признаков угрозы.', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
                                { range: '30-59', title: 'Подозрительно', desc: 'Есть странности. Нужно проверить.', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                                { range: '60-79', title: 'Возможно заражён', desc: 'Много признаков угрозы.', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
                                { range: '80-100', title: 'Опасно', desc: 'Файл точно вредоносный.', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' }
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    padding: 14,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 10,
                                    borderLeft: '4px solid',
                                    borderLeftColor: item.gradient.includes('#22c55e') ? '#22c55e' : item.gradient.includes('#f59e0b') ? '#f59e0b' : item.gradient.includes('#f97316') ? '#f97316' : '#ef4444'
                                }}>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        background: item.gradient,
                                        borderRadius: 6,
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        marginBottom: 8
                                    }}>
                                        {item.range}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.title}</div>
                                    <div style={smallTextStyle}>{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 7: Формула score */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-calculator" style={{ color: '#6366f1' }} />
                            7. Как рассчитывается score?
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            padding: '16px 24px',
                            borderRadius: 10,
                            margin: '16px 0',
                            textAlign: 'center',
                            color: '#fff'
                        }}>
                            <code style={{
                                fontSize: 14,
                                fontWeight: 600,
                                background: 'rgba(255,255,255,0.2)',
                                padding: '8px 16px',
                                borderRadius: 6
                            }}>
                                Score = Σ(правила) + Бонус(цепочки) + Штрафы
                            </code>
                        </div>
                    </div>

                    {/* Раздел 8: Triggered rules */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-gavel" style={{ color: '#6366f1' }} />
                            8. Сработавшие правила (triggered_rules)
                        </div>
                        <div style={textStyle}>
                            Список сигнатур, которые совпали с содержимым файла. "Улики", которые нашёл антивирус.
                        </div>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Правило</th>
                                    <th style={thStyle}>Вес</th>
                                    <th style={thStyle}>Что ищет</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { rule: 'PHP-Eval-POST', w: '+90', color: '#ef4444', desc: 'eval($_POST[...]) — выполнение пользовательского кода' },
                                    { rule: 'PHP-Eval-Base64', w: '+95', color: '#ef4444', desc: 'eval(base64_decode(...)) — скрытый код' },
                                    { rule: 'PHP-Remote-Include', w: '+100', color: '#ef4444', desc: 'include/require с URL — удалённый код' },
                                    { rule: 'Linux-Reverse-Sh', w: '+100', color: '#ef4444', desc: 'Обратный шелл на bash' },
                                    { rule: 'JS-Keylogger-Fetch', w: '+95', color: '#f59e0b', desc: 'Кейлоггер с отправкой данных' },
                                    { rule: 'Base64-Long-Payload', w: '+40', color: '#f59e0b', desc: 'Длинная Base64 строка — возможно скрытый код' }
                                ].map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={tdStyle}>
                                            <code style={codeStyle}>{row.rule}</code>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                ...badgeStyle(`${row.color}20`, row.color),
                                                fontFamily: 'monospace'
                                            }}>
                                                {row.w}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>{row.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Раздел 9: Цепочки */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-link" style={{ color: '#6366f1' }} />
                            9. Цепочки (chains)
                        </div>
                        <div style={textStyle}>
                            Комбинации признаков, которые вместе указывают на угрозу.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                            {[
                                { combo: 'decode + eval', type: 'ОПАСНО', desc: 'Декодирование + выполнение — классика malware', score: '+30', color: '#ef4444' },
                                { combo: 'download + execute', type: 'ОПАСНО', desc: 'Скачивание и запуск — установка вредоносного ПО', score: '+40', color: '#ef4444' },
                                { combo: 'keylog + exfil', type: 'ОПАСНО', desc: 'Перехват клавиш + отправка — кража паролей', score: '+40', color: '#ef4444' },
                                { combo: 'reverse + shell', type: 'ОПАСНО', desc: 'Обратное соединение — удалённый доступ', score: '+35', color: '#ef4444' },
                                { combo: 'base64 + eval', type: 'ПОДОЗРИТЕЛЬНО', desc: 'Base64 код с eval — может быть обфускация', score: '+35', color: '#f59e0b' },
                                { combo: 'network + include', type: 'ПОДОЗРИТЕЛЬНО', desc: 'Сетевой запрос с include — удалённый код', score: '+30', color: '#f59e0b' }
                            ].map((chain, idx) => (
                                <div key={idx} style={{
                                    padding: 14,
                                    background: `${chain.color}08`,
                                    border: `1px solid ${chain.color}30`,
                                    borderRadius: 10
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={badgeStyle(`${chain.color}20`, chain.color)}>{chain.type}</span>
                                        <code style={{ ...codeStyle, fontSize: 13, fontWeight: 700 }}>{chain.combo}</code>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 }}>
                                        {chain.desc}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: chain.color }}>
                                        {chain.score} баллов
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 10: Allowlist */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-check-double" style={{ color: '#22c55e' }} />
                            10. Allowlist (белый список)
                        </div>
                        <div style={textStyle}>
                            Список безопасных библиотек. Если файл содержит код известных библиотек — подозрительность снижается.
                        </div>
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 10,
                            padding: 16,
                            border: '1px solid rgba(255,255,255,0.06)',
                            marginTop: 14
                        }}>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 8, textTransform: 'uppercase' }}>
                                    Библиотеки
                                </div>
                                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.8 }}>
                                    jQuery, React, Vue, Angular, Lodash, Moment, Axios, Express, Koa, Fastify, Bootstrap, Tailwind, Foundation
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 8, textTransform: 'uppercase' }}>
                                    Сборщики
                                </div>
                                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.8 }}>
                                    Webpack, Vite, Parcel, Rollup, Esbuild
                                </div>
                            </div>
                        </div>
                        <div style={{ ...textStyle, marginTop: 14, borderLeftColor: '#22c55e' }}>
                            Каждое совпадение с allowlist уменьшает score на <strong style={{ color: '#22c55e' }}>5 баллов</strong>.
                            Максимальный штраф — <strong style={{ color: '#22c55e' }}>40 баллов</strong>.
                        </div>
                    </div>

                    {/* Раздел 11: Примеры */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b' }} />
                            11. Примеры результатов
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { title: 'Пример 1: Чистый файл (jQuery)', color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', data: { score: 0, verdict: 'CLEAN', confidence: '100%' } },
                                { title: 'Пример 2: Подозрительный JS', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', data: { score: 45, verdict: 'SUSPICIOUS', confidence: '45%' } },
                                { title: 'Пример 3: WebShell', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', data: { score: 95, verdict: 'MALICIOUS', confidence: '98%' } }
                            ].map((example, idx) => (
                                <div key={idx} style={{
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    border: `1px solid ${example.color}30`
                                }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: example.gradient,
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        <i className="fa-solid fa-flask" />
                                        {example.title}
                                    </div>
                                    <div style={{
                                        padding: 14,
                                        background: 'rgba(0,0,0,0.2)'
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Score</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: example.color, fontFamily: 'monospace' }}>
                                                    {example.data.score}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Вердикт</div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                                    {example.data.verdict}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Уверенность</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                    {example.data.confidence}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 12: Формула вердикта */}
                    <div style={sectionStyle}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-scale-balanced" style={{ color: '#6366f1' }} />
                            12. Как определяется вердикт из score?
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[
                                { v: 'CLEAN', s: '0-29', d: 'Нет индикаторов угрозы', c: '#22c55e' },
                                { v: 'SUSPICIOUS', s: '30-59', d: 'Есть странности, мало доказательств', c: '#f59e0b' },
                                { v: 'LIKELY_MALICIOUS', s: '60-79', d: 'Много признаков угрозы', c: '#f97316' },
                                { v: 'MALICIOUS', s: '80-100', d: 'Явные доказательства вредоносного кода', c: '#ef4444' }
                            ].map((row, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                    borderLeft: `4px solid ${row.c}`,
                                    gap: 16
                                }}>
                                    <span style={badgeStyle(`${row.c}20`, row.c)}>{row.v}</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: row.c, minWidth: 60 }}>
                                        {row.s}
                                    </span>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{row.d}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Раздел 13: Категории угроз */}
                    <div style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                        <div style={titleStyle}>
                            <i className="fa-solid fa-bug" style={{ color: '#ef4444' }} />
                            13. Какие типы угроз ищет антивирус?
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                            {[
                                { icon: 'fa-globe', title: 'Веб-атаки', items: ['Веб-шеллы', 'PHP eval с пользовательским вводом', 'Remote File Inclusion', 'XSS', 'SQL Injection'], color: '#ef4444' },
                                { icon: 'fa-terminal', title: 'Обратные шеллы', items: ['Linux reverse shell', 'Netcat reverse/bind', 'PowerShell encoded', 'Node.js child_process', 'Python os.system'], color: '#ef4444' },
                                { icon: 'fa-user-secret', title: 'Кража данных', items: ['Кейлоггеры', 'Кража cookies/localStorage', 'Кража SSH ключей', 'Кража /etc/shadow', 'Exfiltration'], color: '#ef4444' },
                                { icon: 'fa-download', title: 'Загрузчики', items: ['Скачивание и выполнение', 'wget/curl + bash', 'Multi-stage загрузчики', 'Base64 + eval', 'Encrypted payload'], color: '#ef4444' },
                                { icon: 'fa-lock', title: 'Обфускация', items: ['Обфусцированный код', 'String.fromCharCode', 'Nested Base64', 'Hex-encoded данные', 'Eval(function())'], color: '#f59e0b' },
                                { icon: 'fa-box-archive', title: 'Архивы', items: ['Zip-bomb', 'Вредоносные файлы', 'Скрытые исполняемые', 'Malware вложенный'], color: '#f59e0b' }
                            ].map((cat, idx) => (
                                <div key={idx} style={{
                                    padding: 14,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 10,
                                        paddingBottom: 10,
                                        borderBottom: `1px solid ${cat.color}20`
                                    }}>
                                        <div style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            background: `${cat.color}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <i className={`fa-solid ${cat.icon}`} style={{ color: cat.color, fontSize: 12 }} />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{cat.title}</span>
                                    </div>
                                    <ul style={{
                                        margin: 0,
                                        paddingLeft: 16,
                                        fontSize: 12,
                                        color: '#94a3b8',
                                        lineHeight: 1.8
                                    }}>
                                        {cat.items.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Футер */}
                <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.5)',
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                        }}
                    >
                        <i className="fa-solid fa-check" style={{ fontSize: 12 }} />
                        Понятно, закрыть
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default AntivirusInfoModal;