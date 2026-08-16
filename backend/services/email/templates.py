from typing import Dict, Any, Tuple
from backend.services.email.renderer import render_base_layout, interpolate_variables, html_to_plain_text

def get_independence_day_campaign_html() -> str:
    """
    Returns clean template HTML content for Independence Day Greetings.
    """
    return """
    <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
            79th Independence Day Greetings
        </span>
        <h2 style="margin: 16px 0 8px; font-size: 22px; font-weight: 700; color: #0a192f;">
            Celebrating India's Growth, Resilience &amp; Freedom
        </h2>
    </div>

    <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
        Dear {{name}},
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">
        As our nation marks another milestone of independence and economic transformation, we at <strong>P Suman &amp; Associates</strong> extend our warmest wishes to you, your family, and your organization.
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">
        True independence is built on the pillars of transparency, financial governance, and unwavering compliance. We are proud to partner with businesses and leaders driving India's journey toward global leadership.
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #c5a059; padding: 16px 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; font-style: italic; color: #475569;">
            &ldquo;Progress is not merely economic growth; it is the discipline of integrity, innovation, and sustainable leadership.&rdquo;
        </p>
    </div>

    <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
        May this Independence Day bring enduring prosperity, clarity in governance, and new opportunities for your enterprise.
    </p>

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0a192f;">
            Warm regards,
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700; color: #c5a059;">
            CA Prem Suman &amp; Team
        </p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
            P Suman &amp; Associates · Chartered Accountants
        </p>
    </div>
    """

def get_independence_day_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Returns (subject, rendered_html, plain_text) for Independence Day 2026 Greetings.
    """
    raw_subject = "Happy Independence Day — P Suman & Associates"
    content_html = get_independence_day_campaign_html()
    
    name = variables.get("name") or "Valued Partner"
    company = variables.get("company")
    salutation = f"Dear {name}," if not company else f"Dear {name} ({company}),"
    
    # Replace the generic salutation line with specific if present
    content_html = content_html.replace("Dear {{name}},", salutation)

    subject = interpolate_variables(raw_subject, variables)
    full_html = render_base_layout(content_html, preheader="Warm Independence Day wishes from P Suman & Associates", unsubscribe_url=variables.get("unsubscribe_url"))
    plain_text = html_to_plain_text(full_html)
    return subject, full_html, plain_text

def get_contact_acknowledgement_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Transactional confirmation sent when a user submits the Contact form.
    """
    subject = "Inquiry Received — P Suman & Associates"
    name = variables.get("name") or "Valued Client"
    service = variables.get("service_of_interest") or "General Advisory"

    content_html = f"""
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0a192f;">
        Thank You for Reaching Out
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
        Dear {name},
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">
        We have received your inquiry regarding <strong>{service}</strong>. A member of our senior advisory team is reviewing your requirements and will connect with you within 24 business hours.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
            Summary of Your Inquiry
        </p>
        <p style="margin: 0 0 4px; font-size: 14px; color: #334155;"><strong>Service:</strong> {service}</p>
        <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Company:</strong> {variables.get('company') or 'Not specified'}</p>
    </div>

    <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">
        If your matter is urgent, you may directly reach out to our desk at <a href="mailto:contact@psumanassociates.com" style="color: #c5a059;">contact@psumanassociates.com</a>.
    </p>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0a192f;">Client Relations Desk</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">P Suman & Associates</p>
    </div>
    """

    full_html = render_base_layout(content_html, preheader="We have received your advisory inquiry.")
    plain_text = html_to_plain_text(full_html)
    return subject, full_html, plain_text

def get_newsletter_welcome_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Transactional confirmation sent when a user subscribes to the newsletter.
    """
    subject = "Welcome to PSA Insights — P Suman & Associates"

    content_html = f"""
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0a192f;">
        Welcome to PSA Insights
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">
        Thank you for subscribing to <strong>PSA Insights</strong>. You will now receive curated, executive-tier intelligence covering tax amendments, internal audit strategies, corporate governance, and regulatory updates directly in your inbox.
    </p>

    <div style="text-align: center; margin: 28px 0;">
        <a href="https://psumanassociates.com/insights" style="display: inline-block; background-color: #0a192f; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 4px;">
            Explore Recent Insights →
        </a>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0a192f;">Editorial Desk</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">P Suman & Associates</p>
    </div>
    """

    full_html = render_base_layout(content_html, preheader="Welcome to executive tax & audit intelligence", unsubscribe_url=variables.get("unsubscribe_url"))
    plain_text = html_to_plain_text(full_html)
    return subject, full_html, plain_text
