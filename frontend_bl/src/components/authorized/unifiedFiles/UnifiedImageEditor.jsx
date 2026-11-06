import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Badge } from "../../ui/UIComponents";

/**
 * Продвинутый редактор изображений на Canvas
 * Инструменты: кисть, блюр, текст, прямоугольник, стрелка, ластик
 */
function UnifiedImageEditor({ imageUrl, fileName, onSave, onCancel }) {
    const canvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);
    const containerRef = useRef(null);
    const originalImageRef = useRef(null);

    // Состояние инструментов
    const [activeTool, setActiveTool] = useState('brush');
    const [brushColor, setBrushColor] = useState('#ff0000');
    const [brushSize, setBrushSize] = useState(8);
    const [textValue, setTextValue] = useState('');
    const [showTextInput, setShowTextInput] = useState(false);
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

    // История действий
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Рисование
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

    // Масштаб
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    // === МОДАЛКА ПОДТВЕРЖДЕНИЯ СОХРАНЕНИЯ ===
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    const tools = [
        { id: 'brush', icon: 'fa-paintbrush', name: 'Кисть', color: '#ef4444' },
        { id: 'rectangle', icon: 'fa-square', name: 'Прямоугольник', color: '#3b82f6' },
        { id: 'blur', icon: 'fa-eye-slash', name: 'Блюр', color: '#8b5cf6' },
        { id: 'text', icon: 'fa-font', name: 'Текст', color: '#22c55e' },
        { id: 'arrow', icon: 'fa-arrow-right-long', name: 'Стрелка', color: '#f59e0b' },
        { id: 'eraser', icon: 'fa-eraser', name: 'Ластик', color: '#94a3b8' }
    ];

    const colors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
        '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'
    ];

    // === ИНИЦИАЛИЗАЦИЯ ===
    useEffect(() => {
        if (!imageUrl || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            setImageSize({ width: img.width, height: img.height });

            originalImageRef.current = img;

            ctx.drawImage(img, 0, 0);
            saveToHistory(canvas);
        };

        img.onerror = () => {
            console.error('Не удалось загрузить изображение для редактирования');
        };

        img.src = imageUrl;
    }, [imageUrl]);

    // === СОХРАНЕНИЕ В ИСТОРИЮ ===
    const saveToHistory = useCallback((canvas) => {
        try {
            const dataUrl = canvas.toDataURL('image/png');
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(dataUrl);
                return newHistory;
            });
            setHistoryIndex(prev => prev + 1);
        } catch (e) {
            console.error('Не удалось сохранить в историю:', e);
        }
    }, [historyIndex]);

    // === ОТМЕНА/ПОВТОР ===
    const undo = () => {
        if (historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        restoreFromHistory(history[newIndex]);
    };

    const redo = () => {
        if (historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        restoreFromHistory(history[newIndex]);
    };

    const restoreFromHistory = (dataUrl) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    };

    // === ПОЛУЧЕНИЕ КООРДИНАТ ===
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    // === ОБРАБОТЧИКИ СОБЫТИЙ МЫШИ ===
    const handleMouseDown = (e) => {
        const pos = getCanvasCoords(e);
        setIsDrawing(true);
        setStartPos(pos);
        setCurrentPos(pos);

        if (activeTool === 'brush' || activeTool === 'eraser') {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }

        if (activeTool === 'text') {
            setTextPosition(pos);
            setShowTextInput(true);
            setIsDrawing(false);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const pos = getCanvasCoords(e);
        setCurrentPos(pos);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const overlay = overlayCanvasRef.current;

        if (!canvas || !overlay) return;

        const overlayCtx = overlay.getContext('2d');

        if (activeTool === 'brush') {
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = brushColor;
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }

        if (activeTool === 'eraser') {
            ctx.lineWidth = brushSize * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }

        if (activeTool === 'rectangle' || activeTool === 'blur' || activeTool === 'arrow') {
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            drawPreview(overlayCtx, startPos, pos);
        }
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const pos = getCanvasCoords(e);
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const overlay = overlayCanvasRef.current;

        if (!overlay) return;

        const overlayCtx = overlay.getContext('2d');

        if (activeTool === 'rectangle') {
            drawRectangle(ctx, startPos, pos);
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            saveToHistory(canvas);
        }

        if (activeTool === 'blur') {
            applyBlur(ctx, startPos, pos);
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            saveToHistory(canvas);
        }

        if (activeTool === 'arrow') {
            drawArrow(ctx, startPos, pos);
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            saveToHistory(canvas);
        }

        if (activeTool === 'brush' || activeTool === 'eraser') {
            saveToHistory(canvas);
        }
    };

    // === РИСОВАНИЕ ПРЕВЬЮ ===
    const drawPreview = (ctx, start, end) => {
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        if (activeTool === 'rectangle') {
            const w = end.x - start.x;
            const h = end.y - start.y;
            ctx.strokeRect(start.x, start.y, w, h);
        }

        if (activeTool === 'blur') {
            const w = end.x - start.x;
            const h = end.y - start.y;
            ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
            ctx.fillRect(start.x, start.y, w, h);
            ctx.strokeRect(start.x, start.y, w, h);
        }

        if (activeTool === 'arrow') {
            drawArrow(ctx, start, end);
        }

        ctx.setLineDash([]);
    };

    // === РИСОВАНИЕ ПРЯМОУГОЛЬНИКА ===
    const drawRectangle = (ctx, start, end) => {
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.setLineDash([]);
        const w = end.x - start.x;
        const h = end.y - start.y;
        ctx.strokeRect(start.x, start.y, w, h);
    };

    // === ПРИМЕНЕНИЕ БЛЮРА ===
    const applyBlur = (ctx, start, end) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let x1 = Math.round(Math.min(start.x, end.x));
        let y1 = Math.round(Math.min(start.y, end.y));
        let x2 = Math.round(Math.max(start.x, end.x));
        let y2 = Math.round(Math.max(start.y, end.y));

        x1 = Math.max(0, Math.min(x1, canvas.width - 1));
        y1 = Math.max(0, Math.min(y1, canvas.height - 1));
        x2 = Math.max(0, Math.min(x2, canvas.width));
        y2 = Math.max(0, Math.min(y2, canvas.height));

        const w = x2 - x1;
        const h = y2 - y1;

        if (w < 5 || h < 5) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        try {
            tempCtx.drawImage(canvas, x1, y1, w, h, 0, 0, w, h);
        } catch (e) {
            console.error('[BLUR] Не удалось скопировать область:', e);
            return;
        }

        let blurApplied = false;
        try {
            const pixelSize = Math.max(Math.floor(Math.min(w, h) / 12), 6);
            const imgData = tempCtx.getImageData(0, 0, w, h);
            const data = imgData.data;

            for (let py = 0; py < h; py += pixelSize) {
                for (let px = 0; px < w; px += pixelSize) {
                    const blockW = Math.min(pixelSize, w - px);
                    const blockH = Math.min(pixelSize, h - py);

                    let r = 0, g = 0, b = 0, count = 0;

                    for (let dy = 0; dy < blockH; dy++) {
                        for (let dx = 0; dx < blockW; dx++) {
                            const idx = ((py + dy) * w + (px + dx)) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            count++;
                        }
                    }

                    if (count === 0) continue;

                    r = Math.round(r / count);
                    g = Math.round(g / count);
                    b = Math.round(b / count);

                    for (let dy = 0; dy < blockH; dy++) {
                        for (let dx = 0; dx < blockW; dx++) {
                            const idx = ((py + dy) * w + (px + dx)) * 4;
                            data[idx] = r;
                            data[idx + 1] = g;
                            data[idx + 2] = b;
                        }
                    }
                }
            }

            tempCtx.putImageData(imgData, 0, 0);
            blurApplied = true;
        } catch (e) {
            console.warn('[BLUR] getImageData недоступен, используем fallback:', e.message);
        }

        if (!blurApplied) {
            try {
                const smallCanvas = document.createElement('canvas');
                const scaleDown = 0.1;
                const smallW = Math.max(1, Math.floor(w * scaleDown));
                const smallH = Math.max(1, Math.floor(h * scaleDown));

                smallCanvas.width = smallW;
                smallCanvas.height = smallH;
                const smallCtx = smallCanvas.getContext('2d');

                smallCtx.imageSmoothingEnabled = true;
                smallCtx.imageSmoothingQuality = 'high';
                smallCtx.drawImage(tempCanvas, 0, 0, smallW, smallH);

                tempCtx.imageSmoothingEnabled = false;
                tempCtx.clearRect(0, 0, w, h);
                tempCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
            } catch (e) {
                console.error('[BLUR] Fallback тоже не сработал:', e);
                return;
            }
        }

        try {
            ctx.drawImage(tempCanvas, x1, y1);
        } catch (e) {
            console.error('[BLUR] Не удалось нарисовать результат:', e);
        }
    };

    // === РИСОВАНИЕ СТРЕЛКИ ===
    const drawArrow = (ctx, start, end) => {
        const headLength = Math.max(15, brushSize * 3);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        ctx.strokeStyle = brushColor;
        ctx.fillStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    };

    // === ДОБАВЛЕНИЕ ТЕКСТА ===
    const addText = () => {
        if (!textValue.trim()) {
            setShowTextInput(false);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const fontSize = Math.max(brushSize * 3, 16);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = brushColor;
        ctx.textBaseline = 'top';

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillText(textValue, textPosition.x, textPosition.y);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        setTextValue('');
        setShowTextInput(false);
        saveToHistory(canvas);
    };

    // === ПОКАЗАТЬ МОДАЛКУ ПОДТВЕРЖДЕНИЯ ===
    const confirmSave = () => {
        setShowSaveConfirm(true);
    };

    // === ВЫПОЛНИТЬ СОХРАНЕНИЕ (после подтверждения) ===
    const performSave = () => {
        setShowSaveConfirm(false);
        const canvas = canvasRef.current;
        const outputMimeType = 'image/png';

        canvas.toBlob((blob) => {
            if (blob) {
                const mimeType = blob.type || outputMimeType;
                const ext = mimeType.includes('png') ? 'png' : 'jpg';

                const originalBaseName = (fileName || 'image').replace(/\.[^/.]+$/, '');

                const file = new File(
                    [blob],
                    `edited-${originalBaseName}.${ext}`,
                    { type: mimeType }
                );

                if (onSave) onSave(file);
            }
        }, outputMimeType, 0.92);
    };

    // === ОЧИСТКА ===
    const handleClear = () => {
        if (history.length > 0) {
            restoreFromHistory(history[0]);
            setHistoryIndex(0);
        }
    };

    // === СКАЧАТЬ ===
    const handleDownload = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `edited-${fileName || 'image'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Заголовок */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(15,23,42,0.9)',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                            Редактор изображений
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                            {fileName || 'Без имени'}
                        </div>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="fa-solid fa-xmark"
                    onClick={onCancel}
                >
                    Закрыть
                </Button>
            </div>

            {/* Панель инструментов */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.7)',
                flexWrap: 'wrap',
                flexShrink: 0
            }}>
                <div style={{
                    display: 'flex',
                    gap: 4,
                    padding: 4,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 10
                }}>
                    {tools.map(tool => (
                        <button
                            type="button"
                            key={tool.id}
                            onClick={() => {
                                setActiveTool(tool.id);
                                if (tool.id !== 'text') setShowTextInput(false);
                            }}
                            title={tool.name}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                background: activeTool === tool.id
                                    ? `linear-gradient(135deg, ${tool.color}, ${tool.color}dd)`
                                    : 'transparent',
                                color: activeTool === tool.id ? '#fff' : '#94a3b8',
                                boxShadow: activeTool === tool.id
                                    ? `0 4px 12px ${tool.color}40`
                                    : 'none'
                            }}
                        >
                            <i className={`fa-solid ${tool.icon}`} style={{ fontSize: 14 }} />
                        </button>
                    ))}
                </div>

                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />

                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Цвет:</span>
                    {colors.map(color => (
                        <button
                            type="button"
                            key={color}
                            onClick={() => setBrushColor(color)}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                border: brushColor === color
                                    ? '2px solid #fff'
                                    : '2px solid rgba(255,255,255,0.15)',
                                cursor: 'pointer',
                                background: color,
                                boxShadow: brushColor === color
                                    ? '0 0 0 2px rgba(255,255,255,0.3)'
                                    : 'none',
                                transition: 'all 0.15s'
                            }}
                        />
                    ))}
                </div>

                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Размер:</span>
                    <input
                        type="range"
                        min="2"
                        max="40"
                        value={brushSize}
                        onChange={e => setBrushSize(parseInt(e.target.value))}
                        style={{
                            width: 80,
                            accentColor: '#6366f1'
                        }}
                    />
                    <Badge variant="info" style={{ fontFamily: 'monospace', minWidth: 30, textAlign: 'center' }}>
                        {brushSize}
                    </Badge>
                </div>

                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />

                <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="fa-solid fa-rotate-left"
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        title="Отменить (Ctrl+Z)"
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="fa-solid fa-rotate-right"
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        title="Повторить (Ctrl+Y)"
                    />
                </div>
            </div>

            {/* Область канваса */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto',
                    padding: 20,
                    position: 'relative'
                }}
            >
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
                    <canvas
                        ref={canvasRef}
                        style={{
                            maxWidth: '100%',
                            maxHeight: 'calc(100vh - 220px)',
                            borderRadius: 8,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            display: 'block',
                            cursor: activeTool === 'text' ? 'text' : 'crosshair'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                    <canvas
                        ref={overlayCanvasRef}
                        width={imageSize.width}
                        height={imageSize.height}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            borderRadius: 8
                        }}
                    />

                    <AnimatePresence>
                        {showTextInput && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                style={{
                                    position: 'fixed',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'rgba(15,23,42,0.95)',
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    borderRadius: 12,
                                    padding: 20,
                                    zIndex: 10,
                                    minWidth: 300,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                    Введите текст:
                                </div>
                                <input
                                    type="text"
                                    value={textValue}
                                    onChange={e => setTextValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addText();
                                        }
                                        if (e.key === 'Escape') setShowTextInput(false);
                                    }}
                                    autoFocus
                                    placeholder="Текст для размещения..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        color: '#f1f5f9',
                                        fontSize: 14,
                                        outline: 'none',
                                        marginBottom: 12,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setShowTextInput(false)}
                                        fullWidth
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={addText}
                                        fullWidth
                                    >
                                        Добавить
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Нижняя панель действий */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(15,23,42,0.9)',
                flexShrink: 0,
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="fa-solid fa-download"
                        onClick={handleDownload}
                    >
                        Скачать
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="fa-solid fa-trash"
                        onClick={handleClear}
                        disabled={history.length <= 1}
                    >
                        Сбросить
                    </Button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                        Шаг {historyIndex + 1} из {history.length}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        variant="secondary"
                        icon="fa-solid fa-xmark"
                        onClick={onCancel}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="success"
                        icon="fa-solid fa-check"
                        onClick={confirmSave}
                    >
                        Сохранить изменения
                    </Button>
                </div>
            </div>

            {/* === МОДАЛКА ПОДТВЕРЖДЕНИЯ СОХРАНЕНИЯ === */}
            <AnimatePresence>
                {showSaveConfirm && (
                    <>
                        {/* Затемнение фона */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSaveConfirm(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(8px)',
                                zIndex: 3000
                            }}
                        />

                        {/* Само окно снизу */}
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'fixed',
                                bottom: 24,
                                left: '50%',
                                x: '-50%',
                                width: 'calc(100% - 40px)',
                                maxWidth: 520,
                                background: 'linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))',
                                border: '1px solid rgba(245,158,11,0.3)',
                                borderRadius: 20,
                                padding: '24px',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                                zIndex: 3001,
                                backdropFilter: 'blur(20px)'
                            }}
                        >
                            {/* Верхняя часть с иконкой и заголовком */}
                            <div style={{
                                display: 'flex',
                                gap: 16,
                                marginBottom: 20
                            }}>
                                {/* Иконка предупреждения */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', delay: 0.1 }}
                                    style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 14,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 8px 24px rgba(245,158,11,0.35)'
                                    }}
                                >
                                    <i className="fa-solid fa-triangle-exclamation"
                                        style={{ color: '#fff', fontSize: 24 }} />
                                </motion.div>

                                {/* Текст */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 17,
                                        fontWeight: 700,
                                        color: '#f1f5f9',
                                        marginBottom: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}>
                                        Сохранить изменения?
                                    </div>
                                    <div style={{
                                        fontSize: 13,
                                        color: '#cbd5e1',
                                        lineHeight: 1.6
                                    }}>
                                        Оригинальное изображение будет <strong style={{ color: '#fbbf24' }}>полностью заменено</strong> отредактированной версией. Восстановить прежнюю версию будет невозможно.
                                    </div>
                                </div>
                            </div>

                            {/* Информационный блок с деталями */}
                            <div style={{
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: 10,
                                padding: '12px 14px',
                                marginBottom: 20,
                                display: 'flex',
                                gap: 12,
                                alignItems: 'flex-start'
                            }}>
                                <i className="fa-solid fa-circle-info"
                                    style={{ color: '#fbbf24', fontSize: 14, marginTop: 2, flexShrink: 0 }} />
                                <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                                    {/* <div style={{ marginBottom: 4 }}>
                                        <span style={{ color: '#94a3b8' }}>Файл: </span>
                                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                            {fileName || 'Без имени'}
                                        </span>
                                    </div> */}
                                    <div>
                                        <span style={{ color: '#94a3b8' }}>Действий применено: </span>
                                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                            {historyIndex}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Кнопки */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowSaveConfirm(false)}
                                    fullWidth
                                    style={{ padding: '10px 16px' }}
                                >
                                    <i className="fa-solid fa-arrow-left" style={{ marginRight: 6, fontSize: 12 }} />
                                    Вернуться к редактированию
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={performSave}
                                    fullWidth
                                    style={{
                                        padding: '10px 16px',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        border: 'none'
                                    }}
                                >
                                    <i className="fa-solid fa-check" style={{ marginRight: 6, fontSize: 12 }} />
                                    Да, заменить
                                </Button>
                            </div>

                            {/* Подсказка снизу */}
                            <div style={{
                                marginTop: 16,
                                textAlign: 'center',
                                fontSize: 10,
                                color: '#475569',
                                fontFamily: 'monospace',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6
                            }}>
                                <i className="fa-solid fa-lightbulb" style={{ color: '#fbbf24', fontSize: 10 }} />
                                Совет: используйте «Скачать», чтобы сохранить копию без замены оригинала
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default UnifiedImageEditor;