import React, { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 🎬 Современный видеоплеер с кастомными контролами
 * 
 * @param {string} blobUrl - URL видео-блоба
 * @param {string} filename - Имя файла
 * @param {boolean} compact - Компактный режим (inline плеер в карточке)
 * @param {boolean} keyboardEnabled - Слушать горячие клавиши (только full mode)
 * @param {function} onClick - Callback при клике на кнопку expand (compact mode)
 * @param {boolean} enableFrameNav - Покадровая навигация (full mode)
 * @param {boolean} enableAmbient - Ambient glow (full mode + desktop)
 */
const VideoPlayer = memo(({
    blobUrl,
    filename,
    compact = false,
    keyboardEnabled = false,
    onClick = null,
    enableFrameNav = true,
    enableAmbient = true
}) => {
    // ============ REFS ============
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const progressRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const ambientCanvasRef = useRef(null);
    const hideControlsTimerRef = useRef(null);
    const previewThrottleRef = useRef(0);
    const lastTapRef = useRef(0);
    const touchStartRef = useRef(null);

    // ============ STATE ============
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverX, setHoverX] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [ambientColor, setAmbientColor] = useState('rgba(99,102,241,0.3)');
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [gestureFeedback, setGestureFeedback] = useState(null);

    // ============ DERIVED ============
    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }, []);
    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    }, []);
    const fps = 30;
    const frameStep = 1 / fps;

    const isPlayingRef = useRef(false);
    const volumeRef = useRef(1);
    const durationRef = useRef(0);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { volumeRef.current = volume; }, [volume]);
    useEffect(() => { durationRef.current = duration; }, [duration]);

    // ============ TIME FORMAT ============
    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const formatTimestamp = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    // ============ VIDEO EVENT HANDLERS ============
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onLoadedMetadata = () => setDuration(video.duration);
        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.buffered.length > 0) {
                const buffEnd = video.buffered.end(video.buffered.length - 1);
                setBuffered(buffEnd / video.duration);
            }
        };
        const onWaiting = () => setIsBuffering(true);
        const onCanPlay = () => setIsBuffering(false);
        const onPlay = () => {
            setIsPlaying(true);
            resetHideTimer();
        };
        const onPause = () => {
            setIsPlaying(false);
            setShowControls(true);
        };
        const onEnded = () => {
            setIsPlaying(false);
            setShowControls(true);
        };
        const onError = () => setHasError(true);
        const onEnterPiP = () => setIsPiP(true);
        const onLeavePiP = () => setIsPiP(false);

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onError);
        video.addEventListener('enterpictureinpicture', onEnterPiP);
        video.addEventListener('leavepictureinpicture', onLeavePiP);

        return () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('error', onError);
            video.removeEventListener('enterpictureinpicture', onEnterPiP);
            video.removeEventListener('leavepictureinpicture', onLeavePiP);
        };
    }, []);

    // ============ AUTO-HIDE CONTROLS ============
    const resetHideTimer = useCallback(() => {
        if (hideControlsTimerRef.current) {
            clearTimeout(hideControlsTimerRef.current);
        }
        setShowControls(true);
        if (isPlayingRef.current) {
            hideControlsTimerRef.current = setTimeout(() => {
                setShowControls(false);
            }, compact ? 2000 : 3000);
        }
    }, [compact]);

    useEffect(() => {
        return () => {
            if (hideControlsTimerRef.current) {
                clearTimeout(hideControlsTimerRef.current);
            }
        };
    }, []);

    // ============ AMBIENT GLOW (Ambilight) - только full mode ============
    useEffect(() => {
        if (!enableAmbient || isMobile || prefersReducedMotion || compact) return;

        const canvas = ambientCanvasRef.current;
        if (!canvas) return;

        const interval = setInterval(() => {
            const video = videoRef.current;
            if (!video || video.paused || video.readyState < 2) return;

            try {
                const ctx = canvas.getContext('2d');
                canvas.width = 16;
                canvas.height = 9;
                ctx.drawImage(video, 0, 0, 16, 9);
                const data = ctx.getImageData(0, 0, 16, 9).data;
                let r = 0, g = 0, b = 0;
                const count = data.length / 4;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                }
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                setAmbientColor(`rgba(${r}, ${g}, ${b}, 0.4)`);
            } catch (e) {
                // CORS или другие ошибки — игнорируем
            }
        }, 500);

        return () => clearInterval(interval);
    }, [enableAmbient, isMobile, prefersReducedMotion, compact]);

    // ============ CONTROLS ============
    const togglePlay = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (video.paused) {
                await video.play();
            } else {
                video.pause();
            }
        } catch (err) {
            console.warn('[VideoPlayer] Play failed:', err);
        }
    }, []);

    const skip = useCallback((seconds) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, Math.min(durationRef.current, video.currentTime + seconds));
    }, []);

    const frameStepNav = useCallback((direction) => {
        const video = videoRef.current;
        if (!video || !video.paused) return;
        video.currentTime = Math.max(0, Math.min(durationRef.current, video.currentTime + direction * frameStep));
    }, [frameStep]);

    const handleVolumeChange = useCallback((v) => {
        const newVol = Math.max(0, Math.min(1, v));
        setVolume(newVol);
        setMuted(newVol === 0);
        if (videoRef.current) {
            videoRef.current.volume = newVol;
            videoRef.current.muted = newVol === 0;
        }
    }, []);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        const newMuted = !video.muted;
        setMuted(newMuted);
        video.muted = newMuted;
    }, []);

    const handleSpeedChange = useCallback((s) => {
        setSpeed(s);
        if (videoRef.current) {
            videoRef.current.playbackRate = s;
        }
        setShowSpeedMenu(false);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        if (!document.fullscreenElement) {
            container.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }, []);

    const togglePiP = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (video.requestPictureInPicture) {
                await video.requestPictureInPicture();
            }
        } catch (err) {
            console.warn('[VideoPlayer] PiP failed:', err);
        }
    }, []);

    // ============ PROGRESS BAR / SCRUBBING ============
    const seekToPosition = useCallback((clientX) => {
        const bar = progressRef.current;
        const video = videoRef.current;
        if (!bar || !video || durationRef.current === 0) return;

        const rect = bar.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const progress = x / rect.width;
        video.currentTime = progress * durationRef.current;
        setCurrentTime(video.currentTime);
    }, []);

    const handleProgressMouseDown = useCallback((e) => {
        setIsScrubbing(true);
        seekToPosition(e.clientX);

        const move = (ev) => seekToPosition(ev.clientX);
        const up = () => {
            setIsScrubbing(false);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    }, [seekToPosition]);

    const handleProgressHover = useCallback((e) => {
        const bar = progressRef.current;
        if (!bar || durationRef.current === 0) return;

        const rect = bar.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const progress = x / rect.width;
        const time = progress * durationRef.current;

        setHoverTime(time);
        setHoverX(x);
        setShowPreview(true);

        if (!isMobile && previewCanvasRef.current) {
            const now = Date.now();
            if (now - previewThrottleRef.current > 200) {
                previewThrottleRef.current = now;
                generatePreview(time);
            }
        }
    }, [isMobile]);

    const generatePreview = useCallback((time) => {
        const video = videoRef.current;
        const canvas = previewCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        try {
            const ctx = canvas.getContext('2d');
            canvas.width = 160;
            canvas.height = 90;

            const tempVideo = document.createElement('video');
            tempVideo.src = blobUrl;
            tempVideo.muted = true;
            tempVideo.currentTime = time;
            tempVideo.style.display = 'none';

            tempVideo.addEventListener('seeked', () => {
                try {
                    ctx.drawImage(tempVideo, 0, 0, 160, 90);
                } catch (e) { }
                tempVideo.remove();
            }, { once: true });

            tempVideo.addEventListener('error', () => {
                tempVideo.remove();
            }, { once: true });

            document.body.appendChild(tempVideo);
        } catch (e) { }
    }, [blobUrl]);

    const handleProgressLeave = useCallback(() => {
        setShowPreview(false);
        setHoverTime(null);
    }, []);

    // ============ KEYBOARD SHORTCUTS (только full mode) ============
    useEffect(() => {
        if (!keyboardEnabled || compact) return;

        const handler = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (videoRef.current?.paused && enableFrameNav) {
                        frameStepNav(-1);
                    } else {
                        skip(-5);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (videoRef.current?.paused && enableFrameNav) {
                        frameStepNav(1);
                    } else {
                        skip(5);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    handleVolumeChange(volumeRef.current + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    handleVolumeChange(volumeRef.current - 0.1);
                    break;
                case 'm':
                case 'M':
                case 'ь':
                case 'Ь':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'f':
                case 'F':
                case 'а':
                case 'А':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'p':
                case 'P':
                case 'з':
                case 'З':
                    e.preventDefault();
                    togglePiP();
                    break;
            }
            resetHideTimer();
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [keyboardEnabled, compact, togglePlay, skip, frameStepNav, enableFrameNav, handleVolumeChange, toggleMute, toggleFullscreen, togglePiP, resetHideTimer]);

    // ============ FULLSCREEN LISTENER ============
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // ============ TOUCH GESTURES (только full mode) ============
    const handleTouchStart = useCallback((e) => {
        if (compact) return;
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
        resetHideTimer();
    }, [compact, resetHideTimer]);

    const handleTouchEnd = useCallback((e) => {
        if (compact || !touchStartRef.current) return;

        const now = Date.now();
        const tapLength = now - lastTapRef.current;
        const touch = e.changedTouches[0];
        const container = containerRef.current;

        if (!container) return;
        const rect = container.getBoundingClientRect();
        const relativeX = touch.clientX - rect.left;

        if (tapLength < 300 && tapLength > 0) {
            if (relativeX < rect.width / 3) {
                skip(-10);
                setGestureFeedback({ icon: 'fa-backward', text: '-10s', x: '25%' });
            } else if (relativeX > rect.width * 2 / 3) {
                skip(10);
                setGestureFeedback({ icon: 'fa-forward', text: '+10s', x: '75%' });
            } else {
                togglePlay();
            }
            setTimeout(() => setGestureFeedback(null), 600);
        }

        lastTapRef.current = now;
        touchStartRef.current = null;
    }, [compact, skip, togglePlay]);

    const handleTouchMove = useCallback((e) => {
        if (compact || !touchStartRef.current || !containerRef.current) return;

        const dy = e.touches[0].clientY - touchStartRef.current.y;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const rect = containerRef.current.getBoundingClientRect();

        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30 &&
            touchStartRef.current.x > rect.width / 2) {
            const newVol = Math.max(0, Math.min(1, volumeRef.current - dy / 200));
            handleVolumeChange(newVol);
        }
    }, [compact, handleVolumeChange]);

    // ============ VOLUME ICON ============
    const getVolumeIcon = () => {
        if (muted || volume === 0) return 'fa-volume-xmark';
        if (volume < 0.33) return 'fa-volume-off';
        if (volume < 0.66) return 'fa-volume-low';
        return 'fa-volume-high';
    };

    // ============ SPEED MENU ============
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    useEffect(() => {
        if (!showSpeedMenu) return;
        const close = () => setShowSpeedMenu(false);
        const timeout = setTimeout(() => {
            window.addEventListener('click', close);
        }, 0);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('click', close);
        };
    }, [showSpeedMenu]);

    // ============ COMPACT MODE (Inline плеер с кнопкой expand) ============
    if (compact) {
        return (
            <div
                ref={containerRef}
                onMouseMove={resetHideTimer}
                onMouseLeave={() => {
                    if (isPlayingRef.current) {
                        setShowControls(false);
                    }
                }}
                style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#000',
                    aspectRatio: '16 / 9'
                }}
            >
                {/* Video element — играет прямо здесь */}
                <video
                    ref={videoRef}
                    src={blobUrl}
                    playsInline
                    preload="metadata"
                    onClick={togglePlay}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block',
                        background: '#000',
                        cursor: 'pointer'
                    }}
                />

                {/* Skeleton пока metadata не загрузилось */}
                {!duration && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)',
                        pointerEvents: 'none'
                    }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                                width: 24, height: 24,
                                borderRadius: '50%',
                                border: '2px solid rgba(139,92,246,0.2)',
                                borderTopColor: '#8b5cf6'
                            }}
                        />
                    </div>
                )}

                {/* Buffering spinner */}
                <AnimatePresence>
                    {isBuffering && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none'
                            }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 32, height: 32,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(139,92,246,0.2)',
                                    borderTopColor: '#8b5cf6'
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Central play button при pause */}
                <AnimatePresence>
                    {!isPlaying && !isBuffering && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 3
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.8 }}
                                onClick={togglePlay}
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: '50%',
                                    background: 'rgba(139,92,246,0.9)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(139,92,246,0.5)',
                                    backdropFilter: 'blur(8px)',
                                    pointerEvents: 'auto'
                                }}
                            >
                                <i className="fa-solid fa-play" style={{ color: '#fff', fontSize: 18, marginLeft: 3 }} />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Кнопка EXPAND — открывает fullscreen viewer */}
                {onClick && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(e);
                        }}
                        style={{
                            position: 'absolute',
                            top: 6, right: 6,
                            width: 28, height: 28,
                            borderRadius: 6,
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            backdropFilter: 'blur(8px)',
                            opacity: showControls ? 1 : 0,
                            transition: 'opacity 0.2s, background 0.15s',
                            zIndex: 5
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.8)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                        title="Открыть в полноэкранном режиме"
                    >
                        <i className="fa-solid fa-expand" />
                    </button>
                )}

                {/* Duration badge (показывается только при pause) */}
                {duration > 0 && !isPlaying && (
                    <div style={{
                        position: 'absolute',
                        bottom: 6, right: 6,
                        background: 'rgba(0,0,0,0.75)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        color: '#fff',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        pointerEvents: 'none',
                        zIndex: 2,
                        opacity: showControls ? 1 : 0,
                        transition: 'opacity 0.2s'
                    }}>
                        {formatTime(duration)}
                    </div>
                )}

                {/* ============ MINI CONTROLS (показываются при hover/playing) ============ */}
                <motion.div
                    animate={{
                        opacity: showControls ? 1 : 0,
                        y: showControls ? 0 : 10
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                        padding: '20px 8px 6px',
                        pointerEvents: showControls ? 'auto' : 'none'
                    }}
                >
                    {/* Progress bar */}
                    <div
                        ref={progressRef}
                        onMouseDown={handleProgressMouseDown}
                        style={{
                            position: 'relative',
                            height: 3,
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            marginBottom: 4,
                            transition: 'height 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.height = '5px'}
                        onMouseLeave={e => e.currentTarget.style.height = '3px'}
                    >
                        {/* Buffered */}
                        <div style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${buffered * 100}%`,
                            background: 'rgba(139,92,246,0.3)',
                            borderRadius: 2
                        }} />
                        {/* Played */}
                        <div style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                            background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                            borderRadius: 2
                        }} />
                    </div>

                    {/* Controls row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 4
                    }}>
                        {/* Play/Pause + time */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}>
                            <button
                                type="button"
                                onClick={togglePlay}
                                style={{
                                    width: 24, height: 24,
                                    borderRadius: 4,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10
                                }}
                            >
                                <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
                            </button>

                            <span style={{
                                fontSize: 10,
                                color: '#cbd5e1',
                                fontFamily: 'monospace',
                                fontWeight: 600
                            }}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Mute + Speed */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <button
                                type="button"
                                onClick={toggleMute}
                                style={{
                                    width: 24, height: 24,
                                    borderRadius: 4,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10
                                }}
                            >
                                <i className={`fa-solid ${getVolumeIcon()}`} />
                            </button>

                            {/* Speed button */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSpeedMenu(!showSpeedMenu);
                                    }}
                                    style={{
                                        padding: '2px 6px',
                                        background: speed !== 1 ? 'rgba(139,92,246,0.3)' : 'transparent',
                                        border: speed !== 1 ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                                        borderRadius: 4,
                                        color: speed !== 1 ? '#a78bfa' : '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: 9,
                                        fontWeight: 600,
                                        fontFamily: 'monospace'
                                    }}
                                >
                                    {speed}×
                                </button>

                                <AnimatePresence>
                                    {showSpeedMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                position: 'absolute',
                                                bottom: '100%',
                                                right: 0,
                                                marginBottom: 4,
                                                background: 'rgba(15,23,42,0.98)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 6,
                                                padding: 2,
                                                minWidth: 60,
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                                zIndex: 20
                                            }}
                                        >
                                            {speeds.map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => handleSpeedChange(s)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '4px 8px',
                                                        background: speed === s ? 'rgba(139,92,246,0.2)' : 'transparent',
                                                        border: 'none',
                                                        borderRadius: 3,
                                                        color: speed === s ? '#a78bfa' : '#cbd5e1',
                                                        cursor: 'pointer',
                                                        fontSize: 10,
                                                        fontFamily: 'monospace',
                                                        fontWeight: speed === s ? 700 : 500,
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    {s}×
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ============ FULL MODE ============
    return (
        <div
            ref={containerRef}
            onMouseMove={resetHideTimer}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: 900,
                margin: '0 auto',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#000',
                boxShadow: enableAmbient && !isMobile && !prefersReducedMotion
                    ? `0 0 80px 20px ${ambientColor}`
                    : '0 20px 60px rgba(0,0,0,0.5)',
                transition: 'box-shadow 0.5s ease'
            }}
        >
            <canvas ref={ambientCanvasRef} style={{ display: 'none' }} />

            <video
                ref={videoRef}
                src={blobUrl}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                style={{
                    width: '100%',
                    maxHeight: isFullscreen ? '100vh' : '70vh',
                    display: 'block',
                    background: '#000',
                    cursor: 'pointer'
                }}
            />

            {/* Buffering spinner */}
            <AnimatePresence>
                {isBuffering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                        }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                border: '3px solid rgba(139,92,246,0.2)',
                                borderTopColor: '#8b5cf6'
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gesture feedback */}
            <AnimatePresence>
                {gestureFeedback && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        style={{
                            position: 'absolute',
                            left: gestureFeedback.x,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            pointerEvents: 'none'
                        }}
                    >
                        <i className={`fa-solid ${gestureFeedback.icon}`}
                            style={{ color: '#fff', fontSize: 24 }} />
                        <span style={{
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: 'monospace'
                        }}>
                            {gestureFeedback.text}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Central play button (при паузе) */}
            <AnimatePresence>
                {!isPlaying && !isBuffering && showControls && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 3
                        }}
                    >
                        <motion.button
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            onClick={togglePlay}
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                background: 'rgba(139,92,246,0.8)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 28,
                                boxShadow: '0 8px 32px rgba(139,92,246,0.5)',
                                backdropFilter: 'blur(10px)',
                                pointerEvents: 'auto'
                            }}
                        >
                            <i className="fa-solid fa-play" style={{ marginLeft: 4 }} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============ CONTROLS PANEL ============ */}
            <motion.div
                animate={{
                    opacity: showControls || !isPlaying ? 1 : 0,
                    y: showControls || !isPlaying ? 0 : 20
                }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                    padding: '40px 16px 12px',
                    pointerEvents: showControls || !isPlaying ? 'auto' : 'none'
                }}
            >
                {/* Progress bar */}
                <div
                    style={{ marginBottom: 8, position: 'relative' }}
                    onMouseLeave={handleProgressLeave}
                >
                    {/* Preview tooltip */}
                    <AnimatePresence>
                        {showPreview && hoverTime !== null && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'absolute',
                                    left: hoverX,
                                    bottom: '100%',
                                    x: '-50%',
                                    marginBottom: 12,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    pointerEvents: 'none',
                                    zIndex: 10
                                }}
                            >
                                {/* Preview canvas */}
                                {!isMobile && (
                                    <canvas
                                        ref={previewCanvasRef}
                                        style={{
                                            width: 160,
                                            height: 90,
                                            borderRadius: 6,
                                            border: '2px solid rgba(139,92,246,0.5)',
                                            background: '#000',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                                        }}
                                    />
                                )}
                                <span style={{
                                    background: 'rgba(0,0,0,0.9)',
                                    padding: '3px 10px',
                                    borderRadius: 5,
                                    fontSize: 11,
                                    color: '#fff',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {formatTime(hoverTime)}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bar */}
                    <div
                        ref={progressRef}
                        onMouseDown={handleProgressMouseDown}
                        onMouseMove={handleProgressHover}
                        style={{
                            position: 'relative',
                            height: 6,
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: 3,
                            cursor: 'pointer',
                            transition: 'height 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.height = '10px'}
                        onMouseLeave={e => e.currentTarget.style.height = '6px'}
                    >
                        {/* Buffered */}
                        <div style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${buffered * 100}%`,
                            background: 'rgba(139,92,246,0.3)',
                            borderRadius: 3
                        }} />
                        {/* Played */}
                        <div style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                            background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                            borderRadius: 3
                        }} />
                        {/* Playhead */}
                        <div style={{
                            position: 'absolute',
                            left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#fff',
                            border: '3px solid #8b5cf6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }} />
                    </div>
                </div>

                {/* Controls row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap'
                }}>
                    {/* Left controls */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <button
                            type="button"
                            onClick={togglePlay}
                            style={{
                                width: 36, height: 36,
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.4)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        >
                            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
                        </button>

                        <button
                            type="button"
                            onClick={() => skip(-10)}
                            style={{
                                width: 32, height: 32,
                                borderRadius: 6,
                                background: 'transparent',
                                border: 'none',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12
                            }}
                            title="Назад 10 сек"
                        >
                            <i className="fa-solid fa-rotate-left" />
                        </button>
                        <button
                            type="button"
                            onClick={() => skip(10)}
                            style={{
                                width: 32, height: 32,
                                borderRadius: 6,
                                background: 'transparent',
                                border: 'none',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12
                            }}
                            title="Вперёд 10 сек"
                        >
                            <i className="fa-solid fa-arrow-rotate-right" />
                        </button>

                        {/* Frame navigation (при паузе) */}
                        {enableFrameNav && !isPlaying && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', gap: 2 }}
                            >
                                <button
                                    type="button"
                                    onClick={() => frameStepNav(-1)}
                                    style={{
                                        width: 28, height: 28,
                                        borderRadius: 4,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10
                                    }}
                                    title="Предыдущий кадр"
                                >
                                    <i className="fa-solid fa-step-backward" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => frameStepNav(1)}
                                    style={{
                                        width: 28, height: 28,
                                        borderRadius: 4,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10
                                    }}
                                    title="Следующий кадр"
                                >
                                    <i className="fa-solid fa-step-forward" />
                                </button>
                            </motion.div>
                        )}

                        {/* Volume */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginLeft: 4
                        }}>
                            <button
                                type="button"
                                onClick={toggleMute}
                                style={{
                                    width: 32, height: 32,
                                    borderRadius: 6,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 13
                                }}
                            >
                                <i className={`fa-solid ${getVolumeIcon()}`} />
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={muted ? 0 : volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                style={{
                                    width: 80,
                                    height: 4,
                                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) 100%)`,
                                    borderRadius: 2,
                                    outline: 'none',
                                    cursor: 'pointer',
                                    WebkitAppearance: 'none',
                                    appearance: 'none'
                                }}
                            />
                        </div>

                        {/* Time */}
                        <span style={{
                            fontSize: 12,
                            color: '#cbd5e1',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            marginLeft: 4
                        }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        {/* Timestamp copy */}
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard?.writeText(formatTimestamp(currentTime));
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontSize: 10,
                                fontFamily: 'monospace',
                                padding: '2px 4px'
                            }}
                            title="Копировать timestamp"
                        >
                            <i className="fa-solid fa-copy" />
                        </button>
                    </div>

                    {/* Right controls */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        {/* Speed */}
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSpeedMenu(!showSpeedMenu);
                                }}
                                style={{
                                    padding: '4px 10px',
                                    background: speed !== 1 ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                                    border: speed !== 1 ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 6,
                                    color: speed !== 1 ? '#a78bfa' : '#cbd5e1',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: 'monospace'
                                }}
                            >
                                {speed}×
                            </button>

                            <AnimatePresence>
                                {showSpeedMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            right: 0,
                                            marginBottom: 6,
                                            background: 'rgba(15,23,42,0.98)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 8,
                                            padding: 4,
                                            minWidth: 90,
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            zIndex: 10
                                        }}
                                    >
                                        {speeds.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => handleSpeedChange(s)}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 10px',
                                                    background: speed === s ? 'rgba(139,92,246,0.2)' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: 4,
                                                    color: speed === s ? '#a78bfa' : '#cbd5e1',
                                                    cursor: 'pointer',
                                                    fontSize: 11,
                                                    fontFamily: 'monospace',
                                                    fontWeight: speed === s ? 700 : 500,
                                                    textAlign: 'left'
                                                }}
                                            >
                                                {s}×
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* PiP */}
                        {document.pictureInPictureEnabled && (
                            <button
                                type="button"
                                onClick={togglePiP}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 6,
                                    background: isPiP ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: isPiP ? '#a78bfa' : '#cbd5e1',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12
                                }}
                                title="Picture-in-Picture (P)"
                            >
                                <i className="fa-solid fa-clone" />
                            </button>
                        )}

                        {/* Fullscreen */}
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12
                            }}
                            title="Полный экран (F)"
                        >
                            <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
                        </button>
                    </div>
                </div>

                {/* Keyboard hints */}
                {keyboardEnabled && (
                    <div style={{
                        marginTop: 8,
                        textAlign: 'center',
                        fontSize: 9,
                        color: '#475569',
                        fontFamily: 'monospace'
                    }}>
                        Space play · ←→ ±5s/кадр · ↑↓ громкость · M mute · F fullscreen · P PiP
                    </div>
                )}
            </motion.div>

            {/* Error overlay */}
            {hasError && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    background: 'rgba(0,0,0,0.8)'
                }}>
                    <i className="fa-solid fa-triangle-exclamation"
                        style={{ color: '#ef4444', fontSize: 32 }} />
                    <span style={{ color: '#94a3b8' }}>Не удалось загрузить видео</span>
                </div>
            )}

            {/* CSS для range thumb */}
            <style>{`
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    border: 2px solid #8b5cf6;
                }
                input[type="range"]::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    border: 2px solid #8b5cf6;
                }
            `}</style>
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;