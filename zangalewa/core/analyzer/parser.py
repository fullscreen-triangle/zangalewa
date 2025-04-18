"""
Code parser for analyzing Python code structure.
"""

import os
import ast
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
import astroid
from astroid import nodes

logger = logging.getLogger(__name__)

class FunctionInfo:
    """Information about a function/method."""
    
    def __init__(self, name: str, lineno: int, docstring: Optional[str] = None):
        self.name = name
        self.lineno = lineno
        self.docstring = docstring
        self.parameters = []
        self.returns = None
        self.is_method = False
        self.decorators = []
        self.complexity = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "lineno": self.lineno,
            "docstring": self.docstring,
            "parameters": self.parameters,
            "returns": self.returns,
            "is_method": self.is_method,
            "decorators": self.decorators,
            "complexity": self.complexity
        }


class ClassInfo:
    """Information about a class."""
    
    def __init__(self, name: str, lineno: int, docstring: Optional[str] = None):
        self.name = name
        self.lineno = lineno
        self.docstring = docstring
        self.methods = []
        self.attributes = []
        self.base_classes = []
        self.decorators = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "lineno": self.lineno,
            "docstring": self.docstring,
            "methods": [method.to_dict() for method in self.methods],
            "attributes": self.attributes,
            "base_classes": self.base_classes,
            "decorators": self.decorators
        }


class ModuleInfo:
    """Information about a module."""
    
    def __init__(self, name: str, filepath: str, docstring: Optional[str] = None):
        self.name = name
        self.filepath = filepath
        self.docstring = docstring
        self.functions = []
        self.classes = []
        self.imports = []
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "name": self.name,
            "filepath": self.filepath,
            "docstring": self.docstring,
            "functions": [function.to_dict() for function in self.functions],
            "classes": [class_info.to_dict() for class_info in self.classes],
            "imports": self.imports
        }


class CodeParser:
    """
    Parses Python code to extract structure and documentation.
    """
    
    def __init__(self):
        """Initialize the code parser."""
        self.module_cache = {}
        
    async def parse_file(self, filepath: str) -> Optional[ModuleInfo]:
        """
        Parse a Python file and extract information.
        
        Args:
            filepath: Path to the Python file
            
        Returns:
            ModuleInfo object with file information
        """
        if not os.path.isfile(filepath) or not filepath.endswith('.py'):
            logger.warning(f"Not a Python file: {filepath}")
            return None
            
        try:
            # Check if we've already parsed this file
            if filepath in self.module_cache:
                return self.module_cache[filepath]
                
            # Parse the file with astroid
            module_name = os.path.basename(filepath).replace('.py', '')
            with open(filepath, 'r', encoding='utf-8') as f:
                file_content = f.read()
                
            # Try to parse with astroid
            try:
                module_node = astroid.parse(file_content, filepath)
                module_info = self._parse_module(module_node, filepath)
            except Exception as e:
                logger.warning(f"Failed to parse with astroid: {e}")
                # Fall back to ast if astroid fails
                module_info = self._parse_with_ast(file_content, filepath, module_name)
                
            # Cache the result
            self.module_cache[filepath] = module_info
            return module_info
            
        except Exception as e:
            logger.error(f"Error parsing file {filepath}: {e}")
            return None
            
    def _parse_module(self, module_node: nodes.Module, filepath: str) -> ModuleInfo:
        """Parse a module using astroid."""
        module_name = os.path.basename(filepath).replace('.py', '')
        docstring = module_node.doc or ""
        
        module_info = ModuleInfo(module_name, filepath, docstring)
        
        # Extract imports
        for node in module_node.body:
            if isinstance(node, astroid.ImportFrom):
                for name, alias in node.names:
                    import_name = f"from {node.modname} import {name}"
                    if alias:
                        import_name += f" as {alias}"
                    module_info.imports.append(import_name)
            elif isinstance(node, astroid.Import):
                for name, alias in node.names:
                    import_name = f"import {name}"
                    if alias:
                        import_name += f" as {alias}"
                    module_info.imports.append(import_name)
        
        # Extract functions
        for node in module_node.body:
            if isinstance(node, astroid.FunctionDef):
                function_info = self._parse_function(node)
                module_info.functions.append(function_info)
            elif isinstance(node, astroid.ClassDef):
                class_info = self._parse_class(node)
                module_info.classes.append(class_info)
                
        return module_info
        
    def _parse_function(self, func_node: nodes.FunctionDef) -> FunctionInfo:
        """Parse a function definition."""
        docstring = func_node.doc or ""
        function_info = FunctionInfo(func_node.name, func_node.lineno, docstring)
        
        # Extract decorators
        for decorator in func_node.decorators.nodes if func_node.decorators else []:
            if isinstance(decorator, astroid.Name):
                function_info.decorators.append(decorator.name)
            elif isinstance(decorator, astroid.Call):
                if isinstance(decorator.func, astroid.Name):
                    function_info.decorators.append(decorator.func.name)
        
        # Extract parameters
        for arg in func_node.args.args:
            function_info.parameters.append(arg.name)
        
        # Mark as method if it has self or cls parameter
        if function_info.parameters and function_info.parameters[0] in ("self", "cls"):
            function_info.is_method = True
            
        # Extract return annotation if available
        if func_node.returns:
            if isinstance(func_node.returns, astroid.Name):
                function_info.returns = func_node.returns.name
            elif hasattr(func_node.returns, 'as_string'):
                function_info.returns = func_node.returns.as_string()
            
        return function_info
        
    def _parse_class(self, class_node: nodes.ClassDef) -> ClassInfo:
        """Parse a class definition."""
        docstring = class_node.doc or ""
        class_info = ClassInfo(class_node.name, class_node.lineno, docstring)
        
        # Extract base classes
        for base in class_node.bases:
            if isinstance(base, astroid.Name):
                class_info.base_classes.append(base.name)
            elif hasattr(base, 'as_string'):
                class_info.base_classes.append(base.as_string())
        
        # Extract decorators
        for decorator in class_node.decorators.nodes if class_node.decorators else []:
            if isinstance(decorator, astroid.Name):
                class_info.decorators.append(decorator.name)
            elif isinstance(decorator, astroid.Call):
                if isinstance(decorator.func, astroid.Name):
                    class_info.decorators.append(decorator.func.name)
        
        # Extract methods and attributes
        for node in class_node.body:
            if isinstance(node, astroid.FunctionDef):
                method_info = self._parse_function(node)
                class_info.methods.append(method_info)
            elif isinstance(node, astroid.AssignName):
                class_info.attributes.append(node.name)
            elif isinstance(node, astroid.Assign):
                for target in node.targets:
                    if isinstance(target, astroid.AssignName):
                        class_info.attributes.append(target.name)
                        
        return class_info
        
    def _parse_with_ast(self, content: str, filepath: str, module_name: str) -> ModuleInfo:
        """Parse a file using the ast module as fallback."""
        tree = ast.parse(content)
        docstring = ast.get_docstring(tree) or ""
        
        module_info = ModuleInfo(module_name, filepath, docstring)
        
        # Extract imports
        for node in tree.body:
            if isinstance(node, ast.ImportFrom):
                for name in node.names:
                    import_name = f"from {node.module} import {name.name}"
                    if name.asname:
                        import_name += f" as {name.asname}"
                    module_info.imports.append(import_name)
            elif isinstance(node, ast.Import):
                for name in node.names:
                    import_name = f"import {name.name}"
                    if name.asname:
                        import_name += f" as {name.asname}"
                    module_info.imports.append(import_name)
        
        # Extract functions and classes
        for node in tree.body:
            if isinstance(node, ast.FunctionDef):
                function_info = self._parse_ast_function(node)
                module_info.functions.append(function_info)
            elif isinstance(node, ast.ClassDef):
                class_info = self._parse_ast_class(node)
                module_info.classes.append(class_info)
                
        return module_info
        
    def _parse_ast_function(self, func_node: ast.FunctionDef) -> FunctionInfo:
        """Parse a function using ast."""
        docstring = ast.get_docstring(func_node) or ""
        function_info = FunctionInfo(func_node.name, func_node.lineno, docstring)
        
        # Extract decorators
        for decorator in func_node.decorator_list:
            if isinstance(decorator, ast.Name):
                function_info.decorators.append(decorator.id)
            elif isinstance(decorator, ast.Call):
                if isinstance(decorator.func, ast.Name):
                    function_info.decorators.append(decorator.func.id)
        
        # Extract parameters
        for arg in func_node.args.args:
            function_info.parameters.append(arg.arg)
        
        # Mark as method if it has self or cls parameter
        if function_info.parameters and function_info.parameters[0] in ("self", "cls"):
            function_info.is_method = True
            
        # Extract return annotation if available
        if func_node.returns:
            if isinstance(func_node.returns, ast.Name):
                function_info.returns = func_node.returns.id
            elif isinstance(func_node.returns, ast.Subscript):
                function_info.returns = "annotation"  # Simplified for readability
            
        return function_info
        
    def _parse_ast_class(self, class_node: ast.ClassDef) -> ClassInfo:
        """Parse a class using ast."""
        docstring = ast.get_docstring(class_node) or ""
        class_info = ClassInfo(class_node.name, class_node.lineno, docstring)
        
        # Extract base classes
        for base in class_node.bases:
            if isinstance(base, ast.Name):
                class_info.base_classes.append(base.id)
        
        # Extract decorators
        for decorator in class_node.decorator_list:
            if isinstance(decorator, ast.Name):
                class_info.decorators.append(decorator.id)
            elif isinstance(decorator, ast.Call):
                if isinstance(decorator.func, ast.Name):
                    class_info.decorators.append(decorator.func.id)
        
        # Extract methods and attributes
        for node in class_node.body:
            if isinstance(node, ast.FunctionDef):
                method_info = self._parse_ast_function(node)
                class_info.methods.append(method_info)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        class_info.attributes.append(target.id)
                        
        return class_info
        
    async def parse_directory(self, directory: str, recursive: bool = True) -> List[ModuleInfo]:
        """
        Parse all Python files in a directory.
        
        Args:
            directory: Directory path to parse
            recursive: Whether to parse subdirectories
            
        Returns:
            List of ModuleInfo objects
        """
        results = []
        
        if not os.path.isdir(directory):
            logger.warning(f"Not a directory: {directory}")
            return results
            
        # Get all Python files in the directory
        for root, dirs, files in os.walk(directory):
            if not recursive and root != directory:
                continue
                
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    module_info = await self.parse_file(filepath)
                    if module_info:
                        results.append(module_info)
                        
        return results 