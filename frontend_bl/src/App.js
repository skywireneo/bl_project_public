// // src/App.js
import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Context } from ".";
// import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
// import LoaderPage from "./components/ui/LoaderPage";
// import MessageToastContainer from "./components/ui/MessageToastContainer";
// import ErrorModal from "./components/ui/ErrorModal";
import NotFound from "./components/NotFound";
// import LoginPage from "./components/loginPage/LoginPage";
import AuPageLayout from "./components/authorized/AuPageLayout";
// import ChangePass from "./components/authorized/users/ChangePass";
import MainPageLayout from "./components/mainPage/MainPageLayout";
// import FaqPageLayout from "./components/faq/FaqPageLayout";
// import FaqTopicPageLayout from "./components/faq/FaqTopicPageLayout";
// import FaqNewPage from "./components/faq/FaqNewPage";
// import FaqTypesPage from "./components/faq/FaqTypesPage";
// import FaqSearchPage from "./components/faq/FaqSearchPage";
import { check } from "./http/userAPI";
// import { refreshToken } from "./http/index";
import { setToast, setErrorModal, setUserCheck } from "./http/requestHandler";
import { useToast } from "./context/ToastContext";
import { useAccessChecker } from "./utils/accessChecker";
// import BuyPlanPage from "./components/prices/BuyPlanPage";
// import { setUpdateUserCallback } from "./http/index";
// import socket from "./http/socket";
// import BackupCreationPage from "./components/userBackup/BackupCreationPage";
// import storageHandler from "./http/utils/storageHandler";
// import ForgotPassword from "./components/authorized/users/reetPass/ForgotPassword";
// import ResetPassword from "./components/authorized/users/reetPass/ResetPassword";
// import UiLibraryPage from "./components/authorized/uiLibrary/UiLibraryPage";
// import { VersionAdminPage } from "./components/authorized/systemVersions";
// import ArticlesListPage from "./components/authorized/articles/ArticlesListPage";
// import ArticlePage from "./components/authorized/articles/ArticlePage";
// import ArticleFormPage from "./components/authorized/articles/ArticleFormPage";
// import ArticleSettingsPage from "./components/authorized/articles/ArticleSettingsPage";
// import ModuleSettingsPage from "./components/authorized/settings/ModuleSettingsPage";
// import AuthorDashboard from "./components/authorized/articles/AuthorDashboard";
// import RegisterPage from "./components/registerPage/RegisterPage";
// import UserAdminSettings from "./components/authorized/users/admin/UserAdminSettings";
// import EmailConfirmPage from "./components/EmailConfirmPage";
// import ReferralsAdminPage from "./components/authorized/users/ReferralsAdminPage";
// import UserPointsPage from "./components/authorized/userPoints/UserPointsPage";
// import UserPointsShop from "./components/authorized/userPoints/UserPointsShop";
// import UserBalancePage from "./components/authorized/userBalance/UserBalancePage";
// import PointsRulesAdmin from "./components/authorized/userBalanceAdmin/PointsRulesAdmin";
// import DepositCodesAdmin from "./components/authorized/userBalanceAdmin/DepositCodesAdmin";
// import ShopItemsAdmin from "./components/authorized/userPointsAdmin/ShopItemsAdmin";
import IncidentsListPage from "./components/incidents/IncidentsListPage";
import IncidentDetailPage from "./components/incidents/IncidentDetailPage";
import IncidentFormPage from "./components/incidents/IncidentFormPage";
import ContestationDetailPage from "./components/incidents/ContestationDetailPage";
import MessageToastContainer from "./components/ui/MessageToastContainer";
import ErrorModal from "./components/ui/ErrorModal";
import DonationPage from "./components/donation/DonationPage";
import MyDonationPage from "./components/donation/MyDonationPage";
import DonationLoginPage from "./components/donation/DonationLoginPage";
import storageHandler from "./http/utils/storageHandler";
import { initSocket, disconnectSocket, getSocket } from "./http/socket";
import ForceLogoutOverlay from "./components/ui/ForceLogoutOverlay";
import NotificationToastContainer from "./components/notifications/NotificationToastContainer";

const App = observer(() => {
    const { user, notification } = useContext(Context);
    const [forceLogoutState, setForceLogoutState] = useState({ isActive: false, reason: '', redirectDelay: 5000 });
    const [loading, setLoading] = useState(true);
    //   const [changePasswordFlag, setChangePasswordFlag] = useState(false);
    const { showToast, showErrorModal, closeErrorModal, errorModal } = useToast();
    //   const headerRef = useRef(null);
    //   const [headerHeight, setHeaderHeight] = useState(0);

    // Обновляем сигнатуру функции, добавляя параметр delay
    const executeFinalRedirect = useCallback(() => {
        window.location.replace("/");
    }, []);

    // 2. Функция принудительного выхода (убираем setTimeout отсюда!)
    const handleForceLogout = useCallback((reason, delay = 5000) => {
        // МГНОВЕННОЕ УНИЧТОЖЕНИЕ ДАННЫХ
        storageHandler.remove("tokenAccess", { method: "cookies", path: "/" });
        storageHandler.remove("refreshToken", { method: "cookies", path: "/" });
        storageHandler.remove("sessionId");

        user.setUser({});
        user.setIsAuth(false);
        disconnectSocket();

        // Сохраняем состояние и передаем вычисленную задержку в модалку
        setForceLogoutState({
            isActive: true,
            reason: reason,
            redirectDelay: delay // <-- Передаем в оверлей
        });

        // setTimeout больше не нужен здесь, его возьмет на себя ForceLogoutOverlay
    }, [user]);

    useEffect(() => {
        // 1. Инициализируем сокет ВСЕГДА (и для гостей, и для авторизованных)
        const socket = initSocket();
        if (!socket) return;

        console.log('[App] 🔌 Сокет инициализирован, подписываемся на события');

        // --- ГЛОБАЛЬНЫЕ СОБЫТИЯ (РАБОТАЮТ ДЛЯ ВСЕХ) ---
        const handleGlobalReload = (data) => {
            console.log('[App] 📨 Получено событие system:global_reload:', data);
            const delay = (data.delay || 2000) + Math.random() * (data.jitter || 3000);

            setForceLogoutState({
                isActive: true,
                reason: `Система обновляется. Перезагрузка через ${Math.ceil(delay / 1000)} сек.`,
                redirectDelay: delay
            });

            setTimeout(() => window.location.replace("/"), delay);
        };

        socket.on('system:global_reload', handleGlobalReload);


        // --- СОБЫТИЯ ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ ---
        if (user.isAuth && user.user?.id) {
            const handleForceLogoutEvent = (data) => {
                console.log('[App] 📨 Получено событие session:force_logout:', data);
                const currentSessionId = storageHandler.get('sessionId', 'localStorage');
                const myId = String(currentSessionId || '');
                const targetId = data.targetSessionId ? String(data.targetSessionId) : null;

                let shouldLogout = false;
                if (data.targetType === 'all') shouldLogout = true;
                else if (data.targetType === 'specific') shouldLogout = (myId === targetId);
                else if (data.targetType === 'exclude') shouldLogout = (myId !== targetId && myId !== '');

                if (shouldLogout) {
                    const baseDelay = data.delay || 5000;
                    const jitter = data.jitter || 0;
                    const randomDelay = baseDelay + Math.random() * jitter;
                    console.log(`[App] 🚪 Выход через ${Math.round(randomDelay / 1000)} сек.`);
                    handleForceLogout(data.reason, randomDelay);
                } else {
                    window.dispatchEvent(new CustomEvent('sessions_updated'));
                }
            };

            socket.on('session:force_logout', handleForceLogoutEvent);

            // --- СИСТЕМНЫЕ СОБЫТИЯ БЕЗОПАСНОСТИ ---

            // Превышен лимит запросов
            socket.on('system:rate_limit_exceeded', (data) => {
                console.warn('[App]  Превышен лимит запросов для события:', data.event);
                showToast(`Слишком много запросов. Подождите ${data.retryAfter} сек.`, 'warning');
            });

            // Требуется переподключение
            socket.on('system:reconnect_required', (data) => {
                console.warn('[App]  Требуется переподключение:', data.reason);
                disconnectSocket();
                setTimeout(() => {
                    initSocket(); // Переподключаемся
                }, 1000);
            });

            // ОБНОВЛЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ (Смена статуса/прав)
            socket.on('system:refresh_user_data', async (data) => {
                console.log('[App] 📨 Получено событие system:refresh_user_data:', data);

                try {
                    // Вызываем check(), который сам разберётся с токенами и правами
                    const updatedUserData = await check(user);

                    if (updatedUserData) {
                        user.setUser(updatedUserData);
                        user.setIsAuth(true);
                        console.log('[App]  Данные пользователя успешно обновлены');

                        // Показываем toast (убедись, что showToast доступен в этой области видимости)
                        showToast(data.reason || 'Ваши данные были обновлены', 'info');
                    }
                } catch (err) {
                    // Если check() упал (например, токен отозван одновременно со сменой статуса), 
                    // мы просто выбрасываем пользователя. Это безопасно.
                    console.error('[App] ❌ Ошибка обновления данных (вероятно, сессия отозвана), выполняется выход:', err);
                    handleForceLogout('Ваша сессия была завершена из-за изменения прав доступа', 3000);
                }
            });

            // --- СОБЫТИЯ УВЕДОМЛЕНИЙ ---
            socket.on('notification:new', (data) => {
                notification.handleNewNotification(data);
            });

            socket.on('notification:read', (data) => {
                notification.handleReadNotification(data.id);
            });

            socket.on('notification:read_all', (data) => {
                notification.handleReadAll(data.type);
            });

            socket.on('notification:settings_changed', () => {
                notification.handleSettingsChanged();
            });

            // Очистка только для auth-событий при изменении статуса
            return () => {
                socket.off('system:global_reload', handleGlobalReload);
                socket.off('session:force_logout', handleForceLogoutEvent);
                socket.off('system:refresh_user_data');
                // Очистка уведомлений
                socket.off('notification:new');
                socket.off('notification:read');
                socket.off('notification:read_all');
                socket.off('notification:settings_changed');
            };
        }

        // Очистка для гостей (только глобальные события)
        return () => {
            socket.off('system:global_reload', handleGlobalReload);
        };

    }, [user.isAuth, user.user?.id, handleForceLogout]);

    //   // Хук для проверки доступов — без перечислений, динамически
    const checkAccess = useAccessChecker();

    // Проверка пользователя при загрузке
    useEffect(() => {
        setTimeout(() => {
            check(user)
                .then((data) => {
                    if (data) {
                        user.setUser(data);
                        user.setIsAuth(true);
                        // Загружаем уведомления при успешном логине/проверке
                        if (notification) {
                            notification.loadInitialData();
                        }
                    }
                })
                .finally(() => setLoading(false));
        }, 0);
    }, [user]); // Можно добавить notification в зависимости, но он не меняется

    //   useEffect(() => {
    //     const userId = user?.user?.id;
    //     if (!userId || !socket) return;

    //     const event = "updateUserData" + userId;

    //     // Ensure no duplicate listeners
    //     socket.off(event);

    //     // async handler wrapper
    //     const handler = async (data) => {
    //       try {
    //         console.log("Новое обновление по сокету:", data);
    //         const updatedUserData = await refreshToken();
    //         if (updatedUserData) {
    //           user.setUser(updatedUserData);
    //           user.setIsAuth(true);
    //         }
    //       } catch (err) {
    //         console.error("refreshToken failed:", err);
    //         // Если обновление токена не удалось, перенаправляем на логин
    //         user.setUser({});
    //         user.setIsAuth(false);
    //       }
    //     };

    //     socket.on(event, handler);

    //     // cleanup on unmount or dependency change
    //     return () => {
    //       if (socket) {
    //         socket.off(event, handler);
    //       }
    //     };
    //   }, [user?.user?.id, user]);

    //   useEffect(() => {
    //     const userId = user?.user?.id;
    //     if (!userId || !socket) return;

    //     const event = "updateUserDataForSession" + storageHandler.get("sessionId");

    //     // Ensure no duplicate listeners
    //     if (socket) {
    //       socket.off(event);
    //     }

    //     // async handler wrapper
    //     const handler = async (data) => {
    //       try {
    //         console.log("Новое обновление по сокету 2:", data);
    //         const updatedUserData = await refreshToken();
    //         if (updatedUserData) {
    //           user.setUser(updatedUserData);
    //           user.setIsAuth(true);
    //         }
    //       } catch (err) {
    //         console.error("refreshToken failed 2:", err);
    //         // Если обновление токена не удалось, перенаправляем на логин
    //         user.setUser({});
    //         user.setIsAuth(false);
    //       }
    //     };

    //     if (socket) {
    //       socket.on(event, handler);
    //     }
    //     console.log("+++++ 2:", event);

    //     // cleanup on unmount or dependency change
    //     return () => {
    //       if (socket) {
    //         socket.off(event, handler);
    //       }
    //     };
    //   }, [user?.user?.id, user, storageHandler.get("sessionId")]);

    //   useEffect(() => {
    //     setUpdateUserCallback((userData) => {
    //       user.setUser(userData);
    //     });
    //   }, [user]);

    // Функция проверки админа
    const isUserAdmin = () => {
        if (!user.isAuth || !user.user) return false;
        return ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"].includes(user.user.status);
    };

    // Передача функций глобально
    useEffect(() => {
        setToast(showToast);
        setErrorModal(showErrorModal);
        setUserCheck(isUserAdmin);
    }, [showToast, showErrorModal, user.isAuth, user.user]);

    //   // Динамическая высота ПОЛНОГО header (header + строка объявлений)
    //   useEffect(() => {
    //     const updateHeight = () => {
    //       if (headerRef.current) {
    //         setHeaderHeight(headerRef.current.offsetHeight); // total: header ~60px + строка ~72px+
    //       }
    //     };
    //     const rafId = requestAnimationFrame(updateHeight); // smooth
    //     window.addEventListener("resize", updateHeight);
    //     // Update on announcements change (via ResizeObserver)
    //     const resizeObserver = new ResizeObserver(updateHeight);
    //     if (headerRef.current) resizeObserver.observe(headerRef.current);
    //     return () => {
    //       window.removeEventListener("resize", updateHeight);
    //       resizeObserver.disconnect();
    //       cancelAnimationFrame(rafId);
    //     };
    //   }, []);

    const isAuth = user.isAuth;

    // Проверка ролей
    const hasRole = (roles) => {
        if (!roles || roles.length === 0) return false;
        if (!isAuth && roles.includes("UNAUTHORIZED")) return true;
        if (isAuth && roles.includes(user.user.status)) return true;
        return false;
    };

    // Функция проверки доступа к фичам — использует динамический checkAccess
    const hasFeatureAccess = (accessList) => {
        if (!accessList || accessList.length === 0) return true;
        return accessList.every((acc) => checkAccess(acc));
    };

    const routesConfig = [
        {
            path: "/",
            roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="main"
                    loadingPageStatus={loading}
                    header={{
                        title: "Главная",
                        subtitle: "Система управления инцидентами и чёрными списками"
                    }}
                />
            )
        },
        {
            path: "/users",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="users"
                    loadingPageStatus={loading}
                    header={{
                        title: "Пользователи",
                        subtitle: "Управление учетными записями и правами доступа"
                    }}
                />
            )
        },
        {
            path: "/about",
            roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="about"
                    loadingPageStatus={loading}
                    header={{
                        title: "О проекте",
                        subtitle: "Что мы такое"
                    }}
                />
            )
        },
        {
            path: "/incidents",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="incidents_list"
                    loadingPageStatus={loading}
                    header={{
                        title: "Инциденты",
                        subtitle: "Список всех зарегистрированных инцидентов"
                    }}
                />
            )
        },
        {
            path: "/incidents/new",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="incident_form"
                    loadingPageStatus={loading}
                    header={{
                        title: "Сообщить о нарушении",
                        subtitle: "Сообщить о новом нарушении сотрудника или администрации ПВЗ"
                    }}
                />
            )
        },
        {
            path: "/reportPVZ",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="incident_form"
                    loadingPageStatus={loading}
                    header={{
                        title: "Сообщить о нарушении",
                        subtitle: "Сообщить о новом нарушении сотрудника или администрации ПВЗ"
                    }}
                />
            )
        },
        {
            path: "/report",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="incident_form"
                    loadingPageStatus={loading}
                    header={{
                        title: "Сообщить о нарушении",
                        subtitle: "Сообщить о новом нарушении сотрудника или администрации ПВЗ"
                    }}
                />
            )
        },
        {
            path: "/profile",
            roles: ["USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="profile"
                    loadingPageStatus={loading}
                    header={{
                        title: "Профиль",
                        subtitle: "Мой профиль"
                    }}
                />
            )
        },
        {
            path: "/incidents/:id",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="incident_detail"
                    loadingPageStatus={loading}
                    header={{
                        title: "Инцидент",
                        subtitle: "Детальная информация об инциденте"
                    }}
                />
            )
        },
        {
            path: "/incidents/:id/edit",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="incident_form"
                    loadingPageStatus={loading}
                    header={{
                        title: "Редактировать инцидент",
                        subtitle: "Внесите изменения в информацию об инциденте"
                    }}
                />
            )
        },
        {
            path: "/contestation/:id",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="contestation_detail"
                    loadingPageStatus={loading}
                    header={{
                        title: "Оспаривание",
                        subtitle: "Детальная информация об оспаривании"
                    }}
                />
            )
        },
        {
            path: "/users/:login",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], // Или ваши роли для админов
            component: (
                <AuPageLayout
                    type="user_profile"
                    loadingPageStatus={loading}
                    header={{
                        title: "Профиль пользователя",
                        subtitle: "Детальная информация и управление учетной записью"
                    }}
                />
            )
        },
        // {
        //     path: "/persons",
        //     roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], // Можешь изменить роли под свою логику
        //     component: (
        //         <AuPageLayout
        //             type="persons_search"
        //             loadingPageStatus={loading}
        //             header={{
        //                 title: "Поиск персон",
        //                 subtitle: "Поиск по базе данных инцидентов и чёрных списков"
        //             }}
        //         />
        //     )
        // },
        // {
        //     path: "/search/incidents",
        //     roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
        //     component: <AuPageLayout type="incidents_search" loadingPageStatus={loading} />
        // },
        {
            path: "/search/pvz",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout type="pvz_search" loadingPageStatus={loading} header={{
                title: "Проверка ПВЗ",
                subtitle: "Проверьте ПВЗ в чёрном списке"
            }} />
        },
        {
            path: "/check-person",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout type="check_person" loadingPageStatus={loading} header={{
                title: "Проверка человека",
                subtitle: "Проверьте человека в чёрном списке"
            }} />
        },

        // Публичные страницы доната (для всех)
        // {
        //     path: "/donate",
        //     roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"],
        //     component: <DonationPage />
        // },
        // {
        //     path: "/donation/my",
        //     roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"],
        //     component: <MyDonationPage />
        // },
        // {
        //     path: "/donation/login",
        //     roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"],
        //     component: <DonationLoginPage />
        // },

        // // Админка донатов
        // {
        //     path: "/admin/donations",
        //     roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"],
        //     component: <AuPageLayout
        //         type="admin_donations"
        //         loadingPageStatus={loading}
        //         header={{
        //             title: "Администрирование донатов",
        //             subtitle: "Управление заявками, пакетами и плюшками"
        //         }}
        //     />
        // },

        {
            path: "/admin",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], // Только для админов/разработчиков
            component: <AuPageLayout
                type="admin_dashboard"
                loadingPageStatus={loading}
                header={{
                    title: "Админ панель",
                    subtitle: "Главная админ панель"
                }}
            />
        },
        {
            path: "/admin/kanban",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout
                type="admin_kanban"
                loadingPageStatus={loading}
                header={{
                    title: "Канбан доска",
                    subtitle: "Управление статусами инцидентов (Drag & Drop)"
                }}
            />
        },
        {
            path: "/admin/settings",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout
                type="admin_settings"
                loadingPageStatus={loading}
                header={{
                    title: "Настройки справочников",
                    subtitle: "Управление причинами, должностями и типами ПВЗ"
                }}
            />
        },
        {
            path: "/admin/permissions",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="permissions"
                    loadingPageStatus={loading}
                    header={{ title: "Системные права", subtitle: "Управление потолком и дефолтными правами ролей" }}
                />
            )
        },
        {
            path: "/admin/critActions",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout
                type="critActions"
                loadingPageStatus={loading}
                header={{
                    title: "Критические действия",
                    subtitle: "Критические действия"
                }}
            />
        },
        {
            path: "/verify/:token",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout
                type="verify"
                loadingPageStatus={loading}
                header={{
                    title: "Проверка достоверности отчёта",
                    subtitle: "Проверка достоверности отчёта"
                }}
            />
        },
        {
            path: "/admin/av",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout
                type="av"
                loadingPageStatus={loading}
                header={{
                    title: "Антивирус",
                    subtitle: "Антивирус"
                }}
            />
        },
        {
            path: "/admin/singleFile",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout
                type="singleFile"
                loadingPageStatus={loading}
                header={{
                    title: "Статические файлы",
                    subtitle: "Управление статическими файлами"
                }}
            />
        },
        {
            path: "/policies",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="policies_list"
                    loadingPageStatus={loading}
                    header={{
                        title: "Политики",
                        subtitle: "Правила и условия использования системы"
                    }}
                />
            )
        },
        {
            path: "/policies/:type",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="policy_detail"
                    loadingPageStatus={loading}
                    header={{
                        title: "Политика",
                        subtitle: "Просмотр и редактирование политики"
                    }}
                />
            )
        },
        {
            path: "/policies/:type/v/:version",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="policy_detail"
                    loadingPageStatus={loading}
                    header={{
                        title: "Архивная версия",
                        subtitle: "Просмотр истории изменений политики"
                    }}
                />
            )
        },
        {
            path: "/systemVersions",
            roles: ["UNAUTHORIZED", "USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="system_versions"
                    loadingPageStatus={loading}
                    header={{
                        title: "История версий",
                        subtitle: "Список обновлений и изменений в системе"
                    }}
                />
            )
        },
        {
            path: "/admin/systemVersions",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="system_versions_admin"
                    loadingPageStatus={loading}
                    header={{
                        title: "Управление версиями",
                        subtitle: "Создание и администрирование релизов"
                    }}
                />
            )
        },
        {
            path: "/admin/settingsMain",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"], // Или ["ADMINISTRATOR", "DEVELOPER"], если нужно расширить доступ
            component: (
                <AuPageLayout
                    type="settingsMain"
                    loadingPageStatus={loading}
                    header={{
                        title: "Настройки системы",
                        subtitle: "Управление конфигурацией и параметрами приложения"
                    }}
                />
            )
        },

        {
            path: "/notifications",
            roles: ["USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"],
            component: (
                <AuPageLayout
                    type="notifications"
                    loadingPageStatus={loading}
                    header={{
                        title: "Уведомления",
                        subtitle: "История всех ваших уведомaний"
                    }}
                />
            )
        },
        {
            path: "/settings/notifications",
            roles: ["USER", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR", "MODERATOR"],
            component: (
                <AuPageLayout
                    type="notification_settings"
                    loadingPageStatus={loading}
                    header={{
                        title: "Настройки уведомлений",
                        subtitle: "Управление способами получения уведомлений"
                    }}
                />
            )
        },
        {
            path: "/admin/notifications",
            roles: ["DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: (
                <AuPageLayout
                    type="admin_notifications"
                    loadingPageStatus={loading}
                    header={{
                        title: "Управление уведомления",
                        subtitle: "Настройка групп, шаблонов и массовых рассылок"
                    }}
                />
            )
        },

        // Маршрут 404: свойство header ОТСУТСТВУЕТ, поэтому хедер не отобразится
        {
            path: "*",
            roles: ["UNAUTHORIZED", "DEVELOPER", "TOP_LEVEL_DEVELOPER", "TOP_LEVEL_ADMINISTRATOR", "ADMINISTRATOR"],
            component: <AuPageLayout type="NF" loadingPageStatus={loading} />
        },
    ];

    return (
        //     <div className="App">
        //       {loading && <LoaderPage />}

        //       {/* Header с ref для измерения высоты */}
        //       <Header ref={headerRef} />

        //       {/* Контент с динамическим paddingTop под ПОЛНЫЙ header + строка */}
        //       <main style={{ paddingTop: headerHeight }}>
        // <Routes>
        //   {routesConfig.map((route, idx) => {
        //     if (!route) return null;
        //     const canAccess = hasRole(route.roles) && hasFeatureAccess(route.access);
        //     return (
        //       <Route
        //         key={idx}
        //         path={route.path}
        //         element={
        //           canAccess
        //             ? (changePasswordFlag ? <ChangePass setChangePasswordFlag={setChangePasswordFlag} /> : route.component)
        //             : <NotFound loadingPageStatus={loading} />
        //         }
        //       />
        //     );
        //   })}
        // </Routes>
        //       </main>

        //       {/* Глобальные уведомления */}
        //       <MessageToastContainer />

        //       {/* Модальное окно с детальной информацией об ошибках для админов */}
        //       {errorModal && <ErrorModal error={errorModal} onClose={closeErrorModal} />}

        //       <Footer />
        //     </div>
        <div style={{ width: '100%', minHeight: '100vh' }}>
            <Routes>
                {routesConfig.map((route, idx) => {
                    if (!route) return null;
                    const canAccess = hasRole(route.roles) && hasFeatureAccess(route.access);
                    return (
                        <Route
                            key={idx}
                            path={route.path}
                            element={
                                canAccess
                                    ? route.component
                                    : <AuPageLayout type="NF" loadingPageStatus={loading} />
                            }
                        />
                    );
                })}
            </Routes>

            {/* Глобальные уведомления */}
            <MessageToastContainer />

            {/* Модальное окно с детальной информацией об ошибках для админов */}
            {errorModal && <ErrorModal error={errorModal} onClose={closeErrorModal} />}

            <NotificationToastContainer />

            {/* Глобальные стили */}
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body, #root { min-height: 100vh; width: 100%; }
                body { background: #0f1117; color: #e2e8f0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-font-smoothing: antialiased; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
                input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
                select option { background: #1e2030; color: #e2e8f0; }
                button { font-family: inherit; }
                button:hover:not(:disabled) { filter: brightness(1.1); }
                
                /* Адаптив для мобильных */
                @media (max-width: 900px) {
                    .desktop-sidebar { display: none !important; }
                    .main-content { margin-left: 0 !important; }
                    .mobile-topbar { display: flex !important; }
                }
            `}</style>
            {forceLogoutState.isActive && (
                <ForceLogoutOverlay
                    reason={forceLogoutState.reason}
                    delay={forceLogoutState.redirectDelay} // <-- ПЕРЕДАЕМ ЗАДЕРЖКУ!
                    onConfirm={executeFinalRedirect}
                />
            )}
        </div>
    );
});

export default App;