import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Badge, Alert } from '../../../ui/UIComponents';
import SingleFileCard from './SingleFileCard';
import {
    getSingleFilesList,
    formatFileSize,
    getContentType,
    getFileExtension
} from '../../../../http/unifiedFileAPI';

function SingleFileManager({
    onFilesChange = null,
    title = 'Системные файлы',
    showStats = true
}) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0, attached: 0, images: 0, videos: 0, audio: 0, documents: 0, other: 0
    });
    const [showInstructions, setShowInstructions] = useState(false);

    const cardRefs = useRef({});

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getSingleFilesList();

            if (response.success && response.data?.success) {
                const filesData = response.data?.data || [];
                setFiles(filesData);
                calculateStats(filesData);
            } else {
                throw new Error(response.data?.message || response.message || 'Не удалось загрузить файлы');
            }
        } catch (err) {
            console.error('Ошибка загрузки файлов:', err);
            setError(err.message || 'Ошибка при загрузке файлов');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (filesData) => {
        const statsData = {
            total: filesData.length,
            attached: filesData.filter(f => f.attached).length,
            images: 0, videos: 0, audio: 0, documents: 0, other: 0
        };

        filesData.forEach(file => {
            if (!file.file_name) return;
            const extension = getFileExtension(file.file_name);
            const type = getContentType(extension);
            switch (type) {
                case 'image': statsData.images++; break;
                case 'video': statsData.videos++; break;
                case 'audio': statsData.audio++; break;
                case 'document': statsData.documents++; break;
                default: statsData.other++; break;
            }
        });
        setStats(statsData);
    };

    const handleUpdate = useCallback(async (file, newFile) => {
        setFiles(prevFiles => prevFiles.map(f => {
            if (f.code_name === file.code_name) {
                return { ...f, file_name: newFile.name, file_size: newFile.size, attached: true };
            }
            return f;
        }));
        if (onFilesChange) onFilesChange(file, 'update');
    }, [onFilesChange]);

    // Стили
    const statItemStyle = (color = '#818cf8') => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        minWidth: 80,
        gap: 4
    });

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            {/* Заголовок */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <i className="fa-solid fa-folder-open" style={{ color: '#fff', fontSize: 22 }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                            {title}
                        </h1>
                        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                            Управление статическими медиафайлами системы
                        </p>
                    </div>
                    <Badge variant="info" style={{ fontFamily: 'monospace', fontSize: 12, padding: '4px 12px' }}>
                        {files.length}
                    </Badge>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        variant={showInstructions ? 'primary' : 'secondary'}
                        icon={showInstructions ? 'fa-chevron-up' : 'fa-circle-question'}
                        onClick={() => setShowInstructions(!showInstructions)}
                    >
                        {showInstructions ? 'Скрыть' : 'Как использовать'}
                    </Button>
                    <Button variant="secondary" icon="fa-arrows-rotate" onClick={loadFiles} disabled={loading}>
                        Обновить
                    </Button>
                </div>
            </div>

            {/* Статистика */}
            {showStats && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 12,
                        marginBottom: 20
                    }}
                >
                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-folder" style={{ color: '#818cf8', fontSize: 16 }} />
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                            {stats.total}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Всего
                        </div>
                    </div>

                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-circle-check" style={{ color: '#22c55e', fontSize: 16 }} />
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>
                            {stats.attached}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Прикреплено
                        </div>
                    </div>

                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-circle-minus" style={{ color: '#f59e0b', fontSize: 16 }} />
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                            {stats.total - stats.attached}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Свободно
                        </div>
                    </div>

                    <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />

                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-image" style={{ color: '#22c55e', fontSize: 16 }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                            {stats.images}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Изображения
                        </div>
                    </div>

                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-video" style={{ color: '#8b5cf6', fontSize: 16 }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                            {stats.videos}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Видео
                        </div>
                    </div>

                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-music" style={{ color: '#f59e0b', fontSize: 16 }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                            {stats.audio}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Аудио
                        </div>
                    </div>

                    <div style={statItemStyle()}>
                        <i className="fa-solid fa-file-lines" style={{ color: '#3b82f6', fontSize: 16 }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                            {stats.documents + stats.other}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Документы
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Инструкция */}
            <AnimatePresence>
                {showInstructions && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden', marginBottom: 20 }}
                    >
                        <Card style={{
                            background: 'rgba(99,102,241,0.04)',
                            border: '1px dashed rgba(99,102,241,0.2)'
                        }}>
                            <h3 style={{
                                fontSize: 16, fontWeight: 700, color: '#a5b4fc',
                                marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10
                            }}>
                                <i className="fa-solid fa-code" style={{ color: '#818cf8' }} />
                                Как вставить файл на сайт
                            </h3>

                            <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                                Для отображения одиночного системного файла используйте компонент <code style={{
                                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                                    padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12
                                }}>SingleFileViewer</code>:
                            </p>

                            <div style={{
                                background: 'rgba(0,0,0,0.4)',
                                borderRadius: 10,
                                padding: 16,
                                marginBottom: 16,
                                border: '1px solid rgba(255,255,255,0.06)',
                                overflowX: 'auto'
                            }}>
                                <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#a5b4fc', lineHeight: 1.7 }}>
                                    {`<SingleFileViewer
    codeName="test"
    showTitle={true}
    showDownload={true}
    autoPlay={false}
    muted={true}
    maxHeight="400px"
/>`}
                                </pre>
                            </div>

                            <h4 style={{
                                fontSize: 14, fontWeight: 700, color: '#e2e8f0',
                                marginBottom: 12, marginTop: 20
                            }}>
                                <i className="fa-solid fa-sliders" style={{ color: '#818cf8', marginRight: 8 }} />
                                Параметры компонента
                            </h4>

                            <div style={{
                                overflowX: 'auto',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 10
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: 12
                                }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                                            <th style={{
                                                padding: '10px 12px', textAlign: 'left',
                                                color: '#a5b4fc', fontWeight: 700,
                                                fontSize: 11, textTransform: 'uppercase',
                                                letterSpacing: 0.5
                                            }}>Параметр</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: '#a5b4fc', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Тип</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: '#a5b4fc', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>По умолч.</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', color: '#a5b4fc', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Описание</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            ['codeName', 'string', '—', 'Кодовое имя файла (обязательный)'],
                                            ['mediaType', 'string', 'document', "Тип: 'image', 'video', 'audio', 'document'"],
                                            ['showTitle', 'boolean', 'true', 'Показывать заголовок'],
                                            ['showDownload', 'boolean', 'true', 'Кнопка скачивания'],
                                            ['autoPlay', 'boolean', 'false', 'Автовоспроизведение'],
                                            ['muted', 'boolean', 'true', 'Без звука (видео)'],
                                            ['loop', 'boolean', 'false', 'Зацикливание'],
                                            ['controls', 'boolean', 'true', 'Элементы управления'],
                                            ['maxHeight', 'string', '400px', 'Макс. высота'],
                                            ['maxWidth', 'string', '100%', 'Макс. ширина'],
                                            ['showDescription', 'boolean', 'false', 'Показывать описание'],
                                            ['onLoad', 'function', 'null', 'Callback загрузки'],
                                            ['onError', 'function', 'null', 'Callback ошибки'],
                                            ['onClick', 'function', 'null', 'Callback клика']
                                        ].map(([param, type, def, desc], i) => (
                                            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '8px 12px', color: '#a5b4fc', fontFamily: 'monospace', fontWeight: 600 }}>
                                                    {param}
                                                </td>
                                                <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{type}</td>
                                                <td style={{ padding: '8px 12px', color: '#818cf8', fontFamily: 'monospace' }}>{def}</td>
                                                <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{desc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <h4 style={{
                                fontSize: 14, fontWeight: 700, color: '#e2e8f0',
                                marginBottom: 12, marginTop: 24
                            }}>
                                <i className="fa-solid fa-lightbulb" style={{ color: '#fbbf24', marginRight: 8 }} />
                                Полезные советы
                            </h4>

                            <div style={{
                                background: 'rgba(245,158,11,0.05)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: 10,
                                padding: 16
                            }}>
                                <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 13, lineHeight: 1.8 }}>
                                    <li>Для изображений используйте <code style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>muted=true</code> и <code style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>autoPlay=true</code></li>
                                    <li>Видео и аудио по умолчанию отключены (автоплей off)</li>
                                    <li>Клик по изображению открывает его в полном размере</li>
                                    <li>Установите <code style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>maxHeight</code> в зависимости от места на странице</li>
                                    <li>Все файлы автоматически загружаются с авторизацией</li>
                                </ul>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ошибка */}
            {error && (
                <Alert variant="danger" icon="fa-circle-exclamation" onClose={() => setError(null)} style={{ marginBottom: 20 }}>
                    {error}
                </Alert>
            )}

            {/* Контент */}
            {loading ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    gap: 16
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
                    <span style={{ color: '#94a3b8', fontSize: 14 }}>Загрузка файлов...</span>
                    <span style={{ color: '#94a3b8', fontSize: 14 }}>Может потребовать время, дождитесь окончания</span>
                </div>
            ) : files.length === 0 ? (
                <Card>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '60px 20px',
                        gap: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: 'rgba(99,102,241,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <i className="fa-solid fa-folder-xmark" style={{ color: '#6366f1', fontSize: 32 }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
                                Файлов нет
                            </h3>
                            <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
                                Добавьте файлы через базу данных или API
                            </p>
                        </div>
                    </div>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 20
                }}>
                    <AnimatePresence>
                        {files.map((file, idx) => (
                            <motion.div
                                key={file.code_name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <SingleFileCard
                                    ref={el => cardRefs.current[file.code_name] = el}
                                    file={file}
                                    onUpdate={handleUpdate}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export default SingleFileManager;