"""
Error handling module for detecting, analyzing, and resolving errors.
"""

from zangalewa.core.errors.detector import ErrorDetector
from zangalewa.core.errors.resolver import ErrorResolver
from zangalewa.core.errors.search import ErrorSearcher
from zangalewa.core.errors.auto_resolver import AutoErrorResolver, ErrorFixResult

__all__ = ["ErrorDetector", "ErrorResolver", "ErrorSearcher", "AutoErrorResolver", "ErrorFixResult"] 