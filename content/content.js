(function() {
  'use strict';

  const MediaType = {
    IMAGE: 'image',
    GIF: 'gif'
  };

  class XTwitterDownloader {
    constructor() {
      this.previewContainer = null;
      this.currentHoveredMedia = null;
      this.hoverTimer = null;
      this.init();
    }

    init() {
      this.createPreviewContainer();
      this.bindEvents();
      this.processExistingMedia();
      this.observePageChanges();
    }

    createPreviewContainer() {
      const container = document.createElement('div');
      container.id = 'xtwitter-preview-container';
      container.className = 'xtwitter-preview-container';
      container.innerHTML = `
        <div class="xtwitter-preview-content">
          <img class="xtwitter-preview-image" src="" alt="Preview" style="display: none;">
          <video class="xtwitter-preview-video" autoplay muted loop playsinline style="display: none;"></video>
          <div class="xtwitter-preview-loading" style="display: none;">
            <div class="xtwitter-spinner"></div>
          </div>
        </div>
        <div class="xtwitter-preview-toolbar">
          <button class="xtwitter-btn xtwitter-btn-download" data-action="download">
            <span class="xtwitter-btn-icon">⬇</span>
            <span class="xtwitter-btn-text">下载</span>
          </button>
          <button class="xtwitter-btn xtwitter-btn-close" data-action="close">
            <span class="xtwitter-btn-icon">✕</span>
          </button>
        </div>
        <div class="xtwitter-preview-info"></div>
      `;
      document.body.appendChild(container);
      this.previewContainer = container;

      this.previewImage = container.querySelector('.xtwitter-preview-image');
      this.previewVideo = container.querySelector('.xtwitter-preview-video');
      this.previewLoading = container.querySelector('.xtwitter-preview-loading');
      this.previewInfo = container.querySelector('.xtwitter-preview-info');
      this.toolbar = container.querySelector('.xtwitter-preview-toolbar');

      this.bindPreviewEvents();
    }

    bindPreviewEvents() {
      this.toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.xtwitter-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        if (action === 'download' && this.currentHoveredMedia) {
          this.downloadMedia(this.currentHoveredMedia);
        } else if (action === 'close') {
          this.hidePreview();
        }
      });
    }

    bindEvents() {
      document.addEventListener('mouseover', (e) => {
        const mediaElement = this.findMediaElement(e.target);
        if (mediaElement) {
          this.startHoverTimer(mediaElement, e.clientX, e.clientY);
        }
      });

      document.addEventListener('mouseout', (e) => {
        if (this.findMediaElement(e.target)) {
          this.clearHoverTimer();
        }
      });
    }

    findMediaElement(element) {
      if (!element) return null;

      const twitterMediaSelectors = [
        '[data-testid="tweetText"]',
        '[data-testid="cardWrapper"]',
        '[data-testid="tweetPhoto"]',
        '[data-testid="videoComponent"]',
        'article',
        '[role="article"]',
        '.css-1dbjc4n'
      ];

      const isInTweet = element.closest(twitterMediaSelectors.join(','));

      if (!isInTweet) {
        return null;
      }

      if (element.tagName === 'IMG') {
        if (this.isTwitterMedia(element.src) && !element.src.includes('profile_images') && !element.src.includes('profile_banners')) {
          let type = MediaType.IMAGE;
          let src = element.src;
          
          if (this.isGifUrl(element.src, element)) {
            type = MediaType.GIF;
            
            const videoElement = element.closest('article, [role="article"], [data-testid="tweetPhoto"]');
            if (videoElement) {
              const video = videoElement.querySelector('video');
              if (video && video.src) {
                src = video.src;
              } else {
                const videoSource = video?.querySelector('source');
                if (videoSource?.src) {
                  src = videoSource.src;
                }
              }
            }
          }
          
          return { element, type, src };
        }
      }

      const closestAnchor = element.closest('a');
      if (closestAnchor) {
        const img = closestAnchor.querySelector('img');
        if (img && this.isTwitterMedia(img.src) && !img.src.includes('profile_images') && !img.src.includes('profile_banners')) {
          const type = this.isGifUrl(img.src) ? MediaType.GIF : MediaType.IMAGE;
          return { element: img, type, src: img.src };
        }
      }

      return null;
    }

    isGifUrl(url) {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      
      if (lowerUrl.includes('.gif') || 
          lowerUrl.includes('gifv') || 
          lowerUrl.includes('/gif/') ||
          lowerUrl.includes('animated.gif') ||
          lowerUrl.includes('tweet_video.gif') ||
          lowerUrl.includes('tweet_animation.gif')) {
        return true;
      }
      
      try {
        const urlObj = new URL(url);
        const format = urlObj.searchParams.get('format');
        
        if (format === 'gif') {
          return true;
        }
        
        const pathname = urlObj.pathname.toLowerCase();
        if (pathname.includes('/gif/') && !pathname.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
          return true;
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
        return false;
      }
      
      return false;
    }

    isTwitterMedia(url) {
      if (!url) return false;
      return url.includes('twimg.com') || 
             url.includes('twitter.com') || 
             url.includes('x.com');
    }

    findVideoSource(videoElement) {
      const source = videoElement.querySelector('source');
      if (source && source.src) {
        return source.src;
      }

      const poster = videoElement.poster;
      if (poster) {
        return poster;
      }

      return null;
    }

    startHoverTimer(mediaInfo, mouseX, mouseY) {
      this.clearHoverTimer();
      this.hoverX = mouseX;
      this.hoverY = mouseY;
      this.showPreview(mediaInfo);
    }

    clearHoverTimer() {
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    }

    getOriginalUrl(url, type) {
      if (!url) return null;

      if (type === MediaType.IMAGE || type === MediaType.GIF) {
        if (url.includes('pbs.twimg.com/media')) {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          
          if (type === MediaType.GIF) {
            urlObj.searchParams.set('format', 'mp4');
            urlObj.searchParams.set('name', 'orig');
            return urlObj.toString();
          }
          
          if (urlObj.searchParams.has('name')) {
            urlObj.searchParams.set('name', 'orig');
            return urlObj.toString();
          }
          
          const baseUrl = pathname.replace(/\.[a-z]+$/, '');
          const extMatch = pathname.match(/\.([a-z]+)$/);
          const ext = extMatch ? extMatch[1] : 'jpg';
          
          return `${baseUrl}?format=${ext}&name=orig`;
        }

        if (url.includes('twimg.com')) {
          const urlObj = new URL(url);
          
          if (type === MediaType.GIF) {
            urlObj.searchParams.set('format', 'mp4');
            urlObj.searchParams.set('name', 'orig');
            return urlObj.toString();
          }
          
          if (urlObj.searchParams.has('name')) {
            urlObj.searchParams.set('name', 'orig');
            return urlObj.toString();
          }
          
          if (urlObj.searchParams.has('format')) {
            urlObj.searchParams.set('name', 'orig');
            return urlObj.toString();
          }

          if (!url.includes(':orig')) {
            const baseUrl = url.split('?')[0];
            return baseUrl + (url.includes('?') ? '&' : '?') + 'name=orig';
          }
        }
      }
      return url;
    }

    async showPreview(mediaInfo) {
      if (!mediaInfo || !mediaInfo.src) return;

      this.currentHoveredMedia = mediaInfo;
      const originalUrl = this.getOriginalUrl(mediaInfo.src, mediaInfo.type);

      if (!originalUrl) return;

      this.previewLoading.style.display = 'flex';
      this.previewImage.style.display = 'none';
      this.previewVideo.style.display = 'none';
      this.previewContainer.style.display = 'block';

      if (this.hoverX !== undefined && this.hoverY !== undefined) {
        this.previewContainer.style.left = this.hoverX + 'px';
        this.previewContainer.style.top = this.hoverY + 'px';
        this.previewContainer.style.right = 'auto';
      }

      if (mediaInfo.type === MediaType.GIF) {
        this.previewImage.src = originalUrl;
        this.previewImage.onload = () => {
          this.previewLoading.style.display = 'none';
          this.previewImage.style.display = 'block';
        };
        this.previewImage.onerror = () => {
          this.previewLoading.style.display = 'none';
          this.previewImage.style.display = 'none';
        };
      } else {
        this.previewImage.src = originalUrl;
        this.previewImage.onload = () => {
          this.previewLoading.style.display = 'none';
          this.previewImage.style.display = 'block';
        };
        this.previewImage.onerror = () => {
          this.previewLoading.style.display = 'none';
          this.previewImage.style.display = 'none';
        };
      }

      this.previewInfo.textContent = this.getMediaInfo(mediaInfo, originalUrl);
    }

    getMediaInfo(mediaInfo, originalUrl) {
      const url = new URL(originalUrl);
      const pathParts = url.pathname.split('/');
      let filename = pathParts[pathParts.length - 1] || 'media';
      
      if (mediaInfo.type === MediaType.GIF) {
        if (!filename.toLowerCase().endsWith('.mp4')) {
          filename = filename.replace(/\.[a-z]+$/i, '') + '.mp4';
        }
      }
      
      let typeInfo = '';
      if (mediaInfo.type === MediaType.IMAGE) {
        typeInfo = '图片';
      } else if (mediaInfo.type === MediaType.GIF) {
        typeInfo = 'GIF动图';
      }

      return `${typeInfo} | ${filename}`;
    }

    hidePreview() {
      this.previewContainer.style.display = 'none';
      this.currentHoveredMedia = null;
      this.previewImage.src = '';
      this.previewVideo.src = '';
    }

    async downloadMedia(mediaInfo) {
      const originalUrl = this.getOriginalUrl(mediaInfo.src, mediaInfo.type);
      if (!originalUrl) {
        console.error('无法获取下载链接');
        return;
      }

      try {
        const urlObj = new URL(originalUrl);
        const pathParts = urlObj.pathname.split('/');
        let filename = pathParts[pathParts.length - 1] || 'download';
        
        const ext = this.getFileExtension(mediaInfo.type, originalUrl);
        
        if (mediaInfo.type === MediaType.GIF) {
          if (!filename.toLowerCase().endsWith('.mp4')) {
            filename = filename.replace(/\.[a-z]+$/i, '') + ext;
          }
        } else if (!filename.match(/\.[a-zA-Z0-9]+$/)) {
          filename += ext;
        }

        if (chrome && chrome.downloads && chrome.downloads.download) {
          const options = {
            url: originalUrl,
            filename: 'X-Twitter-Downloads/' + filename,
            saveAs: false
          };
          await chrome.downloads.download(options);
        } else {
          const response = await fetch(originalUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
      } catch (error) {
        console.error('下载失败:', error);
      }
    }

    getFileExtension(type, url) {
      if (type === MediaType.GIF) {
        return '.mp4';
      }
      if (url.includes('.jpg') || url.includes('.jpeg')) return '.jpg';
      if (url.includes('.png')) return '.png';
      if (url.includes('.webp')) return '.webp';
      return '.jpg';
    }

    processExistingMedia() {
      const mediaElements = document.querySelectorAll('img, video');
      mediaElements.forEach(el => {
        if (el.tagName === 'IMG' && this.isTwitterMedia(el.src)) {
          el.classList.add('xtwitter-media');
        }
      });
    }

    observePageChanges() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanNode(node);
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    scanNode(node) {
      if (node.tagName === 'IMG' && this.isTwitterMedia(node.src)) {
        node.classList.add('xtwitter-media');
      }

      if (node.querySelectorAll) {
        const mediaElements = node.querySelectorAll('img, video');
        mediaElements.forEach(el => {
          if (el.tagName === 'IMG' && this.isTwitterMedia(el.src)) {
            el.classList.add('xtwitter-media');
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new XTwitterDownloader());
  } else {
    new XTwitterDownloader();
  }
})();
