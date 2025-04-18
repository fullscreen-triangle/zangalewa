"""
Code documenter to generate documentation from code analysis.
"""

import os
import logging
from typing import Dict, List, Any, Optional
import markdown
from pathlib import Path

from zangalewa.core.analyzer.parser import CodeParser, ModuleInfo, FunctionInfo, ClassInfo
from zangalewa.core.analyzer.metrics import CodeMetrics
from zangalewa.core.llm import LLMManager

logger = logging.getLogger(__name__)

class CodeDocumenter:
    """
    Generates documentation from code analysis using LLMs.
    """
    
    def __init__(self, llm_manager: Optional[LLMManager] = None):
        """
        Initialize the code documenter.
        
        Args:
            llm_manager: LLM manager for generating documentation
        """
        self.parser = CodeParser()
        self.metrics = CodeMetrics()
        self.llm_manager = llm_manager
        
    async def document_file(self, filepath: str, output_dir: Optional[str] = None) -> str:
        """
        Generate documentation for a single Python file.
        
        Args:
            filepath: Path to the Python file
            output_dir: Directory to save documentation (if None, return as string)
            
        Returns:
            Documentation as string if output_dir is None, else path to saved file
        """
        if not os.path.isfile(filepath) or not filepath.endswith('.py'):
            logger.warning(f"Not a Python file: {filepath}")
            return ""
            
        try:
            # Parse the file
            module_info = await self.parser.parse_file(filepath)
            if not module_info:
                logger.warning(f"Failed to parse file: {filepath}")
                return ""
                
            # Calculate metrics
            metrics = await self.metrics.calculate_file_metrics(filepath)
            
            # Generate documentation
            doc = await self._generate_module_doc(module_info, metrics)
            
            # Save or return the documentation
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                rel_path = os.path.relpath(filepath).replace('/', '_').replace('\\', '_')
                doc_path = os.path.join(output_dir, f"{rel_path}.md")
                
                with open(doc_path, 'w', encoding='utf-8') as f:
                    f.write(doc)
                    
                return doc_path
            else:
                return doc
                
        except Exception as e:
            logger.error(f"Error documenting file {filepath}: {e}")
            return ""
            
    async def document_directory(self, directory: str, output_dir: Optional[str] = None, recursive: bool = True) -> str:
        """
        Generate documentation for a directory of Python files.
        
        Args:
            directory: Directory path
            output_dir: Directory to save documentation
            recursive: Whether to include subdirectories
            
        Returns:
            Summary documentation as string
        """
        if not os.path.isdir(directory):
            logger.warning(f"Not a directory: {directory}")
            return ""
            
        try:
            # Create output directory if needed
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                
            # Parse all files in the directory
            modules = await self.parser.parse_directory(directory, recursive=recursive)
            
            # Calculate metrics for the directory
            dir_metrics = await self.metrics.calculate_directory_metrics(directory, recursive=recursive)
            
            # Generate summary documentation
            summary = await self._generate_directory_summary(directory, modules, dir_metrics)
            
            if output_dir:
                # Save summary
                summary_path = os.path.join(output_dir, "summary.md")
                with open(summary_path, 'w', encoding='utf-8') as f:
                    f.write(summary)
                    
                # Generate documentation for each file
                for module in modules:
                    await self.document_file(module.filepath, output_dir)
                    
                return summary_path
            else:
                return summary
                
        except Exception as e:
            logger.error(f"Error documenting directory {directory}: {e}")
            return ""
            
    async def _generate_module_doc(self, module: ModuleInfo, metrics: Dict[str, Any]) -> str:
        """Generate documentation for a module."""
        doc = f"# Module: {module.name}\n\n"
        
        # Add docstring if available
        if module.docstring:
            doc += f"{module.docstring}\n\n"
            
        # Add file info
        doc += f"**File:** `{module.filepath}`\n\n"
        
        # Add metrics summary
        doc += "## Metrics\n\n"
        doc += f"- **Lines:** {metrics.get('lines', 'N/A')}\n"
        doc += f"- **Logical Lines:** {metrics.get('logical_lines', 'N/A')}\n"
        doc += f"- **Maintainability Index:** {metrics.get('maintainability_index', 'N/A')} ({metrics.get('maintainability_rank', 'N/A')})\n"
        
        # Add imports
        if module.imports:
            doc += "## Imports\n\n"
            for imp in module.imports:
                doc += f"- `{imp}`\n"
            doc += "\n"
            
        # Add classes
        if module.classes:
            doc += "## Classes\n\n"
            for cls in module.classes:
                doc += self._format_class_doc(cls)
                
        # Add functions
        if module.functions:
            doc += "## Functions\n\n"
            for func in module.functions:
                doc += self._format_function_doc(func)
                
        # Add complexity info if available
        if metrics.get('complexity'):
            doc += "## Complexity\n\n"
            doc += "| Name | Line | Complexity | Rank |\n"
            doc += "| ---- | ---- | ---------- | ---- |\n"
            for func in metrics.get('complexity', []):
                doc += f"| {func.get('name')} | {func.get('line')} | {func.get('complexity')} | {func.get('rank')} |\n"
                
        # Add additional documentation from LLM if available
        if self.llm_manager:
            try:
                with open(module.filepath, 'r', encoding='utf-8') as f:
                    code = f.read()
                
                llm_doc = await self._generate_llm_doc(module, code)
                doc += f"\n## AI Analysis\n\n{llm_doc}\n"
            except Exception as e:
                logger.warning(f"Error generating LLM documentation: {e}")
                
        return doc
        
    def _format_class_doc(self, cls: ClassInfo) -> str:
        """Format documentation for a class."""
        doc = f"### Class: {cls.name}\n\n"
        
        # Add docstring
        if cls.docstring:
            doc += f"{cls.docstring}\n\n"
            
        # Add class info
        doc += f"**Line:** {cls.lineno}\n\n"
        
        # Add base classes if any
        if cls.base_classes:
            doc += f"**Inherits from:** {', '.join(cls.base_classes)}\n\n"
            
        # Add decorators if any
        if cls.decorators:
            doc += f"**Decorators:** {', '.join([f'@{d}' for d in cls.decorators])}\n\n"
            
        # Add attributes if any
        if cls.attributes:
            doc += "**Attributes:**\n\n"
            for attr in cls.attributes:
                doc += f"- `{attr}`\n"
            doc += "\n"
            
        # Add methods if any
        if cls.methods:
            doc += "**Methods:**\n\n"
            for method in cls.methods:
                doc += f"#### {cls.name}.{method.name}\n\n"
                
                if method.docstring:
                    doc += f"{method.docstring}\n\n"
                    
                doc += f"**Line:** {method.lineno}\n\n"
                
                if method.parameters:
                    params = method.parameters[1:] if method.is_method else method.parameters
                    if params:
                        doc += f"**Parameters:** `{', '.join(params)}`\n\n"
                        
                if method.returns:
                    doc += f"**Returns:** `{method.returns}`\n\n"
                    
                if method.decorators:
                    doc += f"**Decorators:** {', '.join([f'@{d}' for d in method.decorators])}\n\n"
                    
        return doc
        
    def _format_function_doc(self, func: FunctionInfo) -> str:
        """Format documentation for a function."""
        doc = f"### Function: {func.name}\n\n"
        
        # Add docstring
        if func.docstring:
            doc += f"{func.docstring}\n\n"
            
        # Add function info
        doc += f"**Line:** {func.lineno}\n\n"
        
        # Add parameters if any
        if func.parameters:
            doc += f"**Parameters:** `{', '.join(func.parameters)}`\n\n"
            
        # Add return type if available
        if func.returns:
            doc += f"**Returns:** `{func.returns}`\n\n"
            
        # Add decorators if any
        if func.decorators:
            doc += f"**Decorators:** {', '.join([f'@{d}' for d in func.decorators])}\n\n"
            
        return doc
        
    async def _generate_directory_summary(self, directory: str, modules: List[ModuleInfo], metrics: Dict[str, Any]) -> str:
        """Generate summary documentation for a directory."""
        dir_name = os.path.basename(os.path.abspath(directory))
        doc = f"# Directory: {dir_name}\n\n"
        
        # Add directory metrics
        doc += "## Metrics\n\n"
        doc += f"- **Files:** {metrics.get('file_count', 0)}\n"
        doc += f"- **Total Lines:** {metrics.get('total_lines', 0)}\n"
        doc += f"- **Average Maintainability:** {metrics.get('average_maintainability', 0):.2f} ({metrics.get('maintainability_rank', 'N/A')})\n"
        doc += f"- **Average Complexity:** {metrics.get('average_complexity', 0):.2f}\n\n"
        
        # Add complexity distribution
        doc += "## Complexity Distribution\n\n"
        doc += "| Rank | Count |\n"
        doc += "| ---- | ----- |\n"
        for rank, count in metrics.get('complexity_by_rank', {}).items():
            doc += f"| {rank} | {count} |\n"
        doc += "\n"
        
        # Add module list
        doc += "## Modules\n\n"
        for module in modules:
            rel_path = os.path.relpath(module.filepath, directory)
            doc += f"- [{module.name}](./{os.path.relpath(module.filepath).replace('/', '_').replace('\\', '_')}.md): {len(module.functions)} functions, {len(module.classes)} classes\n"
            
        # Add LLM summary if available
        if self.llm_manager:
            try:
                module_names = [module.name for module in modules]
                class_names = []
                function_names = []
                
                for module in modules:
                    class_names.extend([cls.name for cls in module.classes])
                    function_names.extend([func.name for func in module.functions])
                    
                llm_summary = await self._generate_directory_llm_summary(directory, module_names, class_names, function_names, metrics)
                doc += f"\n## AI Summary\n\n{llm_summary}\n"
            except Exception as e:
                logger.warning(f"Error generating LLM summary: {e}")
            
        return doc
        
    async def _generate_llm_doc(self, module: ModuleInfo, code: str) -> str:
        """Generate documentation for a module using LLM."""
        if not self.llm_manager:
            return ""
            
        system_prompt = """
        You are a code documentation expert. Please provide a concise but comprehensive analysis of the following Python code.
        Focus on:
        1. The main purpose of the code
        2. Key design patterns used
        3. Potential issues or areas for improvement
        4. How the components interact with each other
        
        Use markdown formatting for your response. Be specific and technical in your explanation.
        """
        
        messages = [
            {"role": "user", "content": f"Please analyze and document this Python code:\n\n```python\n{code}\n```"}
        ]
        
        response = await self.llm_manager.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.1,
            max_tokens=1000
        )
        
        return response
        
    async def _generate_directory_llm_summary(
        self, 
        directory: str, 
        module_names: List[str], 
        class_names: List[str], 
        function_names: List[str],
        metrics: Dict[str, Any]
    ) -> str:
        """Generate summary for a directory using LLM."""
        if not self.llm_manager:
            return ""
            
        system_prompt = """
        You are a code architecture expert. Based on the information provided about a Python codebase, 
        provide a concise high-level summary of the codebase architecture, design patterns, and organization.
        Focus on:
        1. The apparent purpose of the codebase
        2. Key architectural patterns
        3. Code organization and structure
        4. Potential strengths and weaknesses in the design
        
        Use markdown formatting for your response.
        """
        
        content = f"""
        Directory: {directory}
        
        Metrics:
        - Files: {metrics.get('file_count', 0)}
        - Total Lines: {metrics.get('total_lines', 0)}
        - Average Maintainability: {metrics.get('average_maintainability', 0):.2f} ({metrics.get('maintainability_rank', 'N/A')})
        - Average Complexity: {metrics.get('average_complexity', 0):.2f}
        
        Modules:
        {', '.join(module_names)}
        
        Classes:
        {', '.join(class_names)}
        
        Functions:
        {', '.join(function_names[:50])}{'...' if len(function_names) > 50 else ''}
        """
        
        messages = [
            {"role": "user", "content": f"Please provide a high-level summary of this codebase:\n\n{content}"}
        ]
        
        response = await self.llm_manager.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.1,
            max_tokens=1000
        )
        
        return response 