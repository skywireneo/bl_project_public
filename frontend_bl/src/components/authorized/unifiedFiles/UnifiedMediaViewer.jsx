import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AudioWaveformPlayer from "./audio/AudioWaveformPlayer";
import VideoPlayer from "./video/VideoPlayer";

/**
 * Компонент для безопасного отображения медиафайлов в новом тёмном дизайне
 * Поддерживает изображения, видео, аудио и документы
 */
function UnifiedMediaViewer({
    blobUrl,
    filename,
    extension = '',
    type = '',
    mimeType = '',
    maxHeight = '300px',
    onClick = null
}) {
    const [showFull, setShowFull] = useState(false);

    if (!blobUrl) {
        return (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '2px solid rgba(99,102,241,0.2)',
                        borderTopColor: '#6366f1',
                        margin: '0 auto 8px'
                    }}
                />
                <span style={{ fontSize: 12, color: '#64748b' }}>Загрузка...</span>
            </div>
        );
    }

    const handleMediaClick = (e) => {
        if (onClick) {
            onClick(e);
        } else if (type === 'image' || type === 'video') {
            setShowFull(true);
        }
    };

    // 🖼️ Изображения
    if (type === 'image') {
        return (
            <>
                <img
                    src={blobUrl}
                    alt={filename}
                    style={{
                        maxWidth: "100%",
                        maxHeight: maxHeight,
                        borderRadius: "8px",
                        cursor: "pointer",
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto'
                    }}
                    onClick={handleMediaClick}
                />
                <AnimatePresence>
                    {showFull && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFull(false)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.9)",
                                backdropFilter: "blur(10px)",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                zIndex: 9999,
                                cursor: "zoom-out",
                                padding: 20
                            }}
                        >
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={blobUrl}
                                alt={filename}
                                style={{
                                    maxWidth: "90vw",
                                    maxHeight: "90vh",
                                    borderRadius: "12px",
                                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <button
                                onClick={() => setShowFull(false)}
                                style={{
                                    position: 'absolute',
                                    top: 20,
                                    right: 20,
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: 18,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    }

    // 🎥 Видео
    if (type === 'video') {
        return (
            <div
                onClick={onClick ? handleMediaClick : undefined}
                style={{ cursor: onClick ? 'pointer' : 'default' }}
            >
                <VideoPlayer
                    blobUrl={blobUrl}
                    filename={filename}
                    compact={true}
                />
            </div>
        );
    }

    // 🔊 Аудио — ИСПОЛЬЗУЕМ НОВЫЙ КОМПОНЕНТ
    if (type === 'audio') {
        return (
            <AudioWaveformPlayer
                blobUrl={blobUrl}
                filename={filename}
                compact={true}
                autoGain={false}
            />
        );
    }

    // 📄 Документы и всё остальное
    return (
        <a
            href={blobUrl}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8,
                color: '#818cf8',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
        >
            <i className="fa-solid fa-download" />
            Скачать файл
        </a>
    );
}

export default UnifiedMediaViewer;