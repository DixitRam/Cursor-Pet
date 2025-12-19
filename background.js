console.log("Background script loaded.");

chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon clicked for tab:", tab.id);
    if (!tab.id) {
        console.error("No tab ID found.");
        return;
    }

    // Prevent injection into restricted pages
    if (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:")) {
        console.warn("Retricted URL. Cannot inject extension here:", tab.url);
        return;
    }


    console.log("Injecting CSS...");
    chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["styles.css"]
    }).then(() => console.log("CSS injected."))
        .catch(err => console.error("CSS injection failed:", err));

    console.log("Injecting content script...");
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    }).then(() => console.log("Content script injected."))
        .catch(err => console.error("Script injection failed:", err));
});
