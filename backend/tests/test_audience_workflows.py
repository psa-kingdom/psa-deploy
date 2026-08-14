import io
import csv
import pytest
import openpyxl
from backend.services.email.audience import (
    is_valid_email,
    clean_email_token,
    parse_manual_emails,
    analyze_manual_recipients,
    parse_recipient_file,
)
from backend.models.email import TargetFilter, CampaignType, CampaignStatus
from backend.core.config import settings


def test_clean_email_token():
    assert clean_email_token("  <john@gmail.com>  ") == "john@gmail.com"
    assert clean_email_token('"jane@company.org"') == "jane@company.org"
    assert clean_email_token("'HELLO@TEST.CO',") == "hello@test.co"
    assert clean_email_token(";client@law.com;") == "client@law.com"


def test_is_valid_email():
    assert is_valid_email("john@example.com") is True
    assert is_valid_email("  <user.name+tag@sub.domain.co.in>  ") is True
    assert is_valid_email("invalid-email") is False
    assert is_valid_email("@domain.com") is False
    assert is_valid_email("user@") is False
    assert is_valid_email("") is False


def test_manual_email_parsing_mixed_delimiters():
    raw = [
        "john@gmail.com\njane@gmail.com; hello@example.com, <partner@firm.org>",
        "  SECOND@EXAMPLE.COM \t third@example.com  "
    ]
    tokens = parse_manual_emails(raw)
    assert tokens == [
        "john@gmail.com",
        "jane@gmail.com",
        "hello@example.com",
        "partner@firm.org",
        "second@example.com",
        "third@example.com"
    ]


def test_analyze_manual_recipients_deduplication_and_invalids():
    raw = [
        "John@gmail.com, john@gmail.com; JOHN@GMAIL.COM",
        "valid@company.com, bad-email-one, bad-email-two",
        "suppressed@domain.com"
    ]
    suppressed_set = {"suppressed@domain.com"}
    analysis = analyze_manual_recipients(raw, suppressed_set=suppressed_set)

    assert analysis["entered_count"] == 7
    assert analysis["valid_count"] == 5  # 3 johns + 1 valid@company + 1 suppressed
    assert analysis["invalid_count"] == 2
    assert "bad-email-one" in analysis["invalid_samples"]
    assert analysis["duplicate_count"] == 2  # 2 redundant johns
    assert analysis["suppressed_count"] == 1
    assert analysis["net_count"] == 2  # john@gmail.com + valid@company.com
    assert set(analysis["net_sendable"]) == {"john@gmail.com", "valid@company.com"}


def test_csv_import_parsing_auto_detection():
    # Build CSV with multiple columns and 'Email Address' header
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Client Name", "Email Address", "Phone"])
    writer.writerow(["Alice Corp", "alice@example.com", "12345"])
    writer.writerow(["Bob LLC", "BOB@EXAMPLE.COM", "67890"])
    writer.writerow(["Bob Duplicate", "bob@example.com", "67890"])
    writer.writerow(["Invalid Client", "not_valid", "00000"])

    csv_bytes = output.getvalue().encode("utf-8")
    result = parse_recipient_file(csv_bytes, "clients.csv")

    assert result["total_rows"] == 4
    assert result["email_column"] == "Email Address"
    assert result["entered_count"] == 4
    assert result["valid_count"] == 3
    assert result["invalid_count"] == 1
    assert result["duplicate_count"] == 1
    assert result["net_count"] == 2
    assert set(result["valid_emails"]) == {"alice@example.com", "bob@example.com"}


def test_xlsx_import_parsing_auto_detection():
    # Build XLSX with openpyxl in memory
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["ID", "contact_email", "Notes"])
    ws.append([1, "support@psumanassociates.com", "Primary"])
    ws.append([2, "SUPPORT@PSUMANASSOCIATES.COM", "Duplicate"])
    ws.append([3, "partner@law.org", "Active"])

    buf = io.BytesIO()
    wb.save(buf)
    xlsx_bytes = buf.getvalue()

    result = parse_recipient_file(xlsx_bytes, "roster.xlsx")
    assert result["total_rows"] == 3
    assert result["email_column"] == "contact_email"
    assert result["entered_count"] == 3
    assert result["valid_count"] == 3
    assert result["duplicate_count"] == 1
    assert result["net_count"] == 2
    assert set(result["valid_emails"]) == {"support@psumanassociates.com", "partner@law.org"}


def test_sender_configuration_domain():
    # Verify sender domain contains verified updates.psumanassociates.com
    assert "updates.psumanassociates.com" in settings.RESEND_FROM_EMAIL
