import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "PathSelectorNode.AllTriggers",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PathSelectorNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                onNodeCreated?.apply(this, arguments);
                const buttonCallback = (widget, mode) => {
                    if (app.FileFolderAPI) app.FileFolderAPI.open(widget, mode);
                };
                const folderWidget = this.widgets.find(w => w.name === "folder_path");
                const fileWidget = this.widgets.find(w => w.name === "file_path");
                if (folderWidget) this.addWidget("button", "Browse Folder", null, () => buttonCallback(folderWidget, 'folder'));
                if (fileWidget) this.addWidget("button", "Browse File", null, () => buttonCallback(fileWidget, 'file'));
            };

            const onDblClick = nodeType.prototype.onDblClick;
            nodeType.prototype.onDblClick = function(e) {
                onDblClick?.apply(this, arguments);
                const widget = this.widgets.find(w => w.name === "file_path");
                if (app.FileFolderAPI && widget) app.FileFolderAPI.open(widget, 'file');
            };

            const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(canvas, menuOptions) {
                getExtraMenuOptions?.apply(this, arguments);
                const node = this;
                const subMenuItems = [
                    { content: "Select Folder", value: "folder" },
                    { content: "Select File", value: "file" }
                ];
                const subMenuCallback = (selected_option) => {
                    if (!selected_option) return;
                    const mode = selected_option.value;
                    const widgetName = mode === 'folder' ? 'folder_path' : 'file_path';
                    const targetWidget = node.widgets.find(w => w.name === widgetName);
                    if (app.FileFolderAPI && targetWidget) app.FileFolderAPI.open(targetWidget, mode);
                };
                menuOptions.unshift({
                    content: "Browse...", has_submenu: true,
                    callback: (value, options, e, parentMenu) => {
                        new LiteGraph.ContextMenu(subMenuItems, { event: e, parentMenu: parentMenu, callback: subMenuCallback });
                    }
                }, null);
            };
        }
    }
});