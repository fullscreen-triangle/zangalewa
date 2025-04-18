# Contributing to Zangalewa

Thank you for your interest in contributing to Zangalewa! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:

1. Check the [issue tracker](https://github.com/yourusername/zangalewa/issues) to see if the issue has already been reported.
2. If the issue hasn't been reported, [create a new issue](https://github.com/yourusername/zangalewa/issues/new).

When creating a bug report, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior and what actually happened
- System information (OS, Python version, etc.)
- Any relevant logs or screenshots

### Suggesting Features

Feature suggestions are always welcome! To suggest a feature:

1. Check the [issue tracker](https://github.com/yourusername/zangalewa/issues) to see if the feature has already been suggested.
2. If it hasn't, [create a new issue](https://github.com/yourusername/zangalewa/issues/new) with the label "enhancement".

When suggesting a feature, please include:

- A clear and descriptive title
- A detailed description of the proposed feature
- Any potential implementation approach you might have in mind
- Why this feature would be beneficial to the project

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the tests to ensure your changes don't break existing functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

#### Pull Request Guidelines

- Follow the existing coding style
- Include tests for any new functionality
- Update documentation for any changed functionality
- Keep pull requests focused on a single topic
- Reference any relevant issues in your PR description

## Development Setup

### Prerequisites

- Python 3.10 or higher
- Poetry (for dependency management)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zangalewa.git
   cd zangalewa
   ```

2. Install dependencies:
   ```bash
   poetry install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running Tests

```bash
poetry run pytest
```

### Code Style

We use the following tools to maintain code quality:

- Black for code formatting
- isort for import sorting
- pylint for linting

You can run these tools with:

```bash
poetry run black zangalewa tests
poetry run isort zangalewa tests
poetry run pylint zangalewa
```

## Documentation

We use Sphinx and MkDocs for documentation:

- Code docstrings should follow the Google docstring format
- New features should include appropriate documentation
- To build the documentation:
  ```bash
  poetry run sphinx-build -b html docs/source docs/build
  ```

## Release Process

Releases are managed by the core maintainers. The process follows these steps:

1. Update the version in `pyproject.toml`
2. Update the CHANGELOG.md
3. Create a new tag with the version number
4. Push the tag to GitHub
5. CI/CD will build and publish the package to PyPI

## Questions?

If you have any questions about contributing, please reach out by creating an issue. 