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

                    // 检查整个容器是否现在有歌词
                    const containerHasLyrics = lyricsContainer.querySelector('.lyricsLine');
                    
                    console.log('[AMLL] Lyrics check:', {
                        directLyrics: hasDirectLyrics,
                        nestedLyrics: hasNestedLyrics,
                        containerHasLyrics: !!containerHasLyrics
                    });

                    if (hasDirectLyrics || hasNestedLyrics || containerHasLyrics) {
                        console.log('[AMLL] Original lyrics detected, replacing with AMLL...');
                        replaceLyricsWithAMLL(lyricsContainer);
                        // 一次替换后就停止观察
                        observer.disconnect();
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

        // 如果已经有歌词，立即替换
        const existingLyrics = lyricsContainer.querySelector('.lyricsLine');
        if (existingLyrics) {
            console.log('[AMLL] Lyrics already present, replacing immediately...');
            replaceLyricsWithAMLL(lyricsContainer);
            observer.disconnect();
        } else {
            console.log('[AMLL] No lyrics yet, waiting for them to load...');
            
            // 添加轮询作为备用方案 - 每100ms检查一次是否有歌词
            let pollCount = 0;
            const maxPolls = 100; // 最多轮询10秒
            const pollInterval = setInterval(() => {
                pollCount++;
                const lyrics = lyricsContainer.querySelector('.lyricsLine');
                
                if (lyrics) {
                    console.log(`[AMLL] Lyrics detected via polling after ${pollCount * 100}ms!`);
                    replaceLyricsWithAMLL(lyricsContainer);
                    observer.disconnect();
                    clearInterval(pollInterval);
                    // 不重置 isIntercepting,保持拦截状态直到离开页面
                } else if (pollCount >= maxPolls) {
                    console.warn('[AMLL] Polling timeout - no lyrics found after 10 seconds');
                    console.log('[AMLL] Container content:', lyricsContainer.innerHTML);
                    console.log('[AMLL] Container has lyrics elements:', lyricsContainer.querySelectorAll('.lyricsLine').length);
                    isIntercepting = false; // 重置标志以允许下次尝试
                    clearInterval(pollInterval);
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

    // 替换为 AMLL 渲染
    function replaceLyricsWithAMLL(container) {
        try {
            // 提取原生歌词数据
            const lyricsData = extractLyricsData(container);
            
            if (!lyricsData) {
                console.warn('[AMLL] No lyrics data found');
                return;
            }

            // 清空容器
            container.innerHTML = '';

            // 创建 AMLL 容器
            const amllContainer = document.createElement('div');
            amllContainer.className = 'amll-lyrics-container';
            amllContainer.style.cssText = `
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                background: transparent;
            `;

            // 创建背景容器
            const bgContainer = document.createElement('div');
            bgContainer.className = 'amll-background';
            bgContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: -1;
                background: linear-gradient(135deg, rgba(30,30,50,0.95) 0%, rgba(10,10,20,0.98) 100%);
                backdrop-filter: blur(50px);
            `;

            // 创建歌词滚动容器
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'amll-scroll-container';
            scrollContainer.style.cssText = `
                max-height: 70vh;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 40px 20px;
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

            // 添加底部留白
            const spacer = document.createElement('div');
            spacer.style.height = '40vh';
            scrollContainer.appendChild(spacer);

            // 组装容器
            document.body.appendChild(bgContainer);
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
        let currentIndex = -1;
        let syncInterval;
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
        syncInterval = setInterval(updateLyrics, 100);

        // 清理函数
        window.addEventListener('beforeunload', () => {
            if (syncInterval) clearInterval(syncInterval);
        });

        // 监听路由变化，离开歌词页面时清理
        const hashChangeHandler = () => {
            if (!window.location.hash.includes('/lyrics')) {
                if (syncInterval) {
                    clearInterval(syncInterval);
                    console.log('[AMLL] Sync stopped');
                }
                // 移除背景
                const bg = document.querySelector('.amll-background');
                if (bg) bg.remove();
            }
        };
        window.addEventListener('hashchange', hashChangeHandler);

        console.log('[AMLL] Lyrics sync started');
    }

    // 更新活跃歌词
    function updateActiveLyric(container, index) {
        // 移除所有高亮
        const allLines = container.querySelectorAll('.amll-lyric-line');
        allLines.forEach(line => line.classList.remove('active'));

        // 高亮当前行
        const currentLine = container.querySelector(`.amll-lyric-line[data-index="${index}"]`);
        if (currentLine) {
            currentLine.classList.add('active');

            // 滚动到当前行
            const lineTop = currentLine.offsetTop;
            const scrollerHeight = container.clientHeight;
            const lineHeight = currentLine.clientHeight;
            const scrollTo = lineTop - (scrollerHeight / 2) + (lineHeight / 2);
            
            container.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
            });
        }
    }

    // 获取当前播放时间（ticks）
    function getCurrentPlayTimeTicks() {
        try {
            // 方法1: 从缓存的 playbackManager 获取
            if (!playbackManagerRef) {
                playbackManagerRef = tryGetPlaybackManager();
            }
            
            if (playbackManagerRef && typeof playbackManagerRef.currentTime === 'function') {
                const seconds = playbackManagerRef.currentTime();
                if (seconds !== undefined && !isNaN(seconds)) {
                    return seconds * 10000; // 转换为 ticks (1 tick = 0.0001 秒)
                }
            }

            // 方法2: 从 HTML5 媒体元素获取（最可靠）
            const mediaElement = document.querySelector('audio, video');
            if (mediaElement && !isNaN(mediaElement.currentTime)) {
                return Math.floor(mediaElement.currentTime * 10000);
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
