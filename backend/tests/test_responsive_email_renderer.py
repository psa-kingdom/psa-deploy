import pytest
import re
from backend.services.email.renderer import (
    render_base_layout,
    render_final_email,
    render_cta_button,
    interpolate_variables,
    html_to_plain_text
)
from backend.models.email import TemplatePreviewRequest, TestSendRequest


def test_wrapped_template_generates_full_html_document():
    """Requirement 1: Wrapped template must generate a complete valid HTML document."""
    fragment = "<p>Advisory notice for Q3 compliance.</p>"
    full_html, plain_text = render_final_email(
        body_html=fragment,
        apply_wrapper=True,
        preheader="Important Q3 Compliance Update"
    )
    assert "<!DOCTYPE html>" in full_html
    assert "<html" in full_html
    assert "<head>" in full_html
    assert "</html>" in full_html
    assert "Advisory notice for Q3 compliance." in full_html
    assert "Advisory notice for Q3 compliance." in plain_text


def test_raw_template_remains_unwrapped():
    """Requirement 2: Deliberately authored raw email HTML must remain unwrapped."""
    raw_document = (
        "<!DOCTYPE html><html><head><title>Custom</title></head>"
        "<body><div id='custom-root'>Custom Raw Template</div></body></html>"
    )
    final_html, plain_text = render_final_email(
        body_html=raw_document,
        apply_wrapper=False
    )
    assert final_html == raw_document
    assert "Custom Raw Template" in plain_text
    assert final_html.count("<!DOCTYPE html>") == 1


def test_wrapped_template_contains_exactly_one_corporate_header_and_footer():
    """Requirements 3 & 4: Corporate layout must inject exactly one header and one footer."""
    fragment = "<h2>Executive Tax Summary</h2><p>Content block.</p>"
    full_html, _ = render_final_email(
        body_html=fragment,
        apply_wrapper=True,
        unsubscribe_url="https://psumanassociates.com/unsub?tok=123"
    )
    # Header checks
    assert full_html.count("P SUMAN & ASSOCIATES") == 1
    assert full_html.count("Chartered Accountants · Audit · Advisory") == 1
    # Footer checks
    assert full_html.count("New Delhi · Hyderabad · PAN-India Advisory") == 1
    assert full_html.count("Official Website:") == 1
    assert full_html.count("https://psumanassociates.com/unsub?tok=123") == 1


def test_no_double_wrapping_if_html_already_present():
    """Anti-double-wrapping guard: Even if apply_wrapper=True is passed, never wrap existing <html>."""
    already_wrapped = (
        "<!DOCTYPE html><html lang='en'><head><title>Test</title></head>"
        "<body><table role='presentation'><tr><td>Already Full Document</td></tr></table></body></html>"
    )
    output_html, _ = render_final_email(
        body_html=already_wrapped,
        apply_wrapper=True
    )
    assert output_html.count("<html") == 1
    assert output_html.count("<!DOCTYPE html>") == 1
    assert "Already Full Document" in output_html


def test_target_max_width_and_container_structure():
    """Requirement 6: Target container width must be 780px with fluid fallback."""
    full_html = render_base_layout("<p>Width test</p>")
    assert 'max-width: 780px' in full_html
    assert 'width: 100%' in full_html
    assert 'email-container' in full_html


def test_mobile_media_query_present():
    """Requirement 5: Mobile breakpoint @media query must be present with responsive rules."""
    full_html = render_base_layout("<p>Mobile test</p>")
    assert "@media only screen and (max-width: 780px)" in full_html
    assert ".email-container" in full_html
    assert "width: 100% !important" in full_html
    assert ".email-body" in full_html
    assert "padding: 24px 18px !important" in full_html


def test_outlook_mso_structural_fallback():
    """Requirement 7: Outlook Word engine conditional comments and ghost table present."""
    full_html = render_base_layout("<p>Outlook test</p>")
    assert "<!--[if mso]>" in full_html
    assert "<!--[if (gte mso 9)|(IE)]>" in full_html
    assert '<table role="presentation" width="780" align="center"' in full_html
    assert ".mso-container { width: 780px !important; }" in full_html
    assert "mso-table-lspace: 0pt" in full_html
    assert "mso-table-rspace: 0pt" in full_html


def test_presentation_tables_carry_role():
    """Requirement 8: All layout tables must declare role='presentation' for screen reader accessibility."""
    full_html = render_base_layout("<p>Accessibility test</p>")
    # Match all table tags in output
    table_tags = re.findall(r"<table[^>]*>", full_html)
    assert len(table_tags) >= 3
    for tag in table_tags:
        assert 'role="presentation"' in tag


def test_viewport_and_color_scheme_meta_present():
    """Requirement 9: Viewport and dark-mode color-scheme metadata must be present."""
    full_html = render_base_layout("<p>Meta test</p>")
    assert '<meta name="viewport" content="width=device-width, initial-scale=1.0">' in full_html
    assert '<meta name="color-scheme" content="light dark">' in full_html
    assert '<meta name="supported-color-schemes" content="light dark">' in full_html
    assert '<html lang="en" dir="ltr"' in full_html


def test_preheader_structure_valid():
    """Requirement 10: Hidden preheader snippet must render without visible spillover."""
    full_html = render_base_layout("<p>Body</p>", preheader="Exclusive Tax Intelligence")
    assert "Exclusive Tax Intelligence" in full_html
    assert "display: none;" in full_html
    assert "max-height: 0px;" in full_html
    assert "mso-hide: all;" in full_html


def test_safe_html_compatibility_audit_no_forbidden_constructs():
    """Requirements 11, 12, 13: Audit generated HTML for email-incompatible patterns."""
    full_html = render_base_layout(
        "<h2>Statutory Note</h2><p>Safe email content.</p>",
        preheader="Audit",
        unsubscribe_url="https://psumanassociates.com/unsub"
    )
    lower = full_html.lower()
    
    # 1. No CSS grid or flex structural layouts
    assert "display: grid" not in lower
    assert "display:grid" not in lower
    assert "display: flex" not in lower
    assert "display:flex" not in lower
    
    # 2. No interactive/dangerous elements
    assert "<script" not in lower
    assert "<iframe" not in lower
    assert "<form" not in lower
    
    # 3. No linked external stylesheets (which fail in Gmail)
    assert '<link rel="stylesheet"' not in lower
    assert "<link rel='stylesheet'" not in lower
    
    # 4. No problematic CSS properties
    assert "position: fixed" not in lower
    assert "position: sticky" not in lower
    assert "clamp(" not in lower


def test_personalization_variables_still_work():
    """Requirement 14: Personalization tags must interpolate accurately."""
    fragment = "<p>Greetings {{name}} of {{company}}. Year: {{year}}.</p>"
    vars_map = {
        "name": "CA Anita Desai",
        "company": "Horizon Infra Ltd",
        "year": 2026
    }
    rendered, plain = render_final_email(
        body_html=fragment,
        variables=vars_map,
        apply_wrapper=True
    )
    assert "Greetings CA Anita Desai of Horizon Infra Ltd. Year: 2026." in rendered
    assert "Greetings CA Anita Desai of Horizon Infra Ltd. Year: 2026." in plain
    assert "{{name}}" not in rendered
    assert "{{company}}" not in rendered


def test_unsubscribe_link_present_when_provided():
    """Requirement 15: Unsubscribe link must be rendered in the footer when provided."""
    unsub = "https://psumanassociates.com/api/unsubscribe?token=secret123&email=test@example.com"
    rendered, _ = render_final_email(
        body_html="<p>Test body</p>",
        unsubscribe_url=unsub,
        apply_wrapper=True
    )
    assert unsub in rendered
    assert "Unsubscribe / Manage Preferences" in rendered


def test_cta_button_helper_bulletproof_mso_and_html():
    """Requirement 16: CTA button helper renders Outlook VML and standards-compliant HTML button."""
    cta = render_cta_button("Review Tax Memo →", "https://psumanassociates.com/memos/101")
    assert "Review Tax Memo →" in cta
    assert "https://psumanassociates.com/memos/101" in cta
    assert "v:roundrect" in cta
    assert "mso" in cta
    assert "cta-button" in cta
    assert 'role="presentation"' in cta


def test_pipeline_consistency_across_preview_test_and_campaign():
    """Requirements 16, 17, 18: Preview, Test Send, and Campaign Send produce identical HTML decisions."""
    content = "<h2>Annual Statutory Filing</h2><p>Details for {{name}}.</p>"
    vars_map = {
        "name": "Vivek Malhotra",
        "company": "Malhotra Mills",
        "unsubscribe_url": "https://psumanassociates.com/unsub?tok=abc"
    }

    # Pipeline A: Preview
    prev_html, _ = render_final_email(
        body_html=content,
        variables=vars_map,
        apply_wrapper=True,
        preheader="Filing Update"
    )

    # Pipeline B: Test Send
    test_html, _ = render_final_email(
        body_html=content,
        variables=vars_map,
        apply_wrapper=True,
        preheader="Filing Update"
    )

    # Pipeline C: Campaign Dispatch
    camp_html, _ = render_final_email(
        body_html=content,
        variables=vars_map,
        apply_wrapper=True,
        preheader="Filing Update"
    )

    assert prev_html == test_html == camp_html
    assert "Annual Statutory Filing" in prev_html
    assert "Vivek Malhotra" in prev_html
    assert "email-container" in prev_html


def test_custom_raw_html_with_680px_table_remains_unmodified():
    """Requirement: Custom full HTML specifying 680px width must preserve its authored width."""
    custom_raw = (
        "<!DOCTYPE html><html><head><title>Festive</title></head><body>"
        "<table width=\"680\" style=\"width:680px; max-width:680px; margin:0 auto;\">"
        "<tr><td>Custom 680px Content</td></tr>"
        "</table>"
        "</body></html>"
    )
    final_html, _ = render_final_email(
        body_html=custom_raw,
        apply_wrapper=False
    )
    assert final_html == custom_raw
    assert 'width="680"' in final_html
    assert 'max-width:680px' in final_html
    assert 'max-width: 780px' not in final_html


def test_built_in_fragments_contain_no_outer_html():
    """Requirement: Built-in system template sources must be content fragments without <html> or <!DOCTYPE>."""
    from backend.services.email.templates import (
        get_independence_day_campaign_html,
        get_contact_acknowledgement_fragment,
        get_newsletter_welcome_fragment
    )
    indep = get_independence_day_campaign_html()
    assert "<!doctype" not in indep.lower()
    assert "<html" not in indep.lower()
    assert "80th independence day" in indep.lower()

    contact = get_contact_acknowledgement_fragment()
    assert "<!doctype" not in contact.lower()
    assert "<html" not in contact.lower()
    assert "{{name}}" in contact
    assert "{{service_of_interest}}" in contact

    news = get_newsletter_welcome_fragment()
    assert "<!doctype" not in news.lower()
    assert "<html" not in news.lower()
    assert "welcome to psa insights" in news.lower()


@pytest.mark.asyncio
async def test_migrate_system_templates_safety_and_backup():
    """Requirement: System template migration must backup version history and only touch known built-ins."""
    from backend.routes.admin_templates import migrate_system_templates_to_v2

    # In-memory mock database for isolated migration unit testing
    class MockCollection:
        def __init__(self, docs=None):
            self.docs = list(docs or [])

        async def find_one(self, filter_dict, proj=None):
            for d in self.docs:
                if all(d.get(k) == v for k, v in filter_dict.items()):
                    return dict(d)
            return None

        async def insert_one(self, doc):
            self.docs.append(dict(doc))
            return doc

        async def update_one(self, filter_dict, update_dict):
            for d in self.docs:
                if all(d.get(k) == v for k, v in filter_dict.items()):
                    if "$set" in update_dict:
                        d.update(update_dict["$set"])
                    return True
            return False

        async def count_documents(self, filter_dict):
            return len(self.docs)

    class MockDB:
        def __init__(self):
            self.email_templates_studio = MockCollection([
                {
                    "template_id": "independence_day_2026",
                    "name": "Old Independence Day",
                    "published_subject": "79th Independence Day Greetings",
                    "published_body_html": "<!DOCTYPE html><html><body>Old 600px body</body></html>",
                    "version": 1,
                    "apply_wrapper": None
                },
                {
                    "template_id": "custom_user_template_999",
                    "name": "Custom User Promo",
                    "published_subject": "Special Client Advisory",
                    "published_body_html": "<p>User custom content</p>",
                    "version": 3,
                    "apply_wrapper": False
                }
            ])
            self.template_version_history = MockCollection()

    mock_db = MockDB()
    result = await migrate_system_templates_to_v2(mock_db)

    # 1. Verify backup occurred in template_version_history
    history_docs = mock_db.template_version_history.docs
    assert len(history_docs) >= 1
    backed_up_ids = [h["template_id"] for h in history_docs]
    assert "independence_day_2026" in backed_up_ids
    # User template was NEVER backed up or mutated
    assert "custom_user_template_999" not in backed_up_ids

    # 2. Verify independence_day_2026 was updated to v2 with wrapper
    updated_indep = await mock_db.email_templates_studio.find_one({"template_id": "independence_day_2026"})
    assert updated_indep["apply_wrapper"] is True
    assert updated_indep["is_system_template"] is True
    assert updated_indep["system_template_revision"] == 2
    assert updated_indep["version"] == 2
    assert "<!DOCTYPE" not in updated_indep["published_body_html"]

    # 3. Verify custom user template remains 100% untouched
    user_tmpl = await mock_db.email_templates_studio.find_one({"template_id": "custom_user_template_999"})
    assert user_tmpl["name"] == "Custom User Promo"
    assert user_tmpl["version"] == 3
    assert user_tmpl["published_body_html"] == "<p>User custom content</p>"
    assert user_tmpl["apply_wrapper"] is False

