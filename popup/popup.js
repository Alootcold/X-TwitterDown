document.addEventListener('DOMContentLoaded', async () => {
  const downloadCountEl = document.getElementById('download-count');
  const openSettingsBtn = document.getElementById('open-settings');

  try {
    const stats = await chrome.storage.local.get('downloadStats');
    const count = stats.downloadStats || 0;
    downloadCountEl.textContent = count;
  } catch (error) {
    console.log('无法获取下载统计');
  }

  openSettingsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  document.querySelectorAll('.stat-item').forEach(item => {
    item.addEventListener('click', () => {
      item.style.transform = 'scale(0.95)';
      setTimeout(() => {
        item.style.transform = 'scale(1)';
      }, 100);
    });
  });
});
