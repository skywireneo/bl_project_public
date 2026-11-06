import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Button, Select, Badge, Alert } from '../ui/UIComponents';
import { updateTgPost, getIncidentForExport } from '../../http/incidentsAPI';
import { downloadIncidentArchive } from '../../http/unifiedFileAPI';

// ============================================================================
// ЛИМИТ TELEGRAM (символов на одно сообщение)
// ============================================================================
const TELEGRAM_LIMIT = 4096;

// ============================================================================
// ШАБЛОНЫ ДЛЯ СОЦСЕТЕЙ
// ============================================================================
const TEMPLATES = {
    published: {
        name: 'Опубликовано',
        emoji: '🔴',
        color: '#ef4444',
        build: (incident, data) => `🔴 **НОВЫЙ ИНЦИДЕНТ** #${incident.id}

**Причина:** ${incident.add_reason_name || 'Не указана'}

**Замешанные персоны:**
${data.persons || '— не указаны —'}

**Места инцидентов:**
${data.locations || '— не указаны —'}

**Описание:**
${incident.user_description || 'Описание отсутствует'}

🔗 _Подробнее:_ ${data.url}

#инцидент #новости`
    },

    closed: {
        name: 'Закрыт',
        emoji: '',
        color: '#22c55e',
        build: (incident, data) => ` **ИНЦИДЕНТ ЗАКРЫТ** #${incident.id}

Инцидент был успешно закрыт и урегулирован. Все необходимые меры были приняты в установленные сроки.

🔗 _Подробнее:_ ${data.url}

#инцидент #закрыт #решено`
    },

    contested: {
        name: 'Оспорен',
        emoji: '⚖️',
        color: '#a855f7',
        build: (incident, data) => `⚖️ **ИНЦИДЕНТ ОСПОРЕН** #${incident.id}

Инцидент был официально оспорен одной из сторон. Ведётся проверка обстоятельств и повторный анализ ситуации.

🔗 _Подробнее:_ ${data.url}

#инцидент #оспорен #проверка`
    },

    partial: {
        name: 'Частично оспорен',
        emoji: '',
        color: '#eab308',
        build: (incident, data) => ` **ЧАСТИЧНО ОСПОРЕН** #${incident.id}

Инцидент оспорен частично. Некоторые факты подтверждены, по другим ведётся дополнительная проверка.

🔗 _Подробнее:_ ${data.url}

#инцидент #оспорен #частично`
    }
};

// ============================================================================
// КОНВЕРТЕРЫ ФОРМАТОВ
// ============================================================================
const formatConverters = {
    md: (text) => text,

    tg_md: (text) => {
        let result = text;
        result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*');
        result = result.replace(/~~([^~]+)~~/g, '~$1~');
        return result;
    },

    html: (text) => {
        let result = text;
        result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__([^_]+)__/g, '<u>$1</u>');
        result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        result = result.replace(/(^|\s)_([^_]+)_(?=\s|$|\.|,|!|\?)/g, '$1<em>$2</em>');
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        return result;
    },

    plain: (text) => {
        let result = text;
        result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
        result = result.replace(/__([^_]+)__/g, '$1');
        result = result.replace(/~~([^~]+)~~/g, '$1');
        result = result.replace(/(^|\s)_([^_]+)_(?=\s|$|\.|,|!|\?)/g, '$1$2');
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
        return result;
    }
};

// ============================================================================
// ФОРМАТЫ ДЛЯ ВЫБОРА
// ============================================================================
const FORMAT_OPTIONS = [
    { value: 'tg_md', label: 'Telegram MD', icon: 'fa-brands fa-telegram' },
    { value: 'md', label: 'Markdown', icon: 'fa-brands fa-markdown' },
    { value: 'html', label: 'HTML', icon: 'fa-solid fa-code' },
    { value: 'plain', label: 'Просто текст', icon: 'fa-solid fa-align-left' }
];

// ============================================================================
// ХЕЛПЕРЫ ДЛЯ ФОРМИРОВАНИЯ СПИСКОВ
// ============================================================================
const buildPersonsList = (persones) => {
    if (!persones || persones.length === 0) return '';

    return persones.map(p => {
        const fio = (p.fios && p.fios[0]) || 'Неизвестный';
        const position = p.position ? ` (${p.position})` : '';
        return `${fio}${position}`;
    }).join(' · ');
};

const buildLocationsList = (pvzList) => {
    if (!pvzList || pvzList.length === 0) return '';

    return pvzList.map(pvz => {
        const addr = pvz.address || 'Адрес не указан';
        const type = pvz.type ? ` (${pvz.type})` : '';
        return `${addr}${type}`;
    }).join(' · ');
};

// ============================================================================
// КОМПОНЕНТ ЭКСПОРТА
// ============================================================================

/**
 * Модальное окно для экспорта инцидента в социальные сети
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - открыто ли окно
 * @param {Function} props.onClose - функция закрытия
 * @param {Object} props.incident - данные инцидента (используется только для tg_post и id)
 * @param {Function} props.onConfirmPublish - колбэк при успешном подтверждении публикации
 */
export default function ExportIncidentModal({
    isOpen,
    onClose,
    incident,
    onConfirmPublish = () => { }
}) {
    const [activeTemplate, setActiveTemplate] = useState('published');
    const [format, setFormat] = useState('tg_md');
    const [text, setText] = useState('');
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef(null);

    // === СОСТОЯНИЕ ЗАГРУЗКИ ДАННЫХ ДЛЯ ЭКСПОРТА ===
    const [exportData, setExportData] = useState(null);
    const [exportDataFileCount, setExportDataFileCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // === СОСТОЯНИЕ ПУБЛИКАЦИИ В TELEGRAM ===
    const [isConfirming, setIsConfirming] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(
        incident?.tg_post === true
    );
    const [confirmError, setConfirmError] = useState(null);

    // === СОСТОЯНИЕ СКАЧИВАНИЯ АРХИВА ===
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    // === ЗАГРУЗКА ДАННЫХ ПРИ ОТКРЫТИИ МОДАЛКИ ===
    useEffect(() => {
        if (!isOpen || !incident?.id) return;

        let isMounted = true;

        const loadExportData = async () => {
            setIsLoading(true);
            setLoadError(null);

            try {
                const data = await getIncidentForExport(incident.id);
                if (isMounted) {
                    setExportData(data?.data);
                    setExportDataFileCount(data?.fileCount || 0);
                }
            } catch (err) {
                console.error('[ExportModal] Failed to load export data:', err);
                if (isMounted) {
                    setLoadError(
                        err?.response?.data?.message
                        || err.message
                        || 'Не удалось загрузить данные для экспорта'
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadExportData();

        return () => {
            isMounted = false;
        };
    }, [isOpen, incident?.id]);

    // === СБРОС СОСТОЯНИЯ ПРИ ЗАКРЫТИИ МОДАЛКИ ===
    useEffect(() => {
        if (!isOpen) {
            // Сбрасываем данные, чтобы при следующем открытии они были свежими
            setExportData(null);
            setExportDataFileCount(null);
            setLoadError(null);
            setText('');
            setCopied(false);
            setConfirmError(null);
            setDownloadError(null);
        }
    }, [isOpen]);

    // === ФОРМИРОВАНИЕ URL ДЛЯ ШАБЛОНА ===
    // Используем абсолютную ссылку: домен + путь к инциденту
    const incidentUrl = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const origin = window.location.origin;
        const id = exportData?.id || incident?.id;
        return id ? `${origin}/incidents/${id}` : '';
    }, [exportData?.id, incident?.id]);

    // Данные для подстановки в шаблон
    const templateData = useMemo(() => ({
        persons: buildPersonsList(exportData?.personesList),
        locations: buildLocationsList(exportData?.pvzList),
        url: incidentUrl
    }), [exportData, incidentUrl]);

    // Пересборка текста при смене шаблона, формата или данных
    useEffect(() => {
        if (!exportData || !isOpen) return;

        const template = TEMPLATES[activeTemplate];
        if (!template) return;

        try {
            const rawText = template.build(exportData, templateData);
            const converter = formatConverters[format] || formatConverters.md;
            const converted = converter(rawText);
            setText(converted);
        } catch (err) {
            console.error('[ExportModal] Failed to build template:', err);
            setText('Ошибка формирования шаблона');
        }
    }, [activeTemplate, format, exportData, templateData, isOpen]);

    // Сброс флага "скопировано" при смене шаблона/формата
    useEffect(() => {
        setCopied(false);
    }, [activeTemplate, format]);

    // Синхронизация состояния публикации с данными инцидента
    useEffect(() => {
        if (incident?.tg_post !== undefined) {
            setIsConfirmed(incident.tg_post === true);
        }
    }, [incident?.tg_post]);

    // Сброс ошибки при смене шаблона
    useEffect(() => {
        setConfirmError(null);
    }, [activeTemplate]);

    // === Копирование в буфер обмена ===
    const handleCopy = async () => {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            } catch (fallbackErr) {
                console.error('Copy failed:', fallbackErr);
                return;
            }
        }

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // === СКАЧИВАНИЕ АРХИВА С ФАЙЛАМИ ИНЦИДЕНТА ===
    const handleDownloadArchive = async () => {
        if (!incident?.id) {
            setDownloadError('Отсутствует ID инцидента');
            return;
        }

        setIsDownloading(true);
        setDownloadError(null);

        try {
            const result = await downloadIncidentArchive(
                'incident_evidence',  // ← Модуль файлов инцидента
                incident.id
            );

            // Если были пропущенные файлы — показываем уведомление
            if (result.skippedCount > 0) {
                console.warn(
                    `[ExportModal] Архив скачан. Пропущено файлов из-за ошибок: ${result.skippedCount}`
                );
                // Можно показать toast-уведомление вместо alert, если есть
                setTimeout(() => {
                    alert(
                        `Архив "${result.fileName}" скачан.\n` +
                        ` Внимание: ${result.skippedCount} файл(ов) не удалось обработать ` +
                        `и они были пропущены.`
                    );
                }, 300);
            }
        } catch (err) {
            console.error('[ExportModal] Failed to download archive:', err);
            const message = err?.response?.data?.message
                || err.message
                || 'Не удалось скачать архив с файлами инцидента';
            setDownloadError(message);
        } finally {
            setIsDownloading(false);
        }
    };

    // === Повторная загрузка данных ===
    const handleRetryLoad = () => {
        if (incident?.id && isOpen) {
            setExportData(null);
            setExportDataFileCount(0);
            // useEffect сработает автоматически при изменении isOpen/incident.id
            // но нам нужно форсировать перезагрузку
            setIsLoading(true);
            setLoadError(null);
            getIncidentForExport(incident.id)
                .then(data => { setExportData(data.data); setExportDataFileCount(data.fileCount) })
                .catch(err => {
                    setLoadError(err?.response?.data?.message || err.message);
                })
                .finally(() => setIsLoading(false));
        }
    };

    // === Подтверждение публикации в Telegram ===
    const handleConfirmPublishedTg = async () => {
        const incidentId = incident?.id;
        if (!incidentId) {
            setConfirmError('Отсутствует ID инцидента');
            return;
        }

        setIsConfirming(true);
        setConfirmError(null);

        try {
            await updateTgPost(incidentId);
            setIsConfirmed(true);
            onConfirmPublish(incidentId);
        } catch (err) {
            console.error('[ExportModal] Failed to confirm TG publish:', err);
            const message = err?.response?.data?.message
                || err.message
                || 'Не удалось подтвердить публикацию';
            setConfirmError(message);
        } finally {
            setIsConfirming(false);
        }
    };

    // === Сброс текста к исходному шаблону ===
    const handleResetText = () => {
        if (!exportData) return;
        const template = TEMPLATES[activeTemplate];
        if (!template) return;

        try {
            const rawText = template.build(exportData, templateData);
            const converter = formatConverters[format] || formatConverters.md;
            setText(converter(rawText));
        } catch (err) {
            console.error('[ExportModal] Reset failed:', err);
        }
    };

    if (!isOpen) return null;

    const charCount = text.length;
    const isOverLimit = charCount > TELEGRAM_LIMIT;
    const currentTemplate = TEMPLATES[activeTemplate];
    const remainingChars = TELEGRAM_LIMIT - charCount;

    // === РЕЖИМ ЗАГРУЗКИ ===
    if (isLoading && !exportData) {
        return (
            <Modal
                open={isOpen}
                onClose={onClose}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <i className="fa-solid fa-share-nodes" style={{ color: '#6366f1' }} />
                        Экспорт инцидента в соцсети
                    </div>
                }
                size="xl"
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 20px',
                    color: '#94a3b8'
                }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 16 }} />
                    <div style={{ fontSize: 14 }}>Загрузка данных для экспорта...</div>
                </div>
            </Modal>
        );
    }

    // === РЕЖИМ ОШИБКИ ЗАГРУЗКИ ===
    if (loadError && !exportData) {
        return (
            <Modal
                open={isOpen}
                onClose={onClose}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <i className="fa-solid fa-share-nodes" style={{ color: '#6366f1' }} />
                        Экспорт инцидента в соцсети
                    </div>
                }
                size="xl"
            >
                <div style={{ padding: '40px 20px' }}>
                    <Alert
                        variant="danger"
                        icon="fa-solid fa-circle-exclamation"
                        title="Не удалось загрузить данные"
                        style={{ marginBottom: 16 }}
                    >
                        {loadError}
                    </Alert>
                    <Button
                        variant="primary"
                        icon="fa-solid fa-rotate"
                        onClick={handleRetryLoad}
                        fullWidth
                    >
                        Повторить попытку
                    </Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <i className="fa-solid fa-share-nodes" style={{ color: '#6366f1' }} />
                    Экспорт инцидента в соцсети
                </div>
            }
            size="xl"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* === ПАНЕЛЬ УПРАВЛЕНИЯ === */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12
                }}>
                    {/* Выбор шаблона */}
                    <div>
                        <label style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginBottom: 6,
                            display: 'block',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                        }}>
                            Шаблон публикации
                        </label>
                        <Select
                            value={activeTemplate}
                            onChange={(e) => setActiveTemplate(e.target.value)}
                            style={{ fontSize: 13 }}
                        >
                            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                                <option key={key} value={key}>
                                    {tmpl.emoji} {tmpl.name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Выбор формата */}
                    <div>
                        <label style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginBottom: 6,
                            display: 'block',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                        }}>
                            Формат вставки
                        </label>
                        <Select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            style={{ fontSize: 13 }}
                        >
                            {FORMAT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* === ИНФОРМАЦИОННАЯ ПЛАШКА === */}
                <Alert variant="info" icon="fa-solid fa-info-circle">
                    <strong>Как это работает:</strong> Данные загружены через безопасный API
                    (личные данные заявителя скрыты). При смене формата теги автоматически
                    конвертируются. Вы можете свободно редактировать текст в поле ниже.
                </Alert>

                {/* === ТЕКСТОВОЕ ПОЛЕ === */}
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <Badge variant="neutral" style={{
                                background: `${currentTemplate.color}20`,
                                color: currentTemplate.color,
                                border: `1px solid ${currentTemplate.color}40`
                            }}>
                                {currentTemplate.emoji} {currentTemplate.name}
                            </Badge>
                            <span style={{
                                fontSize: 11,
                                color: '#64748b',
                                fontWeight: 600,
                                textTransform: 'uppercase'
                            }}>
                                {FORMAT_OPTIONS.find(f => f.value === format)?.label}
                            </span>
                        </div>

                        <Button
                            variant="ghost"
                            size="xs"
                            icon="fa-solid fa-rotate-left"
                            onClick={handleResetText}
                        >
                            Сбросить правки
                        </Button>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: 280,
                            padding: '14px 16px',
                            background: 'rgba(0,0,0,0.35)',
                            border: `1px solid ${isOverLimit ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 12,
                            color: '#e2e8f0',
                            fontSize: 13,
                            fontFamily: format === 'plain' ? 'inherit' : 'monospace',
                            lineHeight: 1.7,
                            resize: 'vertical',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                        onBlur={(e) => e.target.style.borderColor = isOverLimit
                            ? 'rgba(239,68,68,0.4)'
                            : 'rgba(255,255,255,0.1)'}
                    />

                    {/* === СЧЁТЧИК СИМВОЛОВ === */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        fontSize: 12
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <span style={{ color: '#64748b' }}>
                                <i className="fa-solid fa-text-width" style={{ marginRight: 4 }} />
                                {charCount.toLocaleString('ru-RU')} символов
                            </span>

                            {format === 'tg_md' && (
                                <>
                                    <span style={{ color: '#475569' }}>·</span>
                                    <span style={{
                                        color: isOverLimit ? '#ef4444'
                                            : remainingChars < 200 ? '#eab308'
                                                : '#64748b'
                                    }}>
                                        {isOverLimit
                                            ? ` Превышен лимит на ${Math.abs(remainingChars)}`
                                            : `Telegram: осталось ${remainingChars}`}
                                    </span>
                                </>
                            )}
                        </div>

                        {copied && (
                            <motion.span
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    color: '#22c55e',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <i className="fa-solid fa-circle-check" />
                                Скопировано!
                            </motion.span>
                        )}
                    </div>
                </div>

                {/* === ПРЕДУПРЕЖДЕНИЕ О ЛИМИТЕ === */}
                {isOverLimit && format === 'tg_md' && (
                    <Alert variant="warning" icon="fa-solid fa-triangle-exclamation">
                        Текст превышает лимит Telegram ({TELEGRAM_LIMIT} символов).
                        Сократите описание или уберите часть информации.
                    </Alert>
                )}

                {/* === КНОПКИ ДЕЙСТВИЙ === */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    {/* Основные действия */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: activeTemplate === 'published'
                            ? 'repeat(auto-fit, minmax(180px, 1fr))'
                            : '1fr',
                        gap: 8
                    }}>
                        {/* Кнопка копирования */}
                        <Button
                            variant="primary"
                            icon={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'}
                            onClick={handleCopy}
                            fullWidth
                            disabled={!text}
                            style={copied ? {
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                border: '1px solid rgba(34,197,94,0.3)'
                            } : {}}
                        >
                            {copied ? 'Скопировано!' : 'Скопировать текст'}
                        </Button>

                        {/* Блок скачивания архива (только для шаблона "Опубликовано") */}
                        {activeTemplate === 'published' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                                {/* Красивый счетчик файлов */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 10,
                                    fontSize: 13
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                                        <i className="fa-solid fa-paperclip" style={{ color: '#6366f1' }} />
                                        <span>Вложено файлов:</span>
                                    </div>
                                    <span style={{
                                        color: (exportDataFileCount || 0) > 0 ? '#e2e8f0' : '#64748b',
                                        fontWeight: 600
                                    }}>
                                        {(() => {
                                            const count = exportDataFileCount || 0;
                                            if (count === 0) return 'нет';
                                            if (count === 1) return '1 файл';
                                            if (count >= 2 && count <= 4) return `${count} файла`;
                                            return `${count} файлов`;
                                        })()}
                                    </span>
                                </div>

                                <Button
                                    variant="secondary"
                                    icon={isDownloading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-file-archive'}
                                    onClick={handleDownloadArchive}
                                    fullWidth
                                    loading={isDownloading}
                                    disabled={isDownloading || (exportDataFileCount || 0) === 0}
                                >
                                    {isDownloading ? 'Формирование архива...' : 'Скачать архив с файлами'}
                                </Button>

                                {/* Ошибка скачивания архива */}
                                {downloadError && (
                                    <Alert variant="danger" icon="fa-solid fa-circle-exclamation">
                                        <strong>Ошибка скачивания архива:</strong> {downloadError}
                                    </Alert>
                                )}
                            </div>
                        )}
                    </div>

                    {/* === ПОДТВЕРЖДЕНИЕ ПУБЛИКАЦИИ В TELEGRAM === */}
                    {activeTemplate === 'published' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {isConfirmed ? (
                                <Button
                                    variant="success"
                                    icon="fa-solid fa-circle-check"
                                    fullWidth
                                    disabled
                                    style={{
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        border: '1px solid rgba(34,197,94,0.3)',
                                        cursor: 'default',
                                        opacity: 1
                                    }}
                                >
                                    Опубликовано в Telegram
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    icon="fa-brands fa-telegram"
                                    onClick={handleConfirmPublishedTg}
                                    fullWidth
                                    loading={isConfirming}
                                    disabled={isConfirming}
                                    style={{
                                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                        border: '1px solid rgba(14,165,233,0.3)'
                                    }}
                                >
                                    {isConfirming ? 'Подтверждение...' : 'Подтвердить: Опубликовано в Telegram'}
                                </Button>
                            )}

                            {/* Ошибка подтверждения */}
                            {confirmError && (
                                <Alert variant="danger" icon="fa-solid fa-circle-exclamation">
                                    <strong>Ошибка подтверждения:</strong> {confirmError}
                                </Alert>
                            )}
                        </div>
                    )}
                </div>

                {/* === FOOTER С УМНОЙ ПОДСКАЗКОЙ === */}
                <div style={{
                    padding: '12px 16px',
                    background: isConfirmed
                        ? 'rgba(34,197,94,0.05)'
                        : 'rgba(99,102,241,0.04)',
                    border: isConfirmed
                        ? '1px dashed rgba(34,197,94,0.2)'
                        : '1px dashed rgba(99,102,241,0.15)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#94a3b8',
                    lineHeight: 1.6
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8
                    }}>
                        <i className={`fa-solid ${isConfirmed ? 'fa-circle-check' : 'fa-lightbulb'}`} style={{
                            color: isConfirmed ? '#22c55e' : '#eab308',
                            marginTop: 2,
                            flexShrink: 0
                        }} />
                        <div>
                            {isConfirmed ? (
                                <>
                                    <strong style={{ color: '#22c55e' }}>Публикация подтверждена!</strong>{' '}
                                    Инцидент отмечен как опубликованный в Telegram в системе.
                                </>
                            ) : (
                                <>
                                    <strong style={{ color: '#e2e8f0' }}>Совет:</strong>{' '}
                                    После публикации в Telegram вернитесь сюда и нажмите
                                    «Подтвердить: Опубликовано в Telegram» — это отметит инцидент
                                    как опубликованный в системе.
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}