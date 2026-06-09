"""Startup script for embedded Python — adds engine parent to sys.path."""
import sys
import os

# Add the directory containing the 'engine' package to sys.path
engine_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if engine_dir not in sys.path:
    sys.path.insert(0, engine_dir)

from engine.__main__ import main
main()
