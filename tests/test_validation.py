"""Tests for the PDF pre-flight validation in engine/validate.py.

Covers the checks that run before a file is passed to an engine operation:
rejecting non-PDF input and accepting a well-formed PDF.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from engine.validate import validate_pdf  # noqa: E402


class TestValidationDefense:
    """The validate_pdf pre-flight must accept good PDFs and reject bad input."""

    def test_reject_non_pdf(self, tmp_path):
        """A non-PDF file must be rejected."""
        fake = tmp_path / "not_a_pdf.txt"
        fake.write_text("This is not a PDF")
        with pytest.raises(Exception):
            validate_pdf(str(fake))

    def test_accept_valid_pdf(self, tmp_path):
        """A well-formed PDF under the page limit must pass and report its page count."""
        import pikepdf

        pdf = pikepdf.Pdf.new()
        pdf.add_blank_page(page_size=(612, 792))
        out = str(tmp_path / "small.pdf")
        pdf.save(out)

        result = validate_pdf(out)
        assert result["pages"] == 1
