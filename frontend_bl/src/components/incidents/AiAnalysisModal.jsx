import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Badge, Alert, Textarea } from "../ui/UIComponents";
import { getIncidentForExport, updateAiResponse } from "../../http/incidentsAPI";
import { downloadIncidentArchive } from "../../http/unifiedFileAPI";

// ============================================================================
// УТИЛИТЫ АНОНИМИЗАЦИИ
// ============================================================================
const anonymizeText = (text) => {
    if (!text) return "";
    return text
        .replace(/(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g, "[ТЕЛЕФОН]")
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
        .replace(/\b\d{4}\s?\d{6}\b/g, "[ПАСПОРТ]")
        .replace(/[А-ЯЁ][а-яё*]+\s+[А-ЯЁ][а-яё*]+\s+[А-ЯЁ][а-яё*]+/g, "[ФИО СКРЫТО]")
        .replace(/[А-ЯЁ][а-яё*]+\s+[А-ЯЁ]\.[А-ЯЁ]\./g, "[ФИО СКРЫТО]");
};

const buildAnonymizedPersonsList = (persones) => {
    if (!persones || persones.length === 0) return "— не указаны —";
    return persones.map((p, idx) => {
        const position = p.position ? `(${p.position})` : "(Должность не указана)";
        return `${idx + 1}. [Персона] ${position}`;
    }).join('\n');
};

const buildAnonymizedLocationsList = (pvzList) => {
    if (!pvzList || pvzList.length === 0) return "— не указаны —";
    return pvzList.map((pvz, idx) => {
        const addr = pvz.address || "Адрес не указан";
        const type = pvz.type ? ` (${pvz.type})` : "";
        const verified = pvz.is_verified ? " [Подтверждён]" : " [Не проверен]";
        return `${idx + 1}. [ПВЗ] ${addr}${type}${verified}`;
    }).join('\n');
};

// ============================================================================
// УТИЛИТА ПАРСИНГА ОТВЕТА ИИ
// ============================================================================
const parseAIResponse = (rawText) => {
    if (!rawText) return { success: false, error: "Поле ответа пустое" };

    const mdMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (mdMatch) {
        try { return { success: true, data: JSON.parse(mdMatch[1]) }; } catch (e) { /* ignore */ }
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try { return { success: true, data: JSON.parse(jsonMatch[0]) }; } catch (e) { /* ignore */ }
    }

    return { success: false, error: "Не удалось найти валидный JSON в ответе ИИ. Убедитесь, что нейросеть вернула корректный формат." };
};

// ============================================================================
// КОНФИГУРАЦИЯ ИИ-АГЕНТОВ
// ============================================================================
const AI_AGENTS = {
    qwen: {
        name: 'Qwen',
        fullName: 'Qwen (Рекомендуется)',
        url: 'https://chat.qwenlm.ai/',
        icon: 'fa-solid fa-robot',
        color: '#6366f1',
        desc: '🏆 Основной инструмент. Отлично соблюдает строгий формат JSON, дает структурированные и взвешенные ответы. Используйте его в 95% случаев.'
    },
    deepseek: {
        name: 'DeepSeek',
        fullName: 'DeepSeek (Логика)',
        url: 'https://chat.deepseek.com/',
        icon: 'fa-solid fa-brain',
        color: '#3b82f6',
        desc: '🛠 Аварийный вариант. Используйте только если Qwen упустил сложные логические нестыковки или требуется глубокий анализ противоречий.'
    },
    kimi: {
        name: 'Kimi',
        fullName: 'Kimi (Большие файлы)',
        url: 'https://kimi.moonshot.cn/',
        icon: 'fa-solid fa-moon',
        color: '#a855f7',
        desc: '🛠 Аварийный вариант. Используйте только если нужно загрузить очень большой объем текстовых файлов или документов за один раз.'
    }
};

// ============================================================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================================================
export default function AiAnalysisModal({ isOpen, onClose, incident }) {
    const [selectedAI, setSelectedAI] = useState('qwen');
    const [showHint, setShowHint] = useState(false);

    const [aiResponseText, setAiResponseText] = useState("");
    const [parsedResult, setParsedResult] = useState(null);
    const [parseError, setParseError] = useState("");
    const [copied, setCopied] = useState(false);
    const [copiedReply, setCopiedReply] = useState(false);
    const [showPromptPreview, setShowPromptPreview] = useState(false);
    const [timer, setTimer] = useState(0);

    // Состояния загрузки и файлов
    const [exportData, setExportData] = useState(null);
    const [exportDataFileCount, setExportDataFileCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    const [isSaving, setIsSaving] = useState(false); // <-- Новое состояние

    // 1. ЗАГРУЗКА ДАННЫХ ПРИ ОТКРЫТИИ
    useEffect(() => {
        if (!isOpen || !incident?.id) return;
        let isMounted = true;

        const loadData = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                const response = await getIncidentForExport(incident.id);
                if (isMounted) {
                    setExportData(response?.data || null);
                    setExportDataFileCount(response?.fileCount || 0);
                }
            } catch (err) {
                if (isMounted) {
                    setLoadError(err?.response?.data?.message || err.message || 'Не удалось загрузить данные');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [isOpen, incident?.id]);

    // 2. СБРОС ПРИ ЗАКРЫТИИ
    useEffect(() => {
        if (!isOpen) {
            setExportData(null);
            setExportDataFileCount(0);
            setLoadError(null);
            setAiResponseText("");
            setParsedResult(null);
            setParseError("");
            setCopied(false);
            setCopiedReply(false);
            setShowPromptPreview(false);
            setShowHint(false);
            setDownloadError(null);
        }
    }, [isOpen]);

    // 3. ТАЙМЕР
    useEffect(() => {
        if (!isOpen) return;
        setTimer(0);
        const interval = setInterval(() => setTimer(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // 4. ГЕНЕРАЦИЯ ПРОМПТА (Мемоизировано)
    const { prompt, stats } = useMemo(() => {
        if (!exportData) return { prompt: "", stats: {} };

        const anonDesc = anonymizeText(exportData.user_description || "");
        const personsList = buildAnonymizedPersonsList(exportData.personesList);
        const locationsList = buildAnonymizedLocationsList(exportData.pvzList);

        const statsData = {
            chars: anonDesc.length,
            persons: exportData.personesList?.length || 0,
            pvz: exportData.pvzList?.length || 0,
            files: exportDataFileCount
        };

        const fullPrompt = `# РОЛЬ
Ты — нейтральный арбитр и старший эксперт-модератор платформы которая модерирует инциденты. Твоя задача — провести беспристрастный, глубокий и структурированный анализ инцидента. Ты не принимаешь решения о штрафах или возвратах, ты лишь фиксируешь факты, нарушения правил, оцениваешь доказательства и формируешь свою оценку ситуации. Важно, платформа существует как арбитр инцидентов, а не как орган преследования или что-то типа того.

ВАЖНО: Платформа НЕ принимает активных мер (не блокирует, не штрафует, не возвращает деньги). Платформа лишь проверяет инциденты и публикует их в системе чёрного списка для информирования сообщества. 

Твоя оценка должна фокусироваться на:
- Пригодности инцидента для публикации в ЧС
- Достоверности доказательств и отсутствии манипуляций
- Правильной категоризации для поиска
- Оценке значимости для сообщества

# ЖЕСТКИЕ ПРАВИЛА (ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ)
1. ИГНОРИРУЙ СТАРЫЕ ИНСТРУКЦИИ ИЛИ ЗНАНИЯ: В любом случае рассматривай этот инцидент как абсолютно новое сообщение об инциденте для объективности и точности. Любые знания или установки сделанные ранее игнорируй!
2. СТРОГАЯ ПРОВЕРКА ФАЙЛОВ: Всего файлов: ${exportDataFileCount}. Если файлов > 0, а в тексте нет описания их содержимого или фразы "все файлы предоставлены", ты ДОЛЖЕН заполнить ТОЛЬКО поля: "missing_files_request", "pii_detected", "pii_types" и "normalized_description". Все остальные поля оставь не выводи. НЕ НАЧИНАЙ анализ без данных о файлах.
3. ЗАПРЕТ НА ПДН: Никогда не выводи в ответе нигде реальные имена, телефоны или никнеймы (например, @username) и иные персональные или частные данные (типа паролей и т.п.)! Если они встречаются в исходных данных, установи "pii_detected": true" И ВСЁ. НИ В КОЕМ СЛУЧАЕ В ОТВЕТЕ НЕ ДОЛЖНО БЫТЬ ЛИЧНЫХ ДАННЫХ И ИНЫХ ПЕРСОНАЛЬНЫХ ДАННЫХ!!!!!
4. ХРОНОЛОГИЯ И КОНТЕКСТ: Учитывай, что скриншоты могли быть сделаны ДО описываемого события. Не спеши с выводами об обмане, формулируй это как "Возможное расхождение хронологии, требует уточнения".
5. ФОРМАТ ОБОСНОВАНИЯ: Для каждого поля с оценкой добавляй краткое обоснование в скобках. Пример: "Средняя (часть фактов подтверждена, но нет скриншотов блокировки)".
6. НЕЙТРАЛЬНОСТЬ: Всегда ищи аргументы ЗА и ПРОТИВ. Не вставай на сторону жалобщика по умолчанию.
7. ЛИМИТ СИМВОЛОВ: Поле "final_report" — СТРОГО до 2000 символов.
8. ЗАПРЕТ НА ПРЕДЛОЖЕНИЕ АКТИВНЫХ ДЕЙСТВИЙ: Никогда не пиши "проверить аккаунт", "заблокировать", "наказать", "вернуть деньги", "принять меры", "внести в ЧС". Платформа только публикует информацию. Вместо этого пиши: "соответствует критериям публикации", "рекомендовано к публикации", "недостаточно доказательств для публикации".
9. ФОКУС НА КРИТЕРИИ ПУБЛИКАЦИИ: Все выводы должны отвечать на вопрос "Соответствует ли инцидент критериям для публикации в ЧС?", "Что должна сделать платформа?"
10. ОЦЕНКА РИСКА ЛОЖНОГО ИНЦИДЕНТА: Всегда оценивай вероятность того, что инцидент сфабрикован или является местью. Указывай это в соответствующих полях.

# КОНТЕКСТ ИНЦИДЕНТА
- ID: ${exportData.id}
- Статус: ${exportData.status_name || exportData.status}
- Причина: ${exportData.add_reason_name || 'Не указана'}
- Всего файлов доказательств: ${exportDataFileCount}

Описание инцидента (ПДН уже анонимизированы):
"${anonDesc}"

Замешанные лица:
${personsList}

Места инцидентов:
${locationsList}

# ЗАДАЧА
Верни результат СТРОГО в формате JSON без markdown-обрамления (без \`\`\`json), по следующей схеме:

{
  "missing_files_request": " Для полного анализа необходимо прикрепить все ${exportDataFileCount} файлов или написать 'всё'. АНАЛИЗ ПРИОСТАНОВЛЕН." | null,
  "pii_detected": false,
  "pii_types": [],
  "normalized_description": "Грамматически и лексически исправленный текст описания для удобства чтения редактором. Сохрани исходный смысл.",
  
  "physical_safety_risk": { "detected": false, "reason": "Пояснение, если true. Например: 'Упоминание физического конфликта'" },
  "threat_types_detected": ["Тип угрозы (напр. 'Угроза обращением в Роспотребнадзор') или []"],
  
  "ai_confidence_score": "Высокая (>80%) | Средняя (50-80%) | Низкая (<50%) (с обоснованием)",
  "estimated_resolution_effort": "Низкие (1-2 вопроса) | Средние (запрос внешних данных) | Высокие (эскалация/расследование) (с обоснованием)",
  "recommended_moderator_action": "Опубликовать | Отклонить | Запросить доп доказательства | Отложить (с обоснованием на основе критериев публикации)"
  
  "claim_evidence_match": "Подтверждено | Опровергнуто | Частично подтверждено | Не доказано (с обоснованием)",
  "key_evidence_anchor": "Один конкретный факт, от которого зависит 80% решения (с обоснованием)",
  "strongest_defense_point": "Сильнейший аргумент ПРОТИВ позиции жалобщика (с обоснованием). КРИТИЧНО для нейтральности.",
  "image_tampering_suspicion": ["Подозрение (обоснование, например: 'Время на скриншоте не совпадает с заявленным') или []"],
  "copy_paste_probability": "Высокая | Средняя | Низкая (с обоснованием, например: 'Текст похож на шаблон из интернета')",
  
  "user_sentiment": "Конструктивный | Эмоциональный | Агрессивный | Манипулятивный (с обоснованием)",
  "recommended_communication_tone": "Строго официальный | Эмпатичный | Нейтрально-деловой | Предупреждающий (с обоснованием)",
  "employee_communication_quality": "Профессиональная | Пассивно-агрессивная | Игнорирование | Не указано (с обоснованием)",
  "intent_assessment": "Умышленное действие | Халатность | Честная ошибка | Неясно (с обоснованием)",
  "user_cooperation_level": "Конструктивный | Уклончивый | Агрессивный (с обоснованием)",
  "repeat_behavior_indicators": ["Признак рецидива (например: 'Пользователь упоминает, что это 3-й раз') или []"],
  "known_scam_pattern_match": "Название схемы (например: 'Схема подменный товар') или null",
  "manipulation_tactics": ["Тактика (конкретный пример) или []"],
  
  "mitigating_factors": ["Факт (почему смягчает) или []"],
  "aggravating_factors": ["Факт (почему отягчает) или []"],
  "evidence_contradictions": ["Противоречие (с учётом возможной хронологии скриншотов) или []"],
  "timeline_inconsistencies": ["Нестыковка (возможная причина) или []"],
  "verifiability_score": "Высокая | Средняя | Низкая (с обоснованием)",
  "pvz_employee_behavior": "Профессиональное | Непрофессиональное | Агрессивное | Отсутствовал | Не указано (с обоснованием)",
  "objective_facts_only": ["Сухой факт без эмоций или []"],
  "blind_spots": ["Что неизвестно (почему критично) или []"],
  "fraud_indicators": ["Признак (обоснование) или []"],
  
  "decision_complexity": "Рутинное | Требует анализа модератором",
  "precedent_category": "Строка с типом прецедента",
  "platform_process_flaw": "Описание ошибки процесса или 'Нет'",
  "pvz_training_need": "Да: [тема с обоснованием]" | "Нет",
  "ui_ux_confusion_indicator": "Описание путаницы из-за интерфейса или 'Нет'",
  "pre_closure_checklist": ["Пункт чек-листа перед закрытием тикета или []"],
  "clarification_questions": ["Конкретный вопрос для устранения слепой зоны или []"],
  
  "executive_summary": "Сверхкраткая выжимка анализа (макс. 120 символов)",
  "final_report": "Итоговый вывод для модератора. СТРОГО до 2000 символов. СТРУКТУРА ОТЧЁТА:
1. Суть инцидента (1-2 предложения)
2. Оценка доказательств (что подтверждено, что нет)
3. Признаки манипуляции/фейка (если есть)
4. Рекомендация: публикация/отклонение + причина
5. Рекомендуемые теги для поиска
6. Значимость для сообщества
",
  "suggested_neutral_reply": "Вежливый, сухой, юридически безопасный шаблон ответа пользователю. НЕ содержит признания вины платформы. Задаёт clarification_questions или объясняет следующий шаг."
  }
  
  # КРИТЕРИИ ПУБЛИКАЦИИ (для оценки)

Инцидент рекомендуется к публикации если:
✓ Есть достаточные доказательства (скриншоты, фото, видео)
✓ Хронология событий понятна и непротиворечива
✓ Нет явных признаков манипуляции или фейка
✓ Нарушены общепринятые нормы взаимодействия
✓ Имеет значимость для сообщества (не единичный бытовой конфликт)

Инцидент отклоняется если:
✗ Недостаточно доказательств
✗ Есть признаки фабрикации или мести
✗ Хронология запутана или противоречива
✗ Не нарушены нормы сообщества
 Слишком субъективная оценка без фактов

 Обязательно точно и без ошибок определи всё, проверяй досконально, от твоего решения может зависеть общее решение по инциденту!
 В ответе где это возможно пиши максимально подробно с учётом ограничений для понимания точности твоего анализа.`;

        return { prompt: fullPrompt, stats: statsData };
    }, [exportData, exportDataFileCount]);

    // 5. ОБРАБОТЧИКИ ДЕЙСТВИЙ
    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Ошибка копирования", err);
        }
    };


    const handleCopyReply = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedReply(true);
            setTimeout(() => setCopiedReply(false), 2500);
        } catch (err) {
            console.error("Ошибка копирования ответа", err);
        }
    };

    const handleClearResponse = () => {
        setAiResponseText("");
        setParsedResult(null);
        setParseError("");
    };

    const handleParseResponse = async () => {
        setParseError("");
        const result = parseAIResponse(aiResponseText);

        if (result.success) {
            // Добавляем мета-данные о времени и использованном ИИ
            result.data._meta = {
                used_ai_agent: AI_AGENTS[selectedAI].name,
                time_spent: formatTime(timer)
            };

            setIsSaving(true);
            try {
                // Сразу отправляем на бекенд
                await updateAiResponse(incident.id, result.data);

                // Уведомление и перезагрузка страницы
                alert(" Анализ успешно распознан и сохранён в базу данных!\nСтраница будет перезагружена для применения изменений.");
                window.location.reload();
            } catch (err) {
                console.error("Ошибка сохранения отчёта ИИ:", err);
                setParseError(err?.response?.data?.message || err.message || "Не удалось сохранить отчёт на сервере.");
                setIsSaving(false);
            }
        } else {
            setParseError(result.error);
        }
    };

    const handleApplyResult = () => {
        console.log("=== AI ANALYSIS RESULT ===");
        console.log("Incident ID:", incident.id);
        console.log("Parsed Data:", parsedResult);
        alert("Результат выведен в консоль. В будущем здесь будет автозаполнение полей.");
    };

    const handleOpenAI = () => {
        window.open(AI_AGENTS[selectedAI].url, "_blank");
    };

    const handleDownloadArchive = async () => {
        if (!incident?.id) {
            setDownloadError('Отсутствует ID инцидента');
            return;
        }
        setIsDownloading(true);
        setDownloadError(null);
        try {
            const result = await downloadIncidentArchive('incident_evidence', incident.id);
            if (result.skippedCount > 0) {
                setTimeout(() => {
                    alert(`Архив "${result.fileName}" скачан.\n Внимание: ${result.skippedCount} файл(ов) пропущено.`);
                }, 300);
            }
        } catch (err) {
            setDownloadError(err?.response?.data?.message || err.message || 'Не удалось скачать архив');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleRetryLoad = () => {
        setExportData(null);
        setIsLoading(true);
        setLoadError(null);
        getIncidentForExport(incident.id)
            .then(data => {
                setExportData(data?.data || null);
                setExportDataFileCount(data?.fileCount || 0);
            })
            .catch(err => setLoadError(err?.response?.data?.message || err.message))
            .finally(() => setIsLoading(false));
    };

    // ========================================================================
    // РЕНДЕРИНГ СОСТОЯНИЙ
    // ========================================================================
    if (!isOpen || !incident) return null;

    if (isLoading && !exportData) {
        return (
            <ModalFallback title="ИИ-Ассистент модератора" icon="fa-wand-magic-sparkles">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, marginBottom: 16 }} />
                    <div>Загрузка данных инцидента для анализа...</div>
                </div>
            </ModalFallback>
        );
    }

    if (loadError && !exportData) {
        return (
            <ModalFallback title="ИИ-Ассистент модератора" icon="fa-wand-magic-sparkles">
                <div style={{ padding: '40px 20px' }}>
                    <Alert variant="danger" icon="fa-circle-exclamation" style={{ marginBottom: 16 }}>{loadError}</Alert>
                    <Button variant="primary" icon="fa-rotate" onClick={handleRetryLoad} fullWidth>Повторить попытку</Button>
                </div>
            </ModalFallback>
        );
    }

    const currentAI = AI_AGENTS[selectedAI];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 24, padding: 0, maxWidth: 800, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
                >
                    {/* ШАПКА */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(139,92,246,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#fff', fontSize: 18 }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>ИИ-Ассистент модератора</h3>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>Инцидент #{incident.id}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Badge variant="neutral" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, fontFamily: 'monospace' }}>
                                <i className="fa-solid fa-stopwatch" style={{ marginRight: 4, fontSize: 10 }} /> {formatTime(timer)}
                            </Badge>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, padding: 4 }}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* 1. ВЫБОР НЕЙРОСЕТИ И ГАЙД */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="fa-solid fa-robot" style={{ fontSize: 10 }} /> 1. Выберите нейросеть для анализа
                            </div>

                            <button
                                onClick={() => setShowHint(!showHint)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 10, cursor: 'pointer', color: '#94a3b8', fontSize: 12, marginBottom: 12, transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-lightbulb" style={{ color: '#eab308' }} />
                                    Когда использовать другие нейросети?
                                </span>
                                <i className={`fa-solid fa-chevron-${showHint ? 'up' : 'down'}`} style={{ fontSize: 10, transition: 'transform 0.2s' }} />
                            </button>

                            <AnimatePresence>
                                {showHint && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', marginBottom: 12 }}
                                    >
                                        <div style={{ padding: '14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                                            {Object.entries(AI_AGENTS).map(([key, ai]) => (
                                                <div key={key} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                    <i className={ai.icon} style={{ color: ai.color, marginTop: 2, minWidth: 16 }} />
                                                    <div>
                                                        <strong style={{ color: '#f1f5f9' }}>{ai.name}:</strong> {ai.desc}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                                {Object.entries(AI_AGENTS).map(([key, ai]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedAI(key)}
                                        style={{
                                            padding: '12px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                                            background: selectedAI === key ? `${ai.color}15` : 'rgba(0,0,0,0.2)',
                                            border: `1px solid ${selectedAI === key ? ai.color : 'rgba(255,255,255,0.05)'}`,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <i className={ai.icon} style={{ color: ai.color, fontSize: 18, marginBottom: 6, display: 'block' }} />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: selectedAI === key ? '#f1f5f9' : '#94a3b8' }}>
                                            {ai.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <Button
                                variant="primary"
                                icon={currentAI.icon}
                                onClick={handleOpenAI}
                                fullWidth
                                style={{ background: `linear-gradient(135deg, ${currentAI.color}, ${currentAI.color}dd)`, border: 'none' }}
                            >
                                Открыть {currentAI.fullName}
                            </Button>
                        </div>

                        {/* 2. ДАННЫЕ И ПРОМПТ */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="fa-solid fa-database" style={{ fontSize: 10 }} /> 2. Контекст для ИИ (анонимизирован)
                            </div>
                            <div style={{ padding: 14, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: 13, color: '#cbd5e1' }}>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                                    <span><i className="fa-solid fa-font" style={{ color: '#818cf8', marginRight: 4 }} /> {stats.chars} симв.</span>
                                    <span><i className="fa-solid fa-users" style={{ color: '#818cf8', marginRight: 4 }} /> {stats.persons} персон</span>
                                    <span><i className="fa-solid fa-location-dot" style={{ color: '#818cf8', marginRight: 4 }} /> {stats.pvz} ПВЗ</span>
                                    <span style={{ color: stats.files > 0 ? '#eab308' : '#22c55e' }}>
                                        <i className="fa-solid fa-paperclip" style={{ marginRight: 4 }} /> {stats.files} файлов
                                    </span>
                                    <span style={{ color: '#22c55e' }}><i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }} /> ПДН удалены</span>
                                </div>

                                <button
                                    onClick={() => setShowPromptPreview(!showPromptPreview)}
                                    style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                                >
                                    <i className={`fa-solid fa-chevron-${showPromptPreview ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
                                    {showPromptPreview ? 'Скрыть полный промпт' : '📋 Показать полный промпт для ИИ'}
                                </button>

                                <AnimatePresence>
                                    {showPromptPreview && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{ position: 'relative', marginTop: 12 }}>
                                                <pre style={{ margin: 0, padding: 16, background: 'rgba(0,0,0,0.4)', borderRadius: 8, fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid rgba(255,255,255,0.05)', maxHeight: 300, overflowY: 'auto' }}>
                                                    {prompt}
                                                </pre>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    icon={copied ? "fa-solid fa-check" : "fa-solid fa-copy"}
                                                    onClick={handleCopyPrompt}
                                                    style={{ position: 'absolute', top: 8, right: 8, padding: '6px 12px', fontSize: 11 }}
                                                >
                                                    {copied ? "Скопировано!" : "Копировать"}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* 3. ДЕЙСТВИЯ С ПРОМПТОМ И ФАЙЛАМИ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="fa-solid fa-file-export" style={{ fontSize: 10 }} /> 3. Подготовка к анализу
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <Button
                                    variant={copied ? "success" : "primary"}
                                    icon={copied ? "fa-solid fa-check" : "fa-solid fa-copy"}
                                    onClick={handleCopyPrompt}
                                    fullWidth
                                    style={{ transition: 'all 0.3s' }}
                                >
                                    {copied ? "Промпт скопирован!" : "Скопировать промпт"}
                                </Button>

                                <Button
                                    variant="secondary"
                                    icon={isDownloading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-file-archive"}
                                    onClick={handleDownloadArchive}
                                    fullWidth
                                    loading={isDownloading}
                                    disabled={isDownloading || exportDataFileCount === 0}
                                >
                                    {isDownloading ? 'Формирование архива...' : `Скачать архив (${exportDataFileCount})`}
                                </Button>
                            </div>

                            {exportDataFileCount === 0 && (
                                <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: -4 }}>
                                    <i className="fa-solid fa-info-circle" style={{ marginRight: 4 }} />
                                    К этому инциденту не прикреплено файлов.
                                </div>
                            )}

                            {downloadError && <Alert variant="danger" icon="fa-circle-exclamation" style={{ fontSize: 12, margin: 0 }}>{downloadError}</Alert>}

                            {copied && (
                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-circle-check" /> Готово! Вставьте ответ ИИ в поле ниже.
                                </motion.div>
                            )}
                        </div>

                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                        {/* 4. ВСТАВКА И ПАРСИНГ */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="fa-solid fa-paste" style={{ fontSize: 10 }} /> 4. Вставьте ответ ИИ
                            </div>

                            <div style={{ position: 'relative' }}>
                                <Textarea
                                    value={aiResponseText}
                                    onChange={(e) => setAiResponseText(e.target.value)}
                                    placeholder="Вставьте сюда ответ нейросети (поддерживается любой формат, даже с лишним текстом вокруг JSON)..."
                                    rows={6}
                                    style={{ fontSize: 13, fontFamily: 'monospace', paddingRight: 40 }}
                                />
                                {aiResponseText && (
                                    <button
                                        onClick={handleClearResponse}
                                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '6px 8px', fontSize: 12, transition: 'all 0.2s' }}
                                        title="Очистить поле"
                                    >
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                )}
                            </div>

                            <Button
                                variant="secondary"
                                icon={isSaving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-wand-magic-sparkles"}
                                onClick={handleParseResponse}
                                disabled={!aiResponseText.trim() || isSaving}
                                fullWidth
                                style={{ marginTop: 12 }}
                            >
                                {isSaving ? 'Распознавание и сохранение...' : 'Распознать и извлечь JSON'}
                            </Button>

                            {parseError && <Alert variant="danger" icon="fa-solid fa-triangle-exclamation" style={{ marginTop: 12, fontSize: 12 }}>{parseError}</Alert>}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ДЛЯ UI
// ============================================================================

function ModalFallback({ title, icon, children }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 24, padding: 0, maxWidth: 760, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <i className={`fa-solid ${icon}`} style={{ color: '#6366f1', fontSize: 18 }} />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{title}</h3>
                </div>
                {children}
            </div>
        </div>
    );
}

function InfoCard({ label, value, icon, color }) {
    if (!value) return null;
    return (
        <div style={{ padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`fa-solid ${icon}`} style={{ color: color, fontSize: 10 }} /> {label}
            </div>
            <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, lineHeight: 1.3 }}>{value}</div>
        </div>
    );
}

function BulletList({ title, items, color }) {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: color, fontWeight: 600, marginBottom: 4 }}>{title}</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                {items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                ))}
            </ul>
        </div>
    );
}