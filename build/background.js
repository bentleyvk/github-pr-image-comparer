chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo?.status === 'complete') {
    const url = new URL(tab?.url ?? '');
    if (url.hostname === 'github.com') {
      chrome.tabs.sendMessage(tabId, {
        message: 'ghpric-url-changed',
      });
    }
  }
});
