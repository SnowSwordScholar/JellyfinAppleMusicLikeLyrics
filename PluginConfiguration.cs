using MediaBrowser.Model.Plugins;

namespace JellyfinAppleLyrics;

/// <summary>
/// 插件配置类
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// 是否启用Apple Music风格歌词
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 是否启用动态背景模糊效果
    /// </summary>
    public bool EnableBackgroundBlur { get; set; } = true;

    /// <summary>
    /// 背景模糊程度 (0-100)
    /// </summary>
    public int BlurAmount { get; set; } = 30;

    /// <summary>
    /// 是否启用动态混色效果
    /// </summary>
    public bool EnableDynamicBlending { get; set; } = true;

    /// <summary>
    /// 歌词字体大小 (10-100)
    /// </summary>
    public int FontSize { get; set; } = 32;

    /// <summary>
    /// 是否启用自动获取歌词
    /// </summary>
    public bool EnableAutoFetch { get; set; } = true;
}
