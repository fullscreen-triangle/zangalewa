#!/usr/bin/env python3
"""
Basic Usage Example for Zangalewa
--------------------------------

This example demonstrates how to use the Zangalewa CLI for basic operations.
"""

import sys
from zangalewa.cli.app import main

# Simple example of how to programmatically use Zangalewa
def example_workflow():
    """
    Example workflow to demonstrate basic Zangalewa functionality.
    """
    from zangalewa.core.assistant import ZangalewaAssistant
    
    # Initialize the assistant
    assistant = ZangalewaAssistant()
    
    # Process a simple bioinformatics query
    result = assistant.process_query("Find sequence alignment tools for protein sequences")
    
    # Print the response
    print(result.response)
    
    # Example of error handling
    try:
        result = assistant.process_query("Invalid query that might cause an error")
    except Exception as e:
        print(f"Error encountered: {e}")
        
if __name__ == "__main__":
    # You can either run Zangalewa directly using the CLI
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        sys.exit(main())
    
    # Or use the programmatic interface
    example_workflow() 