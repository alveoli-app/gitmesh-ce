
"""
Tool Registry for managing dynamic tool sets.
"""
from typing import List, Dict, Callable, Any

class ToolRegistry:
    _instance = None
    _tool_sets: Dict[str, List[Any]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ToolRegistry, cls).__new__(cls)
        return cls._instance

    @classmethod
    def register_tool_set(cls, name: str, tools: List[Any]):
        """Register a set of tools under a name."""
        cls._tool_sets[name] = tools

    @classmethod
    def get_tools(cls, set_names: List[str]) -> List[Any]:
        """Get flattened list of tools for given set names."""
        tools = []
        for name in set_names:
            if name in cls._tool_sets:
                tools.extend(cls._tool_sets[name])
        return list(set(tools))  # Deduplicate if needed, though tools objects might not be hashable

    @classmethod
    def available_sets(cls) -> List[str]:
        """Get list of available tool sets."""
        return list(cls._tool_sets.keys())
