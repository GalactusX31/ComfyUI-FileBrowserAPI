import os

class PathSelectorNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "No folder selected", "multiline": False}),
                "file_path": ("STRING", {"default": "No file selected", "multiline": False}),
            }
        }
    RETURN_TYPES = ("STRING", "STRING",)
    RETURN_NAMES = ("folder_path", "file_path",)
    FUNCTION = "get_paths"
    CATEGORY = "utils/path"
    OUTPUT_NODE = True
    def get_paths(self, folder_path, file_path):
        folder_out = folder_path if os.path.isdir(folder_path) else None
        file_out = file_path if os.path.isfile(file_path) else None
        return (folder_out, file_out)
    @classmethod
    def IS_CHANGED(cls, folder_path, file_path):
        return f"{folder_path}:{file_path}"