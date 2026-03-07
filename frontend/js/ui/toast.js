// web/js/ui/toast.js
export function showToast(msg, type = "info") {
    // Simple toast implementation or append to Right Panel
    // Per requirements: "Right panel shows 'Assistant' with list of messages"
    // So toast might just log to right panel.

    // We will use this to append to the right panel list basically.
    const rightPanelList = document.getElementById("rightPanelList");
    if (!rightPanelList) return;

    const div = document.createElement("div");
    div.className = `rp-msg rp-${type}`;
    div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;

    // Prepend to show newest first? Or append? Usually logs append.
    rightPanelList.prepend(div);
}
