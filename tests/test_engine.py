"""Tests for all 10 SpectraPDF Python engine operations + inspect/validate."""

import os
import shutil

import pikepdf
import pytest

from engine.merge import merge
from engine.split import split
from engine.rotate import rotate
from engine.delete import delete
from engine.compress import compress
from engine.pdfa import convert_pdfa
from engine.encrypt import encrypt, decrypt
from engine.extract_text import extract_text
from engine.metadata import get_metadata, set_metadata
from engine.inspect import get_page_count, get_page_info, check_encrypted, unlock
from engine.validate import validate_pdf


# ── Merge ─────────────────────────────────────────────────────────────────


class TestMerge:
    def test_merge_two_files(self, sample_pdf, sample_pdf2, tmp_dir):
        out = os.path.join(tmp_dir, "merged.pdf")
        result = merge(files=[sample_pdf, sample_pdf2], output=out)
        assert result["pages"] == 8  # 5 + 3
        assert result["output"] == out
        assert os.path.isfile(out)
        assert result["size_bytes"] > 0

    def test_merge_single_file(self, sample_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "merged.pdf")
        result = merge(files=[sample_pdf], output=out)
        assert result["pages"] == 5

    def test_merge_same_file_twice(self, sample_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "merged.pdf")
        result = merge(files=[sample_pdf, sample_pdf], output=out)
        assert result["pages"] == 10


# ── Split ─────────────────────────────────────────────────────────────────


class TestSplit:
    def test_split_single_range(self, sample_pdf, tmp_dir):
        result = split(file=sample_pdf, ranges="1-3", output_dir=tmp_dir)
        assert result["pages_extracted"] == 3
        assert len(result["outputs"]) == 1
        assert os.path.isfile(result["outputs"][0])

    def test_split_multiple_ranges(self, sample_pdf, tmp_dir):
        result = split(file=sample_pdf, ranges="1-2,4-5", output_dir=tmp_dir)
        assert result["pages_extracted"] == 4

    def test_split_single_page(self, sample_pdf, tmp_dir):
        result = split(file=sample_pdf, ranges="3", output_dir=tmp_dir)
        assert result["pages_extracted"] == 1

    def test_split_out_of_range_clamped(self, sample_pdf, tmp_dir):
        result = split(file=sample_pdf, ranges="1-100", output_dir=tmp_dir)
        assert result["pages_extracted"] == 5  # clamped to max


# ── Rotate ────────────────────────────────────────────────────────────────


class TestRotate:
    def test_rotate_single_page(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "rotated.pdf")
        result = rotate(file=tmp_pdf, pages=[1], angle=90, output=out)
        assert result["pages_rotated"] == 1
        assert result["angle"] == 90
        with pikepdf.open(out) as pdf:
            assert int(pdf.pages[0].get("/Rotate", 0)) == 90

    def test_rotate_all_pages(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "rotated.pdf")
        result = rotate(file=tmp_pdf, pages="all", angle=180, output=out)
        assert result["pages_rotated"] == 5

    def test_rotate_in_place(self, tmp_pdf):
        result = rotate(file=tmp_pdf, pages=[1, 2], angle=270, output=tmp_pdf)
        assert result["pages_rotated"] == 2

    def test_rotate_invalid_pages_filtered(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "rotated.pdf")
        result = rotate(file=tmp_pdf, pages=[1, 99], angle=90, output=out)
        assert result["pages_rotated"] == 1  # page 99 filtered out


# ── Delete ────────────────────────────────────────────────────────────────


class TestDelete:
    def test_delete_single_page(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "deleted.pdf")
        result = delete(file=tmp_pdf, pages=[3], output=out)
        assert result["pages_deleted"] == 1
        assert result["pages_remaining"] == 4

    def test_delete_multiple_pages(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "deleted.pdf")
        result = delete(file=tmp_pdf, pages=[1, 3, 5], output=out)
        assert result["pages_deleted"] == 3
        assert result["pages_remaining"] == 2

    def test_delete_in_place(self, tmp_pdf):
        result = delete(file=tmp_pdf, pages=[1], output=tmp_pdf)
        assert result["pages_remaining"] == 4

    def test_delete_invalid_pages_filtered(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "deleted.pdf")
        result = delete(file=tmp_pdf, pages=[1, 99], output=out)
        assert result["pages_deleted"] == 1
        assert result["pages_remaining"] == 4

    def test_delete_duplicate_pages(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "deleted.pdf")
        result = delete(file=tmp_pdf, pages=[1, 1, 1], output=out)
        assert result["pages_deleted"] == 1  # deduped


# ── Compress ──────────────────────────────────────────────────────────────


class TestCompress:
    def test_compress_ebook(self, tmp_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "compressed.pdf")
        result = compress(file=tmp_pdf, output=out, quality="ebook", gs_path=gs_path)
        assert result["quality"] == "ebook"
        assert os.path.isfile(out)
        assert result["compressed_size"] > 0

    def test_compress_screen(self, tmp_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "compressed.pdf")
        result = compress(file=tmp_pdf, output=out, quality="screen", gs_path=gs_path)
        assert result["quality"] == "screen"

    def test_compress_default_quality(self, tmp_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "compressed.pdf")
        result = compress(file=tmp_pdf, output=out, gs_path=gs_path)
        assert result["quality"] == "ebook"


# ── PDF/A ─────────────────────────────────────────────────────────────────


class TestPdfa:
    def test_pdfa_2b(self, tmp_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "pdfa.pdf")
        result = convert_pdfa(file=tmp_pdf, output=out, level="2b", gs_path=gs_path)
        assert "2b" in result["level"]
        assert os.path.isfile(out)

    def test_pdfa_1b(self, tmp_pdf, tmp_dir, gs_path):
        out = os.path.join(tmp_dir, "pdfa.pdf")
        result = convert_pdfa(file=tmp_pdf, output=out, level="1b", gs_path=gs_path)
        assert "1b" in result["level"]


# ── Encrypt / Decrypt ────────────────────────────────────────────────────


class TestEncryptDecrypt:
    def test_encrypt_with_password(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "encrypted.pdf")
        result = encrypt(file=tmp_pdf, output=out, user_password="secret")
        assert result["encryption"] == "AES-256"
        assert result["has_user_password"] is True
        # Verify it's actually encrypted
        enc_check = check_encrypted(file=out)
        assert enc_check["encrypted"] is True

    def test_decrypt(self, tmp_pdf, tmp_dir):
        enc = os.path.join(tmp_dir, "encrypted.pdf")
        dec = os.path.join(tmp_dir, "decrypted.pdf")
        encrypt(file=tmp_pdf, output=enc, user_password="secret")
        result = decrypt(file=enc, output=dec, password="secret")
        assert result["decrypted"] is True
        # Verify it's no longer encrypted
        enc_check = check_encrypted(file=dec)
        assert enc_check["encrypted"] is False

    def test_decrypt_wrong_password(self, tmp_pdf, tmp_dir):
        enc = os.path.join(tmp_dir, "encrypted.pdf")
        dec = os.path.join(tmp_dir, "decrypted.pdf")
        encrypt(file=tmp_pdf, output=enc, user_password="secret")
        with pytest.raises(Exception):
            decrypt(file=enc, output=dec, password="wrong")


# ── Extract Text ──────────────────────────────────────────────────────────


class TestExtractText:
    def test_extract_all(self, sample_pdf):
        result = extract_text(file=sample_pdf)
        assert result["pages_extracted"] == "all"
        assert isinstance(result["text"], str)
        assert result["length"] >= 0

    def test_extract_specific_pages(self, sample_pdf):
        result = extract_text(file=sample_pdf, pages=[1, 2])
        assert result["pages_extracted"] == 2


# ── Metadata ──────────────────────────────────────────────────────────────


class TestMetadata:
    def test_get_metadata(self, sample_pdf):
        result = get_metadata(file=sample_pdf)
        assert result["title"] == "Test Document"
        # XMP dc:creator is a list; engine may return list or joined string
        author = result["author"]
        assert "Test Author" in (author if isinstance(author, list) else [author])
        assert result["subject"] == "Test Subject"
        assert result["keywords"] == "test, fixture"
        assert result["pages"] == 5

    def test_set_metadata(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "meta.pdf")
        result = set_metadata(
            file=tmp_pdf, output=out, title="New Title", author="New Author"
        )
        assert "title" in result["updated_fields"]
        assert "author" in result["updated_fields"]
        # Verify round-trip
        meta = get_metadata(file=out)
        assert meta["title"] == "New Title"
        author = meta["author"]
        assert "New Author" in (author if isinstance(author, list) else [author])

    def test_set_metadata_partial(self, tmp_pdf, tmp_dir):
        out = os.path.join(tmp_dir, "meta.pdf")
        result = set_metadata(file=tmp_pdf, output=out, title="Only Title")
        assert result["updated_fields"] == ["title"]


# ── Inspect ───────────────────────────────────────────────────────────────


class TestInspect:
    def test_page_count(self, sample_pdf):
        result = get_page_count(file=sample_pdf)
        assert result["pages"] == 5
        assert len(result["page_sizes"]) == 5
        assert result["page_sizes"][0]["width"] == 612.0
        assert result["page_sizes"][0]["height"] == 792.0

    def test_page_info(self, sample_pdf):
        result = get_page_info(file=sample_pdf, page=1)
        assert result["page"] == 1
        assert result["width"] == 612.0
        assert result["height"] == 792.0
        assert result["rotation"] == 0

    def test_page_info_out_of_range(self, sample_pdf):
        with pytest.raises(ValueError, match="out of range"):
            get_page_info(file=sample_pdf, page=99)

    def test_check_encrypted_unencrypted(self, sample_pdf):
        result = check_encrypted(file=sample_pdf)
        assert result["encrypted"] is False

    def test_unlock(self, tmp_pdf, tmp_dir):
        enc = os.path.join(tmp_dir, "locked.pdf")
        encrypt(file=tmp_pdf, output=enc, user_password="test123")
        result = unlock(file=enc, password="test123")
        assert result["unlocked"] is True
        # Verify it's now readable without password
        assert check_encrypted(file=enc)["encrypted"] is False


# ── Validate ──────────────────────────────────────────────────────────────


class TestValidate:
    def test_validate_good_pdf(self, sample_pdf):
        result = validate_pdf(sample_pdf)
        assert result["pages"] == 5
        assert result["size_bytes"] > 0

    def test_validate_nonexistent(self):
        with pytest.raises(Exception):
            validate_pdf("/nonexistent/file.pdf")
