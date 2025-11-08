using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JellyfinAppleLyrics;

/// <summary>
/// 苹果音乐歌词服务
/// 负责插件的初始化和JS注入配置
/// </summary>
public class AppleLyricsService : IHostedService, IDisposable
{
    private readonly ILogger<AppleLyricsService> _logger;
    private readonly IApplicationPaths _applicationPaths;
    private bool _disposed = false;

    /// <summary>
    /// 构造函数
    /// </summary>
    public AppleLyricsService(
        ILogger<AppleLyricsService> logger,
        IApplicationPaths applicationPaths)
    {
        _logger = logger;
        _applicationPaths = applicationPaths;
    }

    /// <summary>
    /// 服务启动时调用
    /// </summary>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("[AppleMusic] Service starting...");

        try
        {
            // 执行初始化逻辑
            InitializePlugin();
            _logger.LogInformation("[AppleMusic] Service started successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AppleMusic] Error starting service");
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// 服务停止时调用
    /// </summary>
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("[AppleMusic] Service stopping...");
        return Task.CompletedTask;
    }

    /// <summary>
    /// 初始化插件
    /// </summary>
    private void InitializePlugin()
    {
        if (Plugin.Instance == null)
        {
            _logger.LogWarning("[AppleMusic] Plugin instance not found");
            return;
        }

        var config = Plugin.Instance.Configuration;
        _logger.LogInformation($"[AppleMusic] Plugin initialized with config:");
        _logger.LogInformation($"  - Enabled: {config.IsEnabled}");
        _logger.LogInformation($"  - Debug Mode: {config.EnableDebugMode}");
        _logger.LogInformation($"  - Font Landscape: {config.FontSizeLandscape}px");
        _logger.LogInformation($"  - Font Portrait: {config.FontSizePortrait}px");
        _logger.LogInformation($"  - Background Blur: {config.BackgroundBlur}px");
        _logger.LogInformation($"  - Background Brightness: {config.BackgroundBrightness}");
    }

    /// <summary>
    /// 释放资源
    /// </summary>
    public void Dispose()
    {
        if (!_disposed)
        {
            _logger.LogInformation("[AppleMusic] Service disposed");
            _disposed = true;
        }

        GC.SuppressFinalize(this);
    }
}
