// import React, { useState, useEffect, useMemo } from 'react';
// import { PageHeader, Card, Input, Button, Badge, EmptyState, Select } from '../ui/UIComponents'; // Укажи свой путь
// // import { searchIncidents, bulkUpdateStatus, bulkDelete } from '../../http/mock/incidentsAPI';

// export default function IncidentsSearchPage() {
//     const [incidents, setIncidents] = useState([]);
//     const [search, setSearch] = useState('');
//     const [statusFilter, setStatusFilter] = useState('all');
//     const [severityFilter, setSeverityFilter] = useState('all');
//     const [selectedIds, setSelectedIds] = useState([]);
//     const [bulkStatus, setBulkStatus] = useState('');
//     const [isLoading, setIsLoading] = useState(false);

//     useEffect(() => {
//         setIsLoading(true);
//         const timer = setTimeout(async () => {
//             const data = await searchIncidents(search, { status: statusFilter, severity: severityFilter });
//             setIncidents(data);
//             setIsLoading(false);
//         }, 300);
//         return () => clearTimeout(timer);
//     }, [search, statusFilter, severityFilter]);

//     const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
//     const selectAll = () => setSelectedIds(selectedIds.length === incidents.length ? [] : incidents.map(i => i.id));

//     const handleBulkStatus = async () => {
//         if (!bulkStatus || selectedIds.length === 0) return;
//         await bulkUpdateStatus(selectedIds, bulkStatus);
//         setIncidents(await searchIncidents(search, { status: statusFilter, severity: severityFilter }));
//         setSelectedIds([]); setBulkStatus('');
//     };

//     const handleBulkDelete = async () => {
//         if (selectedIds.length === 0) return;
//         await bulkDelete(selectedIds);
//         setIncidents(await searchIncidents(search, { status: statusFilter, severity: severityFilter }));
//         setSelectedIds([]);
//     };

//     const getSevVariant = (s) => s === 'critical' ? 'danger' : s === 'high' ? 'warning' : s === 'medium' ? 'info' : 'success';
//     const getStatVariant = (s) => s === 'active' ? 'danger' : s === 'investigation' ? 'warning' : 'success';

//     return (
//         <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
//             <PageHeader title="Поиск инцидентов" subtitle={`Всего: ${incidents.length}`} />
//             <div style={{ padding: 'clamp(16px, 3vw, 32px)', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
//                 <Card padding={20}>
//                     <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
//                         <div style={{ flex: '1 1 280px' }}>
//                             <Input icon="fa-magnifying-glass" placeholder="Поиск по названию, причине, ФИО..." value={search} onChange={e => setSearch(e.target.value)} />
//                         </div>
//                         <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
//                             <option value="all">Все статусы</option>
//                             <option value="active">Активные</option>
//                             <option value="investigation">Расследование</option>
//                             <option value="closed">Закрытые</option>
//                         </Select>
//                         <Select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
//                             <option value="all">Все серьёзности</option>
//                             <option value="critical">Критическая</option>
//                             <option value="high">Высокая</option>
//                             <option value="medium">Средняя</option>
//                             <option value="low">Низкая</option>
//                         </Select>
//                     </div>
//                     {isLoading && <div style={{ fontSize: 12, color: '#64748b' }}><i className="fa-solid fa-spinner fa-spin" /> Загрузка...</div>}
//                 </Card>

//                 {selectedIds.length > 0 && (
//                     <Card padding={16} style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.3)' }}>
//                         <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
//                             <Badge variant="info" icon="fa-check">Выбрано: {selectedIds.length}</Badge>
//                             <Select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ width: 'auto', minWidth: 180 }}>
//                                 <option value="">Изменить статус на...</option>
//                                 <option value="active">Активный</option>
//                                 <option value="investigation">Расследование</option>
//                                 <option value="closed">Закрыт</option>
//                             </Select>
//                             <Button size="sm" variant="primary" onClick={handleBulkStatus} disabled={!bulkStatus}>Применить</Button>
//                             <Button size="sm" variant="danger" icon="fa-trash" onClick={handleBulkDelete}>Удалить</Button>
//                             <div style={{ flex: 1 }} />
//                             <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Снять</Button>
//                         </div>
//                     </Card>
//                 )}

//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
//                     {incidents.length > 0 && (
//                         <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
//                             <input type="checkbox" checked={selectedIds.length === incidents.length && incidents.length > 0} onChange={selectAll} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }} />
//                             <span style={{ fontSize: 12, color: '#64748b' }}>Выбрать все</span>
//                         </div>
//                     )}

//                     {incidents.map(inc => (
//                         <div key={inc.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
//                             <div style={{ display: 'flex', alignItems: 'center' }}>
//                                 <input type="checkbox" checked={selectedIds.includes(inc.id)} onChange={() => toggleSelect(inc.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366f1' }} />
//                             </div>
//                             <Card hoverable padding="18px 24px" style={{ flex: 1, cursor: 'pointer' }}>
//                                 <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
//                                     <div style={{ width: 48, height: 48, borderRadius: 12, background: `rgba(${getSevVariant(inc.severity) === 'danger' ? '239,68,68' : getSevVariant(inc.severity) === 'warning' ? '245,158,11' : '59,130,246'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
//                                         <i className={`fa-solid ${inc.severity === 'critical' ? 'fa-skull-crossbones' : 'fa-triangle-exclamation'}`} style={{ fontSize: 20, color: getSevVariant(inc.severity) === 'danger' ? '#f87171' : getSevVariant(inc.severity) === 'warning' ? '#fbbf24' : '#60a5fa' }} />
//                                     </div>
//                                     <div style={{ flex: 1, minWidth: 200 }}>
//                                         <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
//                                             <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{inc.title}</span>
//                                             <Badge variant={getStatVariant(inc.status)}>{inc.status === 'active' ? 'Активный' : inc.status === 'investigation' ? 'Расследование' : 'Закрыт'}</Badge>
//                                             <Badge variant={getSevVariant(inc.severity)}>{inc.severity}</Badge>
//                                         </div>
//                                         <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}><i className="fa-solid fa-tag" style={{ marginRight: 6, fontSize: 11 }} />{inc.reason}</div>
//                                         <div style={{ fontSize: 12, color: '#64748b' }}><i className="fa-solid fa-user" style={{ marginRight: 4 }} />{inc.persons.map(p => p.fullName).join(', ')}</div>
//                                     </div>
//                                     <div style={{ textAlign: 'right', flexShrink: 0 }}>
//                                         <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(inc.createdAt).toLocaleDateString('ru-RU')}</div>
//                                         <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>#{String(inc.id).padStart(4, '0')}</div>
//                                     </div>
//                                 </div>
//                             </Card>
//                         </div>
//                     ))}
//                     {incidents.length === 0 && !isLoading && <Card><EmptyState icon="fa-inbox" title="Инциденты не найдены" /></Card>}
//                 </div>
//             </div>
//         </div>
//     );
// }