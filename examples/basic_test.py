#!/usr/bin/env python3
"""
A simple test script to check Zangalewa functionality.
"""

from zangalewa.core.assistant import ZangalewaAssistant
from zangalewa.core.error_resolver import AutoErrorResolver

def test_assistant():
    """Test the ZangalewaAssistant class."""
    print("\n=== Testing ZangalewaAssistant ===")
    
    # Create an assistant instance
    assistant = ZangalewaAssistant()
    print(f"Assistant initialized with model: {assistant.model}")
    
    # Process a query
    query = "Find sequence alignment tools for protein sequences"
    print(f"\nProcessing query: '{query}'")
    
    result = assistant.process_query(query)
    
    print("\nResponse:")
    print(result.response)
    
    print("\nMetadata:")
    for key, value in result.metadata.items():
        print(f"  {key}: {value}")

def test_error_resolver():
    """Test the AutoErrorResolver class."""
    print("\n=== Testing AutoErrorResolver ===")
    
    # Create an error resolver instance
    resolver = AutoErrorResolver(git_enabled=False)
    print("Error resolver initialized")
    
    # Test error resolution with a simple error
    try:
        # Intentionally raise an error
        print("\nIntentionally raising an ImportError...")
        import non_existent_module
    except ImportError as e:
        print(f"Caught error: {type(e).__name__}: {e}")
        
        # Try to resolve the error
        print("\nAttempting to resolve the error...")
        resolved = resolver.resolve_error(e)
        
        if resolved:
            print("Error was successfully resolved!")
        else:
            print("Error could not be automatically resolved (expected for this demo)")

if __name__ == "__main__":
    print("Zangalewa Basic Test")
    print("--------------------")
    
    # Run tests
    test_assistant()
    test_error_resolver()
    
    print("\nTest completed!") 