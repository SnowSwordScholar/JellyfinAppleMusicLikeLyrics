/**
 * Apple Music Like Lyrics for Jellyfin
 * 拦截并替换 Jellyfin 原生歌词渲染
 */

(function() {
    'use strict';

    // ========== 配置对象 ==========
    let AMLL_CONFIG = {
        // 基础设置
        IsEnabled: true,
        EnableDebugMode: false,
        
        // 字体设置
        FontSizeLandscape: 32,
        FontSizePortrait: 24,
        ActiveFontSizeLandscape: 48,
        ActiveFontSizePortrait: 36,
        
        // 背景设置
        BackgroundBlur: 60,
        BackgroundBrightness: 0.8,
        
        // 非活跃歌词设置
        InactiveBrightness: 0.85,
        InactiveOpacity: 0.65,
        InactiveShadowIntensity: 0.5,
        InactiveBlur: 0.5,
        
        // 活跃歌词设置
        ActiveBrightness: 1.15,
        ActiveOpacity: 1.0,
        ActiveGlowIntensity: 0.2,
        ActiveShadowIntensity: 0.15,
        ActiveBlur: 0.0,
        
        // 渐变模糊设置
        GradientBlurAmount: 1.0,
        GradientBlurRange: 3,
        
        // 动画设置
        ScrollDuration: 1000,
        SpringSpeed: 1.0,
        TransformDuration: 800
    };
    
    // 调试日志函数
    const debugLog = (...args) => {
        if (AMLL_CONFIG.EnableDebugMode) {
            console.log('[AMLL DEBUG]', ...args);
        }
    };
    
    // 加载配置
    async function loadConfig() {
        try {
            const response = await fetch('/applelyrics/config');
            if (response.ok) {
                const config = await response.json();
                AMLL_CONFIG = { ...AMLL_CONFIG, ...config };
                console.log('[AMLL] Configuration loaded:', AMLL_CONFIG);
            } else {
                console.warn('[AMLL] Failed to load config, using defaults');
            }
        } catch (error) {
            console.warn('[AMLL] Error loading config, using defaults:', error);
        }
    }
    
    console.log('[AMLL] Lyrics interceptor loaded');

    // 播放管理器引用（从页面事件中获取）
    let playbackManagerRef = null;
    let isIntercepting = false; // 防止重复拦截标志
    let interceptionAttempts = 0; // 拦截尝试计数
    let currentSyncInterval = null; // 当前的同步定时器
    let currentHashChangeHandler = null; // 当前的hash变化监听器
    let lastInterceptedContainer = null; // 记录上次拦截的容器,用于检测容器变化
    
    // 检测设备类型
    function isMobileDevice() {
        return window.innerWidth < window.innerHeight || window.innerWidth < 768;
    }

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

        debugLog('Found lyrics container:', lyricsContainer);
        debugLog('Container identity check - last:', lastInterceptedContainer, 'current:', lyricsContainer, 'same?:', lastInterceptedContainer === lyricsContainer);
        debugLog('isIntercepting flag:', isIntercepting);

        // 检测容器是否变化(切换歌曲/重新进入会创建新容器)
        if (lastInterceptedContainer && lastInterceptedContainer !== lyricsContainer) {
            console.log('[AMLL] Detected new lyrics container (song changed), resetting interception');
            debugLog('Old container:', lastInterceptedContainer);
            debugLog('New container:', lyricsContainer);
            isIntercepting = false;
            lastInterceptedContainer = null;
        }

        // 防止重复拦截同一个容器
        if (isIntercepting && lastInterceptedContainer === lyricsContainer) {
            if (interceptionAttempts % 10 === 0) {
                console.log(`[AMLL] Already intercepting same container, ignoring (#${interceptionAttempts})`);
            }
            return;
        }
        
        isIntercepting = true;
        lastInterceptedContainer = lyricsContainer;
        console.log('[AMLL] ✅ Starting interception on new container');
        debugLog('Container reference stored:', lyricsContainer);
        debugLog('Container HTML:', lyricsContainer.outerHTML.substring(0, 200));

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
            
            // 如果有专辑封面,使用模糊背景 (使用配置)
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
                    filter: blur(${AMLL_CONFIG.BackgroundBlur}px) brightness(${AMLL_CONFIG.BackgroundBrightness});
                    transform: scale(1.2);
                    pointer-events: none;
                `;
                
                // 添加更亮的渐变遮罩
                const gradientOverlay = document.createElement('div');
                gradientOverlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to bottom, 
                        rgba(0,0,0,0.1) 0%, 
                        rgba(0,0,0,0.3) 50%, 
                        rgba(0,0,0,0.5) 100%);
                    pointer-events: none;
                `;
                bgContainer.appendChild(gradientOverlay);
            } else {
                // 降级为更亮的纯色渐变
                bgContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 0;
                    background: linear-gradient(135deg, rgba(40,40,60,0.9) 0%, rgba(20,20,35,0.95) 100%);
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
                
                // 添加点击跳转功能
                lyricLine.addEventListener('click', () => {
                    seekToTime(lyric.Start);
                });
                
                lyricLine.style.cssText = `
                    font-size: 32px;
                    color: rgba(255, 255, 255, 0.4);
                    text-align: center;
                    text-shadow: 0 1px 6px rgba(0,0,0,0.5);
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

            console.log('[AMLL] ✅ Rendering complete - AMLL style applied');
            debugLog('Lyrics count:', lyricsData.length);
            debugLog('Container:', container);
        } catch (error) {
            console.error('[AMLL] Error replacing lyrics:', error);
        }
    }

    // 添加全局样式
    function addAMLLStyles() {
        if (document.getElementById('amll-styles')) return;

        const cfg = AMLL_CONFIG;
        const isMobile = isMobileDevice();
        const baseFontSize = isMobile ? cfg.FontSizePortrait : cfg.FontSizeLandscape;
        const activeFontSize = isMobile ? cfg.ActiveFontSizePortrait : cfg.ActiveFontSizeLandscape;
        const transformDuration = cfg.TransformDuration / 1000; // ms to s
        
        const style = document.createElement('style');
        style.id = 'amll-styles';
        style.textContent = `
            /* 隐藏滚动条 */
            .amll-scroll-container::-webkit-scrollbar {
                display: none;
            }

            /* 歌词行基础样式 - 响应式字体大小 */
            .amll-lyric-line {
                position: relative;
                padding: 0.75em 1.5em;
                margin: 0.5em 0;
                border-radius: 0.5em;
                cursor: pointer;
                backface-visibility: hidden;
                will-change: transform, filter, opacity;
                font-size: ${baseFontSize}px;
                /* 添加自动换行支持，防止长歌词造成布局跳动 */
                word-wrap: break-word;
                word-break: break-word;
                white-space: pre-wrap;
                overflow-wrap: break-word;
                transition: 
                    transform ${transformDuration}s cubic-bezier(0.16, 1, 0.3, 1),
                    filter 0.3s ease,
                    opacity 0.3s ease,
                    background-color 0.25s ease,
                    box-shadow 0.25s ease,
                    font-size 0.3s ease;
            }

            /* 活动歌词行 - Apple Music 风格 (可配置，响应式字体) */
            .amll-lyric-line.active {
                color: rgba(255, 255, 255, ${cfg.ActiveOpacity}) !important;
                font-weight: 600 !important;
                font-size: ${activeFontSize}px;
                transform: scale(1.08);
                text-shadow: 
                    0 0 20px rgba(255, 255, 255, ${cfg.ActiveGlowIntensity}),
                    0 1px 4px rgba(0, 0, 0, ${cfg.ActiveShadowIntensity});
                filter: blur(${cfg.ActiveBlur}px) brightness(${cfg.ActiveBrightness});
            }

            /* 非活动歌词行 - 模糊效果 (可配置) */
            .amll-lyric-line:not(.active) {
                filter: blur(${cfg.InactiveBlur}px) brightness(${cfg.InactiveBrightness});
                opacity: ${cfg.InactiveOpacity};
                text-shadow: 0 1px 6px rgba(0,0,0,${cfg.InactiveShadowIntensity});
            }

            /* 渐变模糊效果 - 活跃歌词前后的歌词 */
            .amll-lyric-line.gradient-blur-1 {
                filter: blur(${cfg.InactiveBlur + cfg.GradientBlurAmount * 0.3}px) brightness(${cfg.InactiveBrightness * 0.95});
                opacity: ${cfg.InactiveOpacity * 0.85};
            }
            .amll-lyric-line.gradient-blur-2 {
                filter: blur(${cfg.InactiveBlur + cfg.GradientBlurAmount * 0.6}px) brightness(${cfg.InactiveBrightness * 0.9});
                opacity: ${cfg.InactiveOpacity * 0.7};
            }
            .amll-lyric-line.gradient-blur-3 {
                filter: blur(${cfg.InactiveBlur + cfg.GradientBlurAmount}px) brightness(${cfg.InactiveBrightness * 0.85});
                opacity: ${cfg.InactiveOpacity * 0.6};
            }

            /* Hover 效果 - Apple Music 风格 */
            .amll-lyric-line:hover {
                background-color: rgba(255, 255, 255, 0.08);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                transform: scale(1.02);
            }

            .amll-lyric-line.active:hover {
                background-color: rgba(255, 255, 255, 0.12);
                transform: scale(1.1);
            }

            /* Active 按下效果 */
            .amll-lyric-line:active {
                background-color: rgba(255, 255, 255, 0.05);
                transform: scale(0.98);
            }

            /* 歌词页面背景 */
            #lyricPage {
                background: transparent !important;
            }

            #lyricPage .padded-bottom-page {
                padding: 0 !important;
            }

            /* 隐藏原生 Jellyfin 歌词，防止切换时闪现 */
            .lyricsContainer > .lyricsLine {
                opacity: 0 !important;
                transition: none !important;
            }

            /* 淡入动画 - 新歌词加载时 */
            @keyframes amll-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .amll-lyric-line {
                animation: amll-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
            }

            /* 为不同行设置延迟，创建级联效果 */
            .amll-lyric-line:nth-child(1) { animation-delay: 0.00s; }
            .amll-lyric-line:nth-child(2) { animation-delay: 0.03s; }
            .amll-lyric-line:nth-child(3) { animation-delay: 0.06s; }
            .amll-lyric-line:nth-child(4) { animation-delay: 0.09s; }
            .amll-lyric-line:nth-child(5) { animation-delay: 0.12s; }
            .amll-lyric-line:nth-child(n+6) { animation-delay: 0.15s; }
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

    // 平滑滚动函数 - 使用 cubic-bezier 缓动
    function smoothScrollTo(element, targetScrollTop, duration) {
        duration = duration || AMLL_CONFIG.ScrollDuration;
        const startScrollTop = element.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        const startTime = performance.now();
        
        // 更柔和的缓动函数: cubic-bezier(0.25, 0.46, 0.45, 0.94)
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        
        function animation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = easeOutCubic(progress);
            
            element.scrollTop = startScrollTop + (distance * easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }
        
        requestAnimationFrame(animation);
    }

    // 更新活跃歌词
    function updateActiveLyric(scrollContainer, index) {
        const cfg = AMLL_CONFIG;
        const gradientRange = cfg.GradientBlurRange;
        
        // 移除所有高亮和渐变类
        const allLines = scrollContainer.querySelectorAll('.amll-lyric-line');
        allLines.forEach((line, i) => {
            line.classList.remove('active', 'gradient-blur-1', 'gradient-blur-2', 'gradient-blur-3');
            
            // 计算距离当前活跃歌词的距离
            const lineIndex = parseInt(line.getAttribute('data-index'));
            const distance = Math.abs(lineIndex - index);
            
            // 应用渐变模糊效果
            if (distance > 0 && distance <= gradientRange) {
                if (distance <= Math.min(gradientRange, 3)) {
                    line.classList.add(`gradient-blur-${distance}`);
                    debugLog(`Applied gradient-blur-${distance} to line ${lineIndex}`);
                }
            }
        });

        // 高亮当前行
        const currentLine = scrollContainer.querySelector(`.amll-lyric-line[data-index="${index}"]`);
        if (currentLine) {
            currentLine.classList.add('active');
            debugLog('Active lyric:', currentLine.textContent);

            // 使用 requestAnimationFrame 确保 DOM 已更新
            requestAnimationFrame(() => {
                // 计算当前歌词相对于滚动容器的位置
                const containerRect = scrollContainer.getBoundingClientRect();
                const lineRect = currentLine.getBoundingClientRect();
                const lineTopRelative = lineRect.top - containerRect.top + scrollContainer.scrollTop;
                
                // 将歌词滚动到屏幕上方35%的位置 (AMLL默认)
                // containerRect.height * 0.35 = 从顶部35%的位置
                const targetPosition = containerRect.height * 0.35;
                const scrollTo = lineTopRelative - targetPosition + (lineRect.height / 2);
                
                console.log('[AMLL] Scroll:', {
                    lineTop: lineTopRelative,
                    scrollTo: scrollTo,
                    targetPosition: targetPosition,
                    containerHeight: containerRect.height,
                    currentScrollTop: scrollContainer.scrollTop
                });
                
                // 使用更平滑的自定义滚动动画 (使用配置的滚动时长)
                smoothScrollTo(scrollContainer, Math.max(0, scrollTo), AMLL_CONFIG.ScrollDuration);
            });
        }
    }

    // 跳转到指定时间
    function seekToTime(ticks) {
        try {
            console.log('[AMLL] Seeking to time:', ticks, 'ticks (', (ticks / 10000000).toFixed(2), 's)');
            
            // 方法1: 使用 playbackManager
            if (!playbackManagerRef) {
                playbackManagerRef = tryGetPlaybackManager();
            }
            
            if (playbackManagerRef && typeof playbackManagerRef.seek === 'function') {
                const positionTicks = ticks;
                playbackManagerRef.seek(positionTicks);
                console.log('[AMLL] Seeked via playbackManager');
                return;
            }
            
            // 方法2: 直接操作 HTML5 媒体元素
            const mediaElement = document.querySelector('audio, video');
            if (mediaElement) {
                const seconds = ticks / 10000000;
                mediaElement.currentTime = seconds;
                console.log('[AMLL] Seeked via media element to', seconds, 's');
                return;
            }
            
            console.warn('[AMLL] Unable to seek: no playback manager or media element found');
        } catch (error) {
            console.error('[AMLL] Error seeking:', error);
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
    async function init() {
        console.log('[AMLL] Initializing...');
        console.log('[AMLL] Current URL:', window.location.href);
        console.log('[AMLL] Current hash:', window.location.hash);
        
        // 加载配置
        await loadConfig();
        
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
                lastInterceptedContainer = null;
            }
            
            checkForLyricsPage();
        });
        
        // 方法2: 使用 MutationObserver 监听 DOM 变化（Jellyfin 使用 SPA 架构）
        const observer = new MutationObserver((mutations) => {
            debugLog('MutationObserver triggered, mutations count:', mutations.length);
            
            for (const mutation of mutations) {
                debugLog('Mutation type:', mutation.type, 'target:', mutation.target.tagName, mutation.target.className);
                
                if (mutation.type === 'childList') {
                    debugLog('ChildList mutation - added:', mutation.addedNodes.length, 'removed:', mutation.removedNodes.length);
                    
                    // 检查是否添加了歌词页面
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue; // 只处理元素节点
                        
                        debugLog('Added node:', node.tagName, node.id, node.className);
                        
                        if (node.id === 'lyricPage' || (node.querySelector && node.querySelector('#lyricPage'))) {
                            console.log('[AMLL] Lyrics page detected via MutationObserver!');
                            checkForLyricsPage();
                            return;
                        }
                        
                        // 检查是否添加了新的歌词容器（歌曲切换）
                        if (node.classList && node.classList.contains('lyricsContainer')) {
                            console.log('[AMLL] New lyrics container detected via MutationObserver (song changed)!');
                            debugLog('Container element:', node);
                            // 重置拦截标志，允许重新拦截
                            isIntercepting = false;
                            lastInterceptedContainer = null;
                            checkForLyricsPage();
                            return;
                        }
                        
                        // 检查添加的节点内部是否包含新的歌词容器
                        if (node.querySelector && node.querySelector('.lyricsContainer')) {
                            console.log('[AMLL] New lyrics container detected in added node (song changed)!');
                            const container = node.querySelector('.lyricsContainer');
                            debugLog('Container found in node:', container);
                            isIntercepting = false;
                            lastInterceptedContainer = null;
                            checkForLyricsPage();
                            return;
                        }
                    }
                    
                    // 检查是否移除了歌词容器或我们的 AMLL 容器
                    for (const node of mutation.removedNodes) {
                        if (node.nodeType !== 1) continue;
                        
                        debugLog('Removed node:', node.tagName, node.id, node.className);
                        
                        // 检测到我们的 AMLL 容器被移除（歌曲切换！）
                        if (node.classList && node.classList.contains('amll-lyrics-container')) {
                            console.log('[AMLL] ⚠️ Our AMLL container was removed by Jellyfin (song changed)! Re-intercepting...');
                            debugLog('Removed AMLL container:', node);
                            // 重置状态并立即重新拦截
                            isIntercepting = false;
                            lastInterceptedContainer = null;
                            // 延迟一点让 Jellyfin 先加载原生歌词
                            setTimeout(() => {
                                console.log('[AMLL] Re-intercepting after song change...');
                                checkForLyricsPage();
                            }, 100);
                            return;
                        }
                        
                        if (node.classList && node.classList.contains('lyricsContainer')) {
                            console.log('[AMLL] Lyrics container removed (preparing for song change?)');
                            debugLog('Removed container:', node);
                            // 容器被移除，重置状态
                            isIntercepting = false;
                            lastInterceptedContainer = null;
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
