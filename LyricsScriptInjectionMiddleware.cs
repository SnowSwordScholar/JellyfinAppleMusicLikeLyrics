using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace JellyfinAppleLyrics;

/// <summary>
/// 歌词脚本注入中间件
/// 将初始化脚本注入到web页面中
/// </summary>
public class LyricsScriptInjectionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<LyricsScriptInjectionMiddleware> _logger;
    private readonly string _injectionScript;

    /// <summary>
    /// 构造函数
    /// </summary>
    public LyricsScriptInjectionMiddleware(
        RequestDelegate next,
        ILogger<LyricsScriptInjectionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _injectionScript = BuildInjectionScript();
    }

    /// <summary>
    /// 处理请求
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        // 只处理web客户端请求
        var path = context.Request.Path.Value?.ToLower() ?? "";
        
        if (ShouldInject(path))
        {
            try
            {
                // 检查配置是否启用
                if (Plugin.Instance?.Configuration.IsEnabled != true)
                {
                    await _next(context);
                    return;
                }

                // 包装响应流
                var originalBody = context.Response.Body;
                using var memoryStream = new MemoryStream();
                
                context.Response.Body = memoryStream;

                try
                {
                    await _next(context);

                    // 检查是否是HTML响应
                    if (context.Response.ContentType?.Contains("text/html") == true)
                    {
                        memoryStream.Seek(0, SeekOrigin.Begin);
                        using var reader = new StreamReader(memoryStream);
                        var html = await reader.ReadToEndAsync();

                        // 注入脚本
                        if (html.Contains("</head>"))
                        {
                            html = html.Replace("</head>", $"{_injectionScript}</head>");
                        }
                        else if (html.Contains("<body"))
                        {
                            html = html.Replace("<body>", $"<body>{_injectionScript}");
                        }

                        // 写入修改后的响应
                        memoryStream.SetLength(0);
                        using var writer = new StreamWriter(memoryStream, Encoding.UTF8, -1, true);
                        await writer.WriteAsync(html);
                        await writer.FlushAsync();
                    }

                    // 复制到原始响应
                    memoryStream.Seek(0, SeekOrigin.Begin);
                    await memoryStream.CopyToAsync(originalBody);
                }
                finally
                {
                    context.Response.Body = originalBody;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AppleMusic] Error injecting script");
                await _next(context);
            }
        }
        else
        {
            await _next(context);
        }
    }

    /// <summary>
    /// 判断是否应该注入脚本
    /// </summary>
    private static bool ShouldInject(string path)
    {
        // 只在web客户端和特定路径注入
        var injectPaths = new[]
        {
            "/",
            "/index.html",
            "/web",
            "/web/index.html",
            "/web/nowplaying"
        };

        foreach (var injectPath in injectPaths)
        {
            if (path.StartsWith(injectPath, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// 构建注入脚本
    /// </summary>
    private static string BuildInjectionScript()
    {
        return @"
    <script>
        (function() {
            console.log('[AppleMusic] Script injection initialized');
            
            // 加载初始化脚本
            const script = document.createElement('script');
            script.src = '/applelyrics/init.js?v=' + Date.now();
            script.async = true;
            script.onerror = function() {
                console.error('[AppleMusic] Failed to load init script');
            };
            document.head.appendChild(script);
        })();
    </script>
";
    }
}
