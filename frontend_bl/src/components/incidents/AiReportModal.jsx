import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/UIComponents"; // Проверь путь к UIComponents

// === ВСПОМОГАТЕЛЬНЫЕ МИКРО-КОМПОНЕНТЫ ДЛЯ ОТЧЁТА ===

const Section = ({ title, icon, color, children }) => (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: color, marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`fa-solid ${icon}`} /> {title}
        </div>
        {children}
    </div>
);

const BulletList = ({ items, color = '#cbd5e1' }) => (
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: color, lineHeight: 1.6 }}>
        {items.map((item, idx) => <li key={idx}>{item}</li>)}
    </ul>
);

const InfoRow = ({ label, value, color = '#e2e8f0' }) => (
    <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: color, lineHeight: 1.5 }}>{value}</div>
    </div>
);

// === ОСНОВНОЙ КОМПОНЕНТ МОДАЛЬНОГО ОКНА ===

export default function AiReportModal({ isOpen, onClose, aiResponse }) {
    if (!isOpen || !aiResponse) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 20, padding: 0, maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
                }}
            >
                {/* Шапка модалки */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(139,92,246,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#fff', fontSize: 18 }} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Полный отчёт ИИ-анализа</h3>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Агент: {aiResponse._meta?.used_ai_agent} • Затрачено: {aiResponse._meta?.time_spent}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, padding: 8 }}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* Тело модалки (скроллируемое) */}
                <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* ЛЕВАЯ КОЛОНКА */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Section title="Итоговый вывод" icon="fa-file-lines" color="#a78bfa">
                            <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiResponse.final_report}</div>
                        </Section>
                        <Section title="Оценка ситуации" icon="fa-gauge-high" color="#3b82f6">
                            <InfoRow label="Уверенность ИИ" value={aiResponse.ai_confidence_score} color="#60a5fa" />
                            <InfoRow label="Сложность решения" value={aiResponse.decision_complexity} color="#60a5fa" />
                            <InfoRow label="Проверяемость" value={aiResponse.verifiability_score} color="#60a5fa" />
                            <InfoRow label="Рекомендуемое действие" value={aiResponse.recommended_moderator_action} color="#60a5fa" />
                        </Section>
                        <Section title="Доказательная база" icon="fa-magnifying-glass-chart" color="#10b981">
                            <InfoRow label="Соответствие claims" value={aiResponse.claim_evidence_match} color="#34d399" />
                            {aiResponse.key_evidence_anchor && <InfoRow label="Ключевое доказательство" value={aiResponse.key_evidence_anchor} color="#34d399" />}
                            {aiResponse.strongest_defense_point && <InfoRow label="Сильнейший аргумент защиты" value={aiResponse.strongest_defense_point} color="#fbbf24" />}
                            {aiResponse.image_tampering_suspicion?.length > 0 && <BulletList items={aiResponse.image_tampering_suspicion.map(x => ` ${x}`)} color="#f87171" />}
                        </Section>
                        <Section title="Поведение сторон" icon="fa-users-rectangle" color="#f59e0b">
                            <InfoRow label="Тональность пользователя" value={aiResponse.user_sentiment} color="#fbbf24" />
                            <InfoRow label="Кооперация" value={aiResponse.user_cooperation_level} color="#fbbf24" />
                            <InfoRow label="Качество коммуникации сотрудника" value={aiResponse.employee_communication_quality} color="#fbbf24" />
                            {aiResponse.manipulation_tactics?.length > 0 && <BulletList items={aiResponse.manipulation_tactics.map(x => `🎭 ${x}`)} color="#fbbf24" />}
                            {aiResponse.fraud_indicators?.length > 0 && <BulletList items={aiResponse.fraud_indicators.map(x => `🚩 ${x}`)} color="#f87171" />}
                        </Section>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Section title="Факты и противоречия" icon="fa-scale-balanced" color="#8b5cf6">
                            {aiResponse.objective_facts_only?.length > 0 && <BulletList items={aiResponse.objective_facts_only.map(x => ` ${x}`)} color="#cbd5e1" />}
                            {aiResponse.evidence_contradictions?.length > 0 && <BulletList items={aiResponse.evidence_contradictions.map(x => ` ${x}`)} color="#f87171" />}
                            {aiResponse.timeline_inconsistencies?.length > 0 && <BulletList items={aiResponse.timeline_inconsistencies.map(x => `⏱️ ${x}`)} color="#fbbf24" />}
                            {aiResponse.blind_spots?.length > 0 && <BulletList items={aiResponse.blind_spots.map(x => `❓ ${x}`)} color="#fbbf24" />}
                        </Section>
                        <Section title="Системные выводы" icon="fa-gears" color="#06b6d4">
                            <InfoRow label="Тип прецедента" value={aiResponse.precedent_category || '—'} />
                            {aiResponse.platform_process_flaw && aiResponse.platform_process_flaw !== "Нет" && <InfoRow label="Ошибка платформы" value={aiResponse.platform_process_flaw} color="#f87171" />}
                            {aiResponse.pvz_training_need && aiResponse.pvz_training_need !== "Нет" && <InfoRow label="Обучение ПВЗ" value={aiResponse.pvz_training_need} color="#fbbf24" />}
                            {aiResponse.pre_closure_checklist?.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>Чек-лист перед закрытием:</div>
                                    <BulletList items={aiResponse.pre_closure_checklist.map(x => `▢ ${x}`)} color="#22c55e" />
                                </div>
                            )}
                        </Section>
                        <Section title="Готовый ответ пользователю" icon="fa-reply" color="#22c55e">
                            <div style={{
                                background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 8,
                                fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                border: '1px solid rgba(34,197,94,0.2)'
                            }}>
                                {aiResponse.suggested_neutral_reply}
                            </div>
                        </Section>
                        {aiResponse.pii_detected && (
                            <div style={{ padding: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-user-shield" /> Обнаружены ПДН в исходных данных
                                </div>
                                <div style={{ fontSize: 12, color: '#fca5a5' }}>
                                    Типы: {aiResponse.pii_types?.join(', ') || 'неуказанные'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Футер модалки */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" icon="fa-solid fa-xmark" onClick={onClose}>Закрыть отчёт</Button>
                </div>
            </motion.div>
        </motion.div>
    );
}