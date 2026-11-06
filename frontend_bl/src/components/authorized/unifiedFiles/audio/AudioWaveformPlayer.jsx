import React, { useRef, useEffect, useState, useCallback, useMemo, memo, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Context } from "../../../..";

/**
 * 🎧 Современный аудиоплеер с waveform-визуализацией и auto-gain
 * 
 * Фичи:
 *  - Волновая форма (canvas) с градиентом played/unplayed
 *  - Click & drag scrubbing с time-tooltip
 *  - Auto-gain нормализация громкости через Web Audio API
 *  - Вращающийся vinyl-диск (full mode)
 *  - Ambient фон (desktop + full mode)
 *  - Keyboard shortcuts
 *  - Mobile optimizations (меньше bars, throttled RAF)
 * 
 * @param {string} blobUrl - URL аудиоблоба
 * @param {string} filename - Имя файла для отображения
 * @param {boolean} compact - Компактный режим (для карточек)
 * @param {boolean} autoGain - Нормализация громкости (только full mode)
 * @param {boolean} keyboardEnabled - Слушать горячие клавиши
 * @param {function} onPlay - Callback при play
 * @param {function} onPause - Callback при pause
 */
const AudioWaveformPlayer = memo(({
    blobUrl,
    filename,
    compact = false,
    autoGain = true,
    keyboardEnabled = false,
    onPlay = null,
    onPause = null
}) => {

    const { user } = useContext(Context)
    const isAdminOrDev =
        user?.user?.status && ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);
    // ============ REFS ============
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const gainNodeRef = useRef(null);
    const bgCanvasRef = useRef(null);
    const fgCanvasRef = useRef(null);
    const waveformWrapperRef = useRef(null);
    const rafRef = useRef(null);
    const workerRef = useRef(null);
    const lastFrameRef = useRef(0);

    // ============ STATE ============
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [gainValue, setGainValue] = useState(1);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);
    const [scrubX, setScrubX] = useState(0);
    const [hasError, setHasError] = useState(false);

    // ============ DERIVED ============
    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }, []);
    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    }, []);
    const barCount = compact ? 60 : (isMobile ? 80 : 180);
    const fps = isMobile ? 30 : 60;
    const frameDelay = 1000 / fps;

    // Peaks хранятся в ref для быстрого доступа из RAF
    const peaksRef = useRef(null);
    const rmsRef = useRef(0);
    const isPlayingRef = useRef(false);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // ============ WEB AUDIO SETUP (auto-gain) ============
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Создаём AudioContext только в full mode с auto-gain
        if (!compact && autoGain && !audioContextRef.current) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                try {
                    audioContextRef.current = new AudioCtx();
                    sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
                    gainNodeRef.current = audioContextRef.current.createGain();
                    sourceNodeRef.current.connect(gainNodeRef.current);
                    gainNodeRef.current.connect(audioContextRef.current.destination);
                } catch (err) {
                    console.warn('[AudioPlayer] Web Audio setup failed:', err);
                }
            }
        }

        return () => {
            try { audioContextRef.current?.close(); } catch (e) { }
            audioContextRef.current = null;
            sourceNodeRef.current = null;
            gainNodeRef.current = null;
        };
    }, [compact, autoGain]);

    // ============ WAVEFORM ANALYSIS ============
    useEffect(() => {
        if (!blobUrl) return;

        let cancelled = false;
        setIsAnalyzing(true);
        setHasError(false);
        peaksRef.current = null;

        const analyze = async () => {
            try {
                // 1. Загружаем аудио и декодируем в main thread (для надёжности)
                const response = await fetch(blobUrl);
                if (cancelled) return;
                const arrayBuffer = await response.arrayBuffer();
                if (cancelled) return;

                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const tempCtx = new AudioCtx();
                const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
                await tempCtx.close();
                if (cancelled) return;

                // Берём первый канал (моно)
                const pcmData = audioBuffer.getChannelData(0).slice();
                const audioDuration = audioBuffer.duration;
                const sampleRate = audioBuffer.sampleRate;

                if (cancelled) return;
                setDuration(audioDuration);

                // 2. Отправляем PCM в worker для анализа (RMS + peaks)
                const workerCode = `
                    self.onmessage = (e) => {
                        const { pcmData, targetBars, duration } = e.data;
                        const samples = new Float32Array(pcmData);
                        const length = samples.length;

                        // RMS
                        let sum = 0;
                        for (let i = 0; i < length; i++) {
                            sum += samples[i] * samples[i];
                        }
                        const rms = Math.sqrt(sum / length);

                        // Peaks
                        const peaks = new Float32Array(targetBars);
                        const samplesPerBar = Math.max(1, Math.floor(length / targetBars));
                        for (let i = 0; i < targetBars; i++) {
                            const start = i * samplesPerBar;
                            const end = Math.min(start + samplesPerBar, length);
                            let max = 0;
                            for (let j = start; j < end; j++) {
                                const abs = Math.abs(samples[j]);
                                if (abs > max) max = abs;
                            }
                            peaks[i] = max;
                        }

                        // Normalize peaks to 0..1
                        let maxPeak = 0;
                        for (let i = 0; i < peaks.length; i++) {
                            if (peaks[i] > maxPeak) maxPeak = peaks[i];
                        }
                        if (maxPeak > 0) {
                            for (let i = 0; i < peaks.length; i++) {
                                peaks[i] /= maxPeak;
                            }
                        }

                        self.postMessage({
                            peaks: peaks.buffer,
                            rms,
                            duration
                        }, [peaks.buffer]);
                    };
                `;
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                const worker = new Worker(workerUrl);
                workerRef.current = worker;

                worker.onmessage = (e) => {
                    if (cancelled) return;
                    const { peaks, rms } = e.data;
                    peaksRef.current = new Float32Array(peaks);
                    rmsRef.current = rms;

                    // 3. Применяем auto-gain
                    if (!compact && autoGain && gainNodeRef.current) {
                        const targetRms = 0.2; // ~-14 LUFS
                        const rawGain = rms > 0.001 ? targetRms / rms : 1;
                        const gain = Math.max(0.5, Math.min(3.0, rawGain));
                        setGainValue(gain);
                        gainNodeRef.current.gain.value = gain;
                    }

                    drawWaveform();
                    setIsAnalyzing(false);

                    URL.revokeObjectURL(workerUrl);
                    worker.terminate();
                };

                worker.onerror = (err) => {
                    console.error('[AudioPlayer] Worker error:', err);
                    setIsAnalyzing(false);
                    setHasError(true);
                };

                worker.postMessage({
                    pcmData: pcmData.buffer,
                    targetBars: barCount,
                    duration: audioDuration
                }, [pcmData.buffer]);

            } catch (err) {
                console.error('[AudioPlayer] Analysis failed:', err);
                if (!cancelled) {
                    setIsAnalyzing(false);
                    setHasError(true);
                }
            }
        };

        analyze();

        return () => {
            cancelled = true;
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, [blobUrl, barCount, compact, autoGain]);

    // ============ DRAW STATIC WAVEFORM ============
    const drawWaveform = useCallback(() => {
        const canvas = bgCanvasRef.current;
        const peaks = peaksRef.current;
        if (!canvas || !peaks) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const barWidth = width / peaks.length;
        const centerY = height / 2;
        const maxBarHeight = height * 0.85;

        ctx.fillStyle = '#475569';

        for (let i = 0; i < peaks.length; i++) {
            const x = i * barWidth;
            const barHeight = Math.max(2, peaks[i] * maxBarHeight);
            const y = centerY - barHeight / 2;
            const bw = Math.max(1, barWidth - 2);
            ctx.fillRect(x + 1, y, bw, barHeight);
        }
    }, []);

    // ============ RESIZE HANDLER ============
    useEffect(() => {
        const handleResize = () => {
            if (peaksRef.current) drawWaveform();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawWaveform]);

    // ============ ANIMATION LOOP (playhead + played gradient) ============
    useEffect(() => {
        const audio = audioRef.current;

        const update = (timestamp) => {
            // Throttle FPS на мобильных
            if (timestamp - lastFrameRef.current < frameDelay) {
                rafRef.current = requestAnimationFrame(update);
                return;
            }
            lastFrameRef.current = timestamp;

            const fgCanvas = fgCanvasRef.current;
            const peaks = peaksRef.current;

            if (!fgCanvas || !audio || !peaks) {
                rafRef.current = requestAnimationFrame(update);
                return;
            }

            const ctx = fgCanvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = fgCanvas.getBoundingClientRect();

            if (fgCanvas.width !== Math.floor(rect.width * dpr)) {
                fgCanvas.width = rect.width * dpr;
                fgCanvas.height = rect.height * dpr;
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, rect.width, rect.height);

            const progress = duration > 0 ? audio.currentTime / duration : 0;
            const playheadX = progress * rect.width;

            // Played bars (gradient)
            if (playheadX > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, playheadX, rect.height);
                ctx.clip();

                const barWidth = rect.width / peaks.length;
                const centerY = rect.height / 2;
                const maxBarHeight = rect.height * 0.85;

                const gradient = ctx.createLinearGradient(0, 0, playheadX, 0);
                gradient.addColorStop(0, '#6366f1');
                gradient.addColorStop(1, '#8b5cf6');
                ctx.fillStyle = gradient;

                for (let i = 0; i < peaks.length; i++) {
                    const x = i * barWidth;
                    if (x > playheadX + barWidth) break;
                    const barHeight = Math.max(2, peaks[i] * maxBarHeight);
                    const y = centerY - barHeight / 2;
                    const bw = Math.max(1, barWidth - 2);
                    ctx.fillRect(x + 1, y, bw, barHeight);
                }
                ctx.restore();
            }

            // Playhead line
            ctx.fillStyle = '#f1f5f9';
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 8;
            ctx.fillRect(playheadX - 1, 0, 2, rect.height);
            ctx.shadowBlur = 0;

            // Playhead dot
            ctx.beginPath();
            ctx.arc(playheadX, rect.height / 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#f1f5f9';
            ctx.fill();

            // Update time (throttled state updates)
            if (!isScrubbing) {
                setCurrentTime(audio.currentTime);
            }

            if (isPlayingRef.current) {
                rafRef.current = requestAnimationFrame(update);
            }
        };

        // Start loop if playing, else draw once
        if (isPlaying) {
            rafRef.current = requestAnimationFrame(update);
        } else {
            // Draw current state once
            const fakeUpdate = () => {
                const fgCanvas = fgCanvasRef.current;
                const peaks = peaksRef.current;
                if (!fgCanvas || !audio || !peaks) return;

                const ctx = fgCanvas.getContext('2d');
                const dpr = window.devicePixelRatio || 1;
                const rect = fgCanvas.getBoundingClientRect();

                if (fgCanvas.width !== Math.floor(rect.width * dpr)) {
                    fgCanvas.width = rect.width * dpr;
                    fgCanvas.height = rect.height * dpr;
                }

                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, rect.width, rect.height);

                const progress = duration > 0 ? audio.currentTime / duration : 0;
                const playheadX = progress * rect.width;

                if (playheadX > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, playheadX, rect.height);
                    ctx.clip();
                    const barWidth = rect.width / peaks.length;
                    const centerY = rect.height / 2;
                    const maxBarHeight = rect.height * 0.85;
                    const gradient = ctx.createLinearGradient(0, 0, playheadX, 0);
                    gradient.addColorStop(0, '#6366f1');
                    gradient.addColorStop(1, '#8b5cf6');
                    ctx.fillStyle = gradient;
                    for (let i = 0; i < peaks.length; i++) {
                        const x = i * barWidth;
                        if (x > playheadX + barWidth) break;
                        const barHeight = Math.max(2, peaks[i] * maxBarHeight);
                        const y = centerY - barHeight / 2;
                        const bw = Math.max(1, barWidth - 2);
                        ctx.fillRect(x + 1, y, bw, barHeight);
                    }
                    ctx.restore();
                }
                ctx.fillStyle = '#f1f5f9';
                ctx.shadowColor = '#6366f1';
                ctx.shadowBlur = 8;
                ctx.fillRect(playheadX - 1, 0, 2, rect.height);
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(playheadX, rect.height / 2, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#f1f5f9';
                ctx.fill();
            };
            requestAnimationFrame(fakeUpdate);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isPlaying, duration, isScrubbing, frameDelay]);

    // ============ AUDIO EVENT HANDLERS ============
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            onPause?.();
        };
        const handleError = () => setHasError(true);

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, []);

    // ============ CONTROLS ============
    const togglePlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) return;

        // Resume AudioContext если был suspended (browser policy)
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        try {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
                onPause?.();
            } else {
                await audio.play();
                setIsPlaying(true);
                onPlay?.();
            }
        } catch (err) {
            console.warn('[AudioPlayer] Play failed:', err);
        }
    }, [isPlaying, onPlay, onPause]);

    const skip = useCallback((seconds) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
        setCurrentTime(audio.currentTime);
    }, [duration]);

    const handleVolumeChange = (v) => {
        const newVol = Math.max(0, Math.min(1, v));
        setVolume(newVol);
        setMuted(newVol === 0);
        if (audioRef.current) {
            audioRef.current.volume = newVol;
        }
    };

    const toggleMute = () => {
        const newMuted = !muted;
        setMuted(newMuted);
        if (audioRef.current) {
            audioRef.current.muted = newMuted;
        }
    };

    const handleSpeedChange = (s) => {
        setSpeed(s);
        if (audioRef.current) {
            audioRef.current.playbackRate = s;
        }
        setShowSpeedMenu(false);
    };

    // ============ SCRUBBING ============
    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const scrubToPosition = useCallback((clientX) => {
        const wrapper = waveformWrapperRef.current;
        const audio = audioRef.current;
        if (!wrapper || !audio || duration === 0) return;

        const rect = wrapper.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const progress = x / rect.width;
        const time = progress * duration;

        audio.currentTime = time;
        setCurrentTime(time);
        setScrubTime(time);
        setScrubX(x);
    }, [duration]);

    const handleScrubStart = (clientX) => {
        setIsScrubbing(true);
        scrubToPosition(clientX);
    };

    const handleScrubMove = (clientX) => {
        if (!isScrubbing) return;
        scrubToPosition(clientX);
    };

    const handleScrubEnd = () => {
        setIsScrubbing(false);
    };

    // Mouse events
    const handleMouseDown = (e) => {
        handleScrubStart(e.clientX);
        const move = (ev) => handleScrubMove(ev.clientX);
        const up = () => {
            handleScrubEnd();
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    // Touch events
    const handleTouchStart = (e) => handleScrubStart(e.touches[0].clientX);
    const handleTouchMove = (e) => handleScrubMove(e.touches[0].clientX);
    const handleTouchEnd = () => handleScrubEnd();

    // ============ KEYBOARD SHORTCUTS ============
    useEffect(() => {
        if (!keyboardEnabled) return;

        const handler = (e) => {
            // Игнорируем если фокус в input/textarea
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    skip(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    skip(5);
                    break;
                case 'm':
                case 'M':
                case 'ь':
                case 'Ь':
                    e.preventDefault();
                    toggleMute();
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [keyboardEnabled, togglePlay, skip, toggleMute]);

    // Close speed menu on outside click
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

    // ============ VOLUME ICON ============
    const getVolumeIcon = () => {
        if (muted || volume === 0) return 'fa-volume-xmark';
        if (volume < 0.33) return 'fa-volume-off';
        if (volume < 0.66) return 'fa-volume-low';
        return 'fa-volume-high';
    };

    // ============ RENDER ============
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    // Компактный режим — минималистичный плеер
    if (compact) {
        return (
            <div style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)'
            }}>
                <audio
                    ref={audioRef}
                    src={blobUrl}
                    preload="metadata"
                    crossOrigin="anonymous"
                />

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    {/* Play/Pause button */}
                    <button
                        type="button"
                        onClick={togglePlay}
                        disabled={isAnalyzing || hasError}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            color: '#fff',
                            cursor: isAnalyzing || hasError ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            opacity: isAnalyzing || hasError ? 0.5 : 1,
                            transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isAnalyzing ? (
                            <motion.i
                                className="fa-solid fa-spinner"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{ fontSize: 13 }}
                            />
                        ) : (
                            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}
                                style={{ fontSize: 13, marginLeft: isPlaying ? 0 : 2 }} />
                        )}
                    </button>

                    {/* Waveform + time */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            ref={waveformWrapperRef}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{
                                position: 'relative',
                                height: 32,
                                cursor: 'pointer',
                                userSelect: 'none',
                                touchAction: 'none'
                            }}
                        >
                            <canvas
                                ref={bgCanvasRef}
                                style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%'
                                }}
                            />
                            <canvas
                                ref={fgCanvasRef}
                                style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%',
                                    pointerEvents: 'none'
                                }}
                            />
                            {/* Scrub tooltip */}
                            <AnimatePresence>
                                {isScrubbing && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            position: 'absolute',
                                            left: scrubX,
                                            top: -28,
                                            transform: 'translateX(-50%)',
                                            background: 'rgba(0,0,0,0.9)',
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            color: '#fff',
                                            fontFamily: 'monospace',
                                            pointerEvents: 'none',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {formatTime(scrubTime)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Time row */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 10,
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                            marginTop: 2
                        }}>
                            <span>{formatTime(currentTime)}</span>
                            <span>{hasError ? 'Ошибка' : formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============ FULL MODE ============
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 600,
            margin: '0 auto',
            padding: 32,
            background: 'rgba(15,23,42,0.6)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                src={blobUrl}
                preload="metadata"
                crossOrigin="anonymous"
            />

            {/* Ambient background (desktop only, playing) */}
            {!isMobile && !prefersReducedMotion && isPlaying && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    opacity: 0.6
                }}>
                    <motion.div
                        animate={{
                            x: [-80, 80, -80],
                            y: [-40, 60, -40],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute',
                            top: '-20%', left: '-10%',
                            width: 300, height: 300,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%)',
                            filter: 'blur(60px)'
                        }}
                    />
                    <motion.div
                        animate={{
                            x: [100, -100, 100],
                            y: [80, -40, 80],
                            scale: [1.1, 0.9, 1.1]
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                        style={{
                            position: 'absolute',
                            bottom: '-20%', right: '-10%',
                            width: 340, height: 340,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)',
                            filter: 'blur(60px)'
                        }}
                    />
                </div>
            )}

            {/* Filename + gain badge */}
            <div style={{
                position: 'relative',
                textAlign: 'center',
                marginBottom: 24
            }}>
                <div style={{
                    color: '#f1f5f9',
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {filename}
                </div>
                {isAdminOrDev && autoGain && gainValue !== 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            background: gainValue > 1 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                            borderRadius: 6,
                            fontSize: 10,
                            color: gainValue > 1 ? '#22c55e' : '#f59e0b',
                            fontWeight: 600,
                            fontFamily: 'monospace'
                        }}
                    >
                        <i className={`fa-solid ${gainValue > 1 ? 'fa-arrow-up' : 'fa-arrow-down'}`} style={{ fontSize: 8 }} />
                        AUTO-GAIN ×{gainValue.toFixed(2)}
                    </motion.div>
                )}
            </div>

            {/* Vinyl disc + main controls */}
            <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20
            }}>
                {/* Vinyl disc (full mode) */}
                {/*!prefersReducedMotion && (
                    <motion.div
                        animate={{ rotate: isPlaying ? 360 : 0 }}
                        transition={{
                            duration: 4,
                            repeat: isPlaying ? Infinity : 0,
                            ease: 'linear'
                        }}
                        style={{
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            border: '3px solid rgba(99,102,241,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            boxShadow: isPlaying
                                ? '0 0 40px rgba(99,102,241,0.4), inset 0 0 20px rgba(0,0,0,0.5)'
                                : 'inset 0 0 20px rgba(0,0,0,0.5)'
                        }}
                    >
                        {[...Array(12)].map((_, i) => {
                            const angle = (i / 12) * Math.PI * 2;
                            const x = 50 + 42 * Math.cos(angle);
                            const y = 50 + 42 * Math.sin(angle);
                            return (
                                <div key={i} style={{
                                    position: 'absolute',
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    width: 3,
                                    height: 3,
                                    borderRadius: '50%',
                                    background: '#6366f1',
                                    opacity: 0.4,
                                    transform: 'translate(-50%, -50%)'
                                }} />
                            );
                        })}
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(99,102,241,0.5)'
                        }}>
                            <i className="fa-solid fa-volume-high"
                                style={{ color: '#fff', fontSize: 22 }} />
                        </div>
                    </motion.div>
                )*/}

                {/* Main control row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                }}>
                    {/* Skip back */}
                    <button
                        type="button"
                        onClick={() => skip(-10)}
                        disabled={isAnalyzing}
                        style={{
                            width: 40, height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                    >
                        <i className="fa-solid fa-rotate-left" />
                    </button>

                    {/* Play/Pause */}
                    <div style={{ position: 'relative' }}>
                        {/* Ripple effects при playing */}
                        {isPlaying && !prefersReducedMotion && (
                            <>
                                {[0, 0.5, 1].map((delay, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: [1, 2.2],
                                            opacity: [0.4, 0]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay,
                                            ease: 'ease-out'
                                        }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: '50%',
                                            border: '2px solid #6366f1',
                                            pointerEvents: 'none'
                                        }}
                                    />
                                ))}
                            </>
                        )}
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.92 }}
                            onClick={togglePlay}
                            disabled={isAnalyzing || hasError}
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                color: '#fff',
                                cursor: isAnalyzing || hasError ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                                boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
                                opacity: isAnalyzing || hasError ? 0.5 : 1
                            }}
                        >
                            {isAnalyzing ? (
                                <motion.i
                                    className="fa-solid fa-spinner"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.i
                                        key={isPlaying ? 'pause' : 'play'}
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        transition={{ duration: 0.15 }}
                                        className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}
                                        style={{ marginLeft: isPlaying ? 0 : 3 }}
                                    />
                                </AnimatePresence>
                            )}
                        </motion.button>
                    </div>

                    {/* Skip forward */}
                    <button
                        type="button"
                        onClick={() => skip(10)}
                        disabled={isAnalyzing}
                        style={{
                            width: 40, height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                    >
                        <i className="fa-solid fa-arrow-rotate-right" />
                    </button>
                </div>

                {/* Skip hint */}
                <div style={{
                    display: 'flex',
                    gap: 104,
                    fontSize: 10,
                    color: '#64748b',
                    fontFamily: 'monospace'
                }}>
                    <span>−10s</span>
                    <span>+10s</span>
                </div>
            </div>

            {/* Waveform */}
            <div style={{ marginTop: 24 }}>
                <div
                    ref={waveformWrapperRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        position: 'relative',
                        height: isMobile ? 64 : 80,
                        cursor: 'pointer',
                        userSelect: 'none',
                        touchAction: 'none',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 12,
                        padding: '0 8px'
                    }}
                >
                    <canvas
                        ref={bgCanvasRef}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%'
                        }}
                    />
                    <canvas
                        ref={fgCanvasRef}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Scrub tooltip */}
                    <AnimatePresence>
                        {isScrubbing && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: 'absolute',
                                    left: scrubX,
                                    top: -32,
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.95)',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    color: '#fff',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                    border: '1px solid rgba(99,102,241,0.3)'
                                }}
                            >
                                {formatTime(scrubTime)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Time row */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#cbd5e1',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    marginTop: 8,
                    padding: '0 4px'
                }}>
                    <span>{formatTime(currentTime)}</span>
                    <span style={{ color: '#64748b' }}>
                        {hasError ? 'Ошибка загрузки' : `−${formatTime(Math.max(0, duration - currentTime))}`}
                    </span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Bottom controls: volume + speed */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 20,
                gap: 12,
                flexWrap: 'wrap'
            }}>
                {/* Volume control */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    minWidth: 160,
                    maxWidth: 240
                }}>
                    <button
                        type="button"
                        onClick={toggleMute}
                        style={{
                            width: 32, height: 32,
                            borderRadius: 8,
                            background: 'transparent',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                    >
                        <i className={`fa-solid ${getVolumeIcon()}`} />
                    </button>

                    {/* Custom volume slider */}
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        height: 24,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={muted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            style={{
                                width: '100%',
                                height: 4,
                                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) 100%)`,
                                borderRadius: 2,
                                outline: 'none',
                                cursor: 'pointer',
                                WebkitAppearance: 'none',
                                appearance: 'none'
                            }}
                        />
                    </div>

                    <span style={{
                        fontSize: 11,
                        color: '#64748b',
                        fontFamily: 'monospace',
                        minWidth: 32,
                        textAlign: 'right'
                    }}>
                        {Math.round((muted ? 0 : volume) * 100)}%
                    </span>
                </div>

                {/* Speed control */}
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSpeedMenu(!showSpeedMenu);
                        }}
                        style={{
                            padding: '6px 14px',
                            background: speed !== 1 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                            border: speed !== 1 ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: speed !== 1 ? '#a5b4fc' : '#cbd5e1',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <i className="fa-solid fa-gauge-high" style={{ fontSize: 10 }} />
                        {speed}×
                    </button>

                    <AnimatePresence>
                        {showSpeedMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: 0,
                                    marginBottom: 6,
                                    background: 'rgba(15,23,42,0.98)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 10,
                                    padding: 4,
                                    minWidth: 100,
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
                                            padding: '8px 12px',
                                            background: speed === s ? 'rgba(99,102,241,0.2)' : 'transparent',
                                            border: 'none',
                                            borderRadius: 6,
                                            color: speed === s ? '#a5b4fc' : '#cbd5e1',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontFamily: 'monospace',
                                            fontWeight: speed === s ? 700 : 500,
                                            textAlign: 'left',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => {
                                            if (speed !== s) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }}
                                        onMouseLeave={e => {
                                            if (speed !== s) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        {s}× {s === 1 && <span style={{ color: '#64748b', marginLeft: 4 }}>normal</span>}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Keyboard hint */}
            {keyboardEnabled && (
                <div style={{
                    marginTop: 16,
                    textAlign: 'center',
                    fontSize: 10,
                    color: '#475569',
                    fontFamily: 'monospace'
                }}>
                    <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>Space</span> play
                    {' · '}
                    <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>←</span>
                    <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>→</span> ±5s
                    {' · '}
                    <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>M</span> mute
                </div>
            )}

            {/* Inject CSS для кастомного slider thumb */}
            <style>{`
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    border: 2px solid #6366f1;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
                input[type="range"]::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    border: 2px solid #6366f1;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
});

AudioWaveformPlayer.displayName = 'AudioWaveformPlayer';

export default AudioWaveformPlayer;