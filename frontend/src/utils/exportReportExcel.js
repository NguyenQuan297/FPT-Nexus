import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  orangeDark: "FF7A2B00",
  orangeBg: "FFFFF3E0",
  orange: "FFF97316",
  orangeLight: "FFFED7AA",
  headerBg: "FF1E293B",
  headerFg: "FFFFFFFF",
  blueBg: "FF3B82F6",
  blueLight: "FFDBEAFE",
  totBg: "FFF1F5F9",
  totFg: "FF0F172A",
  rowAlt: "FFFAFAFA",
  rowBase: "FFFFFFFF",
  greenFg: "FF16A34A",
  redFg: "FFDC2626",
  purpleFg: "FF7C3AED",
  blueFg: "FF2563EB",
  slateFg: "FF475569",
};

// ── Style helpers ───────────────────────────────────────────────────────────
function headerStyle(bgArgb, fgArgb = C.headerFg) {
  return {
    font: { bold: true, color: { argb: fgArgb }, name: "Calibri", size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    },
  };
}

function cellStyle(bgArgb, fgArgb, bold = false, alignH = "center") {
  return {
    font: { bold, color: { argb: fgArgb }, name: "Calibri", size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } },
    alignment: { horizontal: alignH, vertical: "middle" },
    border: {
      top: { style: "hair", color: { argb: "FFE2E8F0" } },
      bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
      left: { style: "hair", color: { argb: "FFE2E8F0" } },
      right: { style: "hair", color: { argb: "FFE2E8F0" } },
    },
  };
}

function totalsStyle(fgArgb, alignH = "center") {
  return {
    font: { bold: true, color: { argb: fgArgb }, name: "Calibri", size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: C.totBg } },
    alignment: { horizontal: alignH, vertical: "middle" },
    border: {
      top: { style: "medium", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    },
  };
}

function isHaiPhong(name) {
  return (name || "").toLowerCase().includes("hải phòng") || (name || "").toLowerCase().includes("hai phong");
}

function regRate(reg, total) {
  return total === 0 ? "0.0%" : `${((reg / total) * 100).toFixed(1)}%`;
}

// ── Sheet title row helper ──────────────────────────────────────────────────
function addSheetTitle(ws, title, colCount, dateFrom, dateTo) {
  ws.mergeCells(1, 1, 1, colCount);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.style = {
    font: { bold: true, size: 13, color: { argb: C.headerFg }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, colCount);
  const d = ws.getCell(2, 1);
  d.value = `Kỳ báo cáo: ${dateFrom} — ${dateTo}`;
  d.style = {
    font: { italic: true, size: 9, color: { argb: "FF64748B" }, name: "Calibri" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };
  ws.getRow(2).height = 18;
}

// ── Sheet 1: Tổng quan ─────────────────────────────────────────────────────
function buildSummarySheet(wb, sla, conv, dateFrom, dateTo) {
  const ws = wb.addWorksheet("Tổng quan", { properties: { tabColor: { argb: C.orange } } });

  const totalLeads = conv.reduce((s, r) => s + r.totalLeads, 0);
  const totalReg = conv.reduce((s, r) => s + r.reg, 0);
  const totalLate = sla.reduce((s, r) => s + r.lateLeads, 0);
  const hpLeads = conv.filter((r) => isHaiPhong(r.name)).reduce((s, r) => s + r.totalLeads, 0);
  const hpReg = conv.filter((r) => isHaiPhong(r.name)).reduce((s, r) => s + r.reg, 0);
  const otherLeads = totalLeads - hpLeads;
  const otherReg = totalReg - hpReg;
  const hpCount = sla.filter((r) => isHaiPhong(r.name)).length;
  const otherCount = sla.filter((r) => !isHaiPhong(r.name)).length;

  ws.columns = [{ width: 28 }, { width: 18 }];

  addSheetTitle(ws, "BÁO CÁO TỔNG QUAN — FPT NEXUS CRM", 2, dateFrom, dateTo);

  const metrics = [
    ["Tổng lead", totalLeads],
    ["Lead FSC Hải Phòng", hpLeads],
    ["Lead cơ sở khác", otherLeads],
    ["Lead trễ SLA", totalLate],
    ["Tỷ lệ SLA", totalLeads ? `${(((totalLeads - totalLate) / totalLeads) * 100).toFixed(1)}%` : "100.0%"],
    ["Tổng REG", totalReg],
    ["Tỷ lệ REG", regRate(totalReg, totalLeads)],
    ["REG FSC Hải Phòng", hpReg],
    ["Tỷ lệ REG — Hải Phòng", regRate(hpReg, hpLeads)],
    ["REG Cơ sở khác", otherReg],
    ["Tỷ lệ REG — Cơ sở khác", regRate(otherReg, otherLeads)],
    ["Số tư vấn viên", sla.length],
    ["TVV FSC Hải Phòng", hpCount],
    ["TVV Cơ sở khác", otherCount],
  ];

  ws.getRow(3).height = 20;
  const h3 = ws.getRow(3);
  h3.getCell(1).value = "Chỉ số";
  h3.getCell(2).value = "Giá trị";
  h3.getCell(1).style = headerStyle(C.headerBg);
  h3.getCell(2).style = headerStyle(C.headerBg);

  metrics.forEach(([label, value], i) => {
    const row = ws.getRow(4 + i);
    row.height = 18;
    const bg = i % 2 === 0 ? C.rowBase : C.rowAlt;
    row.getCell(1).value = label;
    row.getCell(1).style = cellStyle(bg, "FF1F2937", false, "left");
    row.getCell(2).value = value;
    row.getCell(2).style = cellStyle(bg, C.slateFg, true, "center");
  });
}

// ── Sheet 2: SLA ────────────────────────────────────────────────────────────
function buildSLASheet(wb, sla, dateFrom, dateTo) {
  const ws = wb.addWorksheet("SLA chi tiết", { properties: { tabColor: { argb: "FF3B82F6" } } });

  ws.columns = [{ width: 36 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 16 }];

  addSheetTitle(ws, "BÁO CÁO SLA THEO NGƯỜI PHỤ TRÁCH", 5, dateFrom, dateTo);

  ws.getRow(3).height = 22;
  ["Người phụ trách", "Cơ sở", "Số lead", "Số lead trễ", "Tỷ lệ SLA"].forEach((h, c) => {
    const cell = ws.getRow(3).getCell(c + 1);
    cell.value = h;
    cell.style = headerStyle(C.headerBg);
  });

  const hp = sla.filter((r) => isHaiPhong(r.name));
  const other = sla.filter((r) => !isHaiPhong(r.name));
  let rowIdx = 4;

  const addGroupHeader = (label) => {
    ws.mergeCells(rowIdx, 1, rowIdx, 5);
    const cell = ws.getRow(rowIdx).getCell(1);
    cell.value = label;
    cell.style = {
      font: { bold: true, size: 9, color: { argb: C.headerFg }, name: "Calibri" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } },
      alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    };
    ws.getRow(rowIdx).height = 16;
    rowIdx++;
  };

  const addDataRow = (r, i) => {
    const bg = i % 2 === 0 ? C.rowBase : C.rowAlt;
    const row = ws.getRow(rowIdx);
    row.height = 18;
    row.getCell(1).value = r.name;
    row.getCell(1).style = cellStyle(bg, "FF1F2937", false, "left");
    row.getCell(2).value = isHaiPhong(r.name) ? "FSC Hải Phòng" : "Cơ sở khác";
    row.getCell(2).style = cellStyle(
      isHaiPhong(r.name) ? "FFFFF7ED" : bg,
      isHaiPhong(r.name) ? "FFC2410C" : C.slateFg,
      false,
      "center"
    );
    row.getCell(3).value = r.leads;
    row.getCell(3).style = cellStyle(bg, C.slateFg, false, "center");
    row.getCell(4).value = r.lateLeads;
    row.getCell(4).style = cellStyle(bg, r.lateLeads > 0 ? C.redFg : C.greenFg, false, "center");
    row.getCell(5).value = r.slaRate;
    row.getCell(5).style = cellStyle(bg, r.slaNum >= 98 ? C.greenFg : r.slaNum >= 90 ? "FFF59E0B" : C.redFg, true, "center");
    rowIdx++;
  };

  addGroupHeader("▸  FSC HẢI PHÒNG");
  hp.forEach((r, i) => addDataRow(r, i));
  addGroupHeader("▸  CƠ SỞ KHÁC");
  other.forEach((r, i) => addDataRow(r, i));

  // Totals
  const row = ws.getRow(rowIdx);
  row.height = 20;
  const totLeads = sla.reduce((s, r) => s + r.leads, 0);
  const totLate = sla.reduce((s, r) => s + r.lateLeads, 0);
  const totSla = totLeads ? `${(((totLeads - totLate) / totLeads) * 100).toFixed(1)}%` : "100.0%";
  row.getCell(1).value = `TỔNG CỘNG (${sla.length} người)`;
  row.getCell(1).style = totalsStyle(C.totFg, "left");
  row.getCell(2).value = "";
  row.getCell(2).style = totalsStyle(C.totFg);
  row.getCell(3).value = totLeads;
  row.getCell(3).style = totalsStyle(C.totFg);
  row.getCell(4).value = totLate;
  row.getCell(4).style = totalsStyle(totLate > 0 ? C.redFg : C.greenFg);
  row.getCell(5).value = totSla;
  row.getCell(5).style = totalsStyle(C.greenFg);
}

// ── Sheet 3: Chuyển đổi ─────────────────────────────────────────────────────
function buildConversionSheet(wb, conv, dateFrom, dateTo) {
  const ws = wb.addWorksheet("Chuyển đổi", { properties: { tabColor: { argb: "FF10B981" } } });

  ws.columns = [{ width: 36 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 16 }];

  addSheetTitle(ws, "BÁO CÁO CHUYỂN ĐỔI THEO TƯ VẤN VIÊN", 7, dateFrom, dateTo);

  const headers = ["Người phụ trách", "Cơ sở", "Tổng lead", "Số lượng REG", "Số lượng NB", "Số lượng NE", "Tỷ lệ REG"];
  ws.getRow(3).height = 22;
  headers.forEach((h, c) => {
    const cell = ws.getRow(3).getCell(c + 1);
    cell.value = h;
    cell.style = headerStyle(C.headerBg);
  });

  const hp = conv.filter((r) => isHaiPhong(r.name));
  const other = conv.filter((r) => !isHaiPhong(r.name));
  let rowIdx = 4;

  const addGroupHeader = (label) => {
    ws.mergeCells(rowIdx, 1, rowIdx, 7);
    const cell = ws.getRow(rowIdx).getCell(1);
    cell.value = label;
    cell.style = {
      font: { bold: true, size: 9, color: { argb: C.headerFg }, name: "Calibri" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } },
      alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    };
    ws.getRow(rowIdx).height = 16;
    rowIdx++;
  };

  const addDataRow = (r, i) => {
    const bg = i % 2 === 0 ? C.rowBase : C.rowAlt;
    const row = ws.getRow(rowIdx);
    row.height = 18;
    row.getCell(1).value = r.name;
    row.getCell(1).style = cellStyle(bg, "FF1F2937", false, "left");
    row.getCell(2).value = isHaiPhong(r.name) ? "FSC Hải Phòng" : "Cơ sở khác";
    row.getCell(2).style = cellStyle(
      isHaiPhong(r.name) ? "FFFFF7ED" : bg,
      isHaiPhong(r.name) ? "FFC2410C" : C.slateFg,
      false,
      "center"
    );
    row.getCell(3).value = r.totalLeads;
    row.getCell(3).style = cellStyle(bg, C.slateFg, false, "center");
    row.getCell(4).value = r.reg;
    row.getCell(4).style = cellStyle(bg, r.reg > 0 ? C.greenFg : C.slateFg, r.reg > 0, "center");
    row.getCell(5).value = r.nb;
    row.getCell(5).style = cellStyle(bg, r.nb > 0 ? C.blueFg : C.slateFg, false, "center");
    row.getCell(6).value = r.ne;
    row.getCell(6).style = cellStyle(bg, r.ne > 0 ? C.purpleFg : C.slateFg, false, "center");
    row.getCell(7).value = regRate(r.reg, r.totalLeads);
    row.getCell(7).style = cellStyle(bg, C.purpleFg, true, "center");
    rowIdx++;
  };

  addGroupHeader("▸  FSC HẢI PHÒNG");
  hp.forEach((r, i) => addDataRow(r, i));
  addGroupHeader("▸  CƠ SỞ KHÁC");
  other.forEach((r, i) => addDataRow(r, i));

  const totLeads = conv.reduce((s, r) => s + r.totalLeads, 0);
  const totReg = conv.reduce((s, r) => s + r.reg, 0);
  const totNb = conv.reduce((s, r) => s + r.nb, 0);
  const totNe = conv.reduce((s, r) => s + r.ne, 0);

  const row = ws.getRow(rowIdx);
  row.height = 20;
  row.getCell(1).value = `TỔNG CỘNG (${conv.length} người)`;
  row.getCell(1).style = totalsStyle(C.totFg, "left");
  row.getCell(2).value = "";
  row.getCell(2).style = totalsStyle(C.totFg);
  row.getCell(3).value = totLeads;
  row.getCell(3).style = totalsStyle(C.totFg);
  row.getCell(4).value = totReg;
  row.getCell(4).style = totalsStyle(C.greenFg);
  row.getCell(5).value = totNb;
  row.getCell(5).style = totalsStyle(C.blueFg);
  row.getCell(6).value = totNe;
  row.getCell(6).style = totalsStyle(C.purpleFg);
  row.getCell(7).value = regRate(totReg, totLeads);
  row.getCell(7).style = totalsStyle(C.purpleFg);
}

// ── Sheet 4: Trạng thái lead ────────────────────────────────────────────────
function buildStatusBreakdownSheet(wb, data, dateFrom, dateTo) {
  const ws = wb.addWorksheet("Trạng thái lead", { properties: { tabColor: { argb: "FF6366F1" } } });
  const colCount = 8;

  ws.columns = [
    { width: 30 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
  ];

  addSheetTitle(ws, "PHÂN TÍCH TRẠNG THÁI LEAD THEO NHÂN SỰ", colCount, dateFrom, dateTo);

  ws.getRow(3).height = 24;
  const colHeaders = [
    { label: "Nhân sự", col: 1, bgArgb: C.headerBg },
    { label: "Quan tâm", col: 2, bgArgb: C.headerBg },
    { label: "Suy nghĩ thêm", col: 3, bgArgb: C.headerBg },
    { label: "Tiềm năng", col: 4, bgArgb: C.headerBg },
    { label: "Không quan tâm", col: 5, bgArgb: C.headerBg },
    { label: "Không phù hợp", col: 6, bgArgb: C.headerBg },
    { label: "Chưa cập nhật", col: 7, bgArgb: C.blueBg },
    { label: "Tổng cộng", col: 8, bgArgb: C.headerBg },
  ];

  colHeaders.forEach(({ label, col, bgArgb }) => {
    const cell = ws.getRow(3).getCell(col);
    cell.value = label;
    cell.style = headerStyle(bgArgb);
  });

  const hp = data.filter((r) => isHaiPhong(r.name));
  const other = data.filter((r) => !isHaiPhong(r.name));
  let rowIdx = 4;

  const addGroupHeader = (label) => {
    ws.mergeCells(rowIdx, 1, rowIdx, colCount);
    const cell = ws.getRow(rowIdx).getCell(1);
    cell.value = label;
    cell.style = {
      font: { bold: true, size: 9, color: { argb: C.headerFg }, name: "Calibri" },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } },
      alignment: { horizontal: "left", vertical: "middle", indent: 1 },
    };
    ws.getRow(rowIdx).height = 16;
    rowIdx++;
  };

  const addDataRow = (r, i) => {
    const bg = i % 2 === 0 ? C.rowBase : C.rowAlt;
    const row = ws.getRow(rowIdx);
    row.height = 18;
    const total = r.quanTam + r.suyNghiThem + r.tiemNang + r.khongQuanTam + r.khongPhuHop + r.chuaCapNhat;

    row.getCell(1).value = r.name;
    row.getCell(1).style = cellStyle(bg, "FF1F2937", false, "left");
    row.getCell(2).value = r.quanTam;
    row.getCell(2).style = cellStyle(bg, r.quanTam > 0 ? C.greenFg : C.slateFg, r.quanTam > 0, "center");
    row.getCell(3).value = r.suyNghiThem;
    row.getCell(3).style = cellStyle(bg, r.suyNghiThem > 0 ? "FFF59E0B" : C.slateFg, r.suyNghiThem > 0, "center");
    row.getCell(4).value = r.tiemNang;
    row.getCell(4).style = cellStyle(bg, r.tiemNang > 0 ? C.blueFg : C.slateFg, r.tiemNang > 0, "center");
    row.getCell(5).value = r.khongQuanTam;
    row.getCell(5).style = cellStyle(bg, r.khongQuanTam > 0 ? C.redFg : C.slateFg, r.khongQuanTam > 0, "center");
    row.getCell(6).value = r.khongPhuHop;
    row.getCell(6).style = cellStyle(bg, r.khongPhuHop > 0 ? C.redFg : C.slateFg, r.khongPhuHop > 0, "center");
    row.getCell(7).value = r.chuaCapNhat;
    row.getCell(7).style = cellStyle(
      r.chuaCapNhat > 0 ? C.blueLight : bg,
      r.chuaCapNhat > 0 ? C.blueFg : C.slateFg,
      r.chuaCapNhat > 0,
      "center"
    );
    row.getCell(8).value = total;
    row.getCell(8).style = cellStyle(bg, C.totFg, true, "center");
    rowIdx++;
  };

  addGroupHeader("▸  FSC HẢI PHÒNG");
  hp.forEach((r, i) => addDataRow(r, i));
  addGroupHeader("▸  CƠ SỞ KHÁC");
  other.forEach((r, i) => addDataRow(r, i));

  // Totals row
  const row = ws.getRow(rowIdx);
  row.height = 22;

  const sumQt = data.reduce((s, r) => s + r.quanTam, 0);
  const sumSnt = data.reduce((s, r) => s + r.suyNghiThem, 0);
  const sumTn = data.reduce((s, r) => s + r.tiemNang, 0);
  const sumKqt = data.reduce((s, r) => s + r.khongQuanTam, 0);
  const sumKph = data.reduce((s, r) => s + r.khongPhuHop, 0);
  const sumCcn = data.reduce((s, r) => s + r.chuaCapNhat, 0);
  const sumTot = sumQt + sumSnt + sumTn + sumKqt + sumKph + sumCcn;

  row.getCell(1).value = `TỔNG (${data.length} người)`;
  row.getCell(1).style = totalsStyle(C.totFg, "left");
  row.getCell(2).value = sumQt;
  row.getCell(2).style = totalsStyle(sumQt > 0 ? C.greenFg : C.totFg);
  row.getCell(3).value = sumSnt;
  row.getCell(3).style = totalsStyle(sumSnt > 0 ? "FFF59E0B" : C.totFg);
  row.getCell(4).value = sumTn;
  row.getCell(4).style = totalsStyle(sumTn > 0 ? C.blueFg : C.totFg);
  row.getCell(5).value = sumKqt;
  row.getCell(5).style = totalsStyle(sumKqt > 0 ? C.redFg : C.totFg);
  row.getCell(6).value = sumKph;
  row.getCell(6).style = totalsStyle(sumKph > 0 ? C.redFg : C.totFg);
  row.getCell(7).value = sumCcn;
  row.getCell(7).style = {
    font: { bold: true, color: { argb: C.blueFg }, name: "Calibri", size: 10 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: C.blueLight } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "medium", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    },
  };
  row.getCell(8).value = sumTot;
  row.getCell(8).style = totalsStyle(C.totFg);

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];
}

// ── Main export function ────────────────────────────────────────────────────
export async function exportReportExcel({ slaData, conversionData, statusBreakdown, dateFrom, dateTo }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FPT Nexus CRM";
  wb.created = new Date();
  wb.modified = new Date();

  buildSummarySheet(wb, slaData, conversionData, dateFrom, dateTo);
  buildSLASheet(wb, slaData, dateFrom, dateTo);
  buildConversionSheet(wb, conversionData, dateFrom, dateTo);
  if (statusBreakdown.length > 0) {
    buildStatusBreakdownSheet(wb, statusBreakdown, dateFrom, dateTo);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `FPT_Nexus_BaoCao_${dateFrom}_${dateTo}.xlsx`;
  saveAs(blob, filename);
}
