/**
 * Apple Music Lyrics - Web 注入脚本
 * 直接注入到 Jellyfin web 页面中
 */

// 立即执行，不等待DOM
console.log('[AppleMusic] Web injector loaded');

// 在页面加载完成时添加初始化脚本
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[AppleMusic] DOM ready, injecting init script');
        injectInitScript();
    });
} else {
    console.log('[AppleMusic] DOM already ready, injecting init script');
    injectInitScript();
}

function injectInitScript() {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '/applelyrics/init.js?v=' + Date.now();
    script.async = true;
    script.onload = function() {
        console.log('[AppleMusic] Init script injected successfully');
    };
    script.onerror = function() {
        console.error('[AppleMusic] Failed to load init script');
    };
    document.head.appendChild(script);
}
