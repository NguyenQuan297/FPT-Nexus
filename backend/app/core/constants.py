"""Canonical lead status values (business workflow)."""

LEAD_STATUS_NEW = "new"
LEAD_STATUS_CONTACTING = "contacting"
LEAD_STATUS_ACTIVE = "active"
LEAD_STATUS_LATE = "late"
LEAD_STATUS_CLOSED = "closed"

VALID_LEAD_STATUSES = frozenset(
    {
        LEAD_STATUS_NEW,
        LEAD_STATUS_CONTACTING,
        LEAD_STATUS_ACTIVE,
        LEAD_STATUS_LATE,
        LEAD_STATUS_CLOSED,
    }
)

# Legacy Excel / DB values mapped on read
LEGACY_STATUS_MAP = {
    "contacted": LEAD_STATUS_ACTIVE,
}
