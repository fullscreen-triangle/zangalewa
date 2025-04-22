# Getting Started with Zangalewa

## Installation

Install Zangalewa using pip:

```bash
pip install zangalewa
```

Or install from the source:

```bash
git clone https://github.com/fullscreen-triangle/zangalewa.git
cd zangalewa
pip install -e .
```

For development installation with all extras:

```bash
pip install -e ".[dev,testing,docs,analysis]"
```

## Configuration

Zangalewa requires API keys for LLM services (OpenAI or Anthropic). You can set these up in the following ways:

1. Using environment variables:
   ```bash
   export OPENAI_API_KEY=your_key_here
   export ANTHROPIC_API_KEY=your_key_here
   ```

2. Using a .env file in your project root:
   ```
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```

3. Using a custom config file (see examples/config_examples for templates)

## Basic Usage

### Command Line Interface

Run Zangalewa from the command line:

```bash
zangalewa "Find sequence alignment tools for protein sequences"
```

For interactive mode:

```bash
zangalewa --interactive
```

### Python API

```python
from zangalewa.core.assistant import ZangalewaAssistant

# Initialize the assistant
assistant = ZangalewaAssistant()

# Process a query
result = assistant.process_query("Find sequence alignment tools for protein sequences")

# Print the response
print(result.response)
```

## Features

- AI-powered bioinformatics assistant
- Command-line interface and Python API
- Integration with popular bioinformatics tools
- Automatic error resolution with Git integration
- Rich text output using the Rich library
- TUI interface with Textual

## Next Steps

- Check out the [examples](../examples/) directory for more usage examples
- Read the [API documentation](./api/) for detailed information
- Explore the [configuration options](./configuration.md) to customize Zangalewa 