import { motion, AnimatePresence } from "motion/react";
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

/** Animated page wrapper for tab transitions — slide + fade like a presentation. */
function PageTransition({ tabKey, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -16, scale: 0.99, filter: "blur(2px)" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Tab panels by role + active tab (single-page routing). */
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
    deleteLead,
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
    enrollmentBucket,
    setEnrollmentBucket,
    statusMulti,
    toggleStatus,
    callStatusOtherOnly,
    setCallStatusOtherOnly,
    callStatusGroups,
    toggleCallStatusGroup,
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
    worstMaxDays,
    setWorstMaxDays,
    loadReport,
    downloadReportExport,
    downloadReportExportTotal,
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

      <PageTransition tabKey={tab}>
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
            nowLabel={app.nowLabel}
            report={report}
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
            enrollmentBucket={enrollmentBucket}
            setEnrollmentBucket={setEnrollmentBucket}
            overdueOnly={overdueOnly}
            setOverdueOnly={setOverdueOnly}
            uncontactedOnly={uncontactedOnly}
            setUncontactedOnly={setUncontactedOnly}
            statusMulti={statusMulti}
            toggleStatus={toggleStatus}
            callStatusOtherOnly={callStatusOtherOnly}
            setCallStatusOtherOnly={setCallStatusOtherOnly}
            callStatusGroups={callStatusGroups}
            toggleCallStatusGroup={toggleCallStatusGroup}
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
            deleteLead={deleteLead}
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
            appendNote={appendNote}
            updateContactCallStatus={updateContactCallStatus}
            uploading={uploading}
            onUpload={app.onUpload}
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
            worstMaxDays={worstMaxDays}
            setWorstMaxDays={setWorstMaxDays}
            loadReport={loadReport}
            downloadReportExport={downloadReportExport}
            downloadReportExportTotal={downloadReportExportTotal}
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
      </PageTransition>
    </>
  );
}
