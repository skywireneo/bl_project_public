import React, { useContext } from "react";
import Footer from "../footer/Footer";
import MainPageLayout from "../mainPage/MainPageLayout";
import NotFound from "../NotFound";
import AuMenu from "./AuMenu";
import Header from "../header/Header"; // <-- Добавлен импорт
import UsersList from "./userList/UsersList";
import AboutPage from "./AboutPage";
import IncidentsListPage from "../incidents/IncidentsListPage";
import IncidentDetailPage from "../incidents/IncidentDetailPage";
import ContestationDetailPage from "../incidents/ContestationDetailPage";
import IncidentFormPage from "../incidents/IncidentFormPage";
import PersonsSearchPage from "../persons/PersonsSearchPage";
import IncidentsSearchPage from "../search/IncidentsSearchPage";
import PvzSearchPage from "../search/PvzSearchPage";
import CheckPersonPage from "../search/CheckPersonPage";
import AdminDashboardPage from "../admin/AdminDashboardPage";
import KanbanBoardPage from "../admin/KanbanBoardPage";
import AdminSettingsPage from "../admin/AdminSettingsPage";
import PoliciesListPage from "./policy/PoliciesListPage";
import PolicyDetailPage from "./policy/PolicyDetailPage";
import SystemVersionsAdminPage from "./systemVersions/SystemVersionsAdminPage";
import SystemVersionsPage from "./systemVersions/SystemVersionsPage";
import SettingsPage from "../settings/SettingsPage";
import AntivirusDashboard from "./unifiedFiles/av/AntivirusDashboard";
import SingleFileManager from "./unifiedFiles/singleFiles/SingleFileManager";
import CriticalActionsPage from "./criticalActions/CriticalActionsPage";
import DonationAdminPage from "../donation/admin/DonationAdminPage";
import VerifyPage from "../search/VerifyPage";
import UserProfile from "./userList/UserProfile";
import MaintenanceBanner from "./criticalActions/MaintenanceBanner";
import RolePermissionsPage from "./permissions/RolePermissionsPage";
import NotificationBell from "../notifications/NotificationBell";
import { Context } from "../..";
import NotificationsPage from "../notifications/NotificationsPage";
import NotificationSettingsPage from "../notifications/NotificationSettingsPage";
import AdminNotificationsPage from "../notifications/AdminNotificationsPage";

function AuPageLayout(props) {
    // Деструктуризируем header из props, остальные пропсы собираем в rest
    const { header, type, compact, headerHeight, ...restProps } = props;
    const { user } = useContext(Context);
    // console.log(type)

    return (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
            {/* Боковое меню */}
            <AuMenu active={type} compact={compact} headerHeight={headerHeight || 0} />

            {/* Основной контент */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
            }} className="main-content">

                {/* Модифицируем вызов Header, добавляя колокольчики в actions */}
                {header && (
                    <Header
                        {...header}
                        actions={
                            <>
                                {user.isAuth && (
                                    <>
                                        <NotificationBell type="user" />
                                        {/* Второй колокольчик только для сотрудников */}
                                        {(user.user?.is_staff || true) && <NotificationBell type="staff" />}// TODO УБРАТЬ true
                                    </>
                                )}
                                {/* Если в App.js передадут свои actions, они добавятся справа */}
                                {header.actions}
                            </>
                        }
                    />
                )}

                <MaintenanceBanner />

                {/* Область рендеринга страниц */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 3vw, 32px)' }}>
                    {type === 'main' && <MainPageLayout />}
                    {type === 'about' && <AboutPage />}
                    {type === 'users' && <UsersList />}
                    {type === 'profile' && <UserProfile />}
                    {type === 'user_profile' && <UserProfile />}
                    {type === 'incidents_list' && <IncidentsListPage />}
                    {type === 'incident_detail' && <IncidentDetailPage id={restProps.incidentId} />}
                    {type === 'incident_form' && <IncidentFormPage editId={restProps.editId} />}
                    {type === 'contestation_detail' && <ContestationDetailPage />}
                    {type === 'persons_search' && <PersonsSearchPage />}
                    {type === 'incidents_search' && <IncidentsSearchPage />}
                    {type === 'pvz_search' && <PvzSearchPage />}
                    {type === 'check_person' && <CheckPersonPage />}
                    {type === 'admin_dashboard' && <AdminDashboardPage />}
                    {type === 'admin_kanban' && <KanbanBoardPage />}
                    {type === 'av' && <AntivirusDashboard />}
                    {type === 'singleFile' && <SingleFileManager />}
                    {type === 'admin_settings' && <AdminSettingsPage />}
                    {type === 'policies_list' && <PoliciesListPage />}
                    {type === 'policy_detail' && <PolicyDetailPage />}
                    {type === 'system_versions' && <SystemVersionsPage />}
                    {type === 'critActions' && <CriticalActionsPage />}
                    {type === 'system_versions_admin' && <SystemVersionsAdminPage />}
                    {type === 'settingsMain' && <SettingsPage />}
                    {type === 'permissions' && <RolePermissionsPage />}
                    {type === 'admin_donations' && <DonationAdminPage />}
                    {type === 'verify' && <VerifyPage />}
                    {type === 'notifications' && <NotificationsPage />}
                    {type === 'notification_settings' && <NotificationSettingsPage />}
                    {type === 'admin_notifications' && <AdminNotificationsPage />}
                    {type === 'NF' && <NotFound />}

                    {/* Здесь будут раскомментированы ваши страницы */}
                </div>

                <Footer />
            </div>
        </div>
    );
}

export default AuPageLayout;