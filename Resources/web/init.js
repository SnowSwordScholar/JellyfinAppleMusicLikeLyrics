/**
 * Apple Music Lyrics 初始化脚本
 * 在Jellyfin Now Playing视图中加载并初始化歌词组件
 */

(function() {
    'use strict';

    // 配置对象
    const config = {
        apiBase: '/applelyrics',
        enableBackgroundBlur: true,
        blurAmount: 30,
        enableDynamicBlending: true,
        fontSize: 32,
        enableAutoFetch: true
    };

    // 从本地存储恢复配置
    function loadConfig() {
        try {
            const saved = localStorage.getItem('appleMusicLyricsConfig');
            if (saved) {
                Object.assign(config, JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load config:', e);
        }
    }

    // 保存配置到本地存储
    function saveConfig() {
        try {
            localStorage.setItem('appleMusicLyricsConfig', JSON.stringify(config));
        } catch (e) {
            console.warn('Failed to save config:', e);
        }
    }

    // 加载外部脚本
    async function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // 加载样式表
    async function loadStyle(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    // 初始化歌词播放器
    async function initLyricPlayer() {
        try {
            console.log('[AppleMusic] Initializing lyric player...');

            // 加载核心CSS
            await loadStyle(`${config.apiBase}/core.css`);

            // 加载核心JavaScript
            await loadScript(`${config.apiBase}/core.js`);

            // 检查window.AmllCore是否可用
            if (!window.AmllCore) {
                console.warn('[AppleMusic] AmllCore not found, retrying...');
                setTimeout(initLyricPlayer, 1000);
                return;
            }

            console.log('[AppleMusic] AmllCore loaded successfully');

            // 等待Now Playing页面出现
            waitForNowPlayingPage();

        } catch (error) {
            console.error('[AppleMusic] Failed to initialize:', error);
        }
    }

    // 等待Now Playing页面
    function waitForNowPlayingPage() {
        const observer = new MutationObserver(() => {
            const nowPlayingPage = document.querySelector('.nowPlayingPage');
            if (nowPlayingPage) {
                console.log('[AppleMusic] Now Playing page detected');
                observer.disconnect();
                setupNowPlayingLyrics(nowPlayingPage);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        // 如果页面已存在，立即检查
        const nowPlayingPage = document.querySelector('.nowPlayingPage');
        if (nowPlayingPage) {
            observer.disconnect();
            setupNowPlayingLyrics(nowPlayingPage);
        }
    }

    // 设置Now Playing歌词显示
    function setupNowPlayingLyrics(pageElement) {
        try {
            console.log('[AppleMusic] Setting up lyrics display');

            // 创建歌词容器
            let lyricsContainer = document.getElementById('appleMusicLyricsContainer');
            if (!lyricsContainer) {
                lyricsContainer = document.createElement('div');
                lyricsContainer.id = 'appleMusicLyricsContainer';
                lyricsContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                `;
                pageElement.insertBefore(lyricsContainer, pageElement.firstChild);
            }

            // 创建背景容器
            let bgContainer = document.getElementById('appleMusicBgContainer');
            if (!bgContainer) {
                bgContainer = document.createElement('div');
                bgContainer.id = 'appleMusicBgContainer';
                bgContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 0;
                    backdrop-filter: blur(${config.blurAmount}px);
                    background: radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.3) 100%);
                `;
                pageElement.insertBefore(bgContainer, pageElement.firstChild);
            }

            // 获取专辑封面并应用动态背景
            updateBackgroundFromAlbum(pageElement, bgContainer);

            // 监听播放信息变化
            monitorPlaybackInfo(pageElement, lyricsContainer);

        } catch (error) {
            console.error('[AppleMusic] Error setting up lyrics:', error);
        }
    }

    // 从专辑封面更新背景
    function updateBackgroundFromAlbum(pageElement, bgContainer) {
        try {
            const albumArtElement = pageElement.querySelector('img[class*="albumart"], [class*="nowPlayingAlbumArt"] img');
            if (albumArtElement && albumArtElement.src) {
                const imgUrl = albumArtElement.src;
                bgContainer.style.backgroundImage = `url('${imgUrl}')`;
                bgContainer.style.backgroundSize = 'cover';
                bgContainer.style.backgroundPosition = 'center';

                // 应用颜色混合效果
                if (config.enableDynamicBlending) {
                    // 从图片中提取主色调并应用
                    extractDominantColor(imgUrl, (color) => {
                        bgContainer.style.backgroundColor = color;
                        bgContainer.style.backgroundBlendMode = 'screen';
                    });
                }
            }
        } catch (error) {
            console.warn('[AppleMusic] Error updating background:', error);
        }
    }

    // 提取图片主色调
    function extractDominantColor(imgUrl, callback) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1;
                canvas.height = 1;
                ctx.drawImage(img, 0, 0, 1, 1);
                const imageData = ctx.getImageData(0, 0, 1, 1);
                const [r, g, b] = imageData.data;
                callback(`rgba(${r},${g},${b},0.3)`);
            };
            img.onerror = () => callback('rgba(100,100,100,0.3)');
            img.src = imgUrl;
        } catch (error) {
            console.warn('[AppleMusic] Error extracting color:', error);
            callback('rgba(100,100,100,0.3)');
        }
    }

    // 监听播放信息变化
    function monitorPlaybackInfo(pageElement, lyricsContainer) {
        const observer = new MutationObserver(() => {
            // 检查是否播放信息变化
            const songTitle = pageElement.querySelector('[class*="nowPlayingTitle"], h1');
            if (songTitle) {
                const titleText = songTitle.textContent;
                updateLyricsDisplay(lyricsContainer, titleText);
            }
        });

        observer.observe(pageElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributeFilter: ['class', 'style']
        });
    }

    // 更新歌词显示
    function updateLyricsDisplay(container, songTitle) {
        try {
            // 清除旧歌词
            const oldLyrics = container.querySelector('.appleMusicLyrics');
            if (oldLyrics) {
                oldLyrics.remove();
            }

            // 创建歌词显示元素
            const lyricsElement = document.createElement('div');
            lyricsElement.className = 'appleMusicLyrics';
            lyricsElement.style.cssText = `
                font-size: ${config.fontSize}px;
                color: white;
                text-align: center;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                padding: 20px;
                font-weight: 300;
                letter-spacing: 1px;
                z-index: 20;
            `;

            // 从API获取歌词
            fetchLyrics(songTitle).then((lyrics) => {
                if (lyrics) {
                    lyricsElement.innerHTML = lyrics;
                    container.appendChild(lyricsElement);
                }
            }).catch(err => {
                console.warn('[AppleMusic] Failed to fetch lyrics:', err);
            });

        } catch (error) {
            console.error('[AppleMusic] Error updating lyrics:', error);
        }
    }

    // 从API获取歌词
    async function fetchLyrics(songTitle) {
        try {
            // 这里可以集成LRC歌词源或Jellyfin API
            // 暂时返回占位符
            return `<p style="font-size: ${config.fontSize}px">${songTitle}</p>`;
        } catch (error) {
            console.warn('[AppleMusic] Error fetching lyrics:', error);
            return null;
        }
    }

    // 全局配置API
    window.AppleMusicLyrics = {
        config,
        loadConfig,
        saveConfig,
        init: initLyricPlayer
    };

    // 当DOM准备好时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadConfig();
            initLyricPlayer();
        });
    } else {
        loadConfig();
        initLyricPlayer();
    }
})();
