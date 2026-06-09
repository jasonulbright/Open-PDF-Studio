"""PDF merge operations using pikepdf."""

from pathlib import Path

import pikepdf


def merge(files: list[str], output: str) -> dict:
    """Merge multiple PDF files into one."""
    output_path = Path(output)
    merged = pikepdf.Pdf.new()

    total_pages = 0
    for file_path in files:
        with pikepdf.open(file_path) as pdf:
            merged.pages.extend(pdf.pages)
            total_pages += len(pdf.pages)

    merged.save(output_path)
    return {
        "output": str(output_path),
        "pages": total_pages,
        "size_bytes": output_path.stat().st_size,
    }
