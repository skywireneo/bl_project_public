import React, { useState, useEffect, useImperativeHandle, forwardRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge } from "../../ui/UIComponents";
import UnifiedMediaViewer from "./UnifiedMediaViewer";
import UnifiedImageEditor from "./UnifiedImageEditor";
import { getFileBlobUrl, formatFileSize, getContentType, getTypeIcon, getTypeName, rescanFile } from "../../../http/unifiedFileAPI";
import { getUnifiedFileHistory } from "../../../http/antivirusAPI";
import AntivirusScanResultViewer from "./av/AntivirusScanResultViewer";
import { Context } from "../../..";

function getFileNameFromPath(filePath) {
    if (!filePath) return '';
    const parts = filePath.split('/');
    return parts[parts.length - 1];
}

const UnifiedFileCard = forwardRef(({
    file,
    canEdit = false,
    onEdit,
    onEditorSave,
    onDelete,
    onMoveLeft,
    onMoveRight,
    isFirst = false,
    isLast = false,
    moduleName,
    recordId,
    onFileAction,
    onCopyId,
    onPreviewClick
}, ref) => {
    const { user } = useContext(Context)
    const isAdminOrDev =
        user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [extension, setExtension] = useState('');
    const [type, setType] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showAntivirusViewer, setShowAntivirusViewer] = useState(false);
    const [antivirusLoading, setAntivirusLoading] = useState(false);

    // === НОВОЕ СОСТОЯНИЕ: индикатор обновления файла ===
    const [isUpdating, setIsUpdating] = useState(false);

    useImperativeHandle(ref, () => ({
        refresh: (newFileId = null) => {
            setRefreshKey(prev => prev + 1);
            if (newFileId && newFileId !== file.id) {
                file.id = newFileId;
            }
        }
    }));

    // === ЗАГРУЗКА ФАЙЛА (модифицировано) ===
    useEffect(() => {
        let isMounted = true;
        let currentBlobUrl = null;

        const loadFile = async () => {
            try {
                setLoading(true);
                setError(null);
                const blobUrl = await getFileBlobUrl(file.id);
                if (isMounted) {
                    currentBlobUrl = blobUrl;
                    setObjectUrl(blobUrl);
                    setExtension(file.file_extension);
                    setType(file.file_type);
                    // Сбрасываем isUpdating после успешной загрузки нового blob
                    setIsUpdating(false);
                }
            } catch (err) {
                console.error('Ошибка загрузки файла:', err);
                if (isMounted) {
                    setError(err.message || 'Ошибка загрузки файла');
                    setObjectUrl(null);
                    setIsUpdating(false); // Сбрасываем и при ошибке
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadFile();

        return () => {
            isMounted = false;
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
        };
    }, [moduleName, recordId, file.file_path, file.file_name, refreshKey]);

    const contentType = getContentType(extension);
    const typeName = getTypeName(contentType);
    const typeIcon = getTypeIcon(contentType);

    const getTypeColor = () => {
        const colors = {
            'image': '#22c55e',
            'video': '#8b5cf6',
            'audio': '#f59e0b',
            'document': '#3b82f6'
        };
        return colors[contentType] || '#6366f1';
    };

    const getTypeBadgeVariant = () => {
        const variants = {
            'image': 'success',
            'video': 'purple',
            'audio': 'warning',
            'document': 'info'
        };
        return variants[contentType] || 'info';
    };

    const handleEdit = () => {
        if (contentType === 'image' && objectUrl) {
            setShowEditor(true);
        }
    };

    const handleDelete = () => {
        setShowConfirmDelete(true);
    };

    const confirmDelete = () => {
        setShowConfirmDelete(false);
        if (onDelete) {
            onDelete(file);
        }
    };

    const handleMoveLeft = () => {
        if (onMoveLeft && !isFirst) {
            onMoveLeft(file);
        }
    };

    const handleMoveRight = () => {
        if (onMoveRight && !isLast) {
            onMoveRight(file);
        }
    };

    // === МОДИФИЦИРОВАН: устанавливаем isUpdating при сохранении ===
    const handleEditorSave = async (editedFile) => {
        setShowEditor(false);
        setIsUpdating(true); // ← Показываем индикатор обновления

        try {
            if (onEditorSave) {
                await onEditorSave(file, editedFile);
            } else if (onEdit) {
                onEdit(file, editedFile);
            }
        } catch (err) {
            console.error('Ошибка при сохранении:', err);
            setIsUpdating(false);
        }
        // isUpdating сбросится автоматически в useEffect после загрузки нового blob
    };

    const handleEditorCancel = () => {
        setShowEditor(false);
    };

    const handleAntivirusRescan = async () => {
        try {
            setAntivirusLoading(true);
            setError(null);
            await rescanFile(file.id);
            alert('Проверка запущена. Результат появится после завершения.');
        } catch (err) {
            console.error('Ошибка запуска проверки:', err);
            setError('Не удалось запустить антивирусную проверку');
        } finally {
            setAntivirusLoading(false);
        }
    };

    const handleCopyId = () => {
        if (onCopyId) {
            onCopyId(file.id, file.file_name);
        }
    };

    const handleInsertFile = () => {
        if (onFileAction) {
            onFileAction(file);
        }
    };

    const handlePreviewClick = () => {
        if (onPreviewClick) {
            onPreviewClick(file);
        }
    };

    const canEditImage = canEdit && contentType === 'image';
    const typeColor = getTypeColor();

    return (
        <>
            <Card style={{
                height: '100%',
                padding: 0,
                overflow: 'hidden',
                border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : isUpdating ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'border-color 0.3s'
            }}>
                {/* Заголовок карточки */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.15)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: `${typeColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <i className={`fa-solid ${typeIcon}`} style={{ color: typeColor, fontSize: 12 }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: 11,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                marginBottom: 1
                            }}>
                                {typeName}
                            </div>
                            <div style={{
                                fontSize: 12,
                                color: '#e2e8f0',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {file.file_name}
                            </div>
                        </div>
                    </div>
                    <Badge variant={getTypeBadgeVariant()} style={{ flexShrink: 0, marginLeft: 8 }}>
                        {(extension || '').toUpperCase()}
                    </Badge>
                </div>

                {/* Превью (МОДИФИЦИРОВАНО: добавлен оверлей обновления) */}
                <div style={{
                    padding: 16,
                    background: 'rgba(0,0,0,0.1)',
                    minHeight: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    {loading && !isUpdating ? (
                        <div style={{ textAlign: 'center' }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(99,102,241,0.2)',
                                    borderTopColor: '#6366f1',
                                    margin: '0 auto 8px'
                                }}
                            />
                            <span style={{ fontSize: 12, color: '#64748b' }}>Загрузка...</span>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'rgba(239,68,68,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 8px'
                            }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: 16 }} />
                            </div>
                            <span style={{ fontSize: 12, color: '#f87171' }}>{error}</span>
                        </div>
                    ) : (
                        <div style={{ width: '100%', position: 'relative' }}>
                            {/* Контейнер с блюром при обновлении */}
                            <div style={{
                                filter: isUpdating ? 'blur(3px) brightness(0.5)' : 'none',
                                transition: 'filter 0.3s ease',
                                pointerEvents: isUpdating ? 'none' : 'auto'
                            }}>
                                <UnifiedMediaViewer
                                    blobUrl={objectUrl}
                                    filename={file.file_name}
                                    extension={extension}
                                    type={type}
                                    mimeType={file.mimetype}
                                    maxHeight="140px"
                                    onClick={onPreviewClick ? handlePreviewClick : null}
                                />
                            </div>

                            {/* === ОВЕРЛЕЙ ОБНОВЛЕНИЯ === */}
                            <AnimatePresence>
                                {isUpdating && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 10,
                                            borderRadius: 8,
                                            zIndex: 10
                                        }}
                                    >
                                        {/* Пульсирующее кольцо вокруг спиннера */}
                                        <div style={{ position: 'relative' }}>
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.8, 1],
                                                    opacity: [0.6, 0, 0.6]
                                                }}
                                                transition={{
                                                    duration: 1.5,
                                                    repeat: Infinity,
                                                    ease: 'ease-out'
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    inset: -6,
                                                    borderRadius: '50%',
                                                    border: '2px solid #6366f1'
                                                }}
                                            />
                                            {/* Спиннер */}
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{
                                                    duration: 0.9,
                                                    repeat: Infinity,
                                                    ease: 'linear'
                                                }}
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    border: '3px solid rgba(99,102,241,0.2)',
                                                    borderTopColor: '#818cf8',
                                                    background: 'rgba(0,0,0,0.4)',
                                                    backdropFilter: 'blur(8px)'
                                                }}
                                            />
                                        </div>
                                        {/* Лейбл */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '4px 12px',
                                                background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(129,140,248,0.9))',
                                                borderRadius: 8,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: '#fff',
                                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                                                backdropFilter: 'blur(8px)',
                                                letterSpacing: 0.3
                                            }}
                                        >
                                            <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 10 }} />
                                            Обновление файла...
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Overlay для preview клика (для всех типов когда onPreviewClick передан) */}
                            {onPreviewClick && !isUpdating && (
                                <div
                                    onClick={handlePreviewClick}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        cursor: 'pointer',
                                        zIndex: 5,
                                        borderRadius: 8,
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.5)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0,
                                        transition: 'opacity 0.2s'
                                    }}
                                        className="preview-overlay-icon"
                                    >
                                        <i className="fa-solid fa-expand" style={{ color: '#fff', fontSize: 12 }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Информация */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    fontSize: 12
                }}>
                    {file.file_size && (
                        <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="fa-solid fa-hard-drive" style={{ fontSize: 10 }} />
                            {formatFileSize(file.file_size)}
                        </span>
                    )}
                </div>

                {/* Действия */}
                <div style={{
                    padding: 14,
                    opacity: isUpdating ? 0.5 : 1,
                    pointerEvents: isUpdating ? 'none' : 'auto',
                    transition: 'opacity 0.3s'
                }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: canEdit || onFileAction ? 10 : 0 }}>
                        {objectUrl && !onPreviewClick && (
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="fa-solid fa-arrow-up-right-from-square"
                                fullWidth
                                onClick={() => window.open(objectUrl, '_blank')}
                            >
                                Открыть
                            </Button>
                        )}
                        {canEditImage && !error && (
                            <Button
                                variant="primary"
                                size="sm"
                                icon="fa-solid fa-pen"
                                fullWidth
                                onClick={handleEdit}
                            >
                                Редактор
                            </Button>
                        )}
                    </div>

                    {canEdit && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="fa-solid fa-arrow-left"
                                onClick={handleMoveLeft}
                                disabled={isFirst}
                                style={{ flex: 1 }}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="fa-solid fa-arrow-right"
                                onClick={handleMoveRight}
                                disabled={isLast}
                                style={{ flex: 1 }}
                            />
                            <Button
                                variant="danger"
                                size="sm"
                                icon="fa-solid fa-trash"
                                onClick={handleDelete}
                                style={{ flex: 1 }}
                            />
                        </div>
                    )}

                    {!error && isAdminOrDev && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                            <button
                                type="button"
                                onClick={() => setShowAntivirusViewer(true)}
                                style={{
                                    padding: '8px 12px',
                                    background: 'rgba(59,130,246,0.1)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    borderRadius: 8,
                                    color: '#60a5fa',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                    width: '100%'
                                }}
                            >
                                <i className="fa-solid fa-shield-virus" style={{ fontSize: 11 }} />
                                Проверка
                                {file?.antivirus_scan_id && (
                                    <span style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: '#22c55e',
                                        background: 'rgba(34,197,94,0.15)',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        marginLeft: 4
                                    }}>
                                        ✓
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleAntivirusRescan}
                                disabled={antivirusLoading}
                                style={{
                                    padding: '8px 12px',
                                    background: 'rgba(245,158,11,0.1)',
                                    border: '1px solid rgba(245,158,11,0.3)',
                                    borderRadius: 8,
                                    color: '#fbbf24',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: antivirusLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    opacity: antivirusLoading ? 0.6 : 1,
                                    width: '100%'
                                }}
                            >
                                {antivirusLoading ? (
                                    <>
                                        <motion.i
                                            className="fa-solid fa-rotate"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            style={{ fontSize: 11 }}
                                        />
                                        Сканирование...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-rotate" style={{ fontSize: 11 }} />
                                        Пересканировать
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {onFileAction && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="fa-solid fa-copy"
                                onClick={handleCopyId}
                                style={{ flex: 1 }}
                            >
                                ID
                            </Button>
                            <Button
                                variant="success"
                                size="sm"
                                icon="fa-solid fa-plus"
                                onClick={handleInsertFile}
                                style={{ flex: 1 }}
                            >
                                Вставить
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Подтверждение удаления */}
            <AnimatePresence>
                {showConfirmDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowConfirmDelete(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
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
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    margin: '0 auto 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 10px 30px rgba(239,68,68,0.3)'
                                }}
                            >
                                <i className="fa-solid fa-trash" style={{ color: '#fff', fontSize: 28 }} />
                            </motion.div>
                            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
                                Удалить файл?
                            </h2>
                            <p style={{ color: '#94a3b8', margin: '0 0 8px', fontSize: 14, lineHeight: 1.6 }}>
                                Файл <strong style={{ color: '#e2e8f0' }}>{file.file_name}</strong> будет удалён безвозвратно.
                            </p>
                            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                <Button variant="secondary" onClick={() => setShowConfirmDelete(false)} fullWidth>
                                    Отмена
                                </Button>
                                <Button variant="danger" onClick={confirmDelete} fullWidth>
                                    Удалить
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Редактор изображений */}
            <AnimatePresence>
                {showEditor && objectUrl && (
                    <UnifiedImageEditor
                        imageUrl={objectUrl}
                        fileName={file.file_name}
                        onSave={handleEditorSave}
                        onCancel={handleEditorCancel}
                    />
                )}
            </AnimatePresence>

            {/* Антивирусный просмотр результатов */}
            <AnimatePresence>
                {showAntivirusViewer && (
                    <AntivirusScanResultViewer
                        isOpen={showAntivirusViewer}
                        onClose={() => setShowAntivirusViewer(false)}
                        moduleName="incident_evidence"
                        recordId={recordId}
                        fileId={file.id}
                        fileName={file.file_name}
                        getHistory={(module, id, name, fileId) => getUnifiedFileHistory(module, id, name, fileId)}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .preview-overlay-icon:hover {
                    opacity: 1 !important;
                }
                div:hover .preview-overlay-icon {
                    opacity: 1 !important;
                }
            `}</style>
        </>
    );
});

export default UnifiedFileCard;