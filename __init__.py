"""ComfyUI Universal Workflow Controller.

Frontend-only custom nodes for controlling user-bound workflow stages.
No backend execution nodes and no third-party Python dependencies.
"""

WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

__all__ = ["WEB_DIRECTORY", "NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
__version__ = "0.1.0-lab"
