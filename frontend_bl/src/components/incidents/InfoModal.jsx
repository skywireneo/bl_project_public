import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/UIComponents"; // Проверь путь к UIComponents

export default function InfoModal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 20, padding: 32, maxWidth: 520, width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
            >
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                    style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 30px rgba(99,102,241,0.3)'
                    }}
                >
                    <i className="fa-solid fa-circle-info" style={{ color: '#fff', fontSize: 28 }} />
                </motion.div>
                <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: '#f1f5f9', textAlign: 'center' }}>
                    {title}
                </h2>
                <div style={{
                    color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 24,
                    background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16,
                    border: '1px solid rgba(255,255,255,0.04)'
                }}>
                    {children}
                </div>
                <Button variant="primary" onClick={onClose} fullWidth>
                    Понятно
                </Button>
            </motion.div>
        </motion.div>
    );
}