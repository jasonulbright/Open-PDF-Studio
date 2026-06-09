"""PDF split operations using pikepdf."""

from pathlib import Path

import pikepdf


def parse_ranges(range_str: str, max_page: int) -> list[int]:
    """Parse a page range string like '1-5,10-15' into a list of 0-based page indices."""
    pages: list[int] = []
    for part in range_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            start_idx = int(start) - 1
            end_idx = min(int(end), max_page)
            pages.extend(range(start_idx, end_idx))
        else:
            pages.append(int(part) - 1)
    return [p for p in pages if 0 <= p < max_page]


def split(file: str, ranges: str, output_dir: str) -> dict:
    """Split a PDF by page ranges into separate files."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    outputs: list[str] = []

    with pikepdf.open(file) as pdf:
        page_indices = parse_ranges(ranges, len(pdf.pages))
        result = pikepdf.Pdf.new()
        for idx in page_indices:
            result.pages.append(pdf.pages[idx])

        out_file = output_path / f"split_{ranges.replace(',', '_')}.pdf"
        result.save(out_file)
        outputs.append(str(out_file))

    return {"outputs": outputs, "pages_extracted": len(page_indices)}
