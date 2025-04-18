"""
Code metrics calculator for Python code.
"""

import os
import logging
import radon.complexity
import radon.raw
import radon.metrics
from radon.visitors import ComplexityVisitor
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class CodeMetrics:
    """
    Calculates various metrics for Python code.
    """
    
    def __init__(self):
        """Initialize the code metrics calculator."""
        pass
        
    async def calculate_file_metrics(self, filepath: str) -> Dict[str, Any]:
        """
        Calculate metrics for a Python file.
        
        Args:
            filepath: Path to the Python file
            
        Returns:
            Dictionary with metrics
        """
        if not os.path.isfile(filepath) or not filepath.endswith('.py'):
            logger.warning(f"Not a Python file: {filepath}")
            return {}
            
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()
                
            # Calculate raw metrics
            raw_metrics = radon.raw.analyze(code)
            
            # Calculate complexity
            complexity_metrics = []
            visitor = ComplexityVisitor.from_code(code)
            for func in visitor.functions:
                complexity_metrics.append({
                    'name': func.name,
                    'line': func.lineno,
                    'complexity': func.complexity,
                    'rank': radon.complexity.rank(func.complexity)
                })
                
            # Calculate maintainability index
            mi = radon.metrics.mi_visit(code, True)
            mi_rank = self._get_maintainability_rank(mi)
            
            # Calculate halstead metrics
            try:
                halstead = radon.metrics.h_visit(code)
                halstead_metrics = {
                    'h1': halstead.h1,  # Number of distinct operators
                    'h2': halstead.h2,  # Number of distinct operands
                    'N1': halstead.N1,  # Total number of operators
                    'N2': halstead.N2,  # Total number of operands
                    'length': halstead.length,  # Program length
                    'vocabulary': halstead.vocabulary,  # Program vocabulary
                    'volume': halstead.volume,  # Program volume
                    'difficulty': halstead.difficulty,  # Program difficulty
                    'effort': halstead.effort,  # Program effort
                    'time': halstead.time,  # Implementation time
                    'bugs': halstead.bugs  # Estimated bugs
                }
            except Exception as e:
                logger.warning(f"Error calculating Halstead metrics: {e}")
                halstead_metrics = {}
                
            return {
                'filepath': filepath,
                'lines': raw_metrics.loc,
                'logical_lines': raw_metrics.lloc,
                'source_lines': raw_metrics.sloc,
                'multi_line_strings': raw_metrics.multi,
                'blank_lines': raw_metrics.blank,
                'comments': raw_metrics.comments,
                'single_comments': raw_metrics.single_comments,
                'maintainability_index': mi,
                'maintainability_rank': mi_rank,
                'complexity': complexity_metrics,
                'halstead': halstead_metrics
            }
            
        except Exception as e:
            logger.error(f"Error calculating metrics for {filepath}: {e}")
            return {
                'filepath': filepath,
                'error': str(e)
            }
            
    async def calculate_directory_metrics(self, directory: str, recursive: bool = True) -> Dict[str, Any]:
        """
        Calculate metrics for a directory of Python files.
        
        Args:
            directory: Directory path
            recursive: Whether to include subdirectories
            
        Returns:
            Dictionary with metrics for all files and aggregate metrics
        """
        if not os.path.isdir(directory):
            logger.warning(f"Not a directory: {directory}")
            return {}
            
        file_metrics = []
        total_lines = 0
        total_logical_lines = 0
        total_complexity = 0
        max_complexity = 0
        complexity_by_rank = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0}
        avg_maintainability = 0
        file_count = 0
        
        # Get all Python files in the directory
        for root, dirs, files in os.walk(directory):
            if not recursive and root != directory:
                continue
                
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    metrics = await self.calculate_file_metrics(filepath)
                    
                    if 'error' not in metrics:
                        file_metrics.append(metrics)
                        
                        # Update aggregate metrics
                        total_lines += metrics['lines']
                        total_logical_lines += metrics['logical_lines']
                        
                        # Sum complexity
                        func_complexity = sum(func['complexity'] for func in metrics['complexity'])
                        total_complexity += func_complexity
                        max_complexity = max(max_complexity, func_complexity)
                        
                        # Count complexity by rank
                        for func in metrics['complexity']:
                            complexity_by_rank[func['rank']] = complexity_by_rank.get(func['rank'], 0) + 1
                            
                        # Track maintainability
                        avg_maintainability += metrics['maintainability_index']
                        file_count += 1
        
        # Calculate averages
        avg_maintainability = avg_maintainability / file_count if file_count > 0 else 0
        avg_complexity = total_complexity / file_count if file_count > 0 else 0
        
        return {
            'directory': directory,
            'file_count': file_count,
            'total_lines': total_lines,
            'total_logical_lines': total_logical_lines,
            'average_maintainability': avg_maintainability,
            'maintainability_rank': self._get_maintainability_rank(avg_maintainability),
            'total_complexity': total_complexity,
            'average_complexity': avg_complexity,
            'max_complexity': max_complexity,
            'complexity_by_rank': complexity_by_rank,
            'files': file_metrics
        }
    
    def _get_maintainability_rank(self, mi: float) -> str:
        """Get the maintainability rank from the index."""
        if mi >= 100:
            return 'A'
        elif mi >= 80:
            return 'B'
        elif mi >= 70:
            return 'C'
        elif mi >= 50:
            return 'D'
        else:
            return 'F' 