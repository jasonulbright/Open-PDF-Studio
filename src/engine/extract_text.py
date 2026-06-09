"""Text extraction from PDF using pikepdf and pdfminer.six."""

from pathlib import Path

from pdfminer.high_level import extract_text as pdfminer_extract


def extract_text(file: str, pages: list[int] | str = "all") -> dict:
    """Extract text from a PDF.

    Args:
        file: Input PDF path.
        pages: List of 1-based page numbers, or 'all'.
    """
    page_numbers = None
    if pages != "all":
        # pdfminer uses 0-based page indices
        page_numbers = set(p - 1 for p in pages)

    text = pdfminer_extract(file, page_numbers=page_numbers)

    return {
        "file": file,
        "text": text,
        "length": len(text),
        "pages_extracted": "all" if page_numbers is None else len(page_numbers),
    }
