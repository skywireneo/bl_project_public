// /context/ToastContext.js
import React, { createContext, useContext, useState } from "react";

// Константа времени автозакрытия тостов (в миллисекундах)
const TOAST_AUTO_CLOSE_TIMEOUT = 10000;

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [errorModal, setErrorModal] = useState(null);

    const showToast = (textOrData, type = 'info') => {
        const id = Date.now() + Math.random();

        // Поддержка старого формата (строка) и нового (объект)
        let toast;
        if (typeof textOrData === 'string') {
            // Старый формат: просто текст
            toast = { id, text: textOrData, type };
        } else {
            // Новый формат: объект с расширенной информацией
            toast = {
                id,
                title: textOrData.title,
                text: textOrData.message || textOrData.text,
                code: textOrData.code,
                serviceCode: textOrData.serviceCode,
                errors: textOrData.errors,
                additionalData: textOrData.additionalData,
                type: textOrData.type || type
            };
        }

        setMessages(prev => [...prev, toast]);

        setTimeout(() => {
            setMessages(prev => prev.filter(t => t.id !== id));
        }, TOAST_AUTO_CLOSE_TIMEOUT);
    };

    const showErrorModal = (errorData) => {
        setErrorModal(errorData);
    };

    const closeErrorModal = () => {
        setErrorModal(null);
    };

    return (
        <ToastContext.Provider value={{
            showToast,
            messages,
            showErrorModal,
            closeErrorModal,
            errorModal
        }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
