"""Helper module to import from the installed openai-agents package.

The openai-agents package installs as 'agents' which conflicts with the
local agents/ directory. This module resolves the conflict by temporarily
adjusting sys.path to import from site-packages.
"""

import sys
import os

# Remove the orchestrator package root from sys.path
_pkg_root = os.path.dirname(os.path.abspath(__file__))
_saved_paths = list(sys.path)
sys.path = [p for p in sys.path if os.path.abspath(p) != os.path.abspath(_pkg_root)]

# Also remove current directory if it matches
if '' in sys.path or '.' in sys.path:
    sys.path = [p for p in sys.path if p not in ('', '.')]

# Remove local 'agents' from module cache if present
if 'agents' in sys.modules:
    _local_agents = sys.modules.pop('agents')
else:
    _local_agents = None

# Import from site-packages
from agents import Agent, Runner, function_tool, handoff, AsyncOpenAI, OpenAIChatCompletionsModel  # noqa: E402
from agents.extensions.models.litellm_model import LitellmModel  # noqa: E402

# Restore sys.path and modules
sys.path = _saved_paths
if _local_agents is not None:
    sys.modules['agents'] = _local_agents

# Re-export
__all__ = ['Agent', 'Runner', 'function_tool', 'handoff', 'LitellmModel', 'AsyncOpenAI', 'OpenAIChatCompletionsModel']
