"""Tests for the PDF repair and recovery operations."""

import os
import shutil
import struct
import tempfile

import pikepdf
import pytest

from engine.repair import repair
from engine.rebuild import rebuild
from engine.recover import recover
from engine.check import check


# ── Fixtures ─────────────────────────────────────────────────────────────


@pytest.fixture
def damaged_xref_pdf(sample_pdf, tmp_dir):
    """Create a PDF with a corrupted xref table (bytes zeroed in xref area)."""
    damaged = os.path.join(tmp_dir, "damaged_xref.pdf")
    with open(sample_pdf, "rb") as f:
        data = bytearray(f.read())

    # Find the xref keyword and corrupt the offset table
    xref_pos = data.find(b"xref")
    if xref_pos > 0:
        # Zero out 20 bytes after 'xref\n' to corrupt the offset table
        start = xref_pos + 5
        end = min(start + 20, len(data))
        for i in range(start, end):
            data[i] = 0x30  # Replace with '0' -- invalid offsets

    with open(damaged, "wb") as f:
        f.write(data)
    return damaged


@pytest.fixture
def truncated_pdf(sample_pdf, tmp_dir):
    """Create a truncated PDF (missing the last ~30% of data)."""
    truncated = os.path.join(tmp_dir, "truncated.pdf")
    with open(sample_pdf, "rb") as f:
        data = f.read()
    # Keep only the first 70% of the file
    cutoff = int(len(data) * 0.7)
    with open(truncated, "wb") as f:
        f.write(data[:cutoff])
    return truncated


@pytest.fixture
def not_a_pdf(tmp_dir):
    """A file that is not a PDF at all."""
    path = os.path.join(tmp_dir, "not_a_pdf.pdf")
    with open(path, "w") as f:
        f.write("This is not a PDF file.")
    return path


# ── Repair (Tier 1) ─────────────────────────────────────────────────────


class TestRepair:
    def test_repair_valid_pdf(self, sample_pdf, tmp_dir):
        """Repairing a valid PDF should succeed (no-op rewrite)."""
        out = os.path.join(tmp_dir, "repaired.pdf")
        result = repair(file=sample_pdf, output=out)
        assert result["pages"] == 5
        assert result["tier"] == "repair"
        assert os.path.isfile(out)
        assert result["repaired_size"] > 0
        # Verify the output is a valid PDF
        with pikepdf.open(out) as pdf:
            assert len(pdf.pages) == 5

    def test_repair_produces_readable_output(self, sample_pdf, tmp_dir):
        """Output of repair should be fully readable by pikepdf."""
        out = os.path.join(tmp_dir, "repaired.pdf")
        repair(file=sample_pdf, output=out)
        with pikepdf.open(out) as pdf:
            for page in pdf.pages:
                assert page.get("/MediaBox") is not None

    def test_repair_nonexistent_file(self, tmp_dir):
        out = os.path.join(tmp_dir, "out.pdf")
        with pytest.raises(FileNotFoundError):
            repair(file="/nonexistent/file.pdf", output=out)

    def test_repair_in_place(self, tmp_pdf):
        """Repair with output == input (overwrite)."""
        result = repair(file=tmp_pdf, output=tmp_pdf)
        assert result["pages"] == 5
        with pikepdf.open(tmp_pdf) as pdf:
            assert len(pdf.pages) == 5


# ── Rebuild (Tier 2) ────────────────────────────────────────────────────


class TestRebuild:
    def test_rebuild_valid_pdf(self, sample_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "rebuilt.pdf")
        result = rebuild(file=sample_pdf, output=out, gs_path=gs_path)
        assert result["pages"] == 5
        assert result["tier"] == "rebuild"
        assert os.path.isfile(out)
        assert result["rebuilt_size"] > 0

    def test_rebuild_produces_readable_output(self, sample_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "rebuilt.pdf")
        rebuild(file=sample_pdf, output=out, gs_path=gs_path)
        with pikepdf.open(out) as pdf:
            assert len(pdf.pages) == 5
            for page in pdf.pages:
                assert page.get("/MediaBox") is not None

    def test_rebuild_nonexistent_file(self, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "out.pdf")
        with pytest.raises(FileNotFoundError):
            rebuild(file="/nonexistent/file.pdf", output=out, gs_path=gs_path)


# ── Recover (Tier 3) ────────────────────────────────────────────────────


class TestRecover:
    def test_recover_valid_pdf(self, sample_pdf, tmp_dir):
        """Recovering from a valid PDF should extract all pages."""
        out = os.path.join(tmp_dir, "recovered.pdf")
        result = recover(file=sample_pdf, output=out)
        assert result["recovered"] == 5
        assert result["lost"] == 0
        assert result["tier"] == "recover"
        assert os.path.isfile(out)

    def test_recover_produces_readable_output(self, sample_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "recovered.pdf")
        recover(file=sample_pdf, output=out)
        with pikepdf.open(out) as pdf:
            assert len(pdf.pages) == 5

    def test_recover_nonexistent_file(self, tmp_dir):
        out = os.path.join(tmp_dir, "out.pdf")
        with pytest.raises(FileNotFoundError):
            recover(file="/nonexistent/file.pdf", output=out)

    def test_recover_reports_lost_pages(self, sample_pdf, tmp_dir):
        """Result includes lost_pages list (empty for a valid file)."""
        out = os.path.join(tmp_dir, "recovered.pdf")
        result = recover(file=sample_pdf, output=out)
        assert isinstance(result["lost_pages"], list)
        assert isinstance(result["recovered_pages"], list)
        assert result["recovered_pages"] == [1, 2, 3, 4, 5]

    def test_recover_not_a_pdf(self, not_a_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "out.pdf")
        with pytest.raises(RuntimeError):
            recover(file=not_a_pdf, output=out)


# ── Check (Validation) ──────────────────────────────────────────────────


class TestCheck:
    def test_check_valid_pdf(self, sample_pdf):
        result = check(file=sample_pdf)
        assert result["valid"] is True
        assert result["info"]["pages"] == 5
        assert result["summary"]["errors"] == 0
        assert result["summary"]["status"] == "ok"

    def test_check_returns_file_info(self, sample_pdf):
        result = check(file=sample_pdf)
        assert result["size_bytes"] > 0
        assert "pdf_version" in result["info"]
        assert "linearized" in result["info"]
        assert "encrypted" in result["info"]

    def test_check_nonexistent_file(self):
        with pytest.raises(FileNotFoundError):
            check(file="/nonexistent/file.pdf")

    def test_check_not_a_pdf(self, not_a_pdf):
        result = check(file=not_a_pdf)
        assert result["valid"] is False
        assert any(i["category"] == "header" for i in result["issues"])

    def test_check_font_info(self, sample_pdf):
        result = check(file=sample_pdf)
        assert "fonts_checked" in result["info"]
        assert "fonts_embedded" in result["info"]

    def test_check_encrypted_pdf(self, tmp_pdf, tmp_dir):
        """Encrypted PDFs should report encryption status."""
        from engine.encrypt import encrypt
        enc = os.path.join(tmp_dir, "encrypted.pdf")
        encrypt(file=tmp_pdf, output=enc, user_password="test123")
        result = check(file=enc)
        assert result["info"]["encrypted"] is True
