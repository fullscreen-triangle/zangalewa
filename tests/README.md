# Zangalewa Tests

This directory contains tests for the Zangalewa project.

## Running Tests

To run all tests:

```bash
pytest
```

To run a specific test module:

```bash
pytest tests/test_cli
```

To run with coverage:

```bash
pytest --cov=zangalewa
```

## Test Structure

- `test_cli/`: Tests for the CLI module
- `test_core/`: Tests for the core functionality
- `test_meta/`: Tests for the metacognitive layer
- `conftest.py`: Common test fixtures and configuration

## Writing Tests

When writing tests, please follow these guidelines:

1. Each test file should focus on testing a single module or class
2. Use fixtures from `conftest.py` when possible
3. Mock external dependencies (API calls, file operations, etc.)
4. Test both success and failure cases
5. Use descriptive test names that explain what's being tested