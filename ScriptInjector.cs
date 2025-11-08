using System;
using System.IO;
using System.Text.RegularExpressions;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace JellyfinAppleLyrics;

/// <summary>
/// 脚本注入工具类
/// 通过直接修改 index.html 文件来注入 JavaScript
/// </summary>
public class ScriptInjector
{
    private readonly IApplicationPaths _applicationPaths;
    private readonly ILogger<ScriptInjector> _logger;
    private const string PluginName = "Apple Music Lyrics";

    public ScriptInjector(IApplicationPaths applicationPaths, ILogger<ScriptInjector> logger)
    {
        _applicationPaths = applicationPaths;
        _logger = logger;
    }

    /// <summary>
    /// 获取 index.html 文件路径
    /// </summary>
    private string IndexHtmlPath => Path.Combine(_applicationPaths.WebPath, "index.html");

    /// <summary>
    /// 注入脚本到 index.html
    /// </summary>
    public void InjectScript()
    {
        UpdateIndexHtml(true);
    }

    /// <summary>
    /// 从 index.html 移除脚本
    /// </summary>
    public void RemoveScript()
    {
        UpdateIndexHtml(false);
    }

    /// <summary>
    /// 检查脚本是否已注入
    /// </summary>
    public bool IsScriptInjected()
    {
        try
        {
            var indexPath = IndexHtmlPath;
            if (!File.Exists(indexPath))
            {
                return false;
            }

            var content = File.ReadAllText(indexPath);
            var regex = new Regex($"<script[^>]*plugin=[\"']{PluginName}[\"'][^>]*src=[\"']../applelyrics/init.js[\"'][^>]*>");
            return regex.IsMatch(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if script is injected");
            return false;
        }
    }

    /// <summary>
    /// 更新 index.html 文件
    /// </summary>
    /// <param name="inject">true 表示注入脚本，false 表示移除脚本</param>
    private void UpdateIndexHtml(bool inject)
    {
        try
        {
            var indexPath = IndexHtmlPath;
            if (!File.Exists(indexPath))
            {
                _logger.LogError("Could not find index.html at path: {Path}", indexPath);
                return;
            }

            var content = File.ReadAllText(indexPath);
            // 使用新的 lyrics-amll.js 脚本
            var scriptUrl = "../applelyrics/lyrics-amll.js";
            var scriptTag = $"<script plugin=\"{PluginName}\" version=\"{Plugin.Instance?.Version}\" src=\"{scriptUrl}\" defer></script>";
            var regex = new Regex($"<script[^>]*plugin=[\"']{PluginName}[\"'][^>]*>\\s*</script>\\n?");

            // 首先移除任何旧版本的脚本标签
            content = regex.Replace(content, string.Empty);

            if (inject)
            {
                var closingBodyTag = "</body>";
                if (content.Contains(closingBodyTag))
                {
                    content = content.Replace(closingBodyTag, $"{scriptTag}\n{closingBodyTag}");
                    _logger.LogInformation("Successfully injected/updated the {PluginName} script (lyrics-amll.js).", PluginName);
                }
                else
                {
                    _logger.LogWarning("Could not find </body> tag in index.html. Script not injected.");
                    return;
                }
            }
            else
            {
                _logger.LogInformation("Successfully removed the {PluginName} script from index.html during uninstall.", PluginName);
            }

            File.WriteAllText(indexPath, content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while trying to update index.html");
        }
    }
}
