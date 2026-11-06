// src/components/notifications/NotificationToastContainer.jsx
import React, { useContext } from "react";
import { observer } from "mobx-react-lite";
import { Context } from "../..";
import { AnimatePresence } from "framer-motion";
import NotificationToast from "./NotificationToast";

const NotificationToastContainer = observer(() => {
    const { notification } = useContext(Context);

    if (!notification.toasts || notification.toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'none'
        }}>
            <AnimatePresence>
                {notification.toasts.map(toast => (
                    <div key={toast.id} style={{ pointerEvents: 'auto' }}>
                        <NotificationToast toast={toast} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
});

export default NotificationToastContainer;