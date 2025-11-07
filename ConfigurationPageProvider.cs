using System;

namespace JellyfinAppleLyrics;

/// <summary>
/// 插件配置页面提供程序
/// 存储配置页面的元数据
/// </summary>
public class ConfigurationPageProvider
{
    /// <summary>
    /// 获取插件配置页面名称
    /// </summary>
    public string Name => "Apple Music Lyrics";

    /// <summary>
    /// 获取配置页面路径
    /// </summary>
    public string EmbeddedResourcePath => "JellyfinAppleLyrics.Resources.web.ConfigPage.html";

    /// <summary>
    /// 获取插件ID
    /// </summary>
    public Guid PluginId => Plugin.Instance?.Id ?? Guid.Empty;
}
