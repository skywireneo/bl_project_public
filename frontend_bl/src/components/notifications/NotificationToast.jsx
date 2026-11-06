import React, { useContext } from "react";
import { motion } from "framer-motion";
import { Context } from "../..";

export default function NotificationToast({ toast }) {
    const { notification } = useContext(Context);

    const priorityColors = {
        low: '#64748b', normal: '#6366f1', high: '#f59e0b', critical: '#ef4444'
    };
    const pColor = priorityColors[toast.priority] || priorityColors.normal;

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            onClick={() => notification.removeToast(toast.id)} // ИСПРАВЛЕНО ЗДЕСЬ
            style={{
                display: 'flex', gap: 12, padding: 16, width: 360,
                background: '#1e2030', border: `1px solid ${pColor}40`,
                borderLeft: `4px solid ${pColor}`, borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)', cursor: 'pointer',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${pColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <i className={`fa-solid ${toast.icon || 'fa-bell'}`} style={{ color: pColor, fontSize: 18 }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{toast.title}</div>
                {toast.body && <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{toast.body}</div>}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Чтобы не триггерить onClick родителя лишний раз
                    notification.removeToast(toast.id);
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
            >
                <i className="fa-solid fa-xmark" />
            </button>
        </motion.div>
    );
}