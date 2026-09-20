from typing import Dict, Any, Tuple, Optional
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


def get_contact_acknowledgement_fragment() -> str:
    """
    Returns clean inner HTML content fragment for Contact Inquiry Acknowledgment.
    Uses mustache variables {{name}}, {{service_of_interest}}, {{company}}.
    Designed to be wrapped by the 780px responsive corporate shell.
    """
    return f"""
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
        Thank You for Reaching Out
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {{{{name}}}},
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        We have received your inquiry regarding <strong>{{{{service_of_interest}}}}</strong>. A member of our senior advisory team is reviewing your requirements and will connect with you within 24 business hours.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid {PSA_BRAND_BORDER}; border-radius: 6px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: {PSA_BRAND_MUTED}; text-transform: uppercase; letter-spacing: 0.5px;">
            Summary of Your Inquiry
        </p>
        <p style="margin: 0 0 6px; font-size: 14px; color: {PSA_BRAND_TEXT};"><strong>Service:</strong> {{{{service_of_interest}}}}</p>
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT};"><strong>Company:</strong> {{{{company}}}}</p>
    </div>

    <p style="margin: 0 0 24px; font-size: 14px; color: {PSA_BRAND_MUTED}; line-height: 1.6;">
        If your matter is urgent, you may directly reach out to our desk at <a href="mailto:contact@psumanassociates.com" style="color: {PSA_BRAND_ACCENT}; font-weight: 500;">contact@psumanassociates.com</a>.
    </p>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: {PSA_BRAND_PRIMARY};">Client Relations Desk</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: {PSA_BRAND_MUTED};">P Suman &amp; Associates</p>
    </div>
    """


def get_newsletter_welcome_fragment() -> str:
    """
    Returns clean inner HTML content fragment for Newsletter Welcome & Insights.
    Designed to be wrapped by the 780px responsive corporate shell.
    """
    cta_html = render_cta_button("Explore Recent Insights →", "https://psumanassociates.com/insights", align="center")
    return f"""
    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
        Welcome to PSA Insights
    </h2>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        Thank you for subscribing to <strong>PSA Insights</strong>. You will now receive curated, executive-tier intelligence covering tax amendments, statutory audit strategies, corporate governance, and regulatory updates directly in your inbox.
    </p>

    {cta_html}

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: {PSA_BRAND_PRIMARY};">Editorial Desk</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: {PSA_BRAND_MUTED};">P Suman &amp; Associates · PAN India Presence</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: {PSA_BRAND_MUTED};">Email: <a href="mailto:psumanassociates@gmail.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">psumanassociates@gmail.com</a> | Phone: <a href="tel:+919831546721" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">+91 9831546721</a></p>
    </div>
    """


def get_independence_day_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Returns (subject, rendered_html, plain_text) for Independence Day Greetings.
    """
    from backend.services.email.renderer import render_final_email
    raw_subject = "Happy Independence Day — P Suman & Associates"
    content_html = get_independence_day_campaign_html()
    
    name = variables.get("name") or "Valued Partner"
    company = variables.get("company")
    salutation = f"Dear {name}," if not company else f"Dear {name} ({company}),"
    content_html = content_html.replace("Dear {{name}},", salutation)

    subject = interpolate_variables(raw_subject, variables)
    full_html, plain_text = render_final_email(
        body_html=content_html,
        variables=variables,
        apply_wrapper=True,
        preheader="Warm Independence Day wishes from P Suman & Associates",
        unsubscribe_url=variables.get("unsubscribe_url")
    )
    return subject, full_html, plain_text


def get_contact_acknowledgement_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Transactional confirmation sent when a user submits the Contact form.
    """
    from backend.services.email.renderer import render_final_email
    subject = "Inquiry Received — P Suman & Associates"
    vars_map = {
        "name": variables.get("name") or "Valued Client",
        "service_of_interest": variables.get("service_of_interest") or "General Advisory",
        "company": variables.get("company") or "Not specified",
        "unsubscribe_url": variables.get("unsubscribe_url")
    }
    fragment = get_contact_acknowledgement_fragment()
    full_html, plain_text = render_final_email(
        body_html=fragment,
        variables=vars_map,
        apply_wrapper=True,
        preheader="We have received your advisory inquiry.",
        unsubscribe_url=variables.get("unsubscribe_url"),
        escape_variables=True
    )
    return subject, full_html, plain_text


def get_newsletter_welcome_template(variables: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Transactional confirmation sent when a user subscribes to the newsletter.
    """
    from backend.services.email.renderer import render_final_email
    subject = "Welcome to PSA Insights — P Suman & Associates"
    vars_map = {
        "unsubscribe_url": variables.get("unsubscribe_url")
    }
    fragment = get_newsletter_welcome_fragment()
    full_html, plain_text = render_final_email(
        body_html=fragment,
        variables=vars_map,
        apply_wrapper=True,
        preheader="Welcome to executive tax & audit intelligence",
        unsubscribe_url=variables.get("unsubscribe_url"),
        escape_variables=True
    )
    return subject, full_html, plain_text


def get_advance_tax_alert_html(occasion: Optional[str] = None) -> str:
    """
    Returns refined HTML fragment for Advance Tax Quarterly Alert.
    Curated with corporate compliance theme (Navy #0A2540, Royal Blue #0284C7, Amber #F59E0B).
    Adapts actively when a specific installment (Q1, Q2, Q3, Q4) is selected.
    """
    occ = (occasion or "").lower()
    highlight_q1 = "q1" in occ or "june" in occ or "15%" in occ
    highlight_q2 = "q2" in occ or "september" in occ or "45%" in occ
    highlight_q3 = "q3" in occ or "december" in occ or "75%" in occ
    highlight_q4 = "q4" in occ or "march" in occ or "100%" in occ

    active_tag = ""
    headline = "Advance Tax Due Date Alert — Mandatory Installment Notice"
    sub_headline = "Statutory Quarterly Compliance · Section 208 Income-tax Act, 1961"

    if highlight_q1:
        active_tag = " — 1st Installment (Q1 · Due 15th June)"
        headline = "Advance Tax Alert: 1st Installment (15%) Due on 15th June"
        sub_headline = "Mandatory 15% Advance Tax Slabs for FY 2026-27"
    elif highlight_q2:
        active_tag = " — 2nd Installment (Q2 · Due 15th September)"
        headline = "Advance Tax Alert: 2nd Installment (45%) Due on 15th September"
        sub_headline = "Cumulative 45% Advance Tax Deposit Slabs"
    elif highlight_q3:
        active_tag = " — 3rd Installment (Q3 · Due 15th December)"
        headline = "Advance Tax Alert: 3rd Installment (75%) Due on 15th December"
        sub_headline = "Cumulative 75% Advance Tax Deposit Slabs"
    elif highlight_q4:
        active_tag = " — 4th Installment (Q4 · Due 15th March)"
        headline = "Advance Tax Alert: Final Installment (100%) Due on 15th March"
        sub_headline = "Mandatory 100% Year-End Advance Tax Settlement"

    cta_html = render_cta_button("Request Advance Tax Computation →", "https://psumanassociates.com/contact", align="center")

    return f"""
    <!-- Category Badge with Curated Compliance Theme -->
    <div style="margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #eff6ff; color: #1e40af; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid #bfdbfe;">
            ⚖ Statutory Compliance · Advance Tax{active_tag}
        </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: {PSA_BRAND_PRIMARY}; line-height: 1.3;">
        {headline}
    </h2>
    <p style="margin: 0 0 18px; font-size: 14px; font-weight: 600; color: {PSA_BRAND_ACCENT}; letter-spacing: 0.2px;">
        {sub_headline}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {{{{name}}}},
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        This is a formal advisory from <strong>P Suman &amp; Associates</strong> to remind you that the statutory deadline for depositing your advance tax installment is fast approaching. Under <strong>Section 208 of the Income-tax Act, 1961</strong>, every taxpayer whose estimated tax liability for the financial year (after TDS/TCS) equals or exceeds <strong>₹10,000</strong> must pay taxes in prescribed quarterly installments.
    </p>

    <!-- Curated Schedule Table with Active Highlight -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; border: 1px solid {PSA_BRAND_BORDER}; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <tr style="background-color: {PSA_BRAND_PRIMARY}; color: #ffffff;">
            <th align="left" style="padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Installment</th>
            <th align="left" style="padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Statutory Due Date</th>
            <th align="right" style="padding: 12px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Cumulative Tax Payable</th>
        </tr>
        <tr style="background-color: {'#eff6ff' if highlight_q1 else '#ffffff'}; border-left: {'4px solid #0284c7' if highlight_q1 else 'none'}; border-bottom: 1px solid {PSA_BRAND_BORDER};">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: {'700' if highlight_q1 else '600'}; color: {PSA_BRAND_PRIMARY};">
                1st Installment (Q1) {'<span style="font-size: 10px; background: #0284c7; color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">CURRENT</span>' if highlight_q1 else ''}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: {PSA_BRAND_TEXT};">On or before <strong>15th June</strong></td>
            <td align="right" style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0284c7;">15% of estimated tax</td>
        </tr>
        <tr style="background-color: {'#eff6ff' if highlight_q2 else '#f8fafc'}; border-left: {'4px solid #0284c7' if highlight_q2 else 'none'}; border-bottom: 1px solid {PSA_BRAND_BORDER};">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: {'700' if highlight_q2 else '600'}; color: {PSA_BRAND_PRIMARY};">
                2nd Installment (Q2) {'<span style="font-size: 10px; background: #0284c7; color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">CURRENT</span>' if highlight_q2 else ''}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: {PSA_BRAND_TEXT};">On or before <strong>15th September</strong></td>
            <td align="right" style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0284c7;">45% of estimated tax</td>
        </tr>
        <tr style="background-color: {'#eff6ff' if highlight_q3 else '#ffffff'}; border-left: {'4px solid #0284c7' if highlight_q3 else 'none'}; border-bottom: 1px solid {PSA_BRAND_BORDER};">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: {'700' if highlight_q3 else '600'}; color: {PSA_BRAND_PRIMARY};">
                3rd Installment (Q3) {'<span style="font-size: 10px; background: #0284c7; color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">CURRENT</span>' if highlight_q3 else ''}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: {PSA_BRAND_TEXT};">On or before <strong>15th December</strong></td>
            <td align="right" style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0284c7;">75% of estimated tax</td>
        </tr>
        <tr style="background-color: {'#eff6ff' if highlight_q4 else '#f8fafc'}; border-left: {'4px solid #16a34a' if highlight_q4 else 'none'};">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: {'700' if highlight_q4 else '600'}; color: {PSA_BRAND_PRIMARY};">
                4th Installment (Q4) {'<span style="font-size: 10px; background: #16a34a; color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">CURRENT</span>' if highlight_q4 else ''}
            </td>
            <td style="padding: 12px 16px; font-size: 14px; color: {PSA_BRAND_TEXT};">On or before <strong>15th March</strong></td>
            <td align="right" style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #16a34a;">100% of estimated tax</td>
        </tr>
    </table>

    <!-- Penalty Caution Box -->
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
            <strong>⚠ Mandatory Statutory Penalties:</strong> Failure to deposit the required installment or deferment in payment attracts mandatory penal interest under <strong>Section 234B and Section 234C</strong> at the rate of <strong>1% per month</strong> on the shortfall amount.
        </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        Please share your updated profit &amp; loss statements, turnover data, and investment receipts with our tax advisory desk to ensure accurate computation and prevent interest levies.
    </p>

    {cta_html}

    <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Warm regards,<br>
            <strong>P Suman &amp; Associates</strong><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Chartered Accountants · Audit · Advisory</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Presence: PAN India Presence</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Email: <a href="mailto:psumanassociates@gmail.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">psumanassociates@gmail.com</a> | Phone: <a href="tel:+919831546721" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">+91 9831546721</a></span>
        </p>
    </div>
    """


def get_itr_checklist_html(occasion: Optional[str] = None) -> str:
    """
    Returns refined HTML fragment for ITR Filing & Document Checklist Request.
    Curated with taxation compliance theme (Emerald Green #065F46, Soft Mint #ECFDF5, Navy #0A2540).
    Adapts checklist details and statutory deadlines based on the specific taxpayer segment.
    """
    occ = (occasion or "").lower()
    is_individual = "individual" in occ or "salaried" in occ or "july" in occ
    is_corporate = "corporate" in occ or "business" in occ or "october" in occ
    is_audit = "audit" in occ or "transfer pricing" in occ or "november" in occ
    is_belated = "belated" in occ or "revised" in occ or "139" in occ

    segment_tag = "Annual Tax Compliance · Income Tax Returns"
    headline = "Income Tax Return Filing & Required Documents Checklist"
    sub_headline = "Timely Collation · Portal Reconciliation (AIS/TIS/26AS) · Error-Free Filing"

    if is_individual:
        segment_tag = "ITR Filing · Salaried & Individual Taxpayers (Due 31st July)"
        headline = "ITR Checklist for Individuals & Salaried Professionals (FY 2026-27)"
        sub_headline = "Statutory Due Date: 31st July · Mandatory Reconciliation with AIS & Form 26AS"
    elif is_corporate:
        segment_tag = "ITR Filing · Corporate & Business Entities (Due 31st October)"
        headline = "Corporate Income Tax Return (ITR-6) Checklist & Filing Notice"
        sub_headline = "Statutory Due Date: 31st October · Company Financials & Statutory Reconciliation"
    elif is_audit:
        segment_tag = "ITR Filing · Tax Audit & Transfer Pricing (Due 30th November)"
        headline = "Tax Audit (Form 3CD) & Transfer Pricing (Form 3CEB) Checklist"
        sub_headline = "Statutory Due Date: 30th November · Comprehensive Audit Collation"
    elif is_belated:
        segment_tag = "ITR Compliance · Belated & Revised Returns (Sec 139(4)/(5))"
        headline = "Notice for Filing Belated or Revised Income Tax Returns"
        sub_headline = "Statutory Cut-Off Notice · Mitigation of Penal Fees under Section 234F"

    cta_html = render_cta_button("Submit Documents to Desk →", "https://psumanassociates.com/contact", align="center")

    return f"""
    <!-- Category Badge with Curated Taxation Theme -->
    <div style="margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid #a7f3d0;">
            📋 {segment_tag}
        </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: {PSA_BRAND_PRIMARY}; line-height: 1.3;">
        {headline}
    </h2>
    <p style="margin: 0 0 18px; font-size: 14px; font-weight: 600; color: #059669; letter-spacing: 0.2px;">
        {sub_headline}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {{{{name}}}},
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        As the annual tax filing cycle approaches, <strong>P Suman &amp; Associates</strong> is initiating preparatory documentation for your Income Tax Return. Early collation is critical to ensuring seamless reconciliation with the Income Tax Department's <strong>Annual Information Statement (AIS)</strong>, <strong>Taxpayer Information Summary (TIS)</strong>, and <strong>Form 26AS</strong>.
    </p>

    <!-- Curated Checklist Section -->
    <div style="background-color: #f8fafc; border: 1px solid {PSA_BRAND_BORDER}; border-radius: 6px; padding: 22px; margin: 24px 0; border-left: 4px solid #10b981;">
        <h3 style="margin: 0 0 14px; font-size: 16px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
            Required Documents for Your Return:
        </h3>
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: {PSA_BRAND_PRIMARY};">1. Tax Credits &amp; Income Certificates:</strong><br>
                    <span style="font-size: 13px; color: {PSA_BRAND_MUTED};">Form 16 / 16A, AIS, TIS, Form 26AS, and interest certificates from all operational bank accounts.</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: {PSA_BRAND_PRIMARY};">2. Banking &amp; Financial Statements:</strong><br>
                    <span style="font-size: 13px; color: {PSA_BRAND_MUTED};">Bank statements for the complete financial year (1st April – 31st March) for all active accounts.</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: {PSA_BRAND_PRIMARY};">3. Capital Gains &amp; Investment Realizations:</strong><br>
                    <span style="font-size: 13px; color: {PSA_BRAND_MUTED};">Broker capital gain statements, mutual fund statements, and property sale/purchase transaction deeds.</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 0;">
                    <strong style="color: {PSA_BRAND_PRIMARY};">4. Business Accounts, Deductions &amp; Audit Records:</strong><br>
                    <span style="font-size: 13px; color: {PSA_BRAND_MUTED};">Financial statements, GST return summaries, Section 80C/80D proofs, and related-party disclosure records.</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- Statutory Due Dates Box with Green Theme -->
    <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 18px 0;">
        <p style="margin: 0; font-size: 13px; color: #065f46; line-height: 1.6;">
            <strong>Statutory Deadlines:</strong><br>
            • Non-Audit Cases (Individuals / HUFs / Partnerships): <strong>31st July</strong><br>
            • Corporate &amp; Tax Audit Cases: <strong>31st October</strong><br>
            • Transfer Pricing Reporting (Form 3CEB): <strong>30th November</strong>
        </p>
    </div>

    {cta_html}

    <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Warm regards,<br>
            <strong>P Suman &amp; Associates</strong><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Chartered Accountants · Audit · Advisory</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Presence: PAN India Presence</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Email: <a href="mailto:psumanassociates@gmail.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">psumanassociates@gmail.com</a> | Phone: <a href="tel:+919831546721" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">+91 9831546721</a></span>
        </p>
    </div>
    """


def get_monthly_tax_digest_html(occasion: Optional[str] = None) -> str:
    """
    Returns refined HTML fragment for Monthly PSA Tax & Regulatory Digest.
    Curated with editorial magazine theme (Burgundy #831843, Slate #0F172A, Soft Rose #FDF2F8).
    Adapts headline, focus briefing, and executive takeaways to the selected edition.
    """
    occ = (occasion or "").lower()
    is_direct_tax = "direct" in occ or "judicial" in occ
    is_gst = "gst" in occ or "indirect" in occ
    is_mca = "corporate" in occ or "mca" in occ or "company" in occ
    is_fema = "fema" in occ or "banking" in occ or "rbi" in occ

    edition_tag = "PSA Insights · Executive Regulatory Digest"
    headline = "Monthly Tax &amp; Regulatory Digest — Executive Briefing"
    sub_headline = "Curated Intelligence on Direct Tax, GST, MCA Corporate Law &amp; Regulatory Norms"

    if is_direct_tax:
        edition_tag = "PSA Digest · Direct Tax &amp; Judicial Precedents Special Edition"
        headline = "Direct Tax Digest: Landmark Judicial Precedents &amp; Statutory Rulings"
        sub_headline = "Key High Court &amp; ITAT Rulings · CBDT Clarifications · Section 14A &amp; 12AB Norms"
    elif is_gst:
        edition_tag = "PSA Digest · GST &amp; Indirect Tax Circulars Special Edition"
        headline = "GST Regulatory Briefing: Recent Circulars, ITC Norms &amp; E-Invoicing"
        sub_headline = "CBIC Notifications · Corporate Guarantee Valuation · ITC Reconciliation Mandates"
    elif is_mca:
        edition_tag = "PSA Digest · Corporate Laws &amp; MCA Regulatory Special Edition"
        headline = "MCA Corporate Governance: Dematerialization, SBO &amp; CSR Audit"
        sub_headline = "Companies Act Updates · Private Company Share Demat · Statutory Filings"
    elif is_fema:
        edition_tag = "PSA Digest · Banking, FEMA &amp; RBI Regulatory Special Edition"
        headline = "Cross-Border &amp; Banking Digest: FEMA, ODI &amp; RBI Directions"
        sub_headline = "Overseas Direct Investment · Foreign Liability Annual Filings · ECB Compliance"

    cta_html = render_cta_button("Access Full Regulatory Archives →", "https://psumanassociates.com/insights", align="center")

    return f"""
    <!-- Category Badge with Curated Editorial Burgundy Theme -->
    <div style="margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #fdf2f8; color: #9d174d; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid #fbcfe8;">
            📰 {edition_tag}
        </span>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: {PSA_BRAND_PRIMARY}; line-height: 1.3;">
        {headline}
    </h2>
    <p style="margin: 0 0 18px; font-size: 14px; font-weight: 600; color: #9d174d; letter-spacing: 0.2px;">
        {sub_headline}
    </p>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {{{{name}}}},
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        Welcome to this month's curated edition of the <strong>PSA Regulatory &amp; Tax Intelligence Digest</strong>. Our research and advisory team has distilled the most significant statutory circulars, judicial precedents, and compliance amendments to help leadership teams make informed financial decisions.
    </p>

    <!-- Highlight Section 1: Direct Tax -->
    <div style="border-left: 3px solid #b91c1c; padding-left: 16px; margin: 20px 0; background-color: #fffafa; padding-top: 10px; padding-bottom: 10px; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
            1. Direct Tax &amp; Judicial Precedents
        </h4>
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Clarifications on charitable trust registrations under Section 12AB/80G. Landmark rulings from ITAT regarding disallowances under Section 14A and deduction eligibility for software development expenditure.
        </p>
    </div>

    <!-- Highlight Section 2: GST & Indirect Tax -->
    <div style="border-left: 3px solid #0284c7; padding-left: 16px; margin: 20px 0; background-color: #f0f9ff; padding-top: 10px; padding-bottom: 10px; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
            2. GST &amp; Indirect Tax Circulars
        </h4>
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Recent CBIC circulars addressing Input Tax Credit (ITC) matching mandates, revised guidelines on corporate guarantees between related entities, and e-invoicing compliance audits.
        </p>
    </div>

    <!-- Highlight Section 3: MCA & Corporate Law -->
    <div style="border-left: 3px solid #16a34a; padding-left: 16px; margin: 20px 0; background-color: #f0fdf4; padding-top: 10px; padding-bottom: 10px; border-radius: 0 6px 6px 0;">
        <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 700; color: {PSA_BRAND_PRIMARY};">
            3. Corporate Governance &amp; MCA Updates
        </h4>
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Mandatory dematerialization compliance for private companies, Significant Beneficial Ownership (SBO) reporting guidelines, and updated CSR expenditure audit protocols.
        </p>
    </div>

    <!-- Takeaway Card -->
    <div style="background-color: #f8fafc; border: 1px solid {PSA_BRAND_BORDER}; border-radius: 6px; padding: 18px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: {PSA_BRAND_MUTED}; line-height: 1.6;">
            <strong style="color: {PSA_BRAND_PRIMARY};">Executive Takeaway:</strong> Corporate entities are advised to conduct internal audits of related-party transactions and GST reconciliations before the upcoming quarterly close.
        </p>
    </div>

    {cta_html}

    <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Warm regards,<br>
            <strong>P Suman &amp; Associates</strong><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Chartered Accountants · Audit · Advisory</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Presence: PAN India Presence</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Email: <a href="mailto:psumanassociates@gmail.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">psumanassociates@gmail.com</a> | Phone: <a href="tel:+919831546721" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">+91 9831546721</a></span>
        </p>
    </div>
    """


def get_festive_greetings_html(occasion: Optional[str] = None) -> str:
    """
    Returns refined HTML fragment for Diwali / Festive Greetings.
    Curated with warm festive themes (Gold #D97706, Crimson #991B1B, Celebration Amber #FEF3C7).
    Adapts headline, greeting banner, and message specifically to Diwali, New Year, Holi, Navratri, or National Days.
    """
    occ = (occasion or "").lower()
    is_diwali = "diwali" in occ or "dhanteras" in occ
    is_new_year = "new year" in occ or "2026" in occ
    is_holi = "holi" in occ
    is_navratri = "navratri" in occ or "dussehra" in occ
    is_independence = "independence" in occ or "15th august" in occ
    is_republic = "republic" in occ or "26th january" in occ

    badge_text = "✨ Festive Greetings · P Suman & Associates"
    headline = "Warm Festive Greetings & Best Wishes"
    sub_headline = "Celebrating Milestones · Fostering Trust & Prosperity"
    quote_text = '"May this joyous season illuminate your path with boundless success, financial wisdom, and lasting prosperity."'
    hero_motif = "🪔"
    badge_bg = "#fefce8"
    badge_color = "#854d0e"
    badge_border = "#fef08a"

    if is_diwali:
        badge_text = "🪔 Shubh Deepawali & Dhanteras · P Suman & Associates"
        headline = "Wishing You a Joyous & Prosperous Diwali"
        sub_headline = "May the Divine Festival of Lights Bring Abundance, Growth & Success"
        quote_text = '"May the auspicious light of Diwali illuminate new avenues of prosperity, ethical enterprise, and lasting joy for you and your family."'
        hero_motif = "🪔"
        badge_bg = "#fef3c7"
        badge_color = "#78350f"
        badge_border = "#fde68a"
    elif is_new_year:
        badge_text = "🎉 New Year 2026 Greetings · P Suman & Associates"
        headline = "Warm Greetings & Best Wishes for the New Year 2026"
        sub_headline = "Embarking on New Horizons · Accelerating Growth & Excellence"
        quote_text = '"May the coming year unfold new milestones, strategic clarity, and sustained success in every endeavor."'
        hero_motif = "✨"
        badge_bg = "#eff6ff"
        badge_color = "#1e40af"
        badge_border = "#bfdbfe"
    elif is_holi:
        badge_text = "🎨 Joyous Holi Greetings · P Suman & Associates"
        headline = "Wishing You a Vibrant, Joyful & Colorful Holi"
        sub_headline = "Celebrating the Colors of Trust, Harmony & Prosperity"
        quote_text = '"May the vibrant colors of Holi bring peace, good health, and joyful accomplishments to your home and enterprise."'
        hero_motif = "🌸"
        badge_bg = "#fdf2f8"
        badge_color = "#9d174d"
        badge_border = "#fbcfe8"
    elif is_navratri:
        badge_text = "🚩 Auspicious Navratri & Dussehra · P Suman & Associates"
        headline = "Warm Wishes on Navratri & Vijayadashami"
        sub_headline = "Triumph of Righteousness · Auspicious Beginnings & Enduring Success"
        quote_text = '"May this festive period bestow boundless energy, courage, and auspicious prosperity upon your personal and professional journey."'
        hero_motif = "🌺"
        badge_bg = "#fff1f2"
        badge_color = "#9f1239"
        badge_border = "#fecdd3"
    elif is_independence or is_republic:
        national_day = "80th Independence Day" if is_independence else "Republic Day"
        badge_text = f"🇮🇳 {national_day} · P Suman & Associates"
        headline = f"Warm Greetings on India's {national_day}"
        sub_headline = "Swaraj to Viksit Bharat 2047 · Professional Excellence in Nation Building"
        quote_text = '"Smart Technology · Strong Controls · Trusted Professionals · Viksit Bharat 2047"'
        hero_motif = "🇮🇳"
        badge_bg = "#fff7ed"
        badge_color = "#9a3412"
        badge_border = "#fed7aa"

    cta_html = render_cta_button("Connect with Our Team →", "https://psumanassociates.com/contact", align="center")

    return f"""
    <!-- Category Badge with Curated Festive Theme -->
    <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: {badge_bg}; color: {badge_color}; font-size: 11px; font-weight: 700; padding: 5px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid {badge_border};">
            {badge_text}
        </span>

        <h2 style="margin: 16px 0 6px; font-size: 26px; font-weight: 700; color: {PSA_BRAND_PRIMARY}; letter-spacing: -0.2px; line-height: 1.3;">
            {hero_motif} {headline}
        </h2>
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: {PSA_BRAND_ACCENT}; letter-spacing: 0.3px;">
            {sub_headline}
        </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 15px; color: {PSA_BRAND_TEXT};">
        Dear {{{{name}}}},
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        On this auspicious festive occasion, the partners and entire professional team at <strong>P Suman &amp; Associates</strong> extend our heartfelt greetings and warmest wishes to you, your esteemed family, and your team.
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        Festivals remind us of the power of dedication, new beginnings, and meaningful relationships. We take this moment to express our sincere appreciation for your continued trust and partnership in our journey of professional excellence.
    </p>

    <!-- Curated Quote / Message Box -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
            <td style="background-color: #f8fafc; border-left: 4px solid {PSA_BRAND_ACCENT}; padding: 20px 24px; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: {PSA_BRAND_PRIMARY}; font-weight: 600; text-align: center; font-style: italic;">
                    {quote_text}
                </p>
            </td>
        </tr>
    </table>

    <p style="margin: 0 0 18px; font-size: 15px; color: {PSA_BRAND_TEXT}; line-height: 1.7;">
        May this joyous season bring abundant health, joy, and peace to your home and fruitful milestones to your enterprise. We look forward to continuing our shared journey of growth and compliance in the days ahead.
    </p>

    <!-- Note on Advisory Desk -->
    <p style="margin: 0 0 24px; font-size: 13px; color: {PSA_BRAND_MUTED}; line-height: 1.6;">
        <em>Note: During the festive period, our advisory and compliance desks remain at your service for any urgent statutory requirements.</em>
    </p>

    {cta_html}

    <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid {PSA_BRAND_BORDER};">
        <p style="margin: 0; font-size: 14px; color: {PSA_BRAND_TEXT}; line-height: 1.6;">
            Warm regards,<br>
            <strong>P Suman &amp; Associates</strong><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Chartered Accountants · Audit · Advisory</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Presence: PAN India Presence</span><br>
            <span style="font-size: 12px; color: {PSA_BRAND_MUTED};">Email: <a href="mailto:psumanassociates@gmail.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">psumanassociates@gmail.com</a> | Phone: <a href="tel:+919831546721" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">+91 9831546721</a></span>
        </p>
    </div>
    """


