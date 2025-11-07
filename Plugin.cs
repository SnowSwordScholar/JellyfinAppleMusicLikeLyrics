using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using System.Reflection;
using Microsoft.Extensions.Logging;

namespace JellyfinAppleLyrics;

/// <summary>
/// Jellyfin Apple Music Lyrics 插件
/// 实现类似Apple Music的歌词显示和动态背景效果
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private readonly ILogger<Plugin> _logger;

    /// <summary>
    /// 插件实例
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// 插件的唯一标识符
    /// </summary>
    public override Guid Id => Guid.Parse("56AF82E5-609E-455D-A135-4B30A73333E5");

    /// <summary>
    /// 插件名称
    /// </summary>
    public override string Name => "Apple Music Lyrics";

    /// <summary>
    /// 插件描述
    /// </summary>
    public override string Description => "在Jellyfin的Now Playing视图中实现类似Apple Music的歌词显示效果，包括动态混色和模糊背景";

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="applicationPaths">应用程序路径</param>
    /// <param name="xmlSerializer">XML序列化器</param>
    /// <param name="logger">日志记录器</param>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer, ILogger<Plugin> logger)
        : base(applicationPaths, xmlSerializer)
    {
        _logger = logger;

        _logger.LogInformation("--- JellyfinAppleLyrics Plugin: Listing Embedded Resource Names ---");
        var resourceNames = Assembly.GetExecutingAssembly().GetManifestResourceNames();
        if (resourceNames.Length == 0)
        {
            _logger.LogWarning("No embedded resources found in the assembly.");
        }
        else
        {
            foreach (var name in resourceNames)
            {
                _logger.LogInformation("Found embedded resource: {Name}", name);
            }
        }
        _logger.LogInformation("-----------------------------------------------------------------");
        Instance = this;
    }

    /// <summary>
    /// 获取插件网页
    /// </summary>
    /// <returns>网页集合</returns>
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = this.Name,
                EmbeddedResourcePath = "JellyfinAppleLyrics.Resources.web.ConfigPage.html",
                EnableInMainMenu = true,
                MenuSection = "server",
                MenuIcon = "music_note",
                DisplayName = this.Name,
            }
        };
    }
}
