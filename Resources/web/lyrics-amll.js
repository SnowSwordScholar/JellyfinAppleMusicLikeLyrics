/**
 * Apple Music Like Lyrics for Jellyfin
 * 拦截并替换 Jellyfin 原生歌词渲染
 */

(function() {
    'use strict';

    console.log('[AMLL] Lyrics interceptor loaded');

    // 等待 Jellyfin 的核心模块加载
    function waitForJellyfinModules() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // 检查必要的 Jellyfin 模块是否已加载
                if (window.playbackManager && window.ApiClient) {
                    clearInterval(checkInterval);
                    console.log('[AMLL] Jellyfin modules ready');
                    resolve();
                }
            }, 100);

            // 10秒超时
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('[AMLL] Timeout waiting for Jellyfin modules');
                resolve();
            }, 10000);
        });
    }

    // 等待歌词页面出现
    function waitForLyricsPage() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const lyricPage = document.querySelector('#lyricPage');
                if (lyricPage) {
                    clearInterval(checkInterval);
                    console.log('[AMLL] Lyrics page found');
                    resolve(lyricPage);
                }
            }, 100);
        });
    }

    // 拦截原生歌词渲染
    async function interceptLyricsRendering() {
        const lyricPage = await waitForLyricsPage();
        const lyricsContainer = lyricPage.querySelector('.lyricsContainer');

        if (!lyricsContainer) {
            console.error('[AMLL] Lyrics container not found');
            return;
        }

        console.log('[AMLL] Intercepting lyrics container');

        // 使用 MutationObserver 监听原生歌词加载
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 检查是否是歌词内容
                    const hasLyrics = Array.from(mutation.addedNodes).some(node => 
                        node.classList && node.classList.contains('lyricsLine')
                    );

                    if (hasLyrics || lyricsContainer.querySelector('.lyricsLine')) {
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

        // 如果已经有歌词，立即替换
        if (lyricsContainer.querySelector('.lyricsLine')) {
            console.log('[AMLL] Lyrics already present, replacing...');
            replaceLyricsWithAMLL(lyricsContainer);
            observer.disconnect();
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

        function updateLyrics() {
            try {
                // 获取当前播放时间（ticks）
                const currentTime = getCurrentPlayTimeTicks();
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
            // 方法1: 使用 Jellyfin playbackManager
            if (window.playbackManager && window.playbackManager.currentTime) {
                const seconds = window.playbackManager.currentTime();
                if (seconds !== undefined && !isNaN(seconds)) {
                    return seconds * 10000; // 转换为 ticks
                }
            }

            // 方法2: 从 HTML5 媒体元素获取
            const mediaElement = document.querySelector('audio, video');
            if (mediaElement && !isNaN(mediaElement.currentTime)) {
                return mediaElement.currentTime * 10000;
            }

            return null;
        } catch (error) {
            console.warn('[AMLL] Error getting playback time:', error);
            return null;
        }
    }

    // 初始化
    async function init() {
        console.log('[AMLL] Initializing...');
        
        // 等待 Jellyfin 模块
        await waitForJellyfinModules();
        
        // 监听路由变化，当进入歌词页面时拦截
        const checkAndIntercept = () => {
            if (window.location.hash.includes('/lyrics')) {
                interceptLyricsRendering();
            }
        };

        // 立即检查
        checkAndIntercept();

        // 监听路由变化
        window.addEventListener('hashchange', checkAndIntercept);
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
