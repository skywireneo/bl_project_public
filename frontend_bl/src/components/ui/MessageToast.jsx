import React from "react";
import { motion } from "framer-motion";

function MessageToast(props) {
  // Цветовая палитра и иконки из дизайн-системы
  const colors = {
    danger: { border: '#ef4444', icon: 'fa-circle-xmark', iconColor: '#f87171', bg: 'rgba(239,68,68,0.1)' },
    warning: { border: '#f59e0b', icon: 'fa-triangle-exclamation', iconColor: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
    success: { border: '#10b981', icon: 'fa-circle-check', iconColor: '#34d399', bg: 'rgba(16,185,129,0.1)' },
    info: { border: '#3b82f6', icon: 'fa-circle-info', iconColor: '#60a5fa', bg: 'rgba(59,130,246,0.1)' }
  };

  const c = colors[props.typeOf] || colors.info;

  const getDefaultTitle = (type) => {
    switch (type) {
      case 'danger': return 'Ошибка';
      case 'warning': return 'Внимание';
      case 'success': return 'Успешно';
      case 'info':
      default: return 'Информация';
    }
  };

  const hasExtendedInfo = props.title || props.code || props.serviceCode || props.errors;
  const displayTitle = props.title || getDefaultTitle(props.typeOf);
  const hasErrors = props.errors && props.errors.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        minWidth: hasExtendedInfo ? '320px' : '280px',
        maxWidth: hasExtendedInfo ? '420px' : '360px',
        background: '#1a1d2e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `4px solid ${c.border}`,
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        color: '#e2e8f0',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        pointerEvents: 'auto',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '16px', gap: 12 }}>
        {/* Иконка */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: c.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2
        }}>
          <i className={`fa-solid ${c.icon}`} style={{ color: c.iconColor, fontSize: 16 }} />
        </div>

        {/* Контент */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasExtendedInfo ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span>{displayTitle}</span>
                {props.serviceCode && (
                  <span style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500
                  }}>
                    svc:{props.serviceCode}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: hasErrors ? 8 : 0 }}>
                {props.text}
              </div>

              {/* Ошибки валидации */}
              {hasErrors && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  marginTop: 8,
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <div style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>Ошибки: {props.errors.length}</div>
                  {props.errors.length <= 3 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {props.errors.map((err, idx) => (
                        <div key={idx} style={{ color: '#cbd5e1' }}>
                          {err.field && <span style={{ color: '#f87171', fontWeight: 600 }}>{err.field}:</span>} {err.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>
                      (показать {Math.min(props.errors.length, 3)} из {props.errors.length})
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Простой формат
            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>
              {props.text}
            </div>
          )}
        </div>

        {/* Кнопка закрытия */}
        <button
          type="button"
          data-bs-dismiss="toast"
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
            fontSize: 14,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </motion.div>
  );
}

export default MessageToast;