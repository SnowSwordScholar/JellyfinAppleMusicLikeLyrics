/**
 * Apple Music Lyrics 初始化脚本
 * 在Jellyfin Now Playing视图中加载并初始化歌词组件
 */

console.log('[AppleMusic] Init script loaded');

// 添加 CSS 动画
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
})();

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
                console.log('[AppleMusic] Config loaded from storage:', config);
            }
        } catch (e) {
            console.warn('[AppleMusic] Failed to load config:', e);
        }
    }

    // 保存配置到本地存储
    function saveConfig() {
        try {
            localStorage.setItem('appleMusicLyricsConfig', JSON.stringify(config));
            console.log('[AppleMusic] Config saved to storage');
        } catch (e) {
            console.warn('[AppleMusic] Failed to save config:', e);
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

            // 检查是否有API端点
            try {
                const response = await fetch(`${config.apiBase}/config`);
                if (!response.ok) {
                    console.warn('[AppleMusic] Config API not available');
                } else {
                    console.log('[AppleMusic] Config API available');
                }
            } catch (e) {
                console.warn('[AppleMusic] Could not reach config API:', e);
            }

            // 等待Now Playing页面出现
            waitForNowPlayingPage();

        } catch (error) {
            console.error('[AppleMusic] Failed to initialize:', error);
        }
    }

    // 强制隐藏原始歌词
    function hideOriginalLyrics(pageElement) {
        // 使用多种方式隐藏原始歌词
        const originalLyricsContainer = pageElement.querySelector('.lyricsContainer');
        if (originalLyricsContainer) {
            console.log('[AppleMusic] Hiding original lyrics container');
            originalLyricsContainer.style.cssText = `
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
                position: absolute !important;
                left: -9999px !important;
            `;
        }
        
        // 隐藏所有歌词行
        const lyricsLines = pageElement.querySelectorAll('.lyricsLine');
        lyricsLines.forEach(line => {
            line.style.cssText = 'display: none !important;';
        });
        
        // 添加全局样式来确保隐藏
        if (!document.getElementById('appleMusicHideStyle')) {
            const style = document.createElement('style');
            style.id = 'appleMusicHideStyle';
            style.textContent = `
                #lyricPage .lyricsContainer,
                #lyricPage .lyricsLine {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 等待Now Playing/Lyrics页面
    function waitForNowPlayingPage() {
        console.log('[AppleMusic] Waiting for Lyrics page...');
        
        let setupDone = false;
        
        // 检查函数
        const checkForPage = () => {
            if (setupDone) return;
            
            const hash = window.location.hash;
            console.log('[AppleMusic] Current hash:', hash);
            
            // Jellyfin 的歌词页面路由是 /web/#/lyrics
            if (hash.includes('/lyrics')) {
                console.log('[AppleMusic] Lyrics page detected, waiting for DOM...');
                
                // 立即尝试隐藏原始歌词（减少闪烁）
                const quickHide = () => {
                    const page = document.querySelector('#lyricPage');
                    if (page) {
                        hideOriginalLyrics(page);
                    }
                };
                
                // 立即执行一次
                quickHide();
                
                // 等待 DOM 加载
                setTimeout(() => {
                    // 查找歌词页面容器 - Jellyfin 使用 #lyricPage
                    const lyricsPage = document.querySelector('#lyricPage');
                    
                    if (lyricsPage) {
                        // 再次确保隐藏
                        hideOriginalLyrics(lyricsPage);
                        
                        if (!setupDone) {
                            setupDone = true;
                            console.log('[AppleMusic] Lyrics page DOM found:', lyricsPage);
                            setupNowPlayingLyrics(lyricsPage);
                        } else {
                            // 如果已经设置过，只需要重新应用（用户重新进入页面）
                            console.log('[AppleMusic] Re-entering lyrics page, reapplying setup');
                            setupNowPlayingLyrics(lyricsPage);
                        }
                    } else {
                        console.log('[AppleMusic] Lyrics page container not found yet, retrying...');
                        // 重试一次
                        setTimeout(() => {
                            const retryPage = document.querySelector('#lyricPage');
                            if (retryPage) {
                                hideOriginalLyrics(retryPage);
                                if (!setupDone) {
                                    setupDone = true;
                                }
                                console.log('[AppleMusic] Lyrics page found on retry');
                                setupNowPlayingLyrics(retryPage);
                            }
                        }, 1000);
                    }
                }, 200); // 减少延迟以更快隐藏
            }
        };

        // 立即检查一次
        checkForPage();

        // 监听 hash 变化（Jellyfin 使用客户端路由）
        const hashChangeHandler = () => {
            console.log('[AppleMusic] Hash changed to:', window.location.hash);
            checkForPage();
        };
        window.addEventListener('hashchange', hashChangeHandler);

        // 设置定期检查（作为备用）
        const intervalId = setInterval(() => {
            if (setupDone) {
                clearInterval(intervalId);
            } else {
                checkForPage();
            }
        }, 2000);

        // 60秒后停止检查
        setTimeout(() => {
            clearInterval(intervalId);
            console.log('[AppleMusic] Stopped waiting for lyrics page');
        }, 60000);
    }

    // 设置歌词显示
    function setupNowPlayingLyrics(pageElement) {
        try {
            console.log('[AppleMusic] Setting up Apple Music style on:', pageElement);

            // 检查是否已经设置过
            const existingBg = document.getElementById('appleMusicBgContainer');
            const existingLyrics = document.getElementById('appleMusicLyricsContainer');
            
            if (existingBg && existingLyrics) {
                console.log('[AppleMusic] Containers already exist, reusing them');
                // 重新显示容器
                existingBg.style.display = 'block';
                existingLyrics.style.display = 'block';
                
                // 重新隐藏原始歌词
                hideOriginalLyrics(pageElement);
                
                // 更新背景和歌词
                setTimeout(() => {
                    updateBackgroundFromAlbum(pageElement, existingBg);
                    // 重新开始监控
                    if (window.appleMusicCheckInterval) {
                        clearInterval(window.appleMusicCheckInterval);
                        window.appleMusicCheckInterval = null;
                    }
                    startMonitoring(pageElement, existingLyrics);
                }, 500);
                
                return;
            }

            // 隐藏原生歌词容器
            hideOriginalLyrics(pageElement);

            // 创建背景容器
            const bgContainer = document.createElement('div');
            bgContainer.id = 'appleMusicBgContainer';
            bgContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 999;
                pointer-events: none;
                backdrop-filter: blur(${config.blurAmount}px);
                background: radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%);
                transition: backdrop-filter 0.5s ease;
            `;
            document.body.appendChild(bgContainer);
            console.log('[AppleMusic] Background container created');

            // 创建歌词容器
            const lyricsContainer = document.createElement('div');
            lyricsContainer.id = 'appleMusicLyricsContainer';
            lyricsContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                pointer-events: none;
                color: white;
                text-align: center;
                font-size: ${config.fontSize}px;
                text-shadow: 0 2px 10px rgba(0,0,0,0.8);
                max-width: 80%;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(lyricsContainer);
            console.log('[AppleMusic] Lyrics container created');

            // 获取专辑封面并应用动态背景
            setTimeout(() => {
                updateBackgroundFromAlbum(pageElement, bgContainer);
            }, 800);

            // 开始监控
            startMonitoring(pageElement, lyricsContainer);

        } catch (error) {
            console.error('[AppleMusic] Error setting up lyrics:', error);
        }
    }

    // 从专辑封面更新背景
    function updateBackgroundFromAlbum(pageElement, bgContainer) {
        try {
            // 查找专辑封面 - 优先从歌词页面内查找
            let nowPlayingImage = pageElement.querySelector('.nowPlayingImage');
            
            // 如果页面内找不到，尝试全局查找
            if (!nowPlayingImage) {
                nowPlayingImage = document.querySelector('.nowPlayingImage');
            }
            
            // 也可以尝试查找其他可能的封面容器
            if (!nowPlayingImage) {
                nowPlayingImage = document.querySelector('.lyricsAlbumArt, .albumArt, [data-role="albumart"]');
            }
            
            console.log('[AppleMusic] Looking for album art...', nowPlayingImage);
            
            if (nowPlayingImage) {
                const bgImageStyle = window.getComputedStyle(nowPlayingImage).backgroundImage;
                console.log('[AppleMusic] Found background-image style:', bgImageStyle);
                
                // 从 "url("...")" 格式中提取 URL
                const urlMatch = bgImageStyle.match(/url\(["']?([^"')]+)["']?\)/);
                
                if (urlMatch && urlMatch[1]) {
                    const imgUrl = urlMatch[1];
                    console.log('[AppleMusic] Extracted album art URL:', imgUrl);
                    
                    bgContainer.style.backgroundImage = `url('${imgUrl}')`;
                    bgContainer.style.backgroundSize = 'cover';
                    bgContainer.style.backgroundPosition = 'center';
                    bgContainer.style.opacity = '0.4';

                    // 应用颜色混合效果
                    if (config.enableDynamicBlending) {
                        extractDominantColor(imgUrl, (color) => {
                            bgContainer.style.backgroundColor = color;
                            bgContainer.style.backgroundBlendMode = 'overlay';
                            console.log('[AppleMusic] Applied dominant color:', color);
                        });
                    }
                } else {
                    console.log('[AppleMusic] Could not extract URL from background-image');
                    bgContainer.style.backgroundColor = 'rgba(20, 20, 30, 0.9)';
                }
            } else {
                console.log('[AppleMusic] No album art element found, using default background');
                bgContainer.style.backgroundColor = 'rgba(20, 20, 30, 0.9)';
            }
        } catch (error) {
            console.warn('[AppleMusic] Error updating background:', error);
            bgContainer.style.backgroundColor = 'rgba(20, 20, 30, 0.9)';
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

    // 开始监控流程
    function startMonitoring(pageElement, lyricsContainer) {
        setTimeout(() => {
            // 尝试从多个地方获取歌曲信息（仅在歌词页面内查找）
            let songTitle = null;
            
            // 方法1: 从歌词页面内的元素获取
            const titleInPage = pageElement.querySelector('.osdTitle, h2, .itemName');
            if (titleInPage && titleInPage.textContent.trim()) {
                const text = titleInPage.textContent.trim();
                if (!text.match(/^\d+:\d+$/) && !text.includes('服务')) {
                    songTitle = text;
                }
            }
            
            // 方法2: 从 nowPlayingBar 获取
            if (!songTitle) {
                const nowPlayingText = document.querySelector('.nowPlayingBarText');
                if (nowPlayingText && nowPlayingText.textContent.trim()) {
                    const text = nowPlayingText.textContent.trim();
                    if (!text.match(/^\d+:\d+$/) && !text.includes('服务')) {
                        songTitle = text;
                    }
                }
            }
            
            if (songTitle) {
                console.log('[AppleMusic] Found initial song title:', songTitle);
                updateLyricsDisplay(lyricsContainer, songTitle);
            } else {
                console.log('[AppleMusic] Song title not found, showing placeholder');
                updateLyricsDisplay(lyricsContainer, 'Waiting for playback...');
            }
            
            // 在获取初始标题后再开始监听
            setTimeout(() => {
                monitorPlaybackInfo(pageElement, lyricsContainer);
            }, 500);
        }, 1000);
    }

    // 监听播放信息变化
    function monitorPlaybackInfo(pageElement, lyricsContainer) {
        let currentSongTitle = '';
        
        // 使用定时器而不是 MutationObserver 来避免性能问题
        const checkInterval = setInterval(() => {
            try {
                // 确保仍在歌词页面
                if (!window.location.hash.includes('/lyrics')) {
                    return;
                }
                
                let songTitle = null;
                
                // 方法1: 从歌词页面内的元素获取
                const lyricPage = document.querySelector('#lyricPage');
                if (lyricPage) {
                    // 查找歌词页面内的标题元素
                    const titleElement = lyricPage.querySelector('.osdTitle, h2, .itemName');
                    if (titleElement && titleElement.textContent.trim()) {
                        const text = titleElement.textContent.trim();
                        // 排除时间格式 (xx:xx) 和空标题
                        if (!text.match(/^\d+:\d+$/) && text.length > 0) {
                            songTitle = text;
                        }
                    }
                }
                
                // 方法2: 从 Now Playing Bar 获取
                if (!songTitle) {
                    const nowPlayingBar = document.querySelector('.nowPlayingBarText');
                    if (nowPlayingBar && nowPlayingBar.textContent.trim()) {
                        const text = nowPlayingBar.textContent.trim();
                        if (!text.match(/^\d+:\d+$/) && text.length > 0 && text !== 'Jellyfin') {
                            songTitle = text;
                        }
                    }
                }
                
                // 方法3: 从页面标题获取（但排除服务器名）
                if (!songTitle) {
                    const pageTitle = document.title;
                    if (pageTitle && pageTitle !== 'Jellyfin') {
                        const cleanTitle = pageTitle.replace(' - Jellyfin', '').replace(/ - .*服务/, '').trim();
                        // 只有当标题不是时间格式、不包含"服务"且长度合理时才使用
                        if (!cleanTitle.match(/^\d+:\d+$/) && !cleanTitle.includes('服务') && cleanTitle.length > 0 && cleanTitle.length < 100) {
                            songTitle = cleanTitle;
                        }
                    }
                }
                
                // 更新歌词显示
                if (songTitle && songTitle !== currentSongTitle) {
                    currentSongTitle = songTitle;
                    console.log('[AppleMusic] Song changed:', currentSongTitle);
                    updateLyricsDisplay(lyricsContainer, currentSongTitle);
                }
            } catch (error) {
                console.warn('[AppleMusic] Error monitoring playback:', error);
            }
        }, 2000); // 每2秒检查一次

        // 存储 intervalId 以便清理
        window.appleMusicCheckInterval = checkInterval;
        console.log('[AppleMusic] Started monitoring playback info');
    }

    // 从 Jellyfin 原生歌词中提取数据
    function extractLyricsFromPage() {
        try {
            const lyricPage = document.querySelector('#lyricPage');
            if (!lyricPage) return null;

            // 查找所有歌词行
            const lyricsLines = lyricPage.querySelectorAll('.lyricsLine');
            if (!lyricsLines || lyricsLines.length === 0) {
                console.log('[AppleMusic] No lyrics lines found in page');
                return null;
            }

            const lyrics = [];
            lyricsLines.forEach(line => {
                const text = line.textContent.trim();
                const timeAttr = line.getAttribute('data-lyrictime');
                
                if (text && timeAttr) {
                    // data-lyrictime 是以毫秒为单位的时间戳
                    const time = parseInt(timeAttr, 10) / 1000; // 转换为秒
                    lyrics.push({ time, text });
                }
            });

            console.log(`[AppleMusic] Extracted ${lyrics.length} lyrics lines`);
            return lyrics.length > 0 ? lyrics : null;
        } catch (error) {
            console.warn('[AppleMusic] Error extracting lyrics:', error);
            return null;
        }
    }

    // 更新歌词显示
    function updateLyricsDisplay(container, songTitle) {
        try {
            if (!songTitle || songTitle.trim() === '') {
                return;
            }

            console.log('[AppleMusic] Updating lyrics for:', songTitle);

            // 尝试从页面中提取歌词
            const lyrics = extractLyricsFromPage();

            if (lyrics && lyrics.length > 0) {
                console.log('[AppleMusic] Found lyrics data, rendering...');
                renderLyrics(container, lyrics, songTitle);
                // 开始同步歌词
                startLyricsSync(container, lyrics);
            } else {
                // 没有歌词时显示歌曲名
                container.innerHTML = `
                    <div class="appleMusicLyrics" style="
                        font-size: ${config.fontSize}px;
                        color: white;
                        text-align: center;
                        text-shadow: 0 2px 10px rgba(0,0,0,0.8);
                        padding: 20px;
                        font-weight: 300;
                        letter-spacing: 1px;
                        animation: fadeIn 0.5s ease;
                    ">
                        <p style="margin: 0; opacity: 0.9;">${songTitle}</p>
                        <p style="margin-top: 10px; font-size: 0.6em; opacity: 0.6;">♪ No lyrics available ♪</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('[AppleMusic] Error updating lyrics:', error);
        }
    }

    // 渲染歌词
    function renderLyrics(container, lyrics, songTitle) {
        const lyricsHTML = lyrics.map((line, index) => `
            <div class="lyric-line" data-time="${line.time}" data-index="${index}" style="
                font-size: ${config.fontSize}px;
                color: rgba(255, 255, 255, 0.4);
                text-align: center;
                text-shadow: 0 2px 10px rgba(0,0,0,0.8);
                padding: 10px 20px;
                margin: 5px 0;
                font-weight: 300;
                letter-spacing: 0.5px;
                transition: all 0.3s ease;
                line-height: 1.5;
            ">
                ${line.text}
            </div>
        `).join('');

        container.innerHTML = `
            <div class="appleMusicLyricsScroller" style="
                max-height: 70vh;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 20px;
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                -ms-overflow-style: none;
            ">
                <div style="margin-bottom: 15px; font-size: ${config.fontSize * 0.7}px; color: rgba(255,255,255,0.6); text-align: center;">
                    ${songTitle}
                </div>
                ${lyricsHTML}
                <div style="height: 40vh;"></div>
            </div>
            <style>
                .appleMusicLyricsScroller::-webkit-scrollbar {
                    display: none;
                }
                .lyric-line.active {
                    color: rgba(255, 255, 255, 1) !important;
                    font-weight: 500 !important;
                    transform: scale(1.1);
                }
            </style>
        `;
    }

    // 同步歌词滚动
    function startLyricsSync(container, lyrics) {
        // 清除之前的同步定时器
        if (window.appleMusicLyricsSyncInterval) {
            clearInterval(window.appleMusicLyricsSyncInterval);
        }

        let currentIndex = -1;

        const syncInterval = setInterval(() => {
            try {
                // 获取当前播放时间
                const currentTime = getCurrentPlaybackTime();
                if (currentTime === null) return;

                // 找到当前应该显示的歌词
                let newIndex = -1;
                for (let i = lyrics.length - 1; i >= 0; i--) {
                    if (currentTime >= lyrics[i].time) {
                        newIndex = i;
                        break;
                    }
                }

                // 如果索引变化，更新高亮
                if (newIndex !== currentIndex && newIndex >= 0) {
                    currentIndex = newIndex;
                    updateActiveLyric(container, currentIndex);
                }
            } catch (error) {
                console.warn('[AppleMusic] Error syncing lyrics:', error);
            }
        }, 100); // 每100ms检查一次

        window.appleMusicLyricsSyncInterval = syncInterval;
        console.log('[AppleMusic] Started lyrics sync');
    }

    // 更新当前活跃的歌词行
    function updateActiveLyric(container, index) {
        try {
            // 移除之前的高亮
            const allLines = container.querySelectorAll('.lyric-line');
            allLines.forEach(line => line.classList.remove('active'));

            // 高亮当前行
            const currentLine = container.querySelector(`.lyric-line[data-index="${index}"]`);
            if (currentLine) {
                currentLine.classList.add('active');

                // 滚动到当前行（居中显示）
                const scroller = container.querySelector('.appleMusicLyricsScroller');
                if (scroller) {
                    const lineTop = currentLine.offsetTop;
                    const scrollerHeight = scroller.clientHeight;
                    const lineHeight = currentLine.clientHeight;
                    const scrollTo = lineTop - (scrollerHeight / 2) + (lineHeight / 2);
                    
                    scroller.scrollTo({
                        top: scrollTo,
                        behavior: 'smooth'
                    });
                }
            }
        } catch (error) {
            console.warn('[AppleMusic] Error updating active lyric:', error);
        }
    }

    // 获取当前播放时间
    function getCurrentPlaybackTime() {
        try {
            // 方法1: 从 HTML5 audio/video 元素获取
            const mediaElement = document.querySelector('audio, video');
            if (mediaElement && !isNaN(mediaElement.currentTime)) {
                return mediaElement.currentTime;
            }

            // 方法2: 从 Jellyfin 的播放器 API 获取（如果有）
            if (window.playerManager && window.playerManager.currentTime) {
                return window.playerManager.currentTime() / 10000000; // Jellyfin 使用 ticks
            }

            // 方法3: 从 OSD 时间显示中解析
            const timeDisplay = document.querySelector('.osdTimeText, .positionTime');
            if (timeDisplay) {
                const timeText = timeDisplay.textContent.trim();
                const match = timeText.match(/(\d+):(\d+)/);
                if (match) {
                    const minutes = parseInt(match[1], 10);
                    const seconds = parseInt(match[2], 10);
                    return minutes * 60 + seconds;
                }
            }

            return null;
        } catch (error) {
            console.warn('[AppleMusic] Error getting playback time:', error);
            return null;
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

    // 清理函数
    function cleanup() {
        console.log('[AppleMusic] Cleaning up...');
        
        // 清理定时器
        if (window.appleMusicCheckInterval) {
            clearInterval(window.appleMusicCheckInterval);
            window.appleMusicCheckInterval = null;
        }
        
        // 清理歌词同步定时器
        if (window.appleMusicLyricsSyncInterval) {
            clearInterval(window.appleMusicLyricsSyncInterval);
            window.appleMusicLyricsSyncInterval = null;
        }

        // 隐藏容器而不是移除（以便重用）
        const bgContainer = document.getElementById('appleMusicBgContainer');
        const lyricsContainer = document.getElementById('appleMusicLyricsContainer');
        if (bgContainer) bgContainer.style.display = 'none';
        if (lyricsContainer) lyricsContainer.style.display = 'none';
        
        // 移除隐藏样式
        const hideStyle = document.getElementById('appleMusicHideStyle');
        if (hideStyle) hideStyle.remove();
    }

    // 监听页面卸载
    window.addEventListener('beforeunload', cleanup);

    // 监听路由变化，离开歌词页面时清理
    let lastHash = window.location.hash;
    setInterval(() => {
        if (window.location.hash !== lastHash) {
            lastHash = window.location.hash;
            // 只有离开歌词页面时才清理
            if (!lastHash.includes('/lyrics') && !lastHash.includes('nowplaying')) {
                cleanup();
            }
        }
    }, 1000);

    // 全局配置API
    window.AppleMusicLyrics = {
        config,
        loadConfig,
        saveConfig,
        init: initLyricPlayer,
        cleanup: cleanup
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
