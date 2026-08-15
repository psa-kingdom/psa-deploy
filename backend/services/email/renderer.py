import re
import html
from typing import Dict, Any, Optional

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
                    

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px; font-size: 15px; line-height: 1.6; color: {PSA_BRAND_TEXT}; background-color: #ffffff;">
                            {content_html}
                        </td>
                    </tr

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
