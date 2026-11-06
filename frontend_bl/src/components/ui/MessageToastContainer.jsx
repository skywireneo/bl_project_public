import React from "react";
import { useToast } from "../../context/ToastContext";
import MessageToast from "./MessageToast";
import { AnimatePresence } from "framer-motion";

function MessageToastContainer() {
    const { messages } = useToast();

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            pointerEvents: 'none'
        }}>
            <AnimatePresence>
                {messages.map(msg => (
                    <MessageToast
                        key={msg.id}
                        typeOf={msg.type}
                        text={msg.text}
                        title={msg.title}
                        code={msg.code}
                        serviceCode={msg.serviceCode}
                        errors={msg.errors}
                        additionalData={msg.additionalData}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

export default MessageToastContainer;