import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Badge } from "../../ui/UIComponents";
import { getFileBlobUrl, formatFileSize, getContentType, getTypeIcon, getTypeName } from "../../../http/unifiedFileAPI";
import AudioWaveformPlayer from "./audio/AudioWaveformPlayer";
import VideoPlayer from "./video/VideoPlayer";

/**
 * Полноэкранный просмотр файлов инцидента
 * Поддерживает: изображения (с zoom), видео, аудио, документы
 * Навигация: клавиши ←→, свайпы, клик по миниатюрам
 */
function IncidentEvidenceViewer({ isOpen, files = [], initialIndex = 0, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [blobCache, setBlobCache] = useState({});
    const [loadingFiles, setLoadingFiles] = useState({});

    // Zoom & pan для изображений
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });

    // Touch/swipe
    const touchStart = useRef(null);

    // Refs
    const blobUrlsRef = useRef({});
    const thumbnailStripRef = useRef(null);
    const containerRef = useRef(null);

    // === СБРОС ПРИ ОТКРЫТИИ ===
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [isOpen, initialIndex]);

    // === ЗАГРУЗКА ФАЙЛОВ С ПРЕДЗАГРУЗКОЙ СОСЕДЕЙ ===
    useEffect(() => {
        if (!isOpen || !files.length) return;

        const loadFile = async (file) => {
            if (blobUrlsRef.current[file.id]) return;

            setLoadingFiles(prev => ({ ...prev, [file.id]: true }));
            try {
                const url = await getFileBlobUrl(file.id);
                blobUrlsRef.current[file.id] = url;
                setBlobCache(prev => ({ ...prev, [file.id]: { url } }));
            } catch (err) {
                console.error('[Viewer] Failed to load file:', file.id, err);
            } finally {
                setLoadingFiles(prev => ({ ...prev, [file.id]: false }));
            }
        };

        // Загружаем текущий + ±2 соседа
        for (let i = Math.max(0, currentIndex - 2); i <= Math.min(files.length - 1, currentIndex + 2); i++) {
            if (files[i]) loadFile(files[i]);
        }
    }, [isOpen, currentIndex, files]);

    // === ОЧИСТКА BLOB URL ПРИ UNMOUNT ===
    useEffect(() => {
        return () => {
            Object.values(blobUrlsRef.current).forEach(url => {
                try { URL.revokeObjectURL(url); } catch (e) { }
            });
        };
    }, []);

    // === НАВИГАЦИЯ ===
    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [currentIndex]);

    const goToNext = useCallback(() => {
        if (currentIndex < files.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setZoom(1);
            setPan({ x: 0, y: 0 });
        }
    }, [currentIndex, files.length]);

    const goToIndex = useCallback((index) => {
        setCurrentIndex(index);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // === ZOOM ===
    const zoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.5, 5)), []);
    const zoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.5, 0.5)), []);
    const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

    const handleWheel = useCallback((e) => {
        if (getCurrentContentType() !== 'image') return;
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
    }, [currentIndex, files]);

    // === PAN (DRAG ПРИ ZOOM) ===
    const handleMouseDown = (e) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e) => {
        if (!isPanning) return;
        setPan({
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y
        });
    };

    const handleMouseUp = () => setIsPanning(false);

    // === TOUCH/SWIPE ===
    const handleTouchStart = (e) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    };

    const handleTouchEnd = (e) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        const dt = Date.now() - touchStart.current.time;

        // Свайп: горизонтальное движение > 50px, быстрее 500ms
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50 && dt < 500) {
            if (dx > 0) goToPrev();
            else goToNext();
        }
        touchStart.current = null;
    };

    // === КЛАВИАТУРНАЯ НАВИГАЦИЯ ===
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape': onClose(); break;
                case 'ArrowLeft': goToPrev(); break;
                case 'ArrowRight': goToNext(); break;
                case '+': case '=': zoomIn(); break;
                case '-': zoomOut(); break;
                case '0': resetZoom(); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToPrev, goToNext, zoomIn, zoomOut, resetZoom, onClose]);

    // === СКРОЛЛ МИНИАТЮР К АКТИВНОЙ ===
    useEffect(() => {
        if (thumbnailStripRef.current) {
            const activeEl = thumbnailStripRef.current.querySelector('[data-active="true"]');
            if (activeEl) {
                activeEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [currentIndex]);

    // === БЛОКИРОВКА СКРОЛЛА СТРАНИЦЫ ===
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // === ХЕЛПЕРЫ ===
    const getCurrentContentType = () => {
        const file = files[currentIndex];
        if (!file) return 'document';
        return getContentType(file.file_extension);
    };

    const getTypeColor = (contentType) => {
        const colors = {
            'image': '#22c55e',
            'video': '#8b5cf6',
            'audio': '#f59e0b',
            'document': '#3b82f6'
        };
        return colors[contentType] || '#6366f1';
    };

    // === РЕНДЕР МИНИАТЮРЫ ===
    const renderThumbnail = (file, index) => {
        const cached = blobCache[file.id];
        const isLoading = loadingFiles[file.id];
        const contentType = getContentType(file.file_extension);
        const typeColor = getTypeColor(contentType);
        const typeIcon = getTypeIcon(contentType);
        const isActive = index === currentIndex;

        return (
            <button
                type="button"
                key={file.id}
                data-active={isActive}
                onClick={() => goToIndex(index)}
                style={{
                    width: 72,
                    height: 72,
                    minWidth: 72,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: isActive
                        ? '2px solid #6366f1'
                        : '2px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                    opacity: isActive ? 1 : 0.7,
                    boxShadow: isActive ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
                    position: 'relative',
                    flexShrink: 0
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.opacity = '0.7'; }}
            >
                {isLoading ? (
                    <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                                width: 20, height: 20, borderRadius: '50%',
                                border: '2px solid rgba(99,102,241,0.2)',
                                borderTopColor: '#6366f1'
                            }}
                        />
                    </div>
                ) : contentType === 'image' && cached?.url ? (
                    <img
                        src={cached.url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        draggable={false}
                    />
                ) : contentType === 'video' && cached?.url ? (
                    <video
                        src={cached.url + '#t=0.5'}
                        muted
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: `${typeColor}15`,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4
                    }}>
                        <i className={`fa-solid ${typeIcon}`}
                            style={{ color: typeColor, fontSize: 18 }} />
                        <span style={{
                            fontSize: 9, color: typeColor,
                            fontWeight: 600, textTransform: 'uppercase'
                        }}>
                            {(file.file_extension || '').replace('.', '')}
                        </span>
                    </div>
                )}

                {/* Номер файла */}
                <div style={{
                    position: 'absolute', bottom: 2, right: 2,
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: 4, padding: '1px 4px',
                    fontSize: 9, color: '#fff', fontWeight: 600
                }}>
                    {index + 1}
                </div>
            </button>
        );
    };

    // === РЕНДЕР ОСНОВНОГО КОНТЕНТА ===
    const renderContent = () => {
        const currentFile = files[currentIndex];
        if (!currentFile) return null;

        const cached = blobCache[currentFile.id];
        const isLoading = loadingFiles[currentFile.id];
        const contentType = getContentType(currentFile.file_extension);
        const blobUrl = cached?.url;
        const typeColor = getTypeColor(contentType);
        const typeIcon = getTypeIcon(contentType);

        if (isLoading) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 16
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: '3px solid rgba(99,102,241,0.2)',
                            borderTopColor: '#6366f1'
                        }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: 14 }}>Загрузка файла...</span>
                </div>
            );
        }

        if (!blobUrl) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12
                }}>
                    <i className="fa-solid fa-triangle-exclamation"
                        style={{ color: '#ef4444', fontSize: 32 }} />
                    <span style={{ color: '#94a3b8' }}>Не удалось загрузить файл</span>
                </div>
            );
        }

        // 🖼️ ИЗОБРАЖЕНИЕ
        if (contentType === 'image') {
            return (
                <div
                    style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', position: 'relative'
                    }}
                    onWheel={handleWheel}
                >
                    <img
                        src={blobUrl}
                        alt={currentFile.file_name}
                        draggable={false}
                        onDoubleClick={() => zoom === 1 ? setZoom(2) : resetZoom()}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                            cursor: zoom > 1
                                ? (isPanning ? 'grabbing' : 'grab')
                                : 'zoom-in',
                            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
                            userSelect: 'none',
                            borderRadius: 8
                        }}
                    />

                    {/* Zoom индикатор */}
                    {zoom !== 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                position: 'absolute', bottom: 20,
                                background: 'rgba(0,0,0,0.7)',
                                borderRadius: 8, padding: '6px 14px',
                                color: '#fff', fontSize: 13, fontWeight: 600,
                                fontFamily: 'monospace',
                                display: 'flex', alignItems: 'center', gap: 8
                            }}
                        >
                            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 11 }} />
                            {Math.round(zoom * 100)}%
                            <button
                                type="button"
                                onClick={resetZoom}
                                style={{
                                    background: 'rgba(255,255,255,0.15)', border: 'none',
                                    color: '#fff', borderRadius: 4, padding: '2px 8px',
                                    cursor: 'pointer', fontSize: 11
                                }}
                            >
                                Сброс
                            </button>
                        </motion.div>
                    )}
                </div>
            );
        }

        // 🎥 ВИДЕО — используем новый плеер
        if (contentType === 'video') {
            return (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10
                }}>
                    <VideoPlayer
                        key={currentFile.id}
                        blobUrl={blobUrl}
                        filename={currentFile.file_name}
                        compact={false}
                        keyboardEnabled={false}
                        enableFrameNav={true}
                        enableAmbient={true}
                    />
                </div>
            );
        }

        // 🔊 АУДИО — используем новый плеер
        if (contentType === 'audio') {
            return (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <AudioWaveformPlayer
                        key={currentFile.id}
                        blobUrl={blobUrl}
                        filename={currentFile.file_name}
                        compact={false}
                        autoGain={true}
                        keyboardEnabled={false}
                    />
                </div>
            );
        }

        // 📄 ДОКУМЕНТ
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 20,
                padding: 40
            }}>
                <div style={{
                    width: 120, height: 120, borderRadius: 24,
                    background: `${typeColor}15`,
                    border: `2px solid ${typeColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className={`fa-solid ${typeIcon}`}
                        style={{ color: typeColor, fontSize: 48 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                        {currentFile.file_name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                        {formatFileSize(currentFile.file_size)}
                    </div>
                </div>
                <Button
                    variant="primary"
                    icon="fa-download"
                    onClick={() => window.open(blobUrl, '_blank')}
                >
                    Скачать файл
                </Button>
            </div>
        );
    };

    if (!isOpen || !files.length) return null;

    const currentFile = files[currentIndex];
    if (!currentFile) return null;

    const contentType = getContentType(currentFile.file_extension);
    const typeName = getTypeName(contentType);
    const typeColor = getTypeColor(contentType);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.97)',
                backdropFilter: 'blur(20px)',
                zIndex: 3000,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* === ВЕРХНЯЯ ПАНЕЛЬ === */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15,23,42,0.9)',
                    flexShrink: 0,
                    gap: 16,
                    flexWrap: 'wrap'
                }}
            >
                {/* Левая часть: навигация + имя */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <Badge variant="info" style={{ fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>
                        {currentIndex + 1} / {files.length}
                    </Badge>
                    <div style={{
                        fontSize: 14, fontWeight: 500, color: '#e2e8f0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {currentFile.file_name}
                    </div>
                </div>

                {/* Правая часть: мета + закрытие */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
                    {/* Тип файла */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', background: `${typeColor}15`,
                        borderRadius: 6, border: `1px solid ${typeColor}30`
                    }}>
                        <i className={`fa-solid ${getTypeIcon(contentType)}`}
                            style={{ color: typeColor, fontSize: 11 }} />
                        <span style={{ color: typeColor, fontSize: 11, fontWeight: 600 }}>
                            {typeName}
                        </span>
                    </div>

                    {/* Размер */}
                    {currentFile.file_size && (
                        <span style={{
                            fontSize: 12, color: '#94a3b8',
                            display: 'flex', alignItems: 'center', gap: 4
                        }}>
                            <i className="fa-solid fa-hard-drive" style={{ fontSize: 10 }} />
                            {formatFileSize(currentFile.file_size)}
                        </span>
                    )}

                    {/* Дата */}
                    {currentFile.created_at && (
                        <span style={{
                            fontSize: 12, color: '#64748b',
                            display: 'flex', alignItems: 'center', gap: 4
                        }}>
                            <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                            {new Date(currentFile.created_at).toLocaleDateString('ru-RU')}
                        </span>
                    )}

                    {/* Zoom кнопки (только для изображений) */}
                    {contentType === 'image' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                type="button"
                                onClick={zoomOut}
                                style={{
                                    width: 32, height: 32, borderRadius: 6,
                                    background: 'rgba(255,255,255,0.08)', border: 'none',
                                    color: '#e2e8f0', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <i className="fa-solid fa-minus" style={{ fontSize: 11 }} />
                            </button>
                            <button
                                type="button"
                                onClick={resetZoom}
                                style={{
                                    height: 32, borderRadius: 6, padding: '0 10px',
                                    background: 'rgba(255,255,255,0.08)', border: 'none',
                                    color: '#e2e8f0', cursor: 'pointer',
                                    fontSize: 11, fontFamily: 'monospace', fontWeight: 600
                                }}
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                type="button"
                                onClick={zoomIn}
                                style={{
                                    width: 32, height: 32, borderRadius: 6,
                                    background: 'rgba(255,255,255,0.08)', border: 'none',
                                    color: '#e2e8f0', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />
                            </button>
                        </div>
                    )}

                    {/* Закрыть */}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)', border: 'none',
                            color: '#f87171', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>
            </div>

            {/* === ОСНОВНАЯ ОБЛАСТЬ КОНТЕНТА === */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: 20
                }}
            >
                {/* Кнопка НАЗАД */}
                {currentIndex > 0 && (
                    <button
                        type="button"
                        onClick={goToPrev}
                        style={{
                            position: 'absolute', left: 16, top: '50%',
                            transform: 'translateY(-50%)', zIndex: 10,
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', cursor: 'pointer', fontSize: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s', backdropFilter: 'blur(10px)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    >
                        <i className="fa-solid fa-chevron-left" />
                    </button>
                )}

                {/* Контент */}
                <div style={{
                    width: '100%', height: '100%',
                    maxWidth: 'calc(100% - 120px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentFile.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Кнопка ВПЕРЁД */}
                {currentIndex < files.length - 1 && (
                    <button
                        type="button"
                        onClick={goToNext}
                        style={{
                            position: 'absolute', right: 16, top: '50%',
                            transform: 'translateY(-50%)', zIndex: 10,
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', cursor: 'pointer', fontSize: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s', backdropFilter: 'blur(10px)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    >
                        <i className="fa-solid fa-chevron-right" />
                    </button>
                )}
            </div>

            {/* === НИЖНЯЯ ПАНЕЛЬ: МИНИАТЮРЫ === */}
            {files.length > 1 && (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        padding: '12px 20px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(15,23,42,0.9)',
                        flexShrink: 0
                    }}
                >
                    <div
                        ref={thumbnailStripRef}
                        style={{
                            display: 'flex',
                            gap: 10,
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            justifyContent: 'center',
                            padding: '4px 0',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}
                    >
                        <style>{`
                            div::-webkit-scrollbar { display: none; }
                        `}</style>
                        {files.map((file, index) => renderThumbnail(file, index))}
                    </div>

                    {/* Подсказка */}
                    <div style={{
                        textAlign: 'center', marginTop: 8,
                        fontSize: 11, color: '#475569'
                    }}>
                        <i className="fa-solid fa-keyboard" style={{ marginRight: 4 }} />
                        ← → для навигации • Esc для закрытия
                        {contentType === 'image' && ' • Колёсико для zoom • Двойной клик для увеличения'}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default IncidentEvidenceViewer;