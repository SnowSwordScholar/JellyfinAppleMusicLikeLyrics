/**
 * Apple Music Like Lyrics for Jellyfin
 * 拦截并替换 Jellyfin 原生歌词渲染
 */

(function() {
    'use strict';

    console.log('[AMLL] Lyrics interceptor loaded');

    // 播放管理器引用（从页面事件中获取）
    let playbackManagerRef = null;
    let isIntercepting = false; // 防止重复拦截标志
    let interceptionAttempts = 0; // 拦截尝试计数
    let currentSyncInterval = null; // 当前的同步定时器
    let currentHashChangeHandler = null; // 当前的hash变化监听器

    // 尝试从全局获取 playbackManager
    function tryGetPlaybackManager() {
        // Jellyfin 可能将 playbackManager 暴露在不同的位置
        if (typeof playbackManager !== 'undefined') {
            return playbackManager;
        }
        if (window.playbackManager) {
            return window.playbackManager;
        }
        // 尝试从 Emby 兼容层获取
        if (window.require && window.require.defined && window.require.defined('playbackManager')) {
            return window.require('playbackManager');
        }
        return null;
    }

    // 等待歌词页面出现
    function waitForLyricsPage() {
        return new Promise((resolve) => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                const lyricPage = document.querySelector('#lyricPage');
                if (lyricPage) {
                    clearInterval(checkInterval);
                    console.log('[AMLL] Lyrics page found after', attempts, 'attempts');
                    resolve(lyricPage);
                } else if (attempts % 10 === 0) {
                    console.log('[AMLL] Still waiting for lyrics page... (' + attempts + ' attempts)');
                }
                
                // 30秒超时
                if (attempts > 300) {
                    clearInterval(checkInterval);
                    console.error('[AMLL] Timeout waiting for lyrics page');
                    resolve(null);
                }
            }, 100);
        });
    }

    // 拦截原生歌词渲染
    async function interceptLyricsRendering() {
        // 防止重复拦截
        if (isIntercepting) {
            interceptionAttempts++;
            if (interceptionAttempts % 10 === 0) {
                console.log(`[AMLL] Already intercepting, ignoring duplicate call (#${interceptionAttempts})`);
            }
            return;
        }
        
        isIntercepting = true;
        interceptionAttempts++;
        console.log(`[AMLL] Starting interception (attempt #${interceptionAttempts})...`);
        
        const lyricPage = await waitForLyricsPage();
        
        if (!lyricPage) {
            console.error('[AMLL] Lyrics page not found, aborting');
            isIntercepting = false;
            return;
        }
        
        const lyricsContainer = lyricPage.querySelector('.lyricsContainer');

        if (!lyricsContainer) {
            console.error('[AMLL] Lyrics container not found in page');
            isIntercepting = false;
            return;
        }

        console.log('[AMLL] Intercepting lyrics container:', lyricsContainer);

        // 轮询定时器的引用(在外部声明,以便在 MutationObserver 中访问)
        let pollInterval = null;

        // 使用 MutationObserver 监听原生歌词加载
        const observer = new MutationObserver((mutations) => {
            console.log('[AMLL] Mutation detected, checking for lyrics...');
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    console.log(`[AMLL] ${mutation.addedNodes.length} nodes added to lyrics container`);
                    
                    // 检查添加的节点本身是否是歌词
                    const hasDirectLyrics = Array.from(mutation.addedNodes).some(node => 
                        node.classList && node.classList.contains('lyricsLine')
                    );
                    
                    // 检查添加的节点内部是否包含歌词
                    const hasNestedLyrics = Array.from(mutation.addedNodes).some(node => 
                        node.querySelector && node.querySelector('.lyricsLine')
                    );

                    // 检查整个容器是否现在有歌词(并且不是我们自己的 AMLL 歌词)
                    const containerHasLyrics = lyricsContainer.querySelector('.lyricsLine');
                    const isAlreadyAMLL = lyricsContainer.querySelector('.amll-lyrics-container');
                    
                    console.log('[AMLL] Lyrics check:', {
                        directLyrics: hasDirectLyrics,
                        nestedLyrics: hasNestedLyrics,
                        containerHasLyrics: !!containerHasLyrics,
                        isAlreadyAMLL: !!isAlreadyAMLL
                    });

                    // 只在有原生歌词且还未替换时进行替换
                    if ((hasDirectLyrics || hasNestedLyrics || containerHasLyrics) && !isAlreadyAMLL) {
                        console.log('[AMLL] Original lyrics detected, replacing with AMLL...');
                        // 停止轮询
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            console.log('[AMLL] Polling stopped by MutationObserver');
                        }
                        // 停止观察
                        observer.disconnect();
                        // 替换歌词
                        replaceLyricsWithAMLL(lyricsContainer);
                        break;
                    }
                }
            }
        });

        // 开始观察
        observer.observe(lyricsContainer, {
            childList: true,
            subtree: true
        });

        console.log('[AMLL] MutationObserver set up, waiting for lyrics to load...');

        // 如果已经有歌词,立即替换
        const existingLyrics = lyricsContainer.querySelector('.lyricsLine');
        const alreadyAMLL = lyricsContainer.querySelector('.amll-lyrics-container');
        
        if (existingLyrics && !alreadyAMLL) {
            console.log('[AMLL] Lyrics already present, replacing immediately...');
            observer.disconnect();
            replaceLyricsWithAMLL(lyricsContainer);
            return; // 立即返回,不再继续轮询
        } else if (alreadyAMLL) {
            console.log('[AMLL] AMLL lyrics already rendered, extracting lyrics data and restarting sync...');
            observer.disconnect();
            // 从已渲染的 AMLL 歌词中提取数据
            const lyricsLines = lyricsContainer.querySelectorAll('.amll-lyric-line');
            if (lyricsLines.length > 0) {
                const lyricsData = Array.from(lyricsLines).map(line => ({
                    Text: line.textContent,
                    Start: parseInt(line.getAttribute('data-time') || '0') // 使用 data-time 而不是 data-start
                }));
                console.log('[AMLL] Extracted', lyricsData.length, 'lyrics lines from existing AMLL container');
                // 重新启动同步(处理退出后再进入的情况)
                const scrollContainer = lyricsContainer.querySelector('.amll-scroll-container');
                if (scrollContainer) {
                    startLyricsSync(scrollContainer, lyricsData);
                }
            }
            return;
        } else {
            console.log('[AMLL] No lyrics yet, waiting for them to load...');
            
            // 添加轮询作为备用方案 - 每100ms检查一次是否有歌词
            let pollCount = 0;
            const maxPolls = 100; // 最多轮询10秒
            pollInterval = setInterval(() => {
                pollCount++;
                const lyrics = lyricsContainer.querySelector('.lyricsLine');
                
                if (lyrics) {
                    console.log(`[AMLL] Lyrics detected via polling after ${pollCount * 100}ms!`);
                    clearInterval(pollInterval);
                    observer.disconnect();
                    replaceLyricsWithAMLL(lyricsContainer);
                    // 不重置 isIntercepting,保持拦截状态直到离开页面
                } else if (pollCount >= maxPolls) {
                    console.warn('[AMLL] Polling timeout - no lyrics found after 10 seconds');
                    clearInterval(pollInterval);
                    isIntercepting = false; // 重置标志以允许下次尝试
                } else if (pollCount % 10 === 0) {
                    console.log(`[AMLL] Still polling for lyrics... (${pollCount}/${maxPolls})`);
                }
            }, 100);
        }
    }

    // 从原生 DOM 提取歌词数据
    function extractLyricsData(container) {
        const lyricsLines = container.querySelectorAll('.lyricsLine');
        if (!lyricsLines || lyricsLines.length === 0) {
            return null;
        }

        const lyrics = [];
        lyricsLines.forEach(line => {
            const text = line.textContent.trim();
            const timeAttr = line.getAttribute('data-lyrictime');
            
            if (text && timeAttr) {
                const ticks = parseInt(timeAttr, 10);
                lyrics.push({ Start: ticks, Text: text });
            }
        });

        console.log(`[AMLL] Extracted ${lyrics.length} lyrics lines`);
        return lyrics.length > 0 ? lyrics : null;
    }

    // 获取当前播放歌曲的专辑封面
    function getCurrentAlbumArt() {
        try {
            // 尝试从 OSD (On-Screen Display) 获取
            const nowPlayingImage = document.querySelector('.nowPlayingImage, .osdPosterImg, [data-type="nowPlayingImage"]');
            if (nowPlayingImage) {
                const bgImage = nowPlayingImage.style.backgroundImage || nowPlayingImage.src;
                if (bgImage) {
                    // 提取 URL
                    const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                    return urlMatch ? urlMatch[1] : bgImage;
                }
            }

            // 尝试从播放栏获取
            const playerImage = document.querySelector('.nowPlayingBarImage, .mediaButton img, .playbackManager img');
            if (playerImage && playerImage.src) {
                return playerImage.src;
            }

            // 尝试从 Jellyfin API 获取当前播放的 item ID
            const lyricPage = document.querySelector('#lyricPage');
            if (lyricPage) {
                const itemIdMatch = lyricPage.getAttribute('data-itemid') || 
                                   window.location.href.match(/id=([a-f0-9]+)/i);
                if (itemIdMatch) {
                    const itemId = typeof itemIdMatch === 'string' ? itemIdMatch : itemIdMatch[1];
                    // 构造专辑封面 URL
                    return `${window.location.origin}/Items/${itemId}/Images/Primary?fillHeight=600&fillWidth=600&quality=90`;
                }
            }

            console.warn('[AMLL] Could not find album art');
            return null;
        } catch (error) {
            console.warn('[AMLL] Error getting album art:', error);
            return null;
        }
    }

    // 替换为 AMLL 渲染
    function replaceLyricsWithAMLL(container) {
        try {
            // 提取原生歌词数据
            const lyricsData = extractLyricsData(container);
            
            if (!lyricsData) {
                console.warn('[AMLL] No lyrics data found');
                return;
            }

            // 获取专辑封面
            const albumArt = getCurrentAlbumArt();
            console.log('[AMLL] Album art URL:', albumArt);

            // 清空容器
            container.innerHTML = '';

            // 创建 AMLL 容器
            const amllContainer = document.createElement('div');
            amllContainer.className = 'amll-lyrics-container';
            amllContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100vw;
                height: 100vh;
                overflow: hidden;
                background: transparent;
            `;

            // 创建背景容器
            const bgContainer = document.createElement('div');
            bgContainer.className = 'amll-background';
            
            // 如果有专辑封面,使用模糊背景
            if (albumArt) {
                bgContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 0;
                    background-image: url('${albumArt}');
                    background-size: cover;
                    background-position: center;
                    filter: blur(60px) brightness(0.6);
                    transform: scale(1.2);
                    pointer-events: none;
                `;
                
                // 添加渐变遮罩
                const gradientOverlay = document.createElement('div');
                gradientOverlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to bottom, 
                        rgba(0,0,0,0.2) 0%, 
                        rgba(0,0,0,0.4) 50%, 
                        rgba(0,0,0,0.6) 100%);
                    pointer-events: none;
                `;
                bgContainer.appendChild(gradientOverlay);
            } else {
                // 降级为纯色渐变
                bgContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 0;
                    background: linear-gradient(135deg, rgba(30,30,50,0.95) 0%, rgba(10,10,20,0.98) 100%);
                    pointer-events: none;
                `;
            }

            // 创建歌词滚动容器
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'amll-scroll-container';
            scrollContainer.style.cssText = `
                position: relative;
                z-index: 1;
                height: 100vh;
                max-height: 100vh;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 20vh 20px;
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                -ms-overflow-style: none;
            `;

            // 渲染歌词行
            lyricsData.forEach((lyric, index) => {
                const lyricLine = document.createElement('div');
                lyricLine.className = 'amll-lyric-line';
                lyricLine.setAttribute('data-time', lyric.Start);
                lyricLine.setAttribute('data-index', index);
                lyricLine.textContent = lyric.Text;
                lyricLine.style.cssText = `
                    font-size: 32px;
                    color: rgba(255, 255, 255, 0.4);
                    text-align: center;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.8);
                    padding: 15px 20px;
                    margin: 8px 0;
                    font-weight: 300;
                    letter-spacing: 0.5px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    line-height: 1.5;
                    cursor: pointer;
                `;
                scrollContainer.appendChild(lyricLine);
            });

            // 添加底部留白,确保最后一句歌词能滚动到屏幕中心
            const spacer = document.createElement('div');
            spacer.style.height = '50vh';
            scrollContainer.appendChild(spacer);

            // 组装容器 - 背景添加到歌词容器内部
            amllContainer.appendChild(bgContainer);
            amllContainer.appendChild(scrollContainer);
            container.appendChild(amllContainer);

            // 添加样式
            addAMLLStyles();

            // 开始同步
            startLyricsSync(scrollContainer, lyricsData);

            console.log('[AMLL] Rendering complete');
        } catch (error) {
            console.error('[AMLL] Error replacing lyrics:', error);
        }
    }

    // 添加全局样式
    function addAMLLStyles() {
        if (document.getElementById('amll-styles')) return;

        const style = document.createElement('style');
        style.id = 'amll-styles';
        style.textContent = `
            .amll-scroll-container::-webkit-scrollbar {
                display: none;
            }

            .amll-lyric-line.active {
                color: rgba(255, 255, 255, 1) !important;
                font-weight: 500 !important;
                transform: scale(1.05);
                text-shadow: 0 0 20px rgba(255,255,255,0.3);
            }

            .amll-lyric-line:hover {
                color: rgba(255, 255, 255, 0.7);
            }

            #lyricPage {
                background: transparent !important;
            }

            #lyricPage .padded-bottom-page {
                padding: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 同步歌词
    function startLyricsSync(container, lyrics) {
        // 清理旧的同步定时器
        if (currentSyncInterval) {
            clearInterval(currentSyncInterval);
            console.log('[AMLL] Cleared previous sync interval');
        }
        
        // 清理旧的hash监听器
        if (currentHashChangeHandler) {
            window.removeEventListener('hashchange', currentHashChangeHandler);
            console.log('[AMLL] Removed previous hash change handler');
        }

        let currentIndex = -1;
        let debugCounter = 0;

        function updateLyrics() {
            try {
                // 获取当前播放时间（ticks）
                const currentTime = getCurrentPlayTimeTicks();
                
                // 每5秒输出一次调试信息
                debugCounter++;
                if (debugCounter % 50 === 0) {
                    console.log('[AMLL] Sync check: currentTime =', currentTime, 'ticks (', (currentTime / 10000).toFixed(2), 's), currentIndex =', currentIndex);
                }
                
                if (currentTime === null) return;

                // 找到当前应该显示的歌词
                let newIndex = -1;
                for (let i = lyrics.length - 1; i >= 0; i--) {
                    if (currentTime >= lyrics[i].Start) {
                        newIndex = i;
                        break;
                    }
                }

                // 更新高亮
                if (newIndex !== currentIndex && newIndex >= 0) {
                    currentIndex = newIndex;
                    console.log('[AMLL] Switching to lyric line', newIndex, ':', lyrics[newIndex].Text);
                    updateActiveLyric(container, currentIndex);
                }
            } catch (error) {
                console.warn('[AMLL] Error syncing lyrics:', error);
            }
        }

        // 每100ms更新一次
        currentSyncInterval = setInterval(updateLyrics, 100);

        // 监听路由变化，离开歌词页面时清理
        currentHashChangeHandler = () => {
            if (!window.location.hash.includes('/lyrics')) {
                if (currentSyncInterval) {
                    clearInterval(currentSyncInterval);
                    currentSyncInterval = null;
                    console.log('[AMLL] Sync stopped');
                }
                // 移除背景
                const bg = document.querySelector('.amll-background');
                if (bg) bg.remove();
            }
        };
        window.addEventListener('hashchange', currentHashChangeHandler);

        console.log('[AMLL] Lyrics sync started');
    }

    // 更新活跃歌词
    function updateActiveLyric(scrollContainer, index) {
        // 移除所有高亮
        const allLines = scrollContainer.querySelectorAll('.amll-lyric-line');
        allLines.forEach(line => {
            line.classList.remove('active');
            // 重置非活跃歌词样式
            line.style.fontSize = '32px';
            line.style.color = 'rgba(255, 255, 255, 0.4)';
            line.style.transform = 'scale(1)';
        });

        // 高亮当前行
        const currentLine = scrollContainer.querySelector(`.amll-lyric-line[data-index="${index}"]`);
        if (currentLine) {
            currentLine.classList.add('active');
            // 增强活跃歌词样式
            currentLine.style.fontSize = '48px';
            currentLine.style.color = 'rgba(255, 255, 255, 1)';
            currentLine.style.transform = 'scale(1.1)';
            currentLine.style.fontWeight = '600';

            // 使用 requestAnimationFrame 确保 DOM 已更新
            requestAnimationFrame(() => {
                // 计算当前歌词相对于滚动容器的位置
                const containerRect = scrollContainer.getBoundingClientRect();
                const lineRect = currentLine.getBoundingClientRect();
                const lineTopRelative = lineRect.top - containerRect.top + scrollContainer.scrollTop;
                
                // 将歌词滚动到视口垂直中心
                const scrollTo = lineTopRelative - (containerRect.height / 2) + (lineRect.height / 2);
                
                console.log('[AMLL] Scroll:', {
                    lineTop: lineTopRelative,
                    scrollTo: scrollTo,
                    containerHeight: containerRect.height,
                    currentScrollTop: scrollContainer.scrollTop
                });
                
                scrollContainer.scrollTo({
                    top: Math.max(0, scrollTo),
                    behavior: 'smooth'
                });
            });
        }
    }

    // 获取当前播放时间(ticks)
    function getCurrentPlayTimeTicks() {
        try {
            // 方法1: 从缓存的 playbackManager 获取
            if (!playbackManagerRef) {
                playbackManagerRef = tryGetPlaybackManager();
            }
            
            if (playbackManagerRef && typeof playbackManagerRef.currentTime === 'function') {
                const seconds = playbackManagerRef.currentTime();
                if (seconds !== undefined && !isNaN(seconds)) {
                    return Math.floor(seconds * 10000000); // 转换为 ticks (1 tick = 100 纳秒, 1秒 = 10000000 ticks)
                }
            }

            // 方法2: 从 HTML5 媒体元素获取(最可靠)
            const mediaElement = document.querySelector('audio, video');
            if (mediaElement && !isNaN(mediaElement.currentTime)) {
                return Math.floor(mediaElement.currentTime * 10000000);
            }

            // 方法3: 从 OSD 时间显示解析
            const osdTime = document.querySelector('.osdTimeText, .positionTime');
            if (osdTime) {
                const text = osdTime.textContent.trim();
                const match = text.match(/(\d+):(\d+)/);
                if (match) {
                    const minutes = parseInt(match[1], 10);
                    const seconds = parseInt(match[2], 10);
                    return (minutes * 60 + seconds) * 10000;
                }
            }

            return null;
        } catch (error) {
            console.warn('[AMLL] Error getting playback time:', error);
            return null;
        }
    }

    // 初始化
    function init() {
        console.log('[AMLL] Initializing...');
        console.log('[AMLL] Current URL:', window.location.href);
        console.log('[AMLL] Current hash:', window.location.hash);
        
        // 尝试获取 playbackManager
        playbackManagerRef = tryGetPlaybackManager();
        if (playbackManagerRef) {
            console.log('[AMLL] PlaybackManager found');
        } else {
            console.log('[AMLL] PlaybackManager not found, will use HTML5 media element');
        }
        
        // 检查是否进入歌词页面
        const checkForLyricsPage = () => {
            const currentHash = window.location.hash;
            
            // 检查 hash
            if (currentHash.includes('/lyrics')) {
                console.log('[AMLL] Lyrics route detected via hash:', currentHash);
                interceptLyricsRendering();
                return true;
            }
            
            // 检查 DOM 是否存在歌词页面
            const lyricPage = document.querySelector('#lyricPage');
            if (lyricPage) {
                console.log('[AMLL] Lyrics page detected via DOM!');
                interceptLyricsRendering();
                return true;
            }
            
            return false;
        };

        // 立即检查
        if (!checkForLyricsPage()) {
            console.log('[AMLL] Not on lyrics page, setting up watchers...');
        }

        // 方法1: 监听 hashchange
        window.addEventListener('hashchange', (e) => {
            console.log('[AMLL] Hash changed from', e.oldURL, 'to', e.newURL);
            
            // 如果离开歌词页面,重置拦截标志
            if (!e.newURL.includes('/lyrics')) {
                console.log('[AMLL] Left lyrics page, resetting interception flag');
                isIntercepting = false;
                interceptionAttempts = 0;
            }
            
            checkForLyricsPage();
        });
        
        // 方法2: 使用 MutationObserver 监听 DOM 变化（Jellyfin 使用 SPA 架构）
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // 检查是否添加了歌词页面
                    for (const node of mutation.addedNodes) {
                        if (node.id === 'lyricPage' || (node.querySelector && node.querySelector('#lyricPage'))) {
                            console.log('[AMLL] Lyrics page detected via MutationObserver!');
                            checkForLyricsPage();
                            return;
                        }
                    }
                }
            }
        });
        
        // 观察 body 的子元素变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 方法3: 定期检查（备用）
        const checkInterval = setInterval(() => {
            if (checkForLyricsPage()) {
                // 找到后可以停止定期检查，MutationObserver 会继续工作
                console.log('[AMLL] Periodic check found lyrics page');
            }
        }, 1000);
        
        // 60秒后停止定期检查（但 MutationObserver 继续工作）
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('[AMLL] Periodic check stopped, MutationObserver still active');
        }, 60000);
        
        console.log('[AMLL] All watchers registered (hashchange + MutationObserver + periodic)');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
