import re
import html
from typing import Dict, Any, Optional, Tuple, List

PSA_BRAND_PRIMARY = "#0a192f"      # Deep Navy
PSA_BRAND_ACCENT = "#c5a059"       # Muted Gold / Amber
PSA_BRAND_ACCENT_HOVER = "#b38f46" # Deeper Gold
PSA_BRAND_IVORY = "#fcfbf9"        # Ivory / Warm Background
PSA_BRAND_CANVAS = "#f8fafc"       # Slate 50 Neutral Canvas
PSA_BRAND_TEXT = "#1e293b"         # Slate 800 Ink Text
PSA_BRAND_MUTED = "#64748b"        # Slate 500 Muted Gray
PSA_BRAND_BORDER = "#e2e8f0"       # Slate 200 Border


def render_cta_button(text: str, url: str, align: str = "center") -> str:
    """
    Generates an email-safe, bulletproof button with Outlook VML and HTML fallbacks.
    """
    safe_text = html.escape(text)
    safe_url = html.escape(url)
    margin_style = "24px auto" if align == "center" else "24px 0"

    return f"""<!-- CTA Button -->
<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="{align}" style="margin: {margin_style};">
    <tr>
        <td align="center" style="border-radius: 4px; background-color: {PSA_BRAND_PRIMARY};">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{safe_url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="10%" fillcolor="{PSA_BRAND_PRIMARY}" stroke="f">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">{safe_text}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="{safe_url}" class="cta-button" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 4px; background-color: {PSA_BRAND_PRIMARY}; line-height: 20px; text-align: center; mso-hide: all;">
                {safe_text}
            </a>
            <!--<![endif]-->
        </td>
    </tr>
</table>"""


def render_base_layout(content_html: str, preheader: str = "", unsubscribe_url: Optional[str] = None) -> str:
    """
    Wraps content in PSA's 680px high-tier corporate responsive email shell.
    Provides cross-client support for Gmail, Outlook (Word engine), Apple Mail, and mobile clients.
    """
    unsub_section = ""
    if unsubscribe_url:
        unsub_section = f"""
        <p style="margin: 10px 0 0; font-size: 11px; color: {PSA_BRAND_MUTED}; text-align: center; line-height: 1.5;">
            You received this email because your organization is associated with P Suman &amp; Associates.
            <br>
            <a href="{unsubscribe_url}" style="color: {PSA_BRAND_ACCENT}; text-decoration: underline;">Unsubscribe / Manage Preferences</a>
        </p>
        """

    preheader_padding = "&#847; &zwnj; &nbsp; " * 30 if preheader else ""

    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>P Suman &amp; Associates</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <style type="text/css">
        body, table, td, p, a, span, h1, h2, h3 {{ font-family: Arial, Helvetica, sans-serif !important; }}
        table {{ border-collapse: collapse; }}
        .mso-container {{ width: 780px !important; }}
    </style>
    <![endif]-->
    <style type="text/css">
        /* Client-specific Resets */
        #outlook a {{ padding: 0; }}
        body {{ margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        table, td {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; max-width: 100%; }}
        
        /* Interactive element styling */
        a {{ color: {PSA_BRAND_ACCENT}; text-decoration: underline; }}
        a:hover {{ color: {PSA_BRAND_ACCENT_HOVER}; text-decoration: underline; }}

        /* Responsive Mobile Styles */
        @media only screen and (max-width: 780px) {{
            .email-outer-table {{
                padding: 10px 4px !important;
            }}
            .email-container {{
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 4px !important;
            }}
            .email-header {{
                padding: 20px 18px !important;
            }}
            .email-header-title {{
                font-size: 18px !important;
            }}
            .email-header-sub {{
                font-size: 10px !important;
                letter-spacing: 0.8px !important;
            }}
            .email-body {{
                padding: 24px 18px !important;
                font-size: 15px !important;
                line-height: 1.65 !important;
            }}
            .email-footer {{
                padding: 20px 16px !important;
            }}
            .responsive-image {{
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
            }}
            .cta-button {{
                display: block !important;
                width: 100% !important;
                text-align: center !important;
                box-sizing: border-box !important;
            }}
        }}
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: {PSA_BRAND_CANVAS}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: {PSA_BRAND_TEXT};">
    <!-- Preheader Hidden Text -->
    <div style="display: none; font-size: 1px; color: {PSA_BRAND_CANVAS}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        {html.escape(preheader)}
        {preheader_padding}
    </div>

    <!-- Outer Canvas Wrapper -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-outer-table" style="background-color: {PSA_BRAND_CANVAS}; padding: 24px 12px; margin: 0;">
        <tr>
            <td align="center" style="padding: 0;">
                <!--[if (gte mso 9)|(IE)]>
                <table role="presentation" width="780" align="center" border="0" cellspacing="0" cellpadding="0" class="mso-container">
                <tr>
                <td>
                <![endif]-->
                
                <!-- Main 780px Email Container -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-container" style="max-width: 780px; width: 100%; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid {PSA_BRAND_BORDER}; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);">
                    
                    <!-- Header -->
                    <tr>
                        <td class="email-header" style="background-color: {PSA_BRAND_PRIMARY}; padding: 26px 38px; text-align: left; border-bottom: 3px solid {PSA_BRAND_ACCENT};">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <h1 class="email-header-title" style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.6px; text-transform: uppercase; line-height: 1.25;">
                                            P SUMAN & ASSOCIATES
                                        </h1>
                                        <p class="email-header-sub" style="margin: 5px 0 0; font-size: 11px; color: #94a3b8; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 500;">
                                            Chartered Accountants · Audit · Advisory
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td class="email-body" style="padding: 36px 38px; font-size: 15px; line-height: 1.7; color: {PSA_BRAND_TEXT}; background-color: #ffffff;">
                            {content_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="email-footer" style="background-color: {PSA_BRAND_IVORY}; padding: 26px 38px; border-top: 1px solid {PSA_BRAND_BORDER}; text-align: center;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: {PSA_BRAND_PRIMARY}; letter-spacing: 0.2px;">
                                P Suman & Associates — Chartered Accountants
                            </p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: {PSA_BRAND_MUTED}; line-height: 1.5;">
                                New Delhi · Hyderabad · PAN-India Advisory
                            </p>
                            <p style="margin: 4px 0 0; font-size: 11px; color: {PSA_BRAND_MUTED};">
                                Official Website: <a href="https://psumanassociates.com" style="color: {PSA_BRAND_ACCENT}; text-decoration: none; font-weight: 500;">psumanassociates.com</a>
                            </p>
                            {unsub_section}
                        </td>
                    </tr>

                </table>

                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>"""


def interpolate_variables(
    text_or_html: str,
    variables: Dict[str, Any],
    escape_html: bool = False,
    safe_keys: Optional[set] = None
) -> str:
    """
    Replaces mustache style placeholders {{key}} with corresponding values.
    If escape_html is True, variable values are safely HTML-escaped to prevent
    markup injection / XSS from untrusted user inputs.
    """
    if not text_or_html:
        return ""
    
    if safe_keys is None:
        safe_keys = {"unsubscribe_url"}

    result = text_or_html
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        if value is None:
            str_val = ""
        else:
            str_val = str(value)
            if escape_html and key not in safe_keys:
                str_val = html.escape(str_val, quote=True)
            elif escape_html and key == "unsubscribe_url":
                str_val = html.escape(str_val, quote=True)
        result = result.replace(placeholder, str_val)
    return result


def html_to_plain_text(html_content: str) -> str:
    """
    Extracts clean readable plain text from an HTML email.
    """
    if not html_content:
        return ""
    # Strip style and script tags
    clean = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html_content, flags=re.DOTALL | re.IGNORECASE)
    # Convert <br> and block closures to newlines
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


def render_final_email(
    body_html: str,
    variables: Optional[Dict[str, Any]] = None,
    unsubscribe_url: Optional[str] = None,
    apply_wrapper: Optional[bool] = False,
    preheader: str = "",
    escape_variables: bool = False
) -> Tuple[str, str]:
    """
    Canonical single source of truth for final email rendering across:
    1. Live Preview
    2. Test Send
    3. Production Dispatch (Outbox Job creation)

    Contract:
    - If apply_wrapper is True:
        body_html is treated as a content fragment and wrapped into the
        corporate responsive shell (render_base_layout).
        Anti-double-wrapping guard prevents re-wrapping if <html> already exists.
    - If apply_wrapper is False (or omitted/None):
        body_html is treated as deliberately authored full/raw email HTML.
        Sent as-is after variable interpolation without a wrapper.
    - If escape_variables is True:
        Interpolated variable values are safely HTML-escaped for untrusted user input.
    """
    vars_map = dict(variables or {})
    if unsubscribe_url and "unsubscribe_url" not in vars_map:
        vars_map["unsubscribe_url"] = unsubscribe_url

    # 1. Variable interpolation
    interpolated_html = interpolate_variables(body_html or "", vars_map, escape_html=escape_variables)
    interpolated_preheader = interpolate_variables(preheader or "", vars_map, escape_html=escape_variables)

    # 2. Wrapper decision & anti-double-wrapping guard
    lower_html = interpolated_html.lower()
    is_already_full_doc = "<html" in lower_html or "<!doctype" in lower_html

    if apply_wrapper is True:
        # Wrap unless it's already an entire document
        should_wrap = not is_already_full_doc
    else:
        should_wrap = False

    if should_wrap:
        final_html = render_base_layout(
            content_html=interpolated_html,
            preheader=interpolated_preheader,
            unsubscribe_url=vars_map.get("unsubscribe_url")
        )
    else:
        final_html = interpolated_html
        # If preheader is provided for raw custom HTML and not already in document, inject right after <body>
        if interpolated_preheader and "<body" in final_html.lower() and "preheader" not in final_html.lower():
            preheader_padding = "&#847; &zwnj; &nbsp; " * 30
            preheader_snippet = (
                f'<div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">'
                f'{html.escape(interpolated_preheader)}{preheader_padding}</div>'
            )
            final_html = re.sub(r"(<body[^>]*>)", r"\1\n" + preheader_snippet, final_html, count=1, flags=re.IGNORECASE)

    # 3. Plain text extraction
    plain_text = html_to_plain_text(final_html)

    return final_html, plain_text


def check_html_compatibility(html_content: str) -> List[Dict[str, str]]:
    """
    Lightweight email client compatibility and link safety guard.
    Scans for elements that degrade or fail in major clients (Outlook, Gmail, Apple Mail).
    """
    if not html_content:
        return []
    warnings = []

    # 1. Scripts
    if re.search(r"<script\b[^>]*>", html_content, re.IGNORECASE):
        warnings.append({
            "severity": "error",
            "type": "script_tag",
            "message": "<script> tags are blocked by email clients for security. JavaScript cannot execute in emails."
        })

    # 2. IFrames
    if re.search(r"<iframe\b[^>]*>", html_content, re.IGNORECASE):
        warnings.append({
            "severity": "error",
            "type": "iframe_tag",
            "message": "<iframe> tags are unsupported in email clients and will fail to render."
        })

    # 3. Forms
    if re.search(r"<form\b[^>]*>", html_content, re.IGNORECASE):
        warnings.append({
            "severity": "warning",
            "type": "form_tag",
            "message": "<form> elements are blocked by many email clients. Use a call-to-action button linking to a web page instead."
        })

    # 4. External Stylesheets
    if re.search(r"<link\b[^>]*rel=[\"']stylesheet[\"'][^>]*>", html_content, re.IGNORECASE):
        warnings.append({
            "severity": "warning",
            "type": "external_css",
            "message": "External CSS stylesheets are blocked by Gmail and other clients. Use inline CSS or style tags in <head>."
        })

    # 5. CSS Flexbox / Grid
    if re.search(r"display\s*:\s*(flex|grid)\b", html_content, re.IGNORECASE):
        warnings.append({
            "severity": "warning",
            "type": "modern_css_layout",
            "message": "CSS flexbox/grid layout has poor support in Outlook (Word engine). Standard nested HTML tables are recommended for email."
        })

    # 6. Dummy / Placeholder Links
    if re.search(r"href\s*=\s*[\"']#[\"']", html_content, re.IGNORECASE):
        warnings.append({
            "severity": "info",
            "type": "placeholder_link",
            "message": "Placeholder link 'href=\"#\"' detected. Ensure all links point to real URLs before broadcast."
        })

    # 7. Obviously malformed URLs
    malformed = re.findall(r"href\s*=\s*[\"'](http[s]?//[^\"'\s>]+|htp[s]?://[^\"'\s>]+)[\"']", html_content, re.IGNORECASE)
    if malformed:
        warnings.append({
            "severity": "warning",
            "type": "malformed_url",
            "message": f"Malformed URL detected: {malformed[0]}. Check link protocol formatting."
        })

    return warnings


STANDARD_KNOWN_VARIABLES = {
    "name", "company", "email", "unsubscribe_url", "year", "service_of_interest"
}

SYSTEM_CONTROLLED_VARIABLES = {
    "unsubscribe_url", "year"
}


def validate_template_variables(
    text: str,
    allowed_variables: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Inspects template text (subject and/or body) for variable interpolation tags {{variable}}.
    Returns a dictionary of:
    - found_variables: list of all tags found
    - known_variables: list of known supported variables
    - unknown_variables: list of unknown/unsupported variables (potential typos)
    - system_variables: list of system-controlled variables (e.g. unsubscribe_url)
    - user_variables: list of recipient-personalized variables (e.g. name, company)
    """
    if not text:
        return {
            "found_variables": [],
            "known_variables": [],
            "unknown_variables": [],
            "system_variables": [],
            "user_variables": []
        }

    known = set(STANDARD_KNOWN_VARIABLES)
    if allowed_variables:
        known.update(v.strip().lower() for v in allowed_variables if v)

    raw_matches = re.findall(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", text)
    found_unique = []
    seen = set()
    for v in raw_matches:
        v_clean = v.strip().lower()
        if v_clean not in seen:
            seen.add(v_clean)
            found_unique.append(v_clean)

    known_vars = [v for v in found_unique if v in known]
    unknown_vars = [v for v in found_unique if v not in known]
    sys_vars = [v for v in known_vars if v in SYSTEM_CONTROLLED_VARIABLES]
    user_vars = [v for v in known_vars if v not in SYSTEM_CONTROLLED_VARIABLES]

    return {
        "found_variables": found_unique,
        "known_variables": known_vars,
        "unknown_variables": unknown_vars,
        "system_variables": sys_vars,
        "user_variables": user_vars
    }




