

function Footer() {
    return (
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'clamp(20px,3vw,32px) clamp(16px,3vw,32px)', marginTop: 'auto', background: 'rgba(15,17,23,0.5)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
                        <i className="fa-solid fa-shield-halved" style={{ color: '#6366f1', marginRight: 8 }} />BlackList
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>© {new Date().getFullYear()} Все права защищены</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <a href="mailto:***" style={{ color: '#a5b4fc', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fa-solid fa-envelope" style={{ marginRight: 6 }} />***
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
