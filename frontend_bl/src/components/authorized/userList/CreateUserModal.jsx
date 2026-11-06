import React, { useState, useEffect } from 'react';
import { Modal, Button, FormField, Input } from '../../ui/UIComponents'; // Проверьте путь
import { createUser } from '../../../http/userAPI';

function CreateUserModal({ isOpen, onClose, onUserCreated }) {
    const [formData, setFormData] = useState({
        login: '',
        pass: '',
        confirmPass: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Регулярное выражение для пароля:
    // 8-40 символов, минимум 1 строчная, 1 заглавная, 1 цифра, 1 спецсимвол
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,40}$/;

    // Проверка отдельных условий для красивого UI
    const passChecks = {
        length: formData.pass.length >= 8 && formData.pass.length <= 40,
        lower: /[a-z]/.test(formData.pass),
        upper: /[A-Z]/.test(formData.pass),
        digit: /\d/.test(formData.pass),
        special: /[^A-Za-z0-9]/.test(formData.pass),
    };
    const isPasswordValid = Object.values(passChecks).every(Boolean);

    // Сброс формы при открытии/закрытии
    useEffect(() => {
        if (!isOpen) {
            setFormData({ login: '', pass: '', confirmPass: '' });
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.login.trim()) {
            setError('Логин обязателен для заполнения');
            return;
        }
        if (formData.login.trim().length < 3) {
            setError('Логин должен содержать минимум 3 символа');
            return;
        }
        if (!isPasswordValid) {
            setError('Пароль не соответствует требованиям безопасности');
            return;
        }
        if (formData.pass !== formData.confirmPass) {
            setError('Пароли не совпадают');
            return;
        }

        setIsLoading(true);
        try {
            // Вызов реального API
            const response = await createUser({
                login: formData.login.trim(),
                pass: formData.pass
            });

            // Уведомляем родительский компонент об успехе
            onUserCreated(response);
            onClose();
        } catch (err) {
            console.error('Ошибка создания пользователя:', err);
            setError(err.response?.data?.message || 'Не удалось создать пользователя. Проверьте, не занят ли логин.');
        } finally {
            setIsLoading(false);
        }
    };

    // Компонент для галочки/крестика требования
    const CheckItem = ({ met, text }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: met ? '#4ade80' : '#94a3b8' }}>
            <i className={`fa-solid ${met ? 'fa-check-circle' : 'fa-circle'}`} />
            <span>{text}</span>
        </div>
    );

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title="Создание пользователя"
            size="md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                        Отмена
                    </Button>
                    <Button variant="success" icon="fa-check" onClick={handleSubmit} loading={isLoading}>
                        Создать
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-circle-exclamation" /> {error}
                        </div>
                    )}

                    <FormField label="Логин" required>
                        <Input
                            icon="fa-user"
                            placeholder="Введите логин (мин. 3 символа)"
                            value={formData.login}
                            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                            autoFocus
                        />
                    </FormField>

                    <FormField label="Пароль" required>
                        <Input
                            icon="fa-lock"
                            type="password"
                            placeholder="Введите надежный пароль"
                            value={formData.pass}
                            onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                        />
                    </FormField>

                    {/* Визуальный чек-лист требований к паролю */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <CheckItem met={passChecks.length} text="Длина от 8 до 40 символов" />
                        <CheckItem met={passChecks.lower} text="Строчная английская буква (a-z)" />
                        <CheckItem met={passChecks.upper} text="Заглавная английская буква (A-Z)" />
                        <CheckItem met={passChecks.digit} text="Цифра (0-9)" />
                        <CheckItem met={passChecks.special} text="Специальный символ (!@#$%^&* и др.)" />
                    </div>

                    <FormField label="Подтверждение пароля" required>
                        <Input
                            icon="fa-lock"
                            type="password"
                            placeholder="Повторите пароль"
                            value={formData.confirmPass}
                            onChange={(e) => setFormData({ ...formData, confirmPass: e.target.value })}
                        />
                    </FormField>
                </div>
            </form>
        </Modal>
    );
}

export default CreateUserModal;