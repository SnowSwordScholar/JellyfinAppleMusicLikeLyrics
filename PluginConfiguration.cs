using MediaBrowser.Model.Plugins;

namespace JellyfinAppleLyrics;

/// <summary>
/// 插件配置类 / Plugin Configuration
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// 是否启用Apple Music风格歌词 / Enable Apple Music-style Lyrics
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    // ==================== 字体设置 / Font Settings ====================
    
    /// <summary>
    /// 横屏字体大小(桌面) / Landscape Font Size (Desktop) (px)
    /// </summary>
    public int FontSizeLandscape { get; set; } = 32;

    /// <summary>
    /// 竖屏字体大小(移动端) / Portrait Font Size (Mobile) (px)
    /// </summary>
    public int FontSizePortrait { get; set; } = 24;

    /// <summary>
    /// 横屏活跃歌词字体大小 / Landscape Active Font Size (px)
    /// </summary>
    public int ActiveFontSizeLandscape { get; set; } = 48;

    /// <summary>
    /// 竖屏活跃歌词字体大小 / Portrait Active Font Size (px)
    /// </summary>
    public int ActiveFontSizePortrait { get; set; } = 36;

    // ==================== 背景设置 / Background Settings ====================
    
    /// <summary>
    /// 背景模糊程度 / Background Blur Amount (px, 0-100)
    /// </summary>
    public int BackgroundBlur { get; set; } = 60;

    /// <summary>
    /// 背景亮度 / Background Brightness (0.0-2.0)
    /// </summary>
    public double BackgroundBrightness { get; set; } = 0.8;

    // ==================== 非活跃歌词设置 / Inactive Lyric Settings ====================
    
    /// <summary>
    /// 非活跃歌词亮度 / Inactive Lyric Brightness (0.0-2.0)
    /// </summary>
    public double InactiveBrightness { get; set; } = 0.85;

    /// <summary>
    /// 非活跃歌词透明度 / Inactive Lyric Opacity (0.0-1.0)
    /// </summary>
    public double InactiveOpacity { get; set; } = 0.65;

    /// <summary>
    /// 非活跃歌词阴影强度 / Inactive Lyric Shadow Intensity (0.0-1.0)
    /// </summary>
    public double InactiveShadowIntensity { get; set; } = 0.5;

    /// <summary>
    /// 非活跃歌词模糊程度 / Inactive Lyric Blur Amount (px, 0-10)
    /// </summary>
    public double InactiveBlur { get; set; } = 0.5;

    // ==================== 活跃歌词设置 / Active Lyric Settings ====================
    
    /// <summary>
    /// 活跃歌词亮度 / Active Lyric Brightness (0.0-2.0)
    /// </summary>
    public double ActiveBrightness { get; set; } = 1.15;

    /// <summary>
    /// 活跃歌词透明度 / Active Lyric Opacity (0.0-1.0)
    /// </summary>
    public double ActiveOpacity { get; set; } = 1.0;

    /// <summary>
    /// 活跃歌词发光强度 / Active Lyric Glow Intensity (0.0-1.0)
    /// </summary>
    public double ActiveGlowIntensity { get; set; } = 0.2;

    /// <summary>
    /// 活跃歌词阴影强度 / Active Lyric Shadow Intensity (0.0-1.0)
    /// </summary>
    public double ActiveShadowIntensity { get; set; } = 0.15;

    /// <summary>
    /// 活跃歌词模糊程度 / Active Lyric Blur Amount (px, 0-10)
    /// </summary>
    public double ActiveBlur { get; set; } = 0.0;

    // ==================== 渐变模糊设置 / Gradient Blur Settings ====================
    
    /// <summary>
    /// 活跃歌词前后的渐变模糊程度 / Gradient Blur Around Active Lyric (0-10)
    /// </summary>
    public double GradientBlurAmount { get; set; } = 1.0;

    /// <summary>
    /// 渐变模糊影响范围(行数) / Gradient Blur Range (lines)
    /// </summary>
    public int GradientBlurRange { get; set; } = 3;

    // ==================== 动画设置 / Animation Settings ====================
    
    /// <summary>
    /// 滚动动画时长 / Scroll Animation Duration (ms)
    /// </summary>
    public int ScrollDuration { get; set; } = 1000;

    /// <summary>
    /// 弹簧动画速度系数 / Spring Animation Speed Factor (0.1-5.0)
    /// </summary>
    public double SpringSpeed { get; set; } = 1.0;

    /// <summary>
    /// Transform过渡时长 / Transform Transition Duration (ms)
    /// </summary>
    public int TransformDuration { get; set; } = 800;

    // ==================== 其他设置 / Other Settings ====================
    
    /// <summary>
    /// 是否启用自动获取歌词 / Enable Auto-fetch Lyrics
    /// </summary>
    public bool EnableAutoFetch { get; set; } = true;

    /// <summary>
    /// 是否启用调试模式 / Enable Debug Mode
    /// </summary>
    public bool EnableDebugMode { get; set; } = false;
}
