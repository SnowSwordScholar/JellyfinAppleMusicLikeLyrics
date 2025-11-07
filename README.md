# Jellyfin Apple Music Lyrics Plugin

在 Jellyfin 网页客户端的 "Now Playing" 视图中实现类似 Apple Music 的歌词显示和动态背景效果。

## 功能特性

✨ **Apple Music 风格歌词显示**
- 优雅的歌词渲染，支持自定义字体大小
- 实时同步播放进度

🎨 **动态背景效果**
- 基于专辑封面的高斯模糊背景
- 自动色彩混合，创建和谐的视觉效果
- 可调整的模糊程度（0-100px）

⚙️ **灵活配置**
- 通过 Web UI 启用/禁用各项功能
- 可调整的参数（字体大小、模糊程度等）
- 本地存储配置

## 系统要求

- Jellyfin 10.10.0+
- .NET 8.0+（用于编译）
- 现代浏览器

## 快速开始

### 编译

```bash
cd JellyfinAppleLyrics
dotnet restore
dotnet build --configuration Release
```

### 安装

#### Linux/macOS

```bash
sudo mkdir -p /var/lib/jellyfin/plugins/AppleMusic
sudo cp bin/Release/net8.0/JellyfinAppleLyrics.dll /var/lib/jellyfin/plugins/AppleMusic/
sudo chown jellyfin:jellyfin /var/lib/jellyfin/plugins/AppleMusic/JellyfinAppleLyrics.dll
sudo systemctl restart jellyfin
```

#### Windows

```powershell
New-Item -ItemType Directory "C:\ProgramData\Jellyfin\data\plugins\AppleMusic" -Force
Copy-Item "bin\Release\net8.0\JellyfinAppleLyrics.dll" "C:\ProgramData\Jellyfin\data\plugins\AppleMusic\"
Restart-Service JellyfinServer
```

#### Docker

```bash
docker cp bin/Release/net8.0/JellyfinAppleLyrics.dll <container_id>:/var/lib/jellyfin/plugins/AppleMusic/
docker restart <container_id>
```

## 使用

1. 启用插件（Jellyfin 管理面板 -> 插件）
2. 播放音乐时自动在 Now Playing 视图显示效果
3. 在浏览器开发者工具 (F12) 的 Console 中查看调试信息

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/applelyrics/core.js` | GET | 核心 JavaScript |
| `/applelyrics/core.css` | GET | 样式表 |
| `/applelyrics/init.js` | GET | 初始化脚本 |
| `/applelyrics/config` | GET/POST | 获取/保存配置 |
| `/applelyrics/lyrics/{itemId}` | GET | 获取歌词数据 |
| `/applelyrics/album-info/{itemId}` | GET | 获取专辑信息 |

## 配置选项

在 Jellyfin 插件配置页面中调整：

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `IsEnabled` | bool | true | 启用插件 |
| `EnableBackgroundBlur` | bool | true | 启用背景模糊 |
| `BlurAmount` | int | 30 | 模糊程度（0-100） |
| `EnableDynamicBlending` | bool | true | 启用动态色彩混合 |
| `FontSize` | int | 32 | 歌词字体大小（10-100） |
| `EnableAutoFetch` | bool | true | 自动获取歌词 |

## 开发

### 项目结构

```
JellyfinAppleLyrics/
├── Plugin.cs                      # 主插件类
├── PluginConfiguration.cs         # 配置模型
├── AppleLyricsController.cs       # API 控制器
├── AppleLyricsService.cs          # 后台服务
├── ServiceCollectionExtensions.cs # DI 扩展
├── JellyfinAppleLyrics.csproj     # 项目文件
├── Resources/web/
│   ├── init.js                    # 初始化脚本
│   ├── injector.js                # 注入脚本
│   ├── ConfigPage.html            # 配置页面
│   ├── amll-core.js               # Apple Music Lyrics 库
│   └── amll-core.css              # 样式表
└── bin/Release/                   # 编译输出
```

### 调试

1. 查看浏览器控制台（F12）中的 `[AppleMusic]` 前缀日志
2. 检查 Jellyfin 日志：`/var/log/jellyfin/jellyfin.log`
3. 验证 API 端点：`curl http://localhost:8096/applelyrics/config`

### 扩展

修改 `AppleLyricsController.cs` 中的 `GetLyrics` 方法来集成第三方歌词源：

```csharp
[HttpGet("lyrics/{itemId}")]
public async Task<ActionResult> GetLyrics(string itemId)
{
    // 从第三方 API 或数据库获取歌词
    var lyrics = await FetchLyrics(itemId);
    return Ok(lyrics);
}
```

## 故障排除

### 插件未加载

- 检查 Jellyfin 日志：`tail -f /var/log/jellyfin/jellyfin.log | grep -i apple`
- 确保 DLL 在正确的插件目录
- 验证文件权限

### 歌词不显示

- 打开浏览器开发者工具（F12）检查 Console 错误
- 验证 `/applelyrics/init.js` 能否访问
- 检查浏览器控制台的 `[AppleMusic]` 前缀日志

### 配置页面卡顿

- 清除浏览器缓存
- 检查网络请求（F12 -> Network 标签）
- 查看 `/applelyrics/config` 端点的响应

## 许可证

GPLv3 - 参见 LICENSE 文件

## 致谢

- [Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) - 核心库
- [Jellyfin](https://jellyfin.org/) - 项目平台

## 支持

- 🐛 报告 Bug：提交 Issue
- 💡 提交功能建议：讨论区
- 🤝 贡献代码：Pull Request

---

**注意**：这是一个社区项目，不隶属于 Jellyfin 官方或 Apple Inc.

