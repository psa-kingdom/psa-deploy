from typing import Dict, Any, Tuple
from backend.services.email.renderer import (
    render_base_layout,
    render_cta_button,
    interpolate_variables,
    html_to_plain_text,
    PSA_BRAND_PRIMARY,
    PSA_BRAND_ACCENT,
    PSA_BRAND_TEXT,
    PSA_BRAND_MUTED,
    PSA_BRAND_BORDER
)


def get_independence_day_campaign_html() -> str:
    """
    Returns refined, responsive template HTML content for Independence Day Greetings.
    Retains the 80th Independence Day theme, '80 Years of Freedom', and 'One Vision for Viksit Bharat 2047'
    with a sophisticated corporate presentation safe for Outlook and modern mobile clients.
    """
    return f"""
    <!-- Independence Day Festive Header -->
    <div style="text-align: center; margin-bottom: 28px;">
        <!-- Restrained Tricolor Ribbon -->
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="width: 120px; margin: 0 auto 16px;">
            <tr>
                <td style="background-color: #ff9933; height: 3px; width: 33.3%;"></td>
                <td style="background-color: #ffffff; height: 3px; width: 33.3%;"></td>
                <td style="background-color: #138808; height: 3px; width: 33.3%;"></td>
            </tr>
        </table>
        
        <span style="display: inline-block; background-color: #fff7ed; color: #9a3412; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #fed7aa;">
            80th Independence Day
        </span>

        <h2 style="margin: 14px 0 6px; font-size: 26px; font-weight: 700; color: {PSA_BRAND_PRIMARY}; letter-spacing: -0.2px; line-height: 1.3;">
            80 Years of Freedom
        </h2>
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: {PSA_BRAND_ACCENT}; letter-spacing: 0.3px;">
            One Vision for Viksit Bharat 2047
        </p>
    </div>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {{{{name}}}},
    </p>


    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        On the occasion of the <strong>80th Independence Day of India</strong>, we extend our warm greetings and best wishes to you, your family, and your organisation.
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        Our journey from <strong>Swaraj</strong> to a digitally empowered, self-reliant, and globally respected Bharat reflects the remarkable transformation of our nation. Today, India is not merely adopting technology — it is creating technology, building robust digital infrastructure, and shaping the future of the global economy.
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        As professionals, our responsibility is also evolving: from auditing numbers to strengthening systems, from traditional controls to technology-enabled governance, and from compliance to creating trust.
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        With <strong>Artificial Intelligence, Digitalisation, Data Analytics, and Intelligent Internal Controls</strong>, we can help build organisations that are transparent, accountable, resilient, and globally competitive — supporting India's journey towards <strong>Viksit Bharat 2047</strong>.
    </p>

    <!-- Quote Block -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
            <td style="background-color: #f8fafc; border-left: 4px solid {PSA_BRAND_ACCENT}; padding: 18px 22px; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: {PSA_BRAND_PRIMARY}; font-weight: 600; text-align: center;">
                    Smart Technology · Strong Controls · Trusted Professionals · Viksit Bharat 2047
                </p>
            </td>
        </tr>
    </table>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        We firmly believe that the future belongs to those who combine professional excellence with technology, innovation with ethics, and growth with responsibility. Let us pledge to contribute our skills, knowledge, and professional integrity towards building an <strong>Atmanirbhar, Viksit, and Digitally Powerful Bharat</strong>.
    </p>

    <p style="margin: 0 0 24px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        From the tricolour in our hands to the values in our work, let every action reflect our pride in India.
    </p>

    <!-- Sign-off -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 15px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
            Jai Hind! Vande Mataram!
        </p>
        <p style="margin: 8px 0 0; font-size: 15px; font-weight: 700; color: {PSA_BRAND_ACCENT};">
            CA Prem Suman &amp; Team
        </p>
        <p style="margin: 2px 0 0; font-size: 12px; color: {PSA_BRAND_MUTED};">
            P Suman &amp; Associates · Chartered Accountants
        </p>
    </div>
    """


def get_independence_day_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Returns (subject, rendered_html, plain_text) for Independence Day Greetings.
    """
    raw_subject = "Happy Independence Day — P Suman & Associates"
    content_html = get_independence_day_campaign_html()
    
    name = variables.get("name") or "Valued Partner"
    company = variables.get("company")
    salutation = f"Dear {name}," if not company else f"Dear {name} ({company}),"
    
    content_html = content_html.replace("Dear {{name}},", salutation)

    subject = interpolate_variables(raw_subject, variables)
    full_html = render_base_layout(
        content_html=content_html,
        preheader="Warm Independence Day wishes from P Suman & Associates",
        unsubscribe_url=variables.get("unsubscribe_url")
    )
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
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
        Thank You for Reaching Out
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {name},
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        We have received your inquiry regarding <strong>{service}</strong>. A member of our senior advisory team is reviewing your requirements and will connect with you within 24 business hours.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid {PSA_BRAND_BORDER}; border-radius: 6px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: {PSA_BRAND_MUTED}; text-transform: uppercase; letter-spacing: 0.5px;">
            Summary of Your Inquiry
        </p>
        <p style="margin: 0 0 6px; font-size: 14px; color: {PSA_BRAND_TEXT};"><strong>Service:</strong> {service}</p>
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT};"><strong>Company:</strong> {variables.get('company') or 'Not specified'}</p>
    </div>

    <p style="margin: 0 0 24px; font-size: 14px; color: {PSA_BRAND_MUTED}; line-height: 1.6;">
        If your matter is urgent, you may directly reach out to our desk at <a href="mailto:contact@psumanassociates.com" style="color: {PSA_BRAND_ACCENT}; font-weight: 500;">contact@psumanassociates.com</a>.
    </p>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: {PSA_BRAND_PRIMARY};">Client Relations Desk</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: {PSA_BRAND_MUTED};">P Suman &amp; Associates</p>
    </div>
    """

    full_html = render_base_layout(
        content_html=content_html,
        preheader="We have received your advisory inquiry."
    )
    plain_text = html_to_plain_text(full_html)
    return subject, full_html, plain_text


def get_newsletter_welcome_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Transactional confirmation sent when a user subscribes to the newsletter.
    """
    subject = "Welcome to PSA Insights — P Suman & Associates"

    cta_html = render_cta_button("Explore Recent Insights →", "https://psumanassociates.com/insights", align="center")

    content_html = f"""
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
        Welcome to PSA Insights
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        Thank you for subscribing to <strong>PSA Insights</strong>. You will now receive curated, executive-tier intelligence covering tax amendments, statutory audit strategies, corporate governance, and regulatory updates directly in your inbox.
    </p>

    {cta_html}

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: {PSA_BRAND_PRIMARY};">Editorial Desk</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: {PSA_BRAND_MUTED};">P Suman &amp; Associates</p>
    </div>
    """

    full_html = render_base_layout(
        content_html=content_html,
        preheader="Welcome to executive tax & audit intelligence",
        unsubscribe_url=variables.get("unsubscribe_url")
    )
    plain_text = html_to_plain_text(full_html)
    return subject, full_html, plain_text

