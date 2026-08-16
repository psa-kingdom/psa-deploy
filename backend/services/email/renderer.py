import re
import html
from typing import Dict, Any, Optional, Tuple

PSA_BRAND_PRIMARY = "#0a192f"      # Deep Navy
PSA_BRAND_ACCENT = "#c5a059"       # Muted Gold / Amber
PSA_BRAND_IVORY = "#fcfbf9"        # Ivory Background
PSA_BRAND_TEXT = "#1e293b"         # Slate Ink Text
PSA_BRAND_MUTED = "#64748b"        # Muted Gray

def render_base_layout(content_html: str, preheader: str = "", unsubscribe_url: Optional[str] = None) -> str:
    """
    Wraps content in PSA's high-tier corporate responsive email layout.
    """
    unsub_section = ""
    if unsubscribe_url:
        unsub_section = f"""
        <p style="margin: 8px 0 0; font-size: 11px; color: {PSA_BRAND_MUTED}; text-align: center;">
            You received this email because you are registered with P Suman & Associates.
            <br>
            <a href="{unsubscribe_url}" style="color: {PSA_BRAND_ACCENT}; text-decoration: underline;">Unsubscribe / Manage Preferences</a>
        </p>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>P Suman & Associates</title>
    <!--[if mso]>
    <style type="text/css">
    body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: {PSA_BRAND_TEXT};">
    <!-- Preheader Hidden Text -->
    <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        {html.escape(preheader)}
    </div>

    <!-- Main Container -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: {PSA_BRAND_PRIMARY}; padding: 28px 32px; text-align: left; border-bottom: 3px solid {PSA_BRAND_ACCENT};">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
                                            P SUMAN & ASSOCIATES
                                        </h1>
                                        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase;">
                                            Chartered Accountants · Audit · Advisory
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px; font-size: 15px; line-height: 1.6; color: {PSA_BRAND_TEXT}; background-color: #ffffff;">
                            {content_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: {PSA_BRAND_IVORY}; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: {PSA_BRAND_PRIMARY};">
                                P Suman & Associates — Chartered Accountants
                            </p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: {PSA_BRAND_MUTED};">
                                New Delhi · Hyderabad · PAN-India Advisory
                            </p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: {PSA_BRAND_MUTED};">
                                Website: <a href="https://psumanassociates.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none;">psumanassociates.com</a>
                            </p>
                            {unsub_section}
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

def interpolate_variables(text_or_html: str, variables: Dict[str, Any]) -> str:
    """
    Replaces mustache style placeholders {{key}} with corresponding values.
    """
    if not text_or_html:
        return ""
    
    result = text_or_html
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        str_val = str(value) if value is not None else ""
        result = result.replace(placeholder, str_val)
    return result

def html_to_plain_text(html_content: str) -> str:
    """
    Extracts readable plain text from an HTML email.
    """
    if not html_content:
        return ""
    # Strip style and script tags
    clean = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html_content, flags=re.DOTALL | re.IGNORECASE)
    # Convert <br> and </p> to newlines
    clean = re.sub(r"<br\s*/?>", "\n", clean, flags=re.IGNORECASE)
    clean = re.sub(r"</p>", "\n\n", clean, flags=re.IGNORECASE)
    clean = re.sub(r"</li>", "\n", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<tr>", "\n", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<h[1-6][^>]*>", "\n\n", clean, flags=re.IGNORECASE)
    # Strip remaining tags
    clean = re.sub(r"<[^>]+>", "", clean)
    # Unescape HTML entities
    clean = html.unescape(clean)
    # Collapse excess whitespace
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean.strip()

# Marker used to detect whether HTML already has the PSA corporate layout
PSA_WRAPPER_HEADER_MARKER = "Chartered Accountants · Audit · Advisory"

def render_final_email(
    body_html: str,
    apply_wrapper: bool = True,
    variables: Optional[Dict[str, Any]] = None,
    preheader: str = "",
    unsubscribe_url: Optional[str] = None
) -> Tuple[str, str]:
    """
    Canonical single source of truth for final email rendering across:
    1. Live Preview
    2. Test Send
    3. Production Dispatch (Outbox Job creation)

    Parameters:
    - body_html: The authored email HTML
    - apply_wrapper: True to apply PSA corporate header/footer wrapper, False to send raw authored HTML
    - variables: Placeholder substitution mapping (e.g. name, company, unsubscribe_url)
    - preheader: Optional preheader hidden text (used when apply_wrapper is True)
    - unsubscribe_url: Optional unsubscribe URL for the footer / variables

    Returns:
    - (final_html, plain_text)
    """
    # 1. Variable Interpolation
    vars_map = variables or {}
    if unsubscribe_url and "unsubscribe_url" not in vars_map:
        vars_map["unsubscribe_url"] = unsubscribe_url
    
    interpolated_body = interpolate_variables(body_html or "", vars_map)

    # 2. Optional Wrapper Composition with Double-Wrapper Guard
    if apply_wrapper:
        # If the authored content already contains the outer PSA corporate wrapper, do not double-wrap
        if PSA_WRAPPER_HEADER_MARKER in interpolated_body:
            final_html = interpolated_body
        else:
            final_html = render_base_layout(
                interpolated_body,
                preheader=preheader,
                unsubscribe_url=vars_map.get("unsubscribe_url") or unsubscribe_url
            )
    else:
        final_html = interpolated_body

    # 3. Plain Text Extraction
    plain_text = html_to_plain_text(final_html)

    return final_html, plain_text

