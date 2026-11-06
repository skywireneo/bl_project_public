import React from "react";
import { Card } from "../ui/UIComponents"; // Проверь путь! Если UIComponents лежит в src/components/ui, а этот файл в src/pages/incidents, то путь "../ui/UIComponents" верный.

export const SKELETON_STYLES = `
@keyframes skeleton-shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
}
.skeleton-box {
    background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.04) 75%);
    background-size: 800px 100%;
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
    border-radius: 8px;
}
.skeleton-line { height: 14px; margin-bottom: 12px; }
.skeleton-title { height: 20px; width: 40%; margin-bottom: 20px; }
.skeleton-field { height: 42px; margin-bottom: 12px; }
.skeleton-text-short { width: 60%; }
.skeleton-text-mid { width: 80%; }
.skeleton-text-long { width: 95%; }
`;

export default function DetailSkeleton() {
    return (
        <>
            <style>{SKELETON_STYLES}</style>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20 }}>
                <Card padding={0} style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ flex: 1, padding: '14px 16px' }}>
                                <div className="skeleton-box" style={{ height: 16, width: '60%', margin: '0 auto' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <div className="skeleton-box" style={{ width: 80, height: 24 }} />
                            <div className="skeleton-box" style={{ width: 80, height: 24 }} />
                            <div className="skeleton-box" style={{ width: 120, height: 24 }} />
                        </div>
                        <div className="skeleton-box skeleton-line skeleton-text-long" />
                        <div className="skeleton-box skeleton-line skeleton-text-long" />
                        <div className="skeleton-box skeleton-line skeleton-text-mid" />
                        <div style={{ margin: '24px 0', height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div className="skeleton-box skeleton-title" />
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                            <div className="skeleton-box skeleton-line skeleton-text-mid" />
                            <div className="skeleton-box skeleton-line skeleton-text-short" />
                        </div>
                    </div>
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <div className="skeleton-box skeleton-line skeleton-text-short" />
                        <div className="skeleton-box skeleton-line skeleton-text-mid" />
                        <div className="skeleton-box skeleton-line skeleton-text-short" />
                    </Card>
                    <Card>
                        <div className="skeleton-box skeleton-line skeleton-text-short" />
                        <div className="skeleton-box" style={{ height: 36, marginBottom: 8 }} />
                        <div className="skeleton-box" style={{ height: 36 }} />
                    </Card>
                </div>
            </div>
        </>
    );
}