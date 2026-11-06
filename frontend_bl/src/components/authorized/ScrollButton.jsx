import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ScrollButton = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const toggleVisible = () => {
            const scrolled = document.documentElement.scrollTop;
            const width = document.documentElement.clientWidth;

            // Показываем кнопку только если прокрутили > 300px и это десктоп (> 767px)
            if (scrolled > 300 && width > 767) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        // Добавляем слушатель при монтировании
        window.addEventListener('scroll', toggleVisible);

        // Обязательно удаляем слушатель при размонтировании (исправление утечки памяти)
        return () => window.removeEventListener('scroll', toggleVisible);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    type="button"
                    onClick={scrollToTop}
                    aria-label="Прокрутить наверх"
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 48,
                        height: 48,
                        borderRadius: 12, // Соответствует borderRadius кнопок в дизайн-системе
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                        zIndex: 900,
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <i className="fa-solid fa-arrow-up" style={{ fontSize: 16 }} />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

export default ScrollButton;