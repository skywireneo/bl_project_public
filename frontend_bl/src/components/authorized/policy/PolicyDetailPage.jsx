import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { getPDFPolicy, selectPolicy, updatePolicy, getPolicyVersions, getPolicyVersionDetail } from "../../../http/policyAPI";
import { Card, Badge, Button, Alert, Modal, FormField, Textarea } from "../../ui/UIComponents";
import { Context } from "../../..";

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'link'],
        ['clean']
    ],
};

function PolicyDetailPage() {
    const { type, version } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(Context);

    const isDev = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER'].includes(user?.user?.status);
    const isHistorical = !!version;

    const [editMode, setEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Данные политики
    const [policyText, setPolicyText] = useState('');
    const [initialText, setInitialText] = useState('');
    const [policyName, setPolicyName] = useState('');
    const [policyVersion, setPolicyVersion] = useState('');
    const [currentVersion, setCurrentVersion] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [changeComment, setChangeComment] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Модалка истории
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [versionsList, setVersionsList] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    // Табы и таймлайн для исторического режима
    const [activeTab, setActiveTab] = useState('diff');
    const [historicalData, setHistoricalData] = useState(null);
    const [timelineVersions, setTimelineVersions] = useState([]); // <-- Новое состояние для таймлайна

    const [confirmModal, setConfirmModal] = useState({ open: false, type: '', title: '', message: '' });

    useEffect(() => {
        if (isHistorical) {
            loadHistoricalVersion();
        } else {
            loadCurrentPolicy();
        }
    }, [type, version]);

    const loadCurrentPolicy = async () => {
        try {
            setIsLoading(true);
            const result = await selectPolicy(type);
            if (result === 'err' || !result || !result[0]) {
                navigate('/policies');
                return;
            }
            const policy = result[0];
            setPolicyText(policy.text || '');
            setInitialText(policy.text || '');
            setPolicyName(policy.name);
            setPolicyVersion(policy.version);
            setCurrentVersion(policy.version);
        } catch (e) {
            navigate('/policies');
        } finally {
            setIsLoading(false);
        }
    };

    const loadHistoricalVersion = async () => {
        try {
            setIsLoading(true);
            const data = await getPolicyVersionDetail(type, version);
            setHistoricalData(data);

            // Загружаем актуальную версию, чтобы получить имя политики и текущую версию для алерта
            const currentRes = await selectPolicy(type);
            if (currentRes && currentRes[0]) {
                setCurrentVersion(currentRes[0].version);
                // <-- ОБНОВЛЕНИЕ: Добавляем имя политики в скобках
                setPolicyName(`Архив: ${currentRes[0].name} (v${version})`);
            } else {
                setPolicyName(`Архив: Политика (v${version})`);
            }

            // <-- ОБНОВЛЕНИЕ: Загружаем последние 10 версий для таймлайна
            const versionsData = await getPolicyVersions(type);
            setTimelineVersions(versionsData ? versionsData.slice(0, 10) : []);

        } catch (e) {
            setError('Не удалось загрузить историческую версию');
            navigate('/policies');
        } finally {
            setIsLoading(false);
        }
    };

    const openHistoryModal = async () => {
        setShowHistoryModal(true);
        setLoadingVersions(true);
        try {
            const data = await getPolicyVersions(type);
            setVersionsList(data || []);
        } catch (e) {
            setError('Ошибка загрузки истории');
        } finally {
            setLoadingVersions(false);
        }
    };

    const downloadPDF = async () => {
        try {
            const response = await getPDFPolicy(type);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${policyName || 'policy'}_v${version || policyVersion}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Ошибка при загрузке PDF-файла');
        }
    };

    const handleSaveClick = (updateType) => {
        if (!policyText.trim()) { setError('Текст политики не может быть пустым'); return; }
        if (!changeComment.trim() || changeComment.length < 10) { setError('Комментарий к изменениям должен содержать минимум 10 символов'); return; }
        if (!isDirty) { setError('Текст не изменился'); return; }

        const titles = { micro: 'Незначительное изменение', minor: 'Значимое изменение', major: 'Глобальное изменение' };
        const messages = {
            micro: 'Незначительные правки (опечатки). Уведомления не будет.',
            minor: 'Значимые изменения. Пользователи получат уведомление в Telegram.',
            major: 'Глобальные изменения. Пользователи получат уведомление в Telegram.',
        };

        setError('');
        setConfirmModal({ open: true, type: updateType, title: titles[updateType], message: messages[updateType] });
    };

    const confirmSave = async () => {
        try {
            setIsLoading(true);
            const result = await updatePolicy(confirmModal.type, type, policyText, changeComment);
            setPolicyVersion(result[1]);
            setInitialText(policyText);
            setChangeComment('');
            setEditMode(false);
            setIsDirty(false);
            setSuccess(` Успешно сохранено! Новая версия: ${result[1]}`);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка при сохранении.');
        } finally {
            setIsLoading(false);
            setConfirmModal({ open: false });
        }
    };

    if (isLoading && !policyText && !historicalData) {
        return <div style={{ padding: 60, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#6366f1' }} /></div>;
    }

    // --- Рендеринг исторической версии с таймлайном ---
    if (isHistorical && historicalData) {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr minmax(300px, 380px)',
                gap: 20,
                alignItems: 'start'
            }}>
                {/* ЛЕВАЯ КОЛОНКА: Основной контент */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Alert variant="warning" icon="fa-solid fa-clock-rotate-left" title="Архивная версия">
                        Вы просматриваете политику версии <strong>v{version}</strong>. Актуальная версия: <strong>v{currentVersion}</strong>.
                        <Button variant="ghost" size="sm" style={{ marginLeft: 12, color: 'inherit' }} onClick={() => navigate(`/policies/${type}`)}>
                            Перейти к актуальной <i className="fa-solid fa-arrow-right" style={{ marginLeft: 4 }} />
                        </Button>
                    </Alert>

                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{policyName}</h1>
                                <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                                    Изменено: {new Date(historicalData.updated_at).toLocaleString('ru-RU')}
                                </div>
                            </div>
                            <Button variant="secondary" icon="fa-solid fa-arrow-left" onClick={() => navigate(`/policies/${type}`)}>К актуальной версии</Button>
                        </div>
                    </Card>

                    <Card>
                        {/* Табы */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                            {[
                                { id: 'diff', label: 'Изменения (Diff)', icon: 'fa-solid fa-code-compare' },
                                { id: 'new', label: `Текст версии (v${historicalData.new_version})`, icon: 'fa-solid fa-file-lines' },
                                { id: 'old', label: `Предыдущая версия (v${historicalData.old_version})`, icon: 'fa-solid fa-file-lines' }
                            ].map(tab => (
                                <Button
                                    key={tab.id}
                                    variant={activeTab === tab.id ? 'primary' : 'ghost'}
                                    size="sm"
                                    icon={tab.icon}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>

                        {/* Контент табов */}
                        {activeTab === 'diff' && (
                            <div
                                className="policy-content"
                                style={{ background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 12, overflowX: 'auto' }}
                                dangerouslySetInnerHTML={{ __html: historicalData.diff_html || '<p>Данные об изменениях отсутствуют</p>' }}
                            />
                        )}
                        {activeTab === 'new' && (
                            <div
                                className="policy-content"
                                style={{ color: '#e2e8f0', lineHeight: 1.8, fontSize: 15 }}
                                dangerouslySetInnerHTML={{ __html: historicalData.clear_new_version_text || '<p>Текст отсутствует</p>' }}
                            />
                        )}
                        {activeTab === 'old' && (
                            <div
                                className="policy-content"
                                style={{ color: '#e2e8f0', lineHeight: 1.8, fontSize: 15, opacity: 0.8 }}
                                dangerouslySetInnerHTML={{ __html: historicalData.clear_old_version_text || '<p>Текст отсутствует</p>' }}
                            />
                        )}
                    </Card>
                </div>

                {/* ПРАВАЯ КОЛОНКА: Таймлайн (Sticky) */}
                <div style={{ position: 'sticky', top: 20 }}>
                    <Card padding={20}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className="fa-solid fa-timeline" style={{ color: '#6366f1' }} /> История версий
                        </h3>

                        <div style={{ position: 'relative', paddingLeft: 24 }}>
                            {/* Вертикальная линия таймлайна */}
                            <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'rgba(99,102,241,0.2)', borderRadius: 1 }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {timelineVersions.map((v, idx) => {
                                    const isCurrentViewed = v.new_version === version;
                                    return (
                                        <div
                                            key={v.id || idx}
                                            onClick={() => {
                                                if (!isCurrentViewed) navigate(`/policies/${type}/v/${v.new_version}`);
                                            }}
                                            style={{
                                                position: 'relative',
                                                cursor: isCurrentViewed ? 'default' : 'pointer',
                                                opacity: isCurrentViewed ? 1 : 0.7,
                                                transition: 'opacity 0.2s'
                                            }}
                                            onMouseEnter={e => { if (!isCurrentViewed) e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={e => { if (!isCurrentViewed) e.currentTarget.style.opacity = '0.7'; }}
                                        >
                                            {/* Точка на таймлайне */}
                                            <div style={{
                                                position: 'absolute', left: -24, top: 4, width: 16, height: 16, borderRadius: '50%',
                                                background: isCurrentViewed ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1e2030',
                                                border: `2px solid ${isCurrentViewed ? '#6366f1' : 'rgba(99,102,241,0.3)'}`,
                                                zIndex: 2
                                            }} />

                                            {/* Карточка версии */}
                                            <div style={{
                                                background: isCurrentViewed ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)',
                                                border: `1px solid ${isCurrentViewed ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                borderRadius: 10, padding: 12, transition: 'all 0.2s'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <Badge variant={isCurrentViewed ? 'info' : 'default'} icon="fa-solid fa-code-branch">
                                                        v{v.new_version}
                                                    </Badge>
                                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                                        {new Date(v.updated_at).toLocaleDateString('ru-RU')}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4, marginBottom: 4 }}>
                                                    {v.change || 'Без комментария'}
                                                </div>

                                                {!isCurrentViewed ? (
                                                    <div style={{ fontSize: 11, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                        <i className="fa-solid fa-eye" /> Посмотреть
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                        <i className="fa-solid fa-check-circle" /> Просматривается
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {timelineVersions.length === 0 && (
                                    <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                                        История пуста
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // --- Рендеринг текущей (актуальной) версии ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{policyName}</h1>
                            <Badge variant="info" icon="fa-solid fa-code-branch">Версия {policyVersion}</Badge>
                        </div>
                        {isDev && (<div style={{ fontSize: 13, color: '#64748b' }}>
                            Идентификатор: <strong style={{ color: '#94a3b8' }}>{type}</strong>
                        </div>)}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Button variant="secondary" icon="fa-solid fa-clock-rotate-left" onClick={openHistoryModal}>История версий</Button>
                        <Button variant="secondary" icon="fa-solid fa-file-pdf" onClick={downloadPDF}>Скачать PDF</Button>
                        {isDev && !editMode && (
                            <Button variant="success" icon="fa-solid fa-pen" onClick={() => setEditMode(true)}>Редактировать</Button>
                        )}
                    </div>
                </div>
            </Card>

            {error && <Alert variant="error" onClose={() => setError('')} title="Ошибка">{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

            {editMode ? (
                <>
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className="fa-solid fa-pen-to-square" style={{ color: '#6366f1' }} /> Редактирование текста
                        </h3>
                        <div style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <ReactQuill
                                theme="snow"
                                value={policyText}
                                onChange={(html) => { setPolicyText(html); setIsDirty(html !== initialText); }}
                                modules={quillModules}
                                style={{ background: '#fff', color: '#000' }}
                            />
                        </div>
                    </Card>

                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className="fa-solid fa-comment-dots" style={{ color: '#6366f1' }} /> Комментарий к изменениям
                        </h3>
                        <FormField required hint="Минимум 10 символов. Будет сохранен в истории версий">
                            <Textarea
                                placeholder="Опишите, что и зачем вы изменили..."
                                value={changeComment}
                                onChange={(e) => setChangeComment(e.target.value)}
                                maxLength={500}
                            />
                        </FormField>
                    </Card>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button variant="secondary" icon="fa-solid fa-xmark" onClick={() => {
                            setEditMode(false); setPolicyText(initialText); setChangeComment(''); setIsDirty(false); setError('');
                        }}>Отмена</Button>
                        <Button variant="secondary" icon="fa-solid fa-pen" disabled={!isDirty} onClick={() => handleSaveClick('micro')}>Незначительное</Button>
                        <Button variant="warning" icon="fa-solid fa-pen-to-square" disabled={!isDirty} onClick={() => handleSaveClick('minor')}>Значимое</Button>
                        <Button variant="danger" icon="fa-solid fa-gavel" disabled={!isDirty} onClick={() => handleSaveClick('major')}>Глобальное</Button>
                    </div>
                </>
            ) : (
                <Card>
                    <div
                        className="policy-content"
                        style={{ color: '#e2e8f0', lineHeight: 1.8, fontSize: 15 }}
                        dangerouslySetInnerHTML={{ __html: policyText || '<p style="color:#64748b">Текст политики отсутствует.</p>' }}
                    />
                </Card>
            )}

            {/* Модалка подтверждения сохранения */}
            <Modal
                open={confirmModal.open}
                onClose={() => !isLoading && setConfirmModal({ open: false })}
                title={confirmModal.title}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setConfirmModal({ open: false })} disabled={isLoading}>Отмена</Button>
                        <Button variant="success" onClick={confirmSave} loading={isLoading} icon="fa-check">Подтвердить</Button>
                    </>
                }
            >
                <Alert variant="warning" icon="fa-solid fa-triangle-exclamation">{confirmModal.message}</Alert>
            </Modal>

            {/* Модалка истории версий */}
            <Modal
                open={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title={`История версий: ${policyName}`}
                size="lg"
            >
                {loadingVersions ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, color: '#6366f1' }} />
                    </div>
                ) : versionsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>История изменений пока пуста</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {versionsList.map((v, idx) => (
                            <div
                                key={v.id}
                                onClick={() => { setShowHistoryModal(false); navigate(`/policies/${type}/v/${v.new_version}`); }}
                                style={{
                                    background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16,
                                    border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Badge variant="info" icon="fa-solid fa-code-branch">v{v.new_version}</Badge>
                                        <span style={{ fontSize: 12, color: '#64748b' }}>← v{v.old_version}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(v.updated_at).toLocaleString('ru-RU')}</span>
                                </div>
                                <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                                    {v.change || 'Без комментария'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default PolicyDetailPage;