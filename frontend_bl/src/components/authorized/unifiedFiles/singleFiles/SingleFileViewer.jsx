import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    downloadSingleFile,
    getFileExtension,
    getContentType,
    getTypeIcon,
    getMimeType
} from '../../../../http/unifiedFileAPI';

function SingleFileViewer({
    codeName,
    className = '',
    style = {},
    mediaType = 'document',
    showTitle = true,
    showDescription = false,
    showDownload = true,
    downloadText = 'Скачать файл',
    description = '',
    autoPlay = false,
    muted = true,
    loop = false,
    controls = true,
    preload = 'metadata',
    maxHeight = '400px',
    maxWidth = '100%',
    onLoad = null,
    onError = null,
    onClick = null
}) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!codeName) {
            setError('Не указан codeName');
            setLoading(false);
            return;
        }

        loadFile();

        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [codeName]);

    const loadFile = async () => {
        try {
            setLoading(true);
            setError(null);
            const blob = await downloadSingleFile(codeName);
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
            if (onLoad) onLoad({ type: mediaType, url });
        } catch (err) {
            console.error('Ошибка загрузки файла:', err);
            setError('Не удалось загрузить файл');
            if (onError) onError(err);
        } finally {
            setLoading(false);
        }
    };

    const isMediaType = mediaType === 'image' || mediaType === 'video' || mediaType === 'audio';
    const hasDescription = description && description.trim && description.trim().length > 0;
    const shouldShowWrapper = !isMediaType || showDescription || hasDescription;

    const extension = codeName.split('.').pop().toLowerCase();
    const mimeType = getMimeType(extension);

    const getIconForType = () => {
        if (mediaType === 'image') return 'fa-solid fa-image';
        if (mediaType === 'video') return 'fa-solid fa-video';
        if (mediaType === 'audio') return 'fa-solid fa-music';
        return getTypeIcon(mediaType);
    };

    const getTypeColor = () => {
        const colors = {
            'image': '#22c55e',
            'video': '#8b5cf6',
            'audio': '#f59e0b',
            'document': '#3b82f6'
        };
        return colors[mediaType] || '#6366f1';
    };

    const typeColor = getTypeColor();

    const renderMediaContent = () => {
        if (loading) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    padding: 40,
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

        if (error) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    padding: 30,
                    color: '#f87171'
                }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 32 }} />
                    <span style={{ fontSize: 13 }}>{error}</span>
                </div>
            );
        }

        if (!blobUrl) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    padding: 30,
                    color: '#64748b'
                }}>
                    <i className="fa-solid fa-circle-question" style={{ fontSize: 32 }} />
                    <span style={{ fontSize: 13 }}>Файл недоступен</span>
                </div>
            );
        }

        if (mediaType === 'image') {
            return (
                <a
                    href={blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClick}
                    title="Открыть в полном размере"
                    style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                    <img
                        src={blobUrl}
                        alt={codeName}
                        style={{
                            maxWidth: maxWidth,
                            maxHeight: maxHeight,
                            objectFit: 'contain',
                            borderRadius: 8,
                            display: 'block',
                            transition: 'opacity 0.2s'
                        }}
                        onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                    />
                </a>
            );
        }

        if (mediaType === 'video') {
            return (
                <video
                    src={blobUrl}
                    style={{
                        maxWidth: maxWidth,
                        maxHeight: maxHeight,
                        backgroundColor: '#000',
                        borderRadius: 8,
                        display: 'block'
                    }}
                    muted={muted}
                    autoPlay={autoPlay}
                    loop={loop}
                    controls={controls}
                    preload={preload}
                    playsInline
                >
                    <source src={blobUrl} type={mimeType} />
                </video>
            );
        }

        if (mediaType === 'audio') {
            return (
                <audio
                    src={blobUrl}
                    controls={controls}
                    autoPlay={autoPlay}
                    style={{ width: '100%', accentColor: '#6366f1' }}
                >
                    <source src={blobUrl} type={mimeType} />
                </audio>
            );
        }

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: 30,
                width: '100%'
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: 16,
                    background: `${typeColor}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className={getTypeIcon(mediaType)} style={{ fontSize: 36, color: typeColor }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: 14, fontWeight: 600, color: '#f1f5f9',
                        marginBottom: 4, wordBreak: 'break-all'
                    }}>
                        {codeName}
                    </div>
                    <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        background: `${typeColor}15`,
                        color: typeColor,
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase'
                    }}>
                        {extension}
                    </span>
                </div>
                {showDownload && (
                    <a
                        href={blobUrl}
                        download={codeName}
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            color: '#fff',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                        }}
                    >
                        <i className="fa-solid fa-download" style={{ fontSize: 12 }} />
                        {downloadText}
                    </a>
                )}
            </div>
        );
    };

    const containerStyle = { ...style, maxWidth: maxWidth };

    if (!shouldShowWrapper) {
        return (
            <div
                ref={containerRef}
                className={className}
                style={containerStyle}
            >
                {renderMediaContent()}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                ...containerStyle,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                overflow: 'hidden'
            }}
        >
            {showTitle && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.15)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <i className={getIconForType()} style={{ color: typeColor, fontSize: 16 }} />
                    <span style={{
                        fontWeight: 600, color: '#e2e8f0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }} title={codeName}>
                        {codeName}
                    </span>
                </div>
            )}

            <div style={{
                padding: 16,
                minHeight: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.1)'
            }}>
                {renderMediaContent()}
            </div>

            {description && (
                <div style={{
                    padding: '12px 16px',
                    background: 'rgba(99,102,241,0.04)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 14,
                    color: '#cbd5e1',
                    lineHeight: 1.5
                }}>
                    {description}
                </div>
            )}
        </div>
    );
}

export default SingleFileViewer;