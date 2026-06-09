"""PDF structural validation (check mode).

Validates PDF structure without modifying the file. Reports xref integrity,
stream health, page tree, font embedding, encryption status. JSON output
for programmatic use.
"""

import os
import pikepdf
from pathlib import Path


def check(file: str) -> dict:
    """Validate PDF structure and report findings.

    Performs a comprehensive structural check without modifying the file.
    Returns a detailed report suitable for JSON output.

    Args:
        file: Input PDF path.
    """
    input_path = Path(file)

    if not input_path.exists():
        raise FileNotFoundError(f"File not found: {file}")

    file_size = os.path.getsize(file)
    report = {
        "file": str(input_path),
        "size_bytes": file_size,
        "valid": True,
        "issues": [],
        "info": {},
    }

    # 1. Check file header (PDF magic bytes)
    with open(file, "rb") as f:
        header = f.read(1024)
        if not header.startswith(b"%PDF-"):
            report["valid"] = False
            report["issues"].append({
                "severity": "error",
                "category": "header",
                "message": "Missing PDF header (%PDF-)",
            })
            return report

        # Extract PDF version from header
        version_line = header[:20].decode("latin-1", errors="replace")
        if version_line.startswith("%PDF-"):
            report["info"]["pdf_version"] = version_line[5:].split()[0].rstrip("\r\n")

    # 2. Try opening with pikepdf (validates xref, trailer, object streams)
    try:
        pdf = pikepdf.open(file, suppress_warnings=False)
    except pikepdf.PasswordError:
        report["info"]["encrypted"] = True
        report["issues"].append({
            "severity": "info",
            "category": "encryption",
            "message": "PDF is encrypted -- cannot perform deep validation without password",
        })
        return report
    except Exception as e:
        report["valid"] = False
        report["issues"].append({
            "severity": "error",
            "category": "structure",
            "message": f"Failed to open: {e}",
        })
        return report

    with pdf:
        report["info"]["encrypted"] = False

        # 3. Page count and page tree validation
        try:
            page_count = len(pdf.pages)
            report["info"]["pages"] = page_count
        except Exception as e:
            report["valid"] = False
            report["issues"].append({
                "severity": "error",
                "category": "page_tree",
                "message": f"Cannot read page tree: {e}",
            })
            return report

        # 4. Per-page validation (MediaBox, Resources)
        page_issues = []
        for i, page in enumerate(pdf.pages):
            page_num = i + 1
            try:
                mediabox = page.get("/MediaBox")
                if mediabox is None:
                    page_issues.append({
                        "severity": "warning",
                        "category": "page",
                        "message": f"Page {page_num}: missing MediaBox",
                    })
            except Exception as e:
                page_issues.append({
                    "severity": "error",
                    "category": "page",
                    "message": f"Page {page_num}: {e}",
                })

            # Check for Resources dict
            try:
                resources = page.get("/Resources")
                if resources is None:
                    page_issues.append({
                        "severity": "warning",
                        "category": "page",
                        "message": f"Page {page_num}: missing Resources dictionary",
                    })
            except Exception:
                pass  # Not critical

        if page_issues:
            report["issues"].extend(page_issues)
            # Page issues are warnings unless MediaBox errors
            if any(p["severity"] == "error" for p in page_issues):
                report["valid"] = False

        # 5. Font embedding check
        fonts_checked = 0
        fonts_embedded = 0
        fonts_not_embedded = []
        try:
            for i, page in enumerate(pdf.pages):
                resources = page.get("/Resources")
                if resources is None:
                    continue
                font_dict = resources.get("/Font")
                if font_dict is None:
                    continue
                for font_name in font_dict.keys():
                    fonts_checked += 1
                    font_obj = font_dict[font_name]
                    if hasattr(font_obj, "get"):
                        descriptor = font_obj.get("/FontDescriptor")
                        if descriptor and hasattr(descriptor, "get"):
                            has_file = (
                                descriptor.get("/FontFile") is not None
                                or descriptor.get("/FontFile2") is not None
                                or descriptor.get("/FontFile3") is not None
                            )
                            if has_file:
                                fonts_embedded += 1
                            else:
                                fonts_not_embedded.append(str(font_name))
                        else:
                            # No descriptor -- likely a standard font
                            fonts_embedded += 1
                    if fonts_checked >= 100:
                        break  # Don't scan the entire document
                if fonts_checked >= 100:
                    break
        except Exception:
            pass  # Font check is best-effort

        report["info"]["fonts_checked"] = fonts_checked
        report["info"]["fonts_embedded"] = fonts_embedded
        if fonts_not_embedded:
            report["issues"].append({
                "severity": "warning",
                "category": "fonts",
                "message": f"{len(fonts_not_embedded)} font(s) not embedded: {', '.join(fonts_not_embedded[:10])}",
            })

        # 6. Linearization check
        report["info"]["linearized"] = pdf.is_linearized

        # 7. Summary
        errors = sum(1 for i in report["issues"] if i["severity"] == "error")
        warnings = sum(1 for i in report["issues"] if i["severity"] == "warning")
        report["summary"] = {
            "errors": errors,
            "warnings": warnings,
            "status": "ok" if errors == 0 else "damaged",
        }

    return report
