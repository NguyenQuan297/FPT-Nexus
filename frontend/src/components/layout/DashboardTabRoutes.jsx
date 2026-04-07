import ToastStack from "../common/ToastStack";
import DashboardTab from "../tabs/DashboardTab";
import LeadsTab from "../tabs/LeadsTab";
import UsersTab from "../tabs/UsersTab";
import ReportsTab from "../tabs/ReportsTab";
import SettingsTab from "../tabs/SettingsTab";
import SalesHomeTab from "../tabs/SalesHomeTab";
import SalesLeadsTab from "../tabs/SalesLeadsTab";
import NotificationsTab from "../tabs/NotificationsTab";
import { styles } from "../../styles/appStyles";

/**
 * Chọn tab nội dung theo `user.role` + `tab` (router thủ công trong SPA).
 * Props lấy từ `useDashboardApp()` — gom một object để file này chỉ lo JSX.
 */
export default function DashboardTabRoutes({ app }) {
  const {
    user,
    tab,
    setTab,
    err,
    toasts,
    stats,
    trend7,
    contactRate7,
    conversionRate7,
    chartProgress,
    applySalesPreset,
    leads,
    activeLead,
    setActiveLeadId,
    phone,
    setPhone,
    overdueOnly,
    setOverdueOnly,
    uncontactedOnly,
    setUncontactedOnly,
    load,
    markContacted,
    appendNote,
    updateLeadStatus,
    updateContactCallStatus,
    saveNotes,
    leadsPage,
    totalLeadPages,
    setLeadsPage,
    leadsTotal,
    notifs,
    loadNotifs,
    setErr,
    totalLeads,
    uncontacted,
    overdueCount,
    contactedToday,
    slaCompliance,
    assigned,
    setAssigned,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statusMulti,
    toggleStatus,
    selected,
    selectedCount,
    currentPageAllSelected,
    toggleSelectAllCurrentPage,
    selectAllByCurrentFilter,
    bulkAction,
    setBulkAction,
    bulkAssignUser,
    setBulkAssignUser,
    assigneeChoices,
    bulkInterest,
    setBulkInterest,
    bulkFollowUpAt,
    setBulkFollowUpAt,
    bulkApplyFiltered,
    setBulkApplyFiltered,
    bulkOnlyOverdue,
    setBulkOnlyOverdue,
    bulkOnlyUncontacted,
    setBulkOnlyUncontacted,
    bulkWorking,
    runBulkAction,
    setSelected,
    assigneeOptions,
    toggleSelect,
    assignPick,
    setAssignPick,
    doAssign,
    pageInput,
    setPageInput,
    commitPageInput,
    newUser,
    setNewUser,
    createUser,
    users,
    patchUser,
    repY,
    setRepY,
    repM,
    setRepM,
    worstMinDays,
    setWorstMinDays,
    worstMaxDays,
    setWorstMaxDays,
    loadReport,
    downloadReportExport,
    report,
    syncMeta,
    runExcelSync,
    downloadLatestSync,
    logout,
    uploading,
  } = app;

  return (
    <>
      {err && <div style={styles.error}>{err}</div>}
      {user.role === "admin" && totalLeads === 0 && !uploading && (
        <div style={styles.banner}>Vui lòng tải file Excel để hiển thị dữ liệu vận hành.</div>
      )}
      <ToastStack toasts={toasts} />

      {user.role === "sale" && tab === "sales-home" && (
        <SalesHomeTab
          stats={stats}
          trend7={trend7}
          contactRate7={contactRate7}
          conversionRate7={conversionRate7}
          chartProgress={chartProgress}
          onOpenMyLeads={() => {
            applySalesPreset("all");
            setTab("sales-leads");
          }}
          onOpenOverdueLeads={() => {
            applySalesPreset("overdue");
            setTab("sales-leads");
          }}
        />
      )}

      {user.role === "sale" && tab === "sales-leads" && (
        <SalesLeadsTab
          visibleLeads={leads}
          activeLead={activeLead}
          setActiveLeadId={setActiveLeadId}
          phone={phone}
          setPhone={setPhone}
          overdueOnly={overdueOnly}
          setOverdueOnly={setOverdueOnly}
          uncontactedOnly={uncontactedOnly}
          setUncontactedOnly={setUncontactedOnly}
          onApplyFilters={() => load()}
          markContacted={markContacted}
          appendNote={appendNote}
          updateLeadStatus={updateLeadStatus}
          updateContactCallStatus={updateContactCallStatus}
          saveNotes={saveNotes}
          leadsPage={leadsPage}
          totalLeadPages={totalLeadPages}
          setLeadsPage={setLeadsPage}
          leadsTotal={leadsTotal}
          applySalesPreset={applySalesPreset}
        />
      )}

      {user.role === "sale" && tab === "notifications" && (
        <NotificationsTab notifs={notifs} loadNotifs={loadNotifs} setErr={setErr} />
      )}

      {tab === "dashboard" && user.role === "admin" && (
        <DashboardTab
          user={user}
          totalLeads={totalLeads}
          uncontacted={uncontacted}
          overdueCount={overdueCount}
          contactedToday={contactedToday}
          slaCompliance={slaCompliance}
          visibleStats={stats}
          trend7={trend7}
          contactRate7={contactRate7}
          conversionRate7={conversionRate7}
          chartProgress={chartProgress}
          onOpenLeads={() => {
            setTab("leads");
            setOverdueOnly(false);
            load();
          }}
        />
      )}

      {tab === "leads" && user.role === "admin" && (
        <LeadsTab
          user={user}
          assigned={assigned}
          setAssigned={setAssigned}
          phone={phone}
          setPhone={setPhone}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          overdueOnly={overdueOnly}
          setOverdueOnly={setOverdueOnly}
          statusMulti={statusMulti}
          toggleStatus={toggleStatus}
          onApplyFilters={() => load()}
          selected={selected}
          selectedCount={selectedCount}
          currentPageAllSelected={currentPageAllSelected}
          onToggleSelectAllCurrentPage={toggleSelectAllCurrentPage}
          onSelectAllButton={selectAllByCurrentFilter}
          bulkAction={bulkAction}
          setBulkAction={setBulkAction}
          bulkAssignUser={bulkAssignUser}
          setBulkAssignUser={setBulkAssignUser}
          assigneeChoices={assigneeChoices}
          bulkInterest={bulkInterest}
          setBulkInterest={setBulkInterest}
          bulkFollowUpAt={bulkFollowUpAt}
          setBulkFollowUpAt={setBulkFollowUpAt}
          bulkApplyFiltered={bulkApplyFiltered}
          setBulkApplyFiltered={setBulkApplyFiltered}
          bulkOnlyOverdue={bulkOnlyOverdue}
          setBulkOnlyOverdue={setBulkOnlyOverdue}
          bulkOnlyUncontacted={bulkOnlyUncontacted}
          setBulkOnlyUncontacted={setBulkOnlyUncontacted}
          bulkWorking={bulkWorking}
          onRunBulkAction={runBulkAction}
          onClearSelection={() => setSelected({})}
          assigneeOptions={assigneeOptions}
          visibleLeads={leads}
          setActiveLeadId={setActiveLeadId}
          toggleSelect={toggleSelect}
          markContacted={markContacted}
          assignPick={assignPick}
          setAssignPick={setAssignPick}
          doAssign={doAssign}
          leadsPage={leadsPage}
          totalLeadPages={totalLeadPages}
          pageInput={pageInput}
          setPageInput={setPageInput}
          commitPageInput={commitPageInput}
          setLeadsPage={setLeadsPage}
          leadsTotal={leadsTotal}
          activeLead={activeLead}
          saveNotes={saveNotes}
          updateContactCallStatus={updateContactCallStatus}
        />
      )}

      {tab === "users" && user.role === "admin" && (
        <UsersTab
          newUser={newUser}
          setNewUser={setNewUser}
          createUser={createUser}
          users={users}
          assigneeOptions={assigneeOptions}
          patchUser={patchUser}
        />
      )}

      {tab === "reports" && user.role === "admin" && (
        <ReportsTab
          repY={repY}
          setRepY={setRepY}
          repM={repM}
          setRepM={setRepM}
          worstMinDays={worstMinDays}
          setWorstMinDays={setWorstMinDays}
          worstMaxDays={worstMaxDays}
          setWorstMaxDays={setWorstMaxDays}
          loadReport={loadReport}
          downloadReportExport={downloadReportExport}
          setErr={setErr}
          report={report}
        />
      )}

      {tab === "settings" && user.role === "admin" && (
        <SettingsTab
          user={user}
          syncMeta={syncMeta}
          runExcelSync={runExcelSync}
          downloadLatestSync={downloadLatestSync}
          setErr={setErr}
          onLogout={logout}
        />
      )}
    </>
  );
}
