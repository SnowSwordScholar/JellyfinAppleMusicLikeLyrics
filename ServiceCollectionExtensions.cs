using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace JellyfinAppleLyrics;

/// <summary>
/// 服务注册扩展
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 注册AppleMusic Lyrics相关服务
    /// </summary>
    public static IServiceCollection AddAppleMusicLyrics(this IServiceCollection services)
    {
        // 注册后台服务
        services.AddHostedService<AppleLyricsService>();

        // 注册控制器
        services.AddScoped<AppleLyricsController>();

        // 注册配置页面提供程序
        services.AddSingleton<ConfigurationPageProvider>();

        return services;
    }
}
