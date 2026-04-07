"""
Facade công khai cho nghiệp vụ lead.

- Logic chi tiết: `lead_service_core` (CRUD/query/đơn lẻ), `lead_service_bulk` (hàng loạt).
- Giữ `from app.services import lead_service` để router/worker không phải đổi import.
"""
from app.services.lead_service_bulk import bulk_apply_action, bulk_assign, bulk_export_csv_rows
from app.services.lead_service_core import (
    assign_lead,
    export_leads_csv_rows,
    get_dashboard_stats,
    get_lead,
    list_available_assignees,
    list_leads,
    merge_ingested_row,
    query_lead_ids,
    query_leads_page,
    update_lead_fields,
)

__all__ = [
    "assign_lead",
    "bulk_apply_action",
    "bulk_assign",
    "bulk_export_csv_rows",
    "export_leads_csv_rows",
    "get_dashboard_stats",
    "get_lead",
    "list_available_assignees",
    "list_leads",
    "merge_ingested_row",
    "query_lead_ids",
    "query_leads_page",
    "update_lead_fields",
]
