using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;

namespace JellyfinAppleLyrics;

/// <summary>
/// Jellyfin Apple Music Lyrics 插件
/// 实现类似Apple Music的歌词显示和动态背景效果
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>
{
    /// <summary>
    /// 插件实例
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// 插件的唯一标识符
    /// </summary>
    public override Guid Id => new Guid("a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6");

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
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }
}
