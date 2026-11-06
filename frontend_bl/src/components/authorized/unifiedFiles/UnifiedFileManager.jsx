import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Badge, EmptyState, Alert } from "../../ui/UIComponents";
import UnifiedFileCard from "./UnifiedFileCard";
import IncidentEvidenceViewer from "./IncidentEvidenceViewer";
import {
    getFiles,
    uploadFiles,
    deleteFile,
    updateFile as apiUpdateFile,
    reorderFiles as apiReorderFiles,
    formatFileSize
} from "../../../http/unifiedFileAPI";

const STYLES = `
@keyframes file-upload-pulse {
    0%, 100% { border-color: rgba(99,102,241,0.3); }
    50% { border-color: rgba(99,102,241,0.6); }
}
@keyframes file-drop-active {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}
.upload-zone-pulse {
    animation: file-upload-pulse 2s ease-in-out infinite;
}
.upload-zone-active {
    animation: file-drop-active 0.6s ease-in-out;
}
@keyframes file-skeleton-shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
}
.file-skeleton-box {
    background: linear-gradient(90deg, 
        rgba(255,255,255,0.04) 25%, 
        rgba(255,255,255,0.08) 50%, 
        rgba(255,255,255,0.04) 75%);
    background-size: 800px 100%;
    animation: file-skeleton-shimmer 1.6s ease-in-out infinite;
    border-radius: 12px;
}
`;

function getFileNameFromPath(filePath) {
    if (!filePath) return '';
    const parts = filePath.split('/');
    return parts[parts.length - 1];
}

function formatExtensions(extensions) {
    if (!extensions || extensions.length === 0) return '';
    return extensions.map(ext => ext.toUpperCase().replace('.', '')).join(', ');
}

function getFileTypeIcon(typeName) {
    const icons = {
        'image': 'fa-image',
        'video': 'fa-play',
        'audio': 'fa-volume-high',
        'document': 'fa-file-lines'
    };
    return icons[typeName] || 'fa-file';
}

function getFileTypeColor(typeName) {
    const colors = {
        'image': '#22c55e',
        'video': '#8b5cf6',
        'audio': '#f59e0b',
        'document': '#3b82f6'
    };
    return colors[typeName] || '#6366f1';
}

function getFileTypeDisplayName(typeName) {
    const names = {
        'image': 'Изображения',
        'video': 'Видео',
        'audio': 'Аудио',
        'document': 'Документы'
    };
    return names[typeName] || 'Файлы';
}

function UnifiedFileManager({
    moduleName,
    recordId,
    canEdit = false,
    onFilesChange = null,
    uploadConfig = {},
    onFileAction = null,
    onCopyId,
    enableViewer = false  // ← НОВЫЙ ПРОП: включает полноэкранный viewer
}) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [serverConfig, setServerConfig] = useState({
        maxFiles: 50,
        allowedFileTypes: {
            image: { maxSize: 10 * 1024 * 1024, extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
            video: { maxSize: 100 * 1024 * 1024, extensions: ['.mp4', '.webm', '.mov'] },
            audio: { maxSize: 50 * 1024 * 1024, extensions: ['.mp3', '.wav', '.ogg'] },
            document: { maxSize: 50 * 1024 * 1024, extensions: ['.doc', '.docx', '.txt'] }
        },
        moduleName: '',
        moduleDescription: ''
    });

    // === СОСТОЯНИЕ VIEWER ===
    const [viewerState, setViewerState] = useState({
        isOpen: false,
        initialIndex: 0
    });

    const defaultConfig = useMemo(() => ({
        maxFiles: 50,
        showUploadZone: true,
        showFileList: true
    }), []);

    const config = useMemo(() => ({ ...defaultConfig, ...uploadConfig }), [defaultConfig, uploadConfig]);
    const fileCardRefs = useRef({});
    const fileInputRef = useRef(null);
    const isLimitReached = files.length >= serverConfig.maxFiles;

    useEffect(() => {
        if (moduleName && recordId) {
            loadFiles();
        }
    }, [moduleName, recordId]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getFiles(moduleName, recordId);
            if (response.success) {
                setFiles(response.data.files || []);
                setServerConfig(prev => ({
                    ...prev,
                    maxFiles: response.data.maxFiles || prev.maxFiles,
                    allowedFileTypes: response.data.allowedFileTypes || prev.allowedFileTypes,
                    moduleName: response.data.name || prev.moduleName,
                    moduleDescription: response.data.description || prev.moduleDescription
                }));
            } else {
                throw new Error('Не удалось загрузить файлы');
            }
        } catch (err) {
            console.error('Ошибка загрузки файлов:', err);
            setError(err.message || 'Ошибка при загрузке файлов');
        } finally {
            setLoading(false);
        }
    };

    const validateFiles = useCallback((filesToValidate) => {
        const errors = [];
        filesToValidate.forEach(file => {
            const fileName = file.name.toLowerCase();
            const extension = '.' + fileName.split('.').pop();
            let matchedType = null;
            for (const [type, typeConfig] of Object.entries(serverConfig.allowedFileTypes)) {
                if (typeConfig.extensions.some(ext => ext.toLowerCase() === extension.toLowerCase())) {
                    matchedType = type;
                    break;
                }
            }
            if (!matchedType) {
                errors.push(`"${file.name}" — неподдерживаемый формат`);
                return;
            }
            const typeConfig = serverConfig.allowedFileTypes[matchedType];
            if (file.size > typeConfig.maxSize) {
                errors.push(`"${file.name}" — превышает лимит ${formatFileSize(typeConfig.maxSize)}`);
            }
        });
        return { errors };
    }, [serverConfig.allowedFileTypes]);

    const handleFileUpload = async (filesToUpload) => {
        if (!filesToUpload || filesToUpload.length === 0) return;
        if (files.length + filesToUpload.length > serverConfig.maxFiles) {
            setError(`Достигнут лимит (${serverConfig.maxFiles} файлов). Текущее: ${files.length}`);
            return;
        }
        const validation = validateFiles(filesToUpload);
        if (validation.errors.length > 0) {
            setError('Ошибки:\n' + validation.errors.join('\n'));
            return;
        }
        try {
            setUploading(true);
            setError(null);
            setUploadProgress(0);

            const response = await uploadFiles(moduleName, recordId, filesToUpload);
            if (response.success) {
                await loadFiles();
                if (onFilesChange) {
                    onFilesChange(files, 'upload');
                }
            } else {
                throw new Error(response.message || 'Ошибка загрузки');
            }
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            setError(err.message || 'Ошибка при загрузке');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleFileSelect = (event) => {
        const selectedFiles = Array.from(event.target.files);
        handleFileUpload(selectedFiles);
        event.target.value = '';
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            handleFileUpload(droppedFiles);
        }
    };

    const handleDelete = async (file) => {
        try {
            setError(null);
            const response = await deleteFile(file.id);
            if (response.success) {
                const updatedFiles = files.filter(f => f.id !== file.id);
                setFiles(updatedFiles);
                if (onFilesChange) {
                    onFilesChange(updatedFiles, 'delete');
                }
            } else {
                throw new Error(response.message || 'Ошибка удаления');
            }
        } catch (err) {
            console.error('Ошибка удаления:', err);
            setError(err.message || 'Ошибка при удалении');
        }
    };

    const handleUpdate = async (file, newFile) => {
        try {
            setError(null);
            const response = await apiUpdateFile(file.id, newFile);
            if (response.success) {
                const updatedFile = response.data.file;
                setFiles(prevFiles => prevFiles.map(f => {
                    if (f.id === file.id) {
                        return {
                            ...f,
                            id: updatedFile.id || f.id,
                            file_name: updatedFile.file_name ?? f.file_name,
                            file_size: updatedFile.file_size ?? f.file_size,
                            mimetype: updatedFile.mimetype ?? f.mimetype,
                            file_type: updatedFile.file_type || f.file_type || 'document',
                            file_extension: updatedFile.file_extension || f.file_extension || '',
                            sort_order: updatedFile.sort_order ?? f.sort_order
                        };
                    }
                    return f;
                }));
                const cardRef = fileCardRefs.current[file.id];
                if (cardRef) {
                    cardRef.refresh();
                }
                if (onFilesChange) {
                    onFilesChange(files, 'update');
                }
            } else {
                throw new Error(response.message || 'Ошибка обновления');
            }
        } catch (err) {
            console.error('Ошибка обновления:', err);
            setError(err.message || 'Ошибка при обновлении');
        }
    };

    const handleMoveLeft = async (file) => {
        const currentIndex = files.findIndex(f => f.id === file.id);
        if (currentIndex <= 0) return;
        const newFiles = [...files];
        [newFiles[currentIndex], newFiles[currentIndex - 1]] =
            [newFiles[currentIndex - 1], newFiles[currentIndex]];
        setFiles(newFiles);
        await handleReorder(newFiles);
    };

    const handleMoveRight = async (file) => {
        const currentIndex = files.findIndex(f => f.id === file.id);
        if (currentIndex >= files.length - 1) return;
        const newFiles = [...files];
        [newFiles[currentIndex], newFiles[currentIndex + 1]] =
            [newFiles[currentIndex + 1], newFiles[currentIndex]];
        setFiles(newFiles);
        await handleReorder(newFiles);
    };

    const handleReorder = async (newFilesOrder) => {
        try {
            const fileOrders = newFilesOrder.map((file, index) => ({
                id: getFileNameFromPath(file.id),
                sortOrder: index + 1
            }));
            const response = await apiReorderFiles(moduleName, recordId, fileOrders);
            if (!response.success) {
                await loadFiles();
            }
        } catch (err) {
            console.error('Ошибка изменения порядка:', err);
            await loadFiles();
        }
    };

    const handleReplaceClick = (file) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = Object.values(serverConfig.allowedFileTypes)
            .flatMap(c => c.extensions)
            .join(',');
        input.onchange = (e) => {
            const newFile = e.target.files[0];
            if (newFile) {
                handleUpdate(file, newFile);
            }
        };
        input.click();
    };

    // === НОВЫЙ ОБРАБОТЧИК PREVIEW ===
    const handlePreviewClick = (file) => {
        if (!enableViewer) return;
        const index = files.findIndex(f => f.id === file.id);
        setViewerState({
            isOpen: true,
            initialIndex: index >= 0 ? index : 0
        });
    };

    // === Информационная панель ===
    const renderInfoPanel = () => {
        const types = Object.entries(serverConfig.allowedFileTypes);
        const usedPercentage = Math.round((files.length / serverConfig.maxFiles) * 100);

        return (
            <AnimatePresence>
                {showInfo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <Card style={{
                            marginBottom: 16,
                            background: 'rgba(99,102,241,0.04)',
                            border: '1px dashed rgba(99,102,241,0.2)'
                        }}>
                            {serverConfig.moduleDescription && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 16,
                                    padding: '10px 14px',
                                    background: 'rgba(99,102,241,0.08)',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: '#a5b4fc'
                                }}>
                                    <i className="fa-solid fa-circle-info" />
                                    {serverConfig.moduleDescription}
                                </div>
                            )}

                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                    fontSize: 13
                                }}>
                                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fa-solid fa-chart-pie" style={{ color: '#6366f1' }} />
                                        Использовано
                                    </span>
                                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>
                                        {files.length} / {serverConfig.maxFiles}
                                        <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
                                            ({usedPercentage}%)
                                        </span>
                                    </span>
                                </div>
                                <div style={{
                                    height: 6,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 3,
                                    overflow: 'hidden'
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${usedPercentage}%` }}
                                        transition={{ duration: 0.5 }}
                                        style={{
                                            height: '100%',
                                            borderRadius: 3,
                                            background: usedPercentage >= 100
                                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                                : usedPercentage >= 80
                                                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                    : 'linear-gradient(90deg, #22c55e, #16a34a)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    marginBottom: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <i className="fa-solid fa-gear" style={{ color: '#6366f1' }} />
                                    Допустимые форматы
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: 8
                                }}>
                                    {types.map(([type, typeConfig]) => {
                                        const icon = getFileTypeIcon(type);
                                        const color = getFileTypeColor(type);
                                        return (
                                            <div key={type} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                background: 'rgba(0,0,0,0.25)',
                                                borderRadius: 8,
                                                border: `1px solid ${color}20`
                                            }}>
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    background: `${color}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <i className={`fa-solid ${icon}`} style={{ color, fontSize: 14 }} />
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: '#e2e8f0',
                                                        marginBottom: 2
                                                    }}>
                                                        {getFileTypeDisplayName(type)}
                                                    </div>
                                                    <div style={{
                                                        fontSize: 10,
                                                        color: '#64748b',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {formatExtensions(typeConfig.extensions)}
                                                    </div>
                                                    <div style={{
                                                        fontSize: 10,
                                                        color: '#22c55e',
                                                        fontWeight: 500
                                                    }}>
                                                        до {formatFileSize(typeConfig.maxSize)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    if (loading) {
        return (
            <Card>
                <style>{STYLES}</style>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 20,
                    paddingBottom: 16,
                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <div className="file-skeleton-box" style={{ width: 36, height: 36 }} />
                    <div style={{ flex: 1 }}>
                        <div className="file-skeleton-box" style={{ height: 14, width: '40%', marginBottom: 6 }} />
                        <div className="file-skeleton-box" style={{ height: 10, width: '25%' }} />
                    </div>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16
                }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="file-skeleton-box" style={{ height: 240 }} />
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <style>{STYLES}</style>

            {/* Заголовок */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <i className="fa-solid fa-folder-open" style={{ color: '#818cf8', fontSize: 18 }} />
                    </div>
                    <div>
                        <h3 style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#f1f5f9',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            {serverConfig.moduleName || 'Доказательства'}
                        </h3>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {files.length === 0
                                ? 'Файлы не загружены'
                                : `${files.length} из ${serverConfig.maxFiles} файлов`}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                        variant={showInfo ? 'primary' : 'secondary'}
                        size="sm"
                        icon={showInfo ? 'fa-solid fa-chevron-up' : 'fa-solid fa-circle-info'}
                        onClick={() => setShowInfo(!showInfo)}
                    >
                        {showInfo ? 'Скрыть' : 'Информация'}
                    </Button>
                    {canEdit && config.showUploadZone && !isLimitReached && (
                        <Button
                            variant="primary"
                            size="sm"
                            icon="fa-solid fa-plus"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Добавить файлы
                        </Button>
                    )}
                </div>
            </div>

            {canEdit && config.showUploadZone && !isLimitReached && (
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={Object.values(serverConfig.allowedFileTypes).flatMap(c => c.extensions).join(',')}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            )}

            {renderInfoPanel()}

            {canEdit && config.showUploadZone && !isLimitReached && (
                <div
                    className={`${dragActive ? 'upload-zone-active' : ''} ${uploading ? 'upload-zone-pulse' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragActive ? '#6366f1' : 'rgba(99,102,241,0.25)'}`,
                        borderRadius: 16,
                        padding: uploading ? '24px' : '32px 20px',
                        textAlign: 'center',
                        background: dragActive
                            ? 'rgba(99,102,241,0.08)'
                            : 'rgba(0,0,0,0.15)',
                        marginBottom: 16,
                        transition: 'all 0.2s',
                        cursor: uploading ? 'default' : 'pointer'
                    }}
                >
                    {uploading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(99,102,241,0.2)',
                                    borderTopColor: '#6366f1'
                                }}
                            />
                            <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
                                Загрузка файлов...
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: 14 }}>Может потребовать время, дождитесь окончания</span>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: dragActive ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}>
                                <i className={`fa-solid ${dragActive ? 'fa-arrow-down' : 'fa-cloud-arrow-up'}`}
                                    style={{ color: '#818cf8', fontSize: 20 }} />
                            </div>
                            <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500 }}>
                                {dragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда'}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                или нажмите для выбора
                            </div>
                        </div>
                    )}
                </div>
            )}

            {canEdit && isLimitReached && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: 'rgba(234,179,8,0.08)',
                    border: '1px solid rgba(234,179,8,0.2)',
                    borderRadius: 10,
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#fbbf24'
                }}>
                    <i className="fa-solid fa-triangle-exclamation" />
                    Лимит файлов достигнут ({files.length} / {serverConfig.maxFiles})
                </div>
            )}

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{ marginBottom: 16 }}
                    >
                        <Alert variant="danger" icon="fa-circle-exclamation" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            {config.showFileList && (
                <>
                    {files.length === 0 ? (
                        <EmptyState
                            icon="fa-folder-xmark"
                            title="Файлы не загружены"
                            description={canEdit
                                ? 'Добавьте файлы, перетащив их в область выше или нажав кнопку "Добавить файлы"'
                                : 'К этому инциденту не прикреплено ни одного файла'}
                        />
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 16
                        }}>
                            <AnimatePresence>
                                {files.map((file, index) => (
                                    <motion.div
                                        key={file.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <UnifiedFileCard
                                            ref={el => fileCardRefs.current[file.id] = el}
                                            file={file}
                                            canEdit={canEdit}
                                            onEdit={handleReplaceClick}
                                            onEditorSave={handleUpdate}
                                            onDelete={handleDelete}
                                            onMoveLeft={handleMoveLeft}
                                            onMoveRight={handleMoveRight}
                                            isFirst={index === 0}
                                            isLast={index === files.length - 1}
                                            moduleName={moduleName}
                                            recordId={recordId}
                                            onFileAction={onFileAction}
                                            onCopyId={onCopyId}
                                            onPreviewClick={enableViewer ? handlePreviewClick : null}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}

            {/* === VIEWER === */}
            {enableViewer && (
                <IncidentEvidenceViewer
                    isOpen={viewerState.isOpen}
                    files={files}
                    initialIndex={viewerState.initialIndex}
                    onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
                />
            )}
        </Card>
    );
}

export default UnifiedFileManager;