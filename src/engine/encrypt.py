"""PDF encryption and decryption using pikepdf."""

from pathlib import Path

import pikepdf


def encrypt(
    file: str,
    output: str,
    user_password: str = "",
    owner_password: str = "",
) -> dict:
    """Encrypt a PDF with AES-256.

    Args:
        file: Input PDF path.
        output: Output PDF path.
        user_password: Password to open the document (empty = no password to view).
        owner_password: Password to modify/print (empty = same as user_password).
    """
    if not owner_password:
        owner_password = user_password

    with pikepdf.open(file) as pdf:
        output_path = Path(output)
        pdf.save(
            output_path,
            encryption=pikepdf.Encryption(
                owner=owner_password,
                user=user_password,
                aes=True,
                R=6,  # AES-256
            ),
        )

    return {
        "output": str(output_path),
        "encryption": "AES-256",
        "has_user_password": bool(user_password),
    }


def decrypt(file: str, output: str, password: str = "") -> dict:
    """Decrypt a PDF.

    Args:
        file: Input PDF path.
        output: Output PDF path.
        password: Password to unlock the document.
    """
    with pikepdf.open(file, password=password) as pdf:
        output_path = Path(output)
        pdf.save(output_path)

    return {
        "output": str(output_path),
        "decrypted": True,
    }
