using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace JellyfinAppleLyrics;

/// <summary>
/// Apple Lyrics 静态资源服务器
/// 负责提供JS、CSS、WASM文件和歌词数据
/// </summary>
[Route("applelyrics")]
[ApiController]
[AllowAnonymous]
public class AppleLyricsController : ControllerBase
{
    /// <summary>
    /// 获取核心JavaScript文件
    /// </summary>
    [HttpGet("core.js")]
    public ActionResult GetCoreJs()
    {
        return ServeEmbeddedResource("amll-core.js", "application/javascript");
    }

    /// <summary>
    /// 获取核心CSS文件
    /// </summary>
    [HttpGet("core.css")]
    public ActionResult GetCoreCss()
    {
        return ServeEmbeddedResource("amll-core.css", "text/css");
    }

    /// <summary>
    /// 获取React集成文件
    /// </summary>
    [HttpGet("react.js")]
    public ActionResult GetReactJs()
    {
        return ServeEmbeddedResource("amll-react.js", "application/javascript");
    }

    /// <summary>
    /// 获取初始化脚本 (旧版，保留兼容)
    /// </summary>
    [HttpGet("init.js")]
    public ActionResult GetInitJs()
    {
        var content = GetEmbeddedResourceContent("init.js");
        if (content == null)
        {
            return NotFound("init.js not found");
        }
        return Content(content, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// 获取AMLL歌词拦截脚本（新版）
    /// </summary>
    [HttpGet("lyrics-amll.js")]
    public ActionResult GetLyricsAmllJs()
    {
        var content = GetEmbeddedResourceContent("lyrics-amll.js");
        if (content == null)
        {
            return NotFound("lyrics-amll.js not found");
        }
        return Content(content, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// 获取注入脚本（用于页面注入）
    /// </summary>
    [HttpGet("inject.js")]
    public ActionResult GetInjectJs()
    {
        var content = GetEmbeddedResourceContent("injector.js");
        if (content == null)
        {
            return NotFound("injector.js not found");
        }
        return Content(content, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// 获取注入脚本（用于页面注入）
    /// </summary>
    [HttpGet("inject-direct.js")]
    public ActionResult GetInjectDirectJs()
    {
        var script = @"
(function() {
    console.log('[AppleMusic] Direct injection...');
    var script = document.createElement('script');
    script.src = '/applelyrics/init.js?v=' + Date.now();
    script.async = true;
    script.onerror = function() {
        console.error('[AppleMusic] Failed to load init script');
    };
    document.head.appendChild(script);
})();
";
        return Content(script, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// 获取后台渲染WASM模块
    /// </summary>
    [HttpGet("bg-render.wasm")]
    public ActionResult GetBgRenderWasm()
    {
        return ServeEmbeddedResource("bg-render.wasm", "application/wasm");
    }

    /// <summary>
    /// 获取后台渲染JavaScript文件
    /// </summary>
    [HttpGet("bg-render.js")]
    public ActionResult GetBgRenderJs()
    {
        return ServeEmbeddedResource("bg-render.js", "application/javascript");
    }

    /// <summary>
    /// 获取配置信息 / Get Configuration
    /// </summary>
    [HttpGet("config")]
    public ActionResult GetConfig()
    {
        try
        {
            if (Plugin.Instance == null)
            {
                return BadRequest("Plugin not initialized");
            }

            var config = Plugin.Instance.Configuration;
            return Ok(new
            {
                // 基础设置
                config.IsEnabled,
                config.EnableDebugMode,
                
                // 字体设置
                config.FontSizeLandscape,
                config.FontSizePortrait,
                config.ActiveFontSizeLandscape,
                config.ActiveFontSizePortrait,
                
                // 背景设置
                config.BackgroundBlur,
                config.BackgroundBrightness,
                
                // 非活跃歌词设置
                config.InactiveBrightness,
                config.InactiveOpacity,
                config.InactiveShadowIntensity,
                config.InactiveBlur,
                
                // 活跃歌词设置
                config.ActiveBrightness,
                config.ActiveOpacity,
                config.ActiveGlowIntensity,
                config.ActiveShadowIntensity,
                config.ActiveBlur,
                
                // 渐变模糊设置
                config.EnableGradientBlur,
                config.GradientBlurAmount,
                
                // 动画设置
                config.ScrollDuration,
                config.SpringSpeed,
                config.TransformDuration,
                config.ScrollPositionLandscape,
                config.ScrollPositionPortrait,
                
                // 其他设置
                config.EnableAutoFetch
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error getting config: {ex.Message}");
        }
    }

    /// <summary>
    /// 设置配置信息
    /// </summary>
    [HttpPost("config")]
    public ActionResult SaveConfig([FromBody] PluginConfiguration config)
    {
        try
        {
            if (Plugin.Instance == null)
            {
                return BadRequest("Plugin not initialized");
            }

            // 更新配置
            Plugin.Instance.UpdateConfiguration(config);
            
            return Ok(new { message = "Configuration saved successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error saving config: {ex.Message}");
        }
    }

    /// <summary>
    /// 获取歌词数据
    /// 可以扩展为支持多个歌词源
    /// </summary>
    [HttpGet("lyrics/{itemId}")]
    public ActionResult GetLyrics(string itemId, [FromQuery] string? format = "lrc")
    {
        try
        {
            // 这是一个占位符，实际实现需要集成Jellyfin API
            // 从Jellyfin数据库或第三方服务获取歌词
            return Ok(new
            {
                itemId,
                format,
                lyrics = new List<object>(),
                message = "Lyrics endpoint ready for integration"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error fetching lyrics: {ex.Message}");
        }
    }

    /// <summary>
    /// 获取专辑信息用于背景渲染
    /// </summary>
    [HttpGet("album-info/{itemId}")]
    public ActionResult GetAlbumInfo(string itemId)
    {
        try
        {
            // 这是一个占位符，实际实现需要集成Jellyfin API
            // 获取专辑封面、主色调等信息
            return Ok(new
            {
                itemId,
                coverUrl = "",
                dominantColor = "#1DB954",
                title = "",
                artist = "",
                message = "Album info endpoint ready for integration"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error fetching album info: {ex.Message}");
        }
    }

    /// <summary>
    /// 从嵌入资源中获取文件
    /// </summary>
    private ActionResult ServeEmbeddedResource(string fileName, string contentType)
    {
        try
        {
            var assembly = typeof(Plugin).Assembly;
            var resourcePath = $"JellyfinAppleLyrics.Resources.web.{fileName.Replace("/", ".")}";

            using var stream = assembly.GetManifestResourceStream(resourcePath);
            if (stream == null)
            {
                return NotFound($"Resource not found: {resourcePath}");
            }

            var bytes = new byte[stream.Length];
            stream.Read(bytes, 0, bytes.Length);

            return File(bytes, contentType);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error serving resource: {ex.Message}");
        }
    }

    /// <summary>
    /// 从嵌入资源中获取内容为字符串
    /// </summary>
    private string? GetEmbeddedResourceContent(string fileName)
    {
        try
        {
            var assembly = typeof(Plugin).Assembly;
            var resourcePath = $"JellyfinAppleLyrics.Resources.web.{fileName.Replace("/", ".")}";

            using var stream = assembly.GetManifestResourceStream(resourcePath);
            if (stream == null)
            {
                Console.WriteLine($"[AppleMusic] Resource not found: {resourcePath}");
                return null;
            }

            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AppleMusic] Error reading resource: {ex.Message}");
            return null;
        }
    }
}
