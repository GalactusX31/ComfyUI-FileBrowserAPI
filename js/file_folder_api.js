import { app } from "../../../scripts/app.js";
import { api } from '../../../scripts/api.js';

// --- Create the Setting in the ComfyUI Menu ---
app.ui.settings.addSetting({
    id: "FileBrowser.GodMode",
    name: "📁 File Browser: Enable God Mode (Full System Access)",
    type: "boolean",
    defaultValue: false,
    onChange(newValue) {
        if (newValue) {
            alert("File Browser 'God Mode' has been enabled.\nYou now have full access to the server's file system.\nThis setting is saved in your browser.");
        }
    },
});

class FileFolderAPI {
    static stylesInjected = false;
    constructor() {
        if (!FileFolderAPI.stylesInjected) {
            this.injectStyles();
            FileFolderAPI.stylesInjected = true;
        }
    }
    injectStyles() {
        const styles = `
            .ffa-backdrop { position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7); z-index:1000; }
            .ffa-modal { position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background-color:#333; border:1px solid #555; border-radius:8px; padding:20px; width:80%; max-width:600px; max-height:80vh; overflow-y:auto; color:#eee; z-index:1001; display:flex; flex-direction:column; }
            .ffa-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-shrink:0; }
            .ffa-path { font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-right:10px; }
            .ffa-list { list-style:none; padding:0; margin:0; overflow-y:auto; }
            .ffa-list-item { padding:5px; }
            .ffa-list-item--clickable { cursor:pointer; }
            .ffa-list-item--clickable:hover { background-color:#444; }
            .ffa-list-item--disabled { opacity:0.6; }
        `;
        document.head.appendChild(Object.assign(document.createElement("style"), { textContent: styles }));
    }
    _updateWidget(widget, value) {
        widget.value = value;
        if (widget.inputEl) {
            widget.inputEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    }
    async open(targetWidget, mode) {
        const isGodMode = app.ui.settings.getSettingValue("FileBrowser.GodMode");

        const backdrop = Object.assign(document.createElement("div"), { className: 'ffa-backdrop' });
        const modal = Object.assign(document.createElement("div"), { className: 'ffa-modal' });
        const closeModal = () => document.body.removeChild(backdrop);
        backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
        document.body.appendChild(backdrop).appendChild(modal);
        await this._loadContent(modal, "", targetWidget, mode, closeModal, isGodMode);
    }
    async _loadContent(modal, path, targetWidget, mode, closeModal, isGodMode) {
        modal.innerHTML = `<h2>Loading... (${isGodMode ? 'God Mode' : 'Safe Mode'})</h2>`;
        try {
            const resp = await api.fetchApi('/browse_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path, god_mode: isGodMode })
            });
            const data = await resp.json();
            if (data.error) { modal.innerHTML = `<h2>Error</h2><p>${data.error}</p>`; return; }

            modal.innerHTML = "";
            const list = Object.assign(document.createElement("ul"), { className: 'ffa-list' });

            if (data.is_drive_list) {
                const header = Object.assign(document.createElement("div"), { className: 'ffa-header' });
                header.innerHTML = `<p class="ffa-path">Select a drive:</p>`;
                modal.append(header);
                data.drives.forEach(d => {
                    const driveHandler = () => this._loadContent(modal, d, targetWidget, mode, closeModal, isGodMode);
                    list.appendChild(this._createListItem(d, "💽", driveHandler, true));
                });
                modal.append(list);
                return;
            }
            
            const header = Object.assign(document.createElement("div"), { className: 'ffa-header' });
            header.innerHTML = `<p class="ffa-path">Path: ${data.path}</p>`;
            if (mode === 'folder') {
                const selectBtn = Object.assign(document.createElement("button"), { textContent: "Select this folder", className: "comfy-button" });
                selectBtn.onclick = () => { this._updateWidget(targetWidget, data.path); closeModal(); };
                header.appendChild(selectBtn);
            }
            
            if (data.parent) {
                const upHandler = () => this._loadContent(modal, data.parent, targetWidget, mode, closeModal, isGodMode);
                list.appendChild(this._createListItem(".. (Up)", "⬆️", upHandler, true));
            }

            data.folders.forEach(f => {
                const folderHandler = () => this._loadContent(modal, `${data.path}/${f}`, targetWidget, mode, closeModal, isGodMode);
                list.appendChild(this._createListItem(f, "📁", folderHandler, true));
            });
            data.files.forEach(f => {
                const isClickable = mode === 'file';
                const fileHandler = isClickable ? () => { this._updateWidget(targetWidget, `${data.path}/${f}`); closeModal(); } : null;
                list.appendChild(this._createListItem(f, "📄", fileHandler, isClickable));
            });
            modal.append(header, list);
        } catch (error) { modal.innerHTML = `<h2>Error</h2><p>${error.message}</p>`; }
    }
    _createListItem(text, icon, onClick, isClickable) {
        const li = Object.assign(document.createElement("li"), { textContent: `${icon} ${text}` });
        li.className = `ffa-list-item ${isClickable ? 'ffa-list-item--clickable' : ''}`;
        if (isClickable) li.onclick = onClick;
        else li.classList.add('ffa-list-item--disabled');
        return li;
    }
}
app.FileFolderAPI = new FileFolderAPI();