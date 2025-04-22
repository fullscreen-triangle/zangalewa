# Zangalewa Core API

This document describes the core API components of Zangalewa.

## ZangalewaAssistant

The main assistant class that handles processing queries and integrating with LLM services.

```python
from zangalewa.core.assistant import ZangalewaAssistant

assistant = ZangalewaAssistant(config_path=None, model="gpt-4")
```

### Methods

#### `process_query(query: str) -> QueryResult`

Process a natural language query and return the results.

**Parameters:**
- `query` (str): The natural language query to process

**Returns:**
- `QueryResult`: Object containing the response and metadata

**Example:**
```python
result = assistant.process_query("Find alignment tools for DNA sequences")
print(result.response)  # Prints the assistant's response
print(result.metadata)  # Prints metadata about the query processing
```

#### `load_config(config_path: str) -> None`

Load configuration from a specified path.

**Parameters:**
- `config_path` (str): Path to the configuration file

**Example:**
```python
assistant.load_config("path/to/custom_config.yaml")
```

## QueryResult

Contains the result of a processed query.

```python
from zangalewa.core.types import QueryResult

# Usually obtained from assistant.process_query()
result = QueryResult(
    response="This is the assistant's response",
    metadata={"processing_time": 1.23, "model_used": "gpt-4"}
)
```

### Attributes

- `response` (str): The text response from the assistant
- `metadata` (dict): Metadata about the query processing
- `timestamp` (datetime): When the query was processed

## AutoErrorResolver

Handles automatic error resolution with Git integration.

```python
from zangalewa.core.error_resolver import AutoErrorResolver

resolver = AutoErrorResolver()
```

### Methods

#### `resolve_error(error: Exception) -> bool`

Attempts to automatically resolve an error.

**Parameters:**
- `error` (Exception): The exception to resolve

**Returns:**
- `bool`: True if resolved successfully, False otherwise

**Example:**
```python
try:
    # Some code that might raise an exception
    pass
except Exception as e:
    resolved = resolver.resolve_error(e)
    if resolved:
        print("Error was automatically resolved!")
    else:
        print("Could not automatically resolve the error.")
``` 