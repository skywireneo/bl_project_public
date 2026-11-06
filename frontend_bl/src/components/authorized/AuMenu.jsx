import React, { useContext, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Context } from "../..";
import LoginModal from "./LoginModal";
import storageHandler from "../../http/utils/storageHandler";
import SingleFileViewer from "./unifiedFiles/singleFiles/SingleFileViewer";
import SupportModal from "./SupportModal";

function AuMenu({ active, compact = false, headerHeight = 91 }) {
    const { user, setUser } = useContext(Context);
    const status = user?.user?.status;
    const isAuth = user?.isAuth;
    const location = useLocation();

    const [openGroups, setOpenGroups] = useState({ settings: false, PaySettings: false, chat: false, admin: false });
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    const toggleGroup = (groupName) => {
        setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const STATUS_CONFIG = {
        // Активные пользователи
        USER: {
            label: "Пользователь",
            bg: "rgba(16,185,129,0.15)",
            color: "#10b981" // Emerald
        },
        USER_UNCONFIRMED: {
            label: "Не подтверждён",
            bg: "rgba(148,163,184,0.15)",
            color: "#94a3b8" // Slate
        },
        PARTNER: {
            label: "Партнёр",
            bg: "rgba(59,130,246,0.15)",
            color: "#3b82f6" // Blue
        },

        // Сотрудники
        MODERATOR: {
            label: "Модератор",
            bg: "rgba(245,158,11,0.15)",
            color: "#f59e0b" // Amber
        },
        ADMINISTRATOR: {
            label: "Админ",
            bg: "rgba(239,68,68,0.15)",
            color: "#ef4444" // Red
        },
        TOP_LEVEL_ADMINISTRATOR: {
            label: "Топ Админ",
            bg: "rgba(185,28,28,0.15)",
            color: "#b91c1c" // Dark Red
        },
        DEVELOPER: {
            label: "Разработчик",
            bg: "rgba(99,102,241,0.15)",
            color: "#6366f1" // Indigo
        },
        TOP_LEVEL_DEVELOPER: {
            label: "Топ Разработчик",
            bg: "rgba(139,92,246,0.15)",
            color: "#8b5cf6" // Purple
        },

        // Заблокированные / Удалённые
        BLOCKED: {
            label: "Заблокирован",
            bg: "rgba(239,68,68,0.15)",
            color: "#ef4444" // Red
        },
        BLOCKED_PER: {
            label: "Заблок. (навсегда)",
            bg: "rgba(153,27,27,0.15)",
            color: "#991b1b" // Darker Red
        },
        DELETED_RET: {
            label: "Удалён (с возвр.)",
            bg: "rgba(100,116,139,0.15)",
            color: "#64748b" // Gray
        },
        DELETED_NO_RET: {
            label: "Удалён (без возвр.)",
            bg: "rgba(30,41,59,0.15)",
            color: "#475569" // Dark Gray
        },

        // Фолбэк на случай неизвестного статуса
        DEFAULT: {
            label: "Гость / Неизвестно",
            bg: "rgba(100,116,139,0.15)",
            color: "#94a3b8"
        }
    };

    // const isAdmin = ['DEVELOPER', 'TOP_LEVEL_DEVELOPER', 'TOP_LEVEL_ADMINISTRATOR', 'ADMINISTRATOR'].includes(status);
    // const isModerator = status === "MODERATOR" || isAdmin;
    // const isDev = status === "DEVELOPER";

    const hasAccess = (roles) => {
        if (!roles || roles.length === 0) return false;
        if (!isAuth && roles.includes("UNAUTHORIZED")) return true;
        if (isAuth && roles.includes(status)) return true;
        return false;
    };

    const isItemActive = (item) => {
        const pathname = location.pathname;

        if (pathname === item.to) return true;
        if (item.to === "/" && pathname === "/") return true;

        if (item.activePaths && Array.isArray(item.activePaths)) {
            for (const path of item.activePaths) {
                if (typeof path === "string") {
                    if (pathname === path) return true;
                    if (!path.includes(":") && pathname.startsWith(path + "/")) {
                        return true;
                    }
                    if (path.includes(":")) {
                        const basePath = path.split("/:")[0];
                        if (pathname.startsWith(basePath + "/")) return true;
                    }
                } else if (path instanceof RegExp) {
                    if (path.test(pathname)) return true;
                }
            }
        }

        if (active) {
            const lastSegment = item.to === "/" ? "main" : item.to.split("/").filter(Boolean).pop();
            if (active === lastSegment) return true;
        }

        return false;
    };

    const menuItems = [
        { to: "/", label: "Главная", icon: "fa-house", roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], bottomNav: true, priority: 1 },
        { to: "/profile", label: "Профиль", icon: "fa-user", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], bottomNav: true, priority: 2 },
        { to: "/search/pvz", label: "Поиск ПВЗ", icon: "fa-building", roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], bottomNav: false, priority: 4 },
        { to: "/check-person", label: "Проверка персоны", icon: "fa-user-shield", roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], bottomNav: false, priority: 3 },
        {
            to: "/incidents",
            label: "Инциденты",
            icon: "fa-triangle-exclamation",
            roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            bottomNav: true,
            priority: 5,
            activePaths: [
                "/incidents",
                "/incidents/new",
                "/incidents/:id",
                "/incidents/:id/edit",
                "/reportPVZ"
            ]
        },
        // {
        //     to: "/persons",
        //     label: "Поиск персон",
        //     icon: "fa-user-shield",
        //     roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
        //     bottomNav: true,
        //     priority: 3,
        //     activePaths: ["/persons", "/check-person"]
        // },

        {
            to: "/policies",
            label: "Политики",
            icon: "fa-file-contract",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            bottomNav: false,
            priority: 6,
            activePaths: [
                "/policies",
                "/policies/:type",
                "/policies/:type/v/:version"
            ]
        },

        // { to: "/search/incidents", label: "Поиск инцидентов", icon: "fa-list-check", roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], bottomNav: false, priority: 10 },
        { to: "/about", label: "О проекте", icon: "fa-circle-info", roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], bottomNav: false, priority: 7 },

        {
            to: "/systemVersions",
            label: "История версий",
            icon: "fa-code-branch",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            bottomNav: false,
            priority: 8,
            activePaths: ["/systemVersions", "/admin/systemVersions"]
        },
        { to: "/admin/kanban", label: "Канбан доска", icon: "fa-table-columns", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], priority: 9 },

        // {
        //     group: true,
        //     name: "settings",
        //     label: "Настройки",
        //     icon: "fa-gears",
        //     groupLink: "/settings",
        //     roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
        //     priority: 30,
        //     items: [
        //         // { to: "/settings", label: "Общие", icon: "fa-gear", roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         { to: "/users", label: "Пользователи", icon: "fa-screwdriver-wrench", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/settingsImages", label: "Файлы", icon: "fa-file", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/incidentSettings", label: "Инциденты", icon: "fa-bars", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/article-settings", label: "Статьи", icon: "fa-book-open", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/APISettings", label: "API", icon: "fa-key", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/ChatSettings", label: "Чаты", icon: "fa-comment-dots", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/devSettings", label: "Разработчика", icon: "fa-screwdriver-wrench", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/moduleSettings", label: "Настройки модулей", icon: "fa-gears", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //         // { to: "/ui-library", label: "UI Библиотека", icon: "fa-palette", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
        //     ].filter(Boolean)
        // },

        {
            group: true,
            name: "admin",
            label: "Администрирование",
            icon: "fa-shield-halved",
            groupLink: "/admin",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            priority: 10,
            items: [
                { to: "/admin", label: "Дашборд", icon: "fa-gauge-high", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/kanban", label: "Канбан доска", icon: "fa-table-columns", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                // { to: "/admin/donations", label: "Донаты", icon: "fa-hand-holding-heart", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"] },
                { to: "/admin/av", label: "Антивирус", icon: "fa-table-columns", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/singleFile", label: "Статические файлы", icon: "fa-table-columns", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/settings", label: "Справочники", icon: "fa-gear", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/permissions", label: "Системные права", icon: "fa-key", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/settingsMain", label: "Настройки", icon: "fa-gear", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/critActions", label: "Крит действия", icon: "fa-gear", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/systemVersions", label: "Версии системы", icon: "fa-code-branch", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
                { to: "/admin/notifications", label: "Уведомления", icon: "fa-bell", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] }, // ДОБАВЛЕНО
                { to: "/users", label: "Пользователи", icon: "fa-screwdriver-wrench", roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"] },
            ].filter(Boolean)
        },
    ].filter(Boolean).sort((a, b) => (a.priority || 999) - (b.priority || 999));

    useEffect(() => {
        const pathname = location.pathname;

        menuItems.forEach(item => {
            if (item.group && item.items) {
                const isActiveInGroup = item.items.some(sub => isItemActive(sub));
                if (isActiveInGroup) {
                    setOpenGroups(prev => {
                        if (prev[item.name] === true) return prev;
                        return { ...prev, [item.name]: true };
                    });
                }
            }
        });
    }, [location.pathname]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const accessibleItemCount = menuItems.reduce((count, item) => {
        if (item.group) {
            const visibleItems = item.items.filter(sub => hasAccess(sub.roles));
            return count + (hasAccess(item.roles) && visibleItems.length > 0 ? 1 + visibleItems.length : 0);
        }
        return count + (hasAccess(item.roles) ? 1 : 0);
    }, 0);

    const shouldShowSearch = accessibleItemCount > 10;
    const filteredMenuItems = shouldShowSearch && searchTerm
        ? menuItems.filter(item => {
            if (item.group) {
                const matchesGroup = item.label.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesChild = item.items.some(sub => sub.label.toLowerCase().includes(searchTerm.toLowerCase()));
                return matchesGroup || matchesChild;
            }
            return item.label.toLowerCase().includes(searchTerm.toLowerCase());
        })
        : menuItems;

    const addRipple = (e) => {
        const button = e.currentTarget;
        const ripple = document.createElement("span");
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        ripple.style.cssText = `position: absolute; width: ${size}px; height: ${size}px; left: ${x}px; top: ${y}px; background: rgba(255,255,255,0.15); border-radius: 50%; transform: scale(0); animation: ripple 0.6s linear; pointer-events: none; z-index: 1;`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    };

    const baseItemStyle = {
        display: "flex", alignItems: "center", gap: "10px", padding: "10px 0px",
        borderRadius: "8px", fontSize: "14px", fontWeight: "500", color: "#94a3b8",
        background: "transparent", border: "none", width: "100%", textAlign: "left",
        cursor: "pointer", transition: "all 0.15s ease", position: "relative", overflow: "hidden", textDecoration: "none"
    };

    const activeItemStyle = {
        ...baseItemStyle, background: "rgba(99, 102, 241, 0.12)", color: "#e2e8f0",
        borderLeft: "3px solid #6366f1", paddingLeft: "9px"
    };

    const groupHeaderStyle = (isOpen, colorTheme) => ({
        ...baseItemStyle, background: isOpen ? colorTheme.bg : "transparent",
        border: `1px solid ${isOpen ? colorTheme.border : 'transparent'}`,
        color: isOpen ? "#e2e8f0" : "#94a3b8", justifyContent: "space-between"
    });

    const groupColors = {
        settings: { bg: "rgba(99, 102, 241, 0.1)", border: "rgba(99, 102, 241, 0.3)", icon: "#818cf8" },
        PaySettings: { bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", icon: "#fbbf24" },
        chat: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", icon: "#34d399" },
        admin: { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", icon: "#f87171" },
    };

    const handleLogout = () => {
        user.setUser({});
        user.setIsAuth(false);
        storageHandler.remove("tokenAccess", { method: "cookies", path: "/" });
        storageHandler.remove("refreshToken", { method: "cookies", path: "/" });
        storageHandler.remove("sessionId");
        document.cookie = `auth_token=; path=/; max-age=0; SameSite=Lax`;
        window.location.href = "/";
    };

    const renderMenuItems = (isMobileDrawer = false) => {
        return filteredMenuItems.map((item, idx) => {
            if (item.group) {
                if (!hasAccess(item.roles)) return null;
                const visibleItems = item.items.filter(sub => hasAccess(sub.roles));
                if (visibleItems.length === 0) return null;

                const open = openGroups[item.name];
                const colors = groupColors[item.name] || groupColors.settings;

                const isGroupActive = item.items?.some(sub => isItemActive(sub));

                const groupContainerStyle = {
                    marginBottom: isMobileDrawer ? 8 : 0,
                    borderRadius: "8px",
                    background: isGroupActive ? "rgba(99, 102, 241, 0.08)" : "transparent",
                    transition: "background 0.2s ease",
                };

                const groupTitleStyle = {
                    ...groupHeaderStyle(open, colors),
                    flex: 1,
                    justifyContent: "flex-start",
                    paddingRight: "36px",
                    background: "transparent",
                    border: "none",
                    color: isGroupActive ? "#e2e8f0" : (open ? "#e2e8f0" : "#94a3b8"),
                };

                return (
                    <div key={idx} style={groupContainerStyle}>
                        <div style={{ display: "flex", alignItems: "center", position: "relative", overflow: "hidden", borderRadius: "8px" }}>
                            {item.groupLink ? (
                                <Link
                                    to={item.groupLink}
                                    onClick={(e) => {
                                        if (!open) setOpenGroups(prev => ({ ...prev, [item.name]: true }));
                                        if (isMobileDrawer) setMenuOpen(false);
                                    }}
                                    style={groupTitleStyle}
                                    onMouseDown={!isMobileDrawer ? addRipple : undefined}
                                >
                                    <i className={`fa-solid ${item.icon}`} style={{ color: colors.icon, width: "18px", textAlign: "center" }}></i>
                                    {item.label}
                                </Link>
                            ) : (
                                <button
                                    onClick={() => toggleGroup(item.name)}
                                    style={groupTitleStyle}
                                    onMouseDown={!isMobileDrawer ? addRipple : undefined}
                                >
                                    <i className={`fa-solid ${item.icon}`} style={{ color: colors.icon, width: "18px", textAlign: "center" }}></i>
                                    {item.label}
                                </button>
                            )}

                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleGroup(item.name);
                                }}
                                style={{
                                    position: "absolute",
                                    right: "6px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "transparent",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    width: "24px",
                                    height: "24px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "4px",
                                    transition: "all 0.2s",
                                    zIndex: 2,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                                <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: "11px", transition: "transform 0.2s" }}></i>
                            </button>
                        </div>

                        <div style={{ maxHeight: open ? "1000px" : "0", opacity: open ? 1 : 0, overflow: "hidden", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                            <div style={{ padding: "4px 0 4px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                {visibleItems.map((sub, subIdx) => {
                                    const isSubActive = isItemActive(sub);

                                    return (
                                        <Link
                                            key={subIdx}
                                            to={sub.to}
                                            onClick={() => isMobileDrawer && setMenuOpen(false)}
                                            style={isSubActive ? activeItemStyle : baseItemStyle}
                                        >
                                            <i className={`fa-solid ${sub.icon}`} style={{ width: "18px", textAlign: "center", color: isSubActive ? "#818cf8" : "#64748b" }}></i>
                                            {sub.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            }

            if (!hasAccess(item.roles)) return null;

            const isActive = isItemActive(item);

            return (
                <Link
                    key={idx}
                    to={item.to}
                    onClick={() => isMobileDrawer && setMenuOpen(false)}
                    style={isActive ? activeItemStyle : baseItemStyle}
                >
                    <i className={`fa-solid ${item.icon}`} style={{ width: "18px", textAlign: "center", color: isActive ? "#818cf8" : "#64748b" }}></i>
                    {item.label}
                </Link>
            );
        });
    };

    // === МОБИЛЬНАЯ ВЕРСИЯ ===
    if (isMobile) {
        const bottomItems = menuItems.filter(item => item.bottomNav && hasAccess(item.roles)).slice(0, 4);
        return (
            <>
                <style>{`@keyframes ripple { to { transform: scale(4); opacity: 0; } }`}</style>
                <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
                <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} /> {/* */}


                {/* Нижняя панель навигации */}
                <div style={{
                    position: "fixed", bottom: 0, left: 0, width: "100%", background: "rgba(15, 17, 23, 0.95)",
                    backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 0 12px",
                    height: "64px", zIndex: 1050, boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.4)"
                }}>
                    {bottomItems.map((item, idx) => {
                        const isActive = isItemActive(item);

                        return (
                            <Link to={item.to} key={idx} onClick={() => setMenuOpen(false)} style={{
                                display: "flex", flexDirection: "column", alignItems: "center", color: isActive ? "#818cf8" : "#64748b",
                                fontSize: "11px", fontWeight: "600", textDecoration: "none", gap: "4px", padding: "6px 12px",
                                borderRadius: "8px", background: isActive ? "rgba(99, 102, 241, 0.1)" : "transparent", transition: "all 0.2s ease"
                            }}>
                                <i className={`fa-solid ${item.icon}`} style={{ fontSize: "20px", transition: "transform 0.2s", transform: isActive ? "translateY(-2px)" : "none" }}></i>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                    <button onClick={() => setMenuOpen(prev => !prev)} style={{
                        background: menuOpen ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "white", border: "none", borderRadius: "12px", width: "44px", height: "44px",
                        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                        cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: menuOpen ? "rotate(90deg)" : "rotate(0deg)"
                    }}>
                        <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`} style={{ fontSize: "18px" }}></i>
                    </button>
                </div>

                {/* Выдвижное мобильное меню */}
                {menuOpen && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1030, backdropFilter: "blur(4px)" }} onClick={() => setMenuOpen(false)}>
                        <div style={{ position: "fixed", top: 0, left: 0, width: "85vw", maxWidth: "300px", height: "100vh", background: "#1a1d2e", zIndex: 1040, display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>

                            <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "16px", fontWeight: "700", color: "#f1f5f9" }}>Меню</span>
                                <button onClick={() => setMenuOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px", padding: 4 }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            {/* {shouldShowSearch && (
                                <div style={{ padding: "16px 16px 8px" }}>
                                    <div style={{ position: "relative" }}>
                                        <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "14px" }}></i>
                                        <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: "100%", padding: "9px 14px 9px 36px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                                    </div>
                                </div>
                            )} */}

                            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                {renderMenuItems(true)}

                                {/* Кнопка поддержки в мобильном меню */}
                                {/* <Link
                                    to="/donate"
                                    onClick={() => setMenuOpen(false)}
                                    style={{
                                        marginTop: 16,
                                        padding: 14,
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                                        borderRadius: 12,
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        textAlign: 'center',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <i className="fa-solid fa-heart" style={{
                                        fontSize: 20,
                                        color: '#a5b4fc',
                                        marginBottom: 6,
                                        display: 'block'
                                    }} />
                                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 10, lineHeight: 1.4 }}>
                                        Поддержите проект и получите про-функции!
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: '#fff',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6
                                    }}>
                                        <i className="fa-solid fa-hand-holding-heart" />
                                        Поддержать
                                    </div>
                                </Link>*/}
                            </div>

                            <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(15, 17, 23, 0.95)" }}>
                                <button
                                    onClick={() => { setIsSupportModalOpen(true); setMenuOpen(false); }}
                                    style={{
                                        width: "100%", padding: "12px", borderRadius: "10px",
                                        background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))",
                                        border: "1px solid rgba(236, 72, 153, 0.3)",
                                        color: "#f0abfc", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.25))"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))"}
                                >
                                    <i className="fa-solid fa-heart"></i> Поддержать проект
                                </button>
                                {isAuth ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#fff" }}>
                                                {user.user?.login?.[0]?.toUpperCase() || "U"}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {user.user?.login}
                                                </div>
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                    {status || "Пользователь"}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{
                                            width: "100%", padding: "8px", borderRadius: "8px",
                                            background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
                                            color: "#f87171", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                                        }}>
                                            <i className="fa-solid fa-right-from-bracket"></i> Выйти
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setIsLoginModalOpen(true); setMenuOpen(false); }} style={{
                                        width: "100%", padding: "10px", borderRadius: "8px",
                                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none",
                                        color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                                    }}>
                                        <i className="fa-solid fa-right-to-bracket"></i> Войти в систему
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // === ПК ВЕРСИЯ ===
    return (
        <>
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} /> {/* */}
            <style>{`
                @keyframes ripple { to { transform: scale(4); opacity: 0; } }
                .sidebar-custom::-webkit-scrollbar { display: none; }
                .sidebar-custom { scrollbar-width: none; -ms-overflow-style: none; }
            `}</style>

            <div className="sidebar-custom" style={{
                width: "clamp(220px, 18vw, 260px)",
                background: "rgba(15, 17, 23, 0.85)",
                backdropFilter: "blur(20px)",
                color: "#e2e8f0",
                position: "sticky",
                top: `${headerHeight}px`,
                height: `calc(100vh - ${headerHeight}px)`,
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                transition: "top 0.3s ease",
                overflowY: "auto"
            }}>
                <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                    <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "10px",
                            overflow: "hidden",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(99,102,241,0.1)",
                            flexShrink: 0
                        }}>
                            <SingleFileViewer
                                codeName="logo"
                                mediaType="image"
                                showTitle={false}
                                showDownload={false}
                                maxHeight="36px"
                                maxWidth="36px"
                            />
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9" }}>
                            {isAuth ? `Привет, ${user.user?.login || "Пользователь"}` : "BlackList"}
                        </span>
                    </Link>

                    {isAuth && status && (() => {
                        // Получаем конфиг для текущего статуса или используем DEFAULT, если статус неизвестен
                        const config = STATUS_CONFIG[status] || STATUS_CONFIG.DEFAULT;

                        return (
                            <span style={{
                                fontSize: "10px",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                display: "inline-block",
                                background: config.bg,
                                color: config.color
                            }}>
                                {config.label}
                            </span>
                        );
                    })()}
                </div>

                <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
                    {/* {shouldShowSearch && (
                        <div style={{ position: "relative", marginBottom: "12px" }}>
                            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "14px" }}></i>
                            <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: "100%", padding: "9px 14px 9px 36px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>
                    )} */}

                    {renderMenuItems(false)}
                </div>

                {/* Кнопка поддержки проекта - ссылка на /donate */}
                {/* <Link
                    to="/donate"
                    style={{
                        margin: '0 16px 12px',
                        padding: 14,
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                        borderRadius: 12,
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        textAlign: 'center',
                        textDecoration: 'none',
                        flexShrink: 0,
                        display: 'block'
                    }}
                >
                    <i className="fa-solid fa-heart" style={{
                        fontSize: 20,
                        color: '#a5b4fc',
                        marginBottom: 6,
                        display: 'block'
                    }} />
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 10, lineHeight: 1.4 }}>
                        Поддержите проект и получите про-функции!
                    </div>
                    <div style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                    }}>
                        <i className="fa-solid fa-hand-holding-heart" />
                        Поддержать
                    </div>
                </Link>*/}


                <div style={{
                    marginTop: "auto",
                    padding: "16px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(15, 17, 23, 0.95)",
                    flexShrink: 0
                }}>
                    <button
                        onClick={() => setIsSupportModalOpen(true)}
                        style={{
                            width: "100%", padding: "12px", borderRadius: "10px",
                            background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))",
                            border: "1px solid rgba(236, 72, 153, 0.3)",
                            color: "#f0abfc", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(139, 92, 246, 0.25))"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))"}
                    >
                        <i className="fa-solid fa-heart"></i> Поддержать проект
                    </button>
                    {isAuth ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: 32, height: 32, borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(99,102,241,0.1)", flexShrink: 0 }}>
                                    <SingleFileViewer
                                        codeName="logo"
                                        mediaType="image"
                                        showTitle={false}
                                        showDownload={false}
                                        maxHeight="32px"
                                        maxWidth="32px"
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {user.user?.login}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                                        {status || "Пользователь"}
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleLogout} style={{
                                width: "100%", padding: "8px", borderRadius: "8px",
                                background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
                                color: "#f87171", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                transition: "all 0.2s"
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                            >
                                <i className="fa-solid fa-right-from-bracket"></i> Выйти
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ textAlign: "center", marginBottom: "4px" }}>
                                {/* <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "4px" }}>Добро пожаловать</div> */}
                                <div style={{ fontSize: "11px", color: "#64748b" }}>Вход пока недоступен, будет в новых обновления системы</div>
                            </div>
                            <button onClick={() => setIsLoginModalOpen(true)} style={{
                                width: "100%", padding: "10px", borderRadius: "8px",
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none",
                                color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                transition: "all 0.2s"
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.filter = "brightness(1)"}
                            >
                                <i className="fa-solid fa-right-to-bracket"></i> Войти в систему
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default AuMenu;