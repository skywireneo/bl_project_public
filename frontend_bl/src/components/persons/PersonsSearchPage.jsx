// // src/components/persons/PersonsSearchPage.jsx
// import React, { useState, useEffect, useMemo } from "react";
// // import { getPersons, searchPersons } from "../../http/mock/personsAPI";

// function PersonsSearchPage() {
//     const [search, setSearch] = useState("");
//     const [results, setResults] = useState([]);
//     const [selected, setSelected] = useState(null);
//     const [isLoading, setIsLoading] = useState(false);

//     // Инициализация при загрузке
//     // useEffect(() => {
//     //     setResults(getPersons());
//     // }, []);

//     // Поиск с задержкой (debounce)
//     useEffect(() => {
//         setIsLoading(true);
//         const timer = setTimeout(async () => {
//             const found = await searchPersons(search);
//             setResults(found);
//             setIsLoading(false);
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [search]);

//     const getRiskBadge = (riskLevel, incidentsCount) => {
//         if (incidentsCount === 0) return { variant: 'success', label: 'Чистая', icon: 'fa-circle-check', color: '#10b981' };
//         if (riskLevel === 'critical') return { variant: 'danger', label: 'Критический', icon: 'fa-skull-crossbones', color: '#ef4444' };
//         if (riskLevel === 'high') return { variant: 'danger', label: 'Высокий', icon: 'fa-triangle-exclamation', color: '#f87171' };
//         return { variant: 'warning', label: 'Средний', icon: 'fa-circle-exclamation', color: '#f59e0b' };
//     };

//     return (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
//             {/* Поле поиска */}
//             <div style={{
//                 background: 'rgba(30, 32, 48, 0.6)',
//                 borderRadius: 12,
//                 padding: 16,
//                 border: '1px solid rgba(255,255,255,0.06)'
//             }}>
//                 <div style={{ position: 'relative' }}>
//                     <i className="fa-solid fa-magnifying-glass" style={{
//                         position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 16
//                     }} />
//                     <input
//                         type="text"
//                         placeholder="Поиск по ФИО, телефону, email или Telegram..."
//                         value={search}
//                         onChange={(e) => setSearch(e.target.value)}
//                         style={{
//                             width: '100%',
//                             padding: '14px 14px 14px 44px',
//                             background: 'rgba(0,0,0,0.3)',
//                             border: '1px solid rgba(255,255,255,0.1)',
//                             borderRadius: 10,
//                             color: '#e2e8f0',
//                             fontSize: 15,
//                             outline: 'none',
//                             boxSizing: 'border-box'
//                         }}
//                     />
//                     {isLoading && (
//                         <i className="fa-solid fa-spinner fa-spin" style={{
//                             position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1'
//                         }} />
//                     )}
//                 </div>
//             </div>

//             {/* Основной контент: Список + Детали */}
//             <div style={{
//                 display: 'grid',
//                 gridTemplateColumns: selected ? 'minmax(0, 1fr) minmax(340px, 1fr)' : '1fr',
//                 gap: 20,
//                 alignItems: 'start',
//                 flex: 1
//             }}>
//                 {/* Список результатов */}
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
//                     <div style={{ fontSize: 13, color: '#64748b', paddingLeft: 4 }}>
//                         Найдено: {results.length}
//                     </div>
//                     {results.map(p => {
//                         const risk = getRiskBadge(p.riskLevel, p.incidentsCount);
//                         return (
//                             <div
//                                 key={p.id}
//                                 onClick={() => setSelected(p)}
//                                 style={{
//                                     background: selected?.id === p.id ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 32, 48, 0.6)',
//                                     border: `1px solid ${selected?.id === p.id ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.06)'}`,
//                                     borderRadius: 12,
//                                     padding: '16px 20px',
//                                     cursor: 'pointer',
//                                     transition: 'all 0.2s'
//                                 }}
//                             >
//                                 <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
//                                     {/* Аватар с инициалами */}
//                                     <div style={{
//                                         width: 42, height: 42, borderRadius: 10,
//                                         background: risk.variant === 'danger' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)',
//                                         display: 'flex', alignItems: 'center', justifyContent: 'center',
//                                         fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0
//                                     }}>
//                                         {p.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
//                                     </div>

//                                     <div style={{ flex: 1, minWidth: 200 }}>
//                                         <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
//                                             {p.fullName}
//                                         </div>
//                                         <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
//                                             <span><i className="fa-solid fa-phone" style={{ marginRight: 4 }} />{p.phone}</span>
//                                             <span><i className="fa-solid fa-envelope" style={{ marginRight: 4 }} />{p.email}</span>
//                                         </div>
//                                     </div>

//                                     <div style={{
//                                         padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
//                                         display: 'inline-flex', alignItems: 'center', gap: 6,
//                                         background: `${risk.color}20`, color: risk.color
//                                     }}>
//                                         <i className={`fa-solid ${risk.icon}`} style={{ fontSize: 10 }} />
//                                         {p.incidentsCount} инц.
//                                     </div>
//                                 </div>
//                             </div>
//                         );
//                     })}
//                     {results.length === 0 && !isLoading && (
//                         <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
//                             <i className="fa-solid fa-user-slash" style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
//                             <div>Персоны не найдены</div>
//                         </div>
//                     )}
//                 </div>

//                 {/* Панель деталей (справа) */}
//                 {selected && (
//                     <div style={{
//                         background: 'rgba(30, 32, 48, 0.6)',
//                         border: '1px solid rgba(255,255,255,0.06)',
//                         borderRadius: 16,
//                         padding: 24,
//                         position: 'sticky',
//                         top: 20
//                     }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
//                             <div style={{
//                                 width: 56, height: 56, borderRadius: 14,
//                                 background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
//                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
//                                 fontSize: 20, fontWeight: 700, color: '#fff'
//                             }}>
//                                 {selected.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
//                             </div>
//                             <div>
//                                 <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
//                                     {selected.fullName}
//                                 </div>
//                                 <div style={{
//                                     padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
//                                     display: 'inline-flex', alignItems: 'center', gap: 6,
//                                     background: selected.incidentsCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
//                                     color: selected.incidentsCount > 0 ? '#f87171' : '#34d399'
//                                 }}>
//                                     <i className={`fa-solid ${selected.incidentsCount > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
//                                     {selected.incidentsCount > 0 ? 'В чёрном списке' : 'Репутация чиста'}
//                                 </div>
//                             </div>
//                         </div>

//                         <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
//                             <ContactItem icon="fa-phone" label="Телефон" value={selected.phone} />
//                             <ContactItem icon="fa-envelope" label="Email" value={selected.email} />
//                             <ContactItem icon="fa-paper-plane" label="Telegram" value={selected.telegram} />
//                             <ContactItem icon="fa-brands fa-whatsapp" label="WhatsApp" value={selected.whatsapp} />
//                         </div>

//                         {selected.notes && (
//                             <div style={{
//                                 background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16, marginBottom: 16
//                             }}>
//                                 <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>
//                                     <i className="fa-solid fa-comment-dots" style={{ marginRight: 6 }} />Комментарий
//                                 </div>
//                                 <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{selected.notes}</div>
//                             </div>
//                         )}

//                         {selected.history?.length > 0 && (
//                             <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 16 }}>
//                                 <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', fontWeight: 600 }}>
//                                     <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />История нарушений
//                                 </div>
//                                 {selected.history.map((h, i) => (
//                                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#e2e8f0', marginBottom: 6 }}>
//                                         <i className="fa-solid fa-circle-exclamation" style={{ color: '#f87171', fontSize: 10 }} />
//                                         {h}
//                                     </div>
//                                 ))}
//                             </div>
//                         )}

//                         <button
//                             onClick={() => setSelected(null)}
//                             style={{
//                                 width: '100%', marginTop: 20, padding: '10px', borderRadius: 8,
//                                 background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
//                                 color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
//                                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
//                             }}
//                         >
//                             <i className="fa-solid fa-xmark" /> Закрыть детали
//                         </button>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// // Вспомогательный компонент для строк контактов
// function ContactItem({ icon, label, value }) {
//     if (!value) return null;
//     return (
//         <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 10 }}>
//             <i className={`fa-solid ${icon}`} style={{ color: '#64748b', width: 16, textAlign: 'center' }} />
//             <span style={{ color: '#64748b', minWidth: 70 }}>{label}:</span>
//             <span style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>{value}</span>
//         </div>
//     );
// }

// export default PersonsSearchPage;