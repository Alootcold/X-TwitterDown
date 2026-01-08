chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      downloadStats: 0,
      settings: {
        autoDownload: false,
        savePath: 'X-Twitter-Downloads/'
      }
    });
  }
});

chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    chrome.storage.local.get(['downloadStats'], (result) => {
      const newCount = (result.downloadStats || 0) + 1;
      chrome.storage.local.set({ downloadStats: newCount });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_COMPLETE') {
    chrome.storage.local.get(['downloadStats'], (result) => {
      const newCount = (result.downloadStats || 0) + 1;
      chrome.storage.local.set({ downloadStats: newCount }, () => {
        sendResponse({ success: true, count: newCount });
      });
    });
    return true;
  }

  if (message.type === 'GET_STATS') {
    chrome.storage.local.get(['downloadStats'], (result) => {
      sendResponse({ count: result.downloadStats || 0 });
    });
    return true;
  }

  if (message.type === 'RESET_STATS') {
    chrome.storage.local.set({ downloadStats: 0 }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PREVIEW' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('无法在当前页面发送消息');
    }
  });
});

chrome.runtime.setUpdateUrlData = function() {
  const manifest = chrome.runtime.getManifest();
  console.log(`X/Twitter Download Assistant v${manifest.version} loaded successfully`);
};

try {
  chrome.runtime.setUpdateUrlData();
} catch (e) {
  console.log('Background script initialized');
}
