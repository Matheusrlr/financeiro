"""PDF text and table helpers."""

from __future__ import annotations

from pathlib import Path

import pdfplumber
import pymupdf


# If pdfplumber yields almost no text (bad encoding/layout), try PyMuPDF.
_MIN_CHARS_FIRST_PAGES = 24
_MIN_CHARS_FULL = 40


def _read_pymupdf_first_pages(pdf_path: Path, max_pages: int) -> str:
    doc = pymupdf.open(pdf_path)
    try:
        n = min(max_pages, len(doc))
        parts: list[str] = []
        for i in range(n):
            parts.append(doc[i].get_text() or "")
        return "\n".join(parts)
    finally:
        doc.close()


def _read_pymupdf_full(pdf_path: Path) -> str:
    doc = pymupdf.open(pdf_path)
    try:
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text() or "")
        return "\n".join(parts)
    finally:
        doc.close()


def read_pdf_text_first_pages(pdf_path: Path, max_pages: int = 2) -> str:
    parts: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages[:max_pages]:
            parts.append(page.extract_text() or "")
    text = "\n".join(parts)
    if len(text.strip()) >= _MIN_CHARS_FIRST_PAGES:
        return text
    fallback = _read_pymupdf_first_pages(pdf_path, max_pages)
    return fallback if len(fallback.strip()) > len(text.strip()) else text


def read_pdf_full_text(pdf_path: Path) -> str:
    parts: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    text = "\n".join(parts)
    if len(text.strip()) >= _MIN_CHARS_FULL:
        return text
    fallback = _read_pymupdf_full(pdf_path)
    return fallback if len(fallback.strip()) > len(text.strip()) else text
