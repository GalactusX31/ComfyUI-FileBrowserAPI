import server
import os

# --- Security Boundaries ---
COMFYUI_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DRIVE_ROOT = os.path.splitdrive(COMFYUI_ROOT)[0] + os.sep

@server.PromptServer.instance.routes.post("/browse_folder")
async def browse_folder_route(request):
    """
    Handles web requests to list directory contents.
    The security policy is determined by the 'god_mode' flag
    sent by the frontend with each request.
    """
    try:
        json_data = await request.json()
        req_path = json_data.get("path", "")
        god_mode = json_data.get("god_mode", False) 
    except Exception:
        req_path = ""
        god_mode = False

    if god_mode and req_path == "drives":
        if os.name == 'nt':
            from string import ascii_uppercase
            drives = [f"{d}:\\" for d in ascii_uppercase if os.path.exists(f"{d}:")]
            return server.web.json_response({"is_drive_list": True, "drives": drives, "parent": ""})
        else:
            req_path = "/"
            
    current_path = os.path.abspath(req_path or COMFYUI_ROOT)

    if not god_mode and not current_path.startswith(DRIVE_ROOT):
        return server.web.json_response({"error": f"Access denied. Safe Mode is confined to drive: {DRIVE_ROOT}"}, status=403)

    if not os.path.isdir(current_path):
        if god_mode and os.name == 'nt':
            body = '{"path": "drives", "god_mode": true}'.encode('utf-8')
            return await browse_folder_route(await request.clone(body=body))
        else:
            return server.web.json_response({"error": f"Path not found: {current_path}"}, status=404)

    parent_path = os.path.dirname(current_path)
    if parent_path == current_path:
        if god_mode and os.name == 'nt':
            parent_path = "drives"
        else:
            parent_path = "" 
    
    try:
        all_items = os.listdir(current_path)
        folders = sorted([f for f in all_items if os.path.isdir(os.path.join(current_path, f))])
        files = sorted([f for f in all_items if not os.path.isdir(os.path.join(current_path, f))])
    except OSError as e:
        return server.web.json_response({"error": f"Cannot read directory: {e}"}, status=500)

    return server.web.json_response({
        "is_drive_list": False,
        "path": current_path.replace('\\', '/'),
        "parent": parent_path.replace('\\', '/'),
        "folders": folders,
        "files": files
    })