import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import storageHandler from "../../http/utils/storageHandler";

const COOKIE_KEY_DISABLED = 'incident_dont_save_user_data';

export default function UserDataAutoFill({ isEnabled, onToggle }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = () => {
        setIsAnimating(true);
        setTimeout(() => {
            onToggle();
            setIsAnimating(false);
        }, 200);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <motion.button
                type="button"
                onClick={handleToggle}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                animate={{ scale: isAnimating ? 0.9 : 1 }}
                style={{
                    background: isEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${isEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    borderRadius: 6,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: isEnabled ? '#34d399' : '#64748b',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                }}
            >
                <i className={`fa-solid ${isEnabled ? 'fa-floppy-disk' : 'fa-ban'}`} style={{ fontSize: 10 }} />
                {isEnabled ? 'Автозаполнение включено' : 'Автозаполнение выключено'}
            </motion.button>

            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            right: 0,
                            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 8,
                            padding: 12,
                            width: 240,
                            fontSize: 12,
                            color: '#cbd5e1',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            zIndex: 100,
                            lineHeight: 1.5
                        }}
                    >
                        <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: '#f1f5f9' }}>
                                {isEnabled ? '✓ Автозаполнение активно' : '✗ Автозаполнение отключено'}
                            </strong>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            {isEnabled
                                ? 'Ваши email и Telegram автоматически подставляются при создании инцидента. Данные хранятся 10 дней с момента создания инцидента.'
                                : 'Email и Telegram не будут сохраняться автоматически.'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            Нажмите кнопку, чтобы {isEnabled ? 'отключить' : 'включить'}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}