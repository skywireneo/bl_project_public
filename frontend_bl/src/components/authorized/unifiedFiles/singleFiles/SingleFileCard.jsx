import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, Alert } from '../../../ui/UIComponents';
import {
    downloadSingleFile,
    updateSingleFile,
    deleteSingleFile,
    formatFileSize,
    getFileExtension,
    getContentType,
    getTypeIcon,
    getMimeType
} from '../../../../http/unifiedFileAPI';
import { rescanSingleFile, getSingleFileHistory } from '../../../../http/antivirusAPI';
import AntivirusScanResultViewer from '../av/AntivirusScanResultViewer';

const SingleFileCard = forwardRef(({
    file,
    onUpdate = null,
    onDelete = null,
    onRefresh = null
}, ref) => {
    const [loading, setLoading] = useState(false);
    const [blobUrl, setBlobUrl] = useState(null);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [localFile, setLocalFile] = useState(null);
    const [showAntivirusViewer, setShowAntivirusViewer] = useState(false);
    const [antivirusLoading, setAntivirusLoading] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const fileInputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        refresh: () => loadFile(),
        clearBlob: () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);
            }
        }
    }));

    useEffect(() => {
        setLocalFile(file);
        if (file?.attached && file?.code_name && file?.file_name) {
            loadFile();
        } else {
            setBlobUrl(null);
        }
    }, [file?.code_name, file?.attached, file?.file_name]);

    // Блокировка скролла при fullscreen
    useEffect(() => {
        if (showFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showFullscreen]);

    // Escape для закрытия
    useEffect(() => {
        if (!showFullscreen) return;
        const handleKey = (e) => { if (e.key === 'Escape') setShowFullscreen(false); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showFullscreen]);

    const loadFile = async () => {
        if (!file?.code_name) return;
        try {
            setLoading(true);
            setError(null);
            const blob = await downloadSingleFile(file.code_name);
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
        } catch (err) {
            console.error('Ошибка загрузки файла:', err);
            setError('Не удалось загрузить файл');
        } finally {
            setLoading(false);
        }
    };

    const handleReplaceClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        try {
            setUpdating(true);
            setError(null);
            await updateSingleFile(file.code_name, selectedFile);

            if (blobUrl) URL.revokeObjectURL(blobUrl);

            const updatedFile = { ...file, attached: true, file_name: selectedFile.name, file_size: selectedFile.size };
            setLocalFile(updatedFile);
            await loadFile();

            if (onUpdate) onUpdate(file, selectedFile);
        } catch (err) {
            console.error('Ошибка обновления файла:', err);
            setError('Не удалось обновить файл');
        } finally {
            setUpdating(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        setShowConfirmDelete(false);
        try {
            setLoading(true);
            setError(null);
            await deleteSingleFile(file.code_name);

            if (blobUrl) URL.revokeObjectURL(blobUrl);

            const updatedFile = { ...file, attached: false, file_name: null, file_size: null, antivirus_scan_id: null };
            setLocalFile(updatedFile);
            setBlobUrl(null);

            if (onDelete) onDelete(file);
        } catch (err) {
            console.error('Ошибка удаления файла:', err);
            setError('Не удалось удалить файл');
        } finally {
            setLoading(false);
        }
    };

    const handleAntivirusRescan = async () => {
        try {
            setAntivirusLoading(true);
            setError(null);
            await rescanSingleFile(file.code_name);
            alert('Проверка запущена. Обновите страницу для просмотра результата.');
        } catch (err) {
            console.error('Ошибка запуска проверки:', err);
            setError('Не удалось запустить антивирусную проверку');
        } finally {
            setAntivirusLoading(false);
        }
    };

    const handleMediaClick = () => {
        const extension = getFileExtension(localFile?.file_name);
        const contentType = getContentType(extension);
        if (contentType === 'image' || contentType === 'video') {
            setShowFullscreen(true);
        }
    };

    const extension = getFileExtension(localFile?.file_name);
    const contentType = getContentType(extension);
    const typeIcon = getTypeIcon(contentType);
    const mimeType = getMimeType(extension);

    const getTypeColor = () => {
        const colors = {
            'image': '#22c55e',
            'video': '#8b5cf6',
            'audio': '#f59e0b',
            'document': '#3b82f6'
        };
        return colors[contentType] || '#6366f1';
    };

    const typeColor = getTypeColor();

    const renderMediaPreview = () => {
        if (loading) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 30,
                    color: '#94a3b8'
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: '3px solid rgba(99,102,241,0.2)',
                            borderTopColor: '#6366f1'
                        }}
                    />
                    <span style={{ fontSize: 12 }}>Загрузка...</span>
                </div>
            );
        }

        if (!localFile?.attached || !localFile?.file_name || !blobUrl) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 30,
                    color: '#64748b'
                }}>
                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 36, color: '#475569' }} />
                    <span style={{ fontSize: 12 }}>Файл не загружен</span>
                </div>
            );
        }

        if (contentType === 'image') {
            return (
                <div onClick={handleMediaClick} style={{ cursor: 'zoom-in', position: 'relative' }}>
                    <img
                        src={blobUrl}
                        alt={localFile.descr || localFile.name || localFile.code_name}
                        style={{
                            maxWidth: '100%',
                            maxHeight: 220,
                            borderRadius: 8,
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                            transition: 'transform 0.2s'
                        }}
                        onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                    />
                    <div style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <i className="fa-solid fa-expand" style={{ color: '#fff', fontSize: 11 }} />
                    </div>
                </div>
            );
        }

        if (contentType === 'video') {
            return (
                <div onClick={handleMediaClick} style={{ cursor: 'pointer' }}>
                    <video
                        muted
                        playsInline
                        preload="metadata"
                        style={{
                            maxWidth: '100%',
                            maxHeight: 220,
                            borderRadius: 8,
                            background: '#000',
                            display: 'block',
                            margin: '0 auto'
                        }}
                        onError={(e) => { e.target.onerror = null; }}
                    >
                        <source src={blobUrl + '#t=0.5'} type={mimeType} />
                    </video>
                </div>
            );
        }

        if (contentType === 'audio') {
            return (
                <div style={{ width: '100%', padding: '10px 0' }}>
                    <audio controls style={{ width: '100%', accentColor: '#6366f1' }}>
                        <source src={blobUrl} type={mimeType} />
                    </audio>
                </div>
            );
        }

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: 30,
                color: '#94a3b8'
            }}>
                <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: `${typeColor}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className={typeIcon} style={{ fontSize: 28, color: typeColor }} />
                </div>
                <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: typeColor,
                    background: `${typeColor}15`,
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase'
                }}>
                    {extension}
                </span>
            </div>
        );
    };

    // Loading state
    if (loading && !blobUrl && localFile?.attached) {
        return (
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: 20,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: '3px solid rgba(99,102,241,0.2)',
                        borderTopColor: '#6366f1'
                    }}
                />
            </div>
        );
    }

    const commonBtnStyle = {
        padding: '8px 12px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.2s',
        width: '100%'
    };

    return (
        <>
            <div style={{
                background: localFile?.attached ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.15)',
                border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : localFile?.attached ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                {/* Скрытый input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.15)',
                    gap: 10,
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        minWidth: 0,
                        flex: 1
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `${typeColor}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <i className={typeIcon} style={{ color: typeColor, fontSize: 14 }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            {localFile?.name && (
                                <div style={{
                                    fontSize: 13, fontWeight: 600, color: '#f1f5f9',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }} title={localFile.name}>
                                    {localFile.name}
                                </div>
                            )}
                            <div style={{
                                fontSize: 11, color: '#64748b',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }} title={localFile?.code_name}>
                                {localFile?.code_name}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 600, color: typeColor,
                            background: `${typeColor}15`, padding: '2px 8px', borderRadius: 4,
                            textTransform: 'uppercase'
                        }}>
                            {localFile?.type || 'file'}
                        </span>
                        {localFile?.attached ? (
                            <span style={{
                                fontSize: 10, fontWeight: 600, color: '#22c55e',
                                background: 'rgba(34,197,94,0.15)', padding: '2px 8px', borderRadius: 4
                            }}>
                                Прикреплён
                            </span>
                        ) : (
                            <span style={{
                                fontSize: 10, fontWeight: 600, color: '#f59e0b',
                                background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 4
                            }}>
                                Не прикреплён
                            </span>
                        )}
                        {localFile?.can_delete && (
                            <span style={{
                                fontSize: 10, fontWeight: 600, color: '#818cf8',
                                background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 4
                            }}>
                                Можно удалить
                            </span>
                        )}
                    </div>
                </div>

                {/* Превью */}
                <div style={{
                    padding: 14,
                    background: 'rgba(0,0,0,0.1)',
                    minHeight: 150,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {renderMediaPreview()}
                </div>

                {/* Описание */}
                {localFile?.descr && (
                    <div style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#94a3b8',
                        lineHeight: 1.5,
                        background: 'rgba(99,102,241,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                        {localFile.descr}
                    </div>
                )}

                {/* Детали файла */}
                {localFile?.attached && localFile?.file_name && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        fontSize: 11,
                        color: '#64748b',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        gap: 8
                    }}>
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            flex: 1, minWidth: 0
                        }} title={localFile.file_name}>
                            <i className="fa-solid fa-file" style={{ fontSize: 9, flexShrink: 0 }} />
                            {localFile.file_name}
                        </span>
                        {localFile?.file_size && (
                            <span style={{
                                flexShrink: 0,
                                background: 'rgba(99,102,241,0.1)',
                                color: '#818cf8',
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontFamily: 'monospace',
                                fontWeight: 600
                            }}>
                                {formatFileSize(localFile.file_size)}
                            </span>
                        )}
                    </div>
                )}

                {/* Ошибка */}
                {error && (
                    <div style={{ padding: '0 14px', marginTop: 10 }}>
                        <Alert variant="danger" icon="fa-circle-exclamation" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    </div>
                )}

                {/* Действия */}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                    {/* Загрузка/замена */}
                    <button
                        type="button"
                        onClick={handleReplaceClick}
                        disabled={updating || loading}
                        style={{
                            ...commonBtnStyle,
                            background: updating ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            color: '#818cf8',
                            opacity: updating ? 0.6 : 1,
                            cursor: updating ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={e => { if (!updating) e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; }}
                        onMouseLeave={e => e.currentTarget.style.background = updating ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)'}
                    >
                        {updating ? (
                            <>
                                <motion.i
                                    className="fa-solid fa-rotate"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    style={{ fontSize: 11 }}
                                />
                                Загрузка...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 11 }} />
                                {localFile?.attached ? 'Заменить файл' : 'Загрузить файл'}
                            </>
                        )}
                    </button>

                    {/* Удаление */}
                    {localFile?.attached && localFile?.can_delete && (
                        <button
                            type="button"
                            onClick={() => setShowConfirmDelete(true)}
                            disabled={loading}
                            style={{
                                ...commonBtnStyle,
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        >
                            <i className="fa-solid fa-trash" style={{ fontSize: 11 }} />
                            Удалить файл
                        </button>
                    )}

                    {/* Антивирус */}
                    {localFile?.attached && (
                        <>
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                            <button
                                type="button"
                                onClick={() => setShowAntivirusViewer(true)}
                                disabled={loading}
                                style={{
                                    ...commonBtnStyle,
                                    background: 'rgba(59,130,246,0.1)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    color: '#60a5fa',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                            >
                                <i className="fa-solid fa-shield-virus" style={{ fontSize: 11 }} />
                                Проверка
                                {localFile?.antivirus_scan_id && (
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, color: '#22c55e',
                                        background: 'rgba(34,197,94,0.15)', padding: '2px 6px',
                                        borderRadius: 4, marginLeft: 4
                                    }}>
                                        <i className="fa-solid fa-check" />
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleAntivirusRescan}
                                disabled={antivirusLoading}
                                style={{
                                    ...commonBtnStyle,
                                    background: 'rgba(245,158,11,0.1)',
                                    border: '1px solid rgba(245,158,11,0.3)',
                                    color: '#fbbf24',
                                    opacity: antivirusLoading ? 0.6 : 1,
                                    cursor: antivirusLoading ? 'not-allowed' : 'pointer'
                                }}
                                onMouseEnter={e => { if (!antivirusLoading) e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; }}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
                            >
                                {antivirusLoading ? (
                                    <>
                                        <motion.i
                                            className="fa-solid fa-rotate"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            style={{ fontSize: 11 }}
                                        />
                                        Проверка...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-rotate" style={{ fontSize: 11 }} />
                                        Сканировать
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Полноэкранный просмотр */}
            <AnimatePresence>
                {showFullscreen && blobUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        onClick={() => setShowFullscreen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.95)',
                            backdropFilter: 'blur(20px)',
                            zIndex: 4000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20
                        }}
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}
                            style={{
                                position: 'absolute', top: 20, right: 20,
                                width: 44, height: 44, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#f87171', fontSize: 18, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 1
                            }}
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
                        >
                            {getContentType(getFileExtension(localFile.file_name)) === 'image' ? (
                                <img
                                    src={blobUrl}
                                    alt={localFile.descr || localFile.name || localFile.code_name}
                                    style={{
                                        maxWidth: '90vw',
                                        maxHeight: '90vh',
                                        objectFit: 'contain',
                                        borderRadius: 12,
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                    }}
                                />
                            ) : (
                                <video
                                    controls
                                    autoPlay
                                    playsInline
                                    style={{
                                        maxWidth: '90vw',
                                        maxHeight: '90vh',
                                        borderRadius: 12,
                                        background: '#000',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    <source src={blobUrl} type={getMimeType(getFileExtension(localFile.file_name))} />
                                </video>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Подтверждение удаления */}
            <AnimatePresence>
                {showConfirmDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        onClick={() => setShowConfirmDelete(false)}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 4500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 20,
                                padding: 32,
                                maxWidth: 420,
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                margin: '0 auto 20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 10px 30px rgba(239,68,68,0.3)'
                            }}>
                                <i className="fa-solid fa-trash" style={{ color: '#fff', fontSize: 28 }} />
                            </div>
                            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
                                Удалить файл?
                            </h2>
                            <p style={{ color: '#94a3b8', margin: '0 0 8px', fontSize: 14, lineHeight: 1.6 }}>
                                Файл <strong style={{ color: '#e2e8f0' }}>{localFile?.name || localFile?.code_name}</strong> будет откреплён и удалён.
                            </p>
                            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmDelete(false)}
                                    style={{
                                        flex: 1, padding: '10px 16px',
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#e2e8f0', borderRadius: 8, cursor: 'pointer',
                                        fontSize: 13, fontWeight: 500
                                    }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    style={{
                                        flex: 1, padding: '10px 16px',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        border: 'none', color: '#fff', borderRadius: 8,
                                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                                    }}
                                >
                                    Удалить
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Антивирусный viewer */}
            <AnimatePresence>
                {showAntivirusViewer && localFile?.code_name && (
                    <AntivirusScanResultViewer
                        isOpen={showAntivirusViewer}
                        onClose={() => setShowAntivirusViewer(false)}
                        moduleName="files_single"
                        recordId={localFile.code_name}
                        fileName={localFile.file_name}
                        getHistory={(codeName) => getSingleFileHistory(localFile.code_name)}
                    />
                )}
            </AnimatePresence>
        </>
    );
});

SingleFileCard.displayName = 'SingleFileCard';

export default SingleFileCard;