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
- 通过配置页面启用/禁用各项功能
- 可调整的 UI 参数（字体大小、模糊程度等）
- 自动获取歌词选项

🔧 **易于集成**
- 基于标准 Jellyfin 插件框架
- REST API 端点供前端调用
- 支持多种歌词格式（可扩展）

## 系统要求

- Jellyfin 10.11.2 或更高版本
- .NET 8.0 或更高版本（用于编译）
- 现代浏览器（支持 Web API）

## 安装

### 从源代码编译

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/JellyfinAppleLyrics.git
   cd JellyfinAppleLyrics
   ```

2. **安装依赖**
   ```bash
   # 确保安装了 .NET 8.0 SDK
   dotnet restore
   ```

3. **编译项目**
   ```bash
   dotnet build --configuration Release
   ```

4. **输出 DLL**
   ```bash
   dotnet publish --configuration Release --output ./bin/Release/publish
   ```

5. **安装到 Jellyfin**
   ```bash
   # 复制 DLL 到 Jellyfin 插件目录
   # 在 Linux 上（示例）：
   cp bin/Release/publish/JellyfinAppleLyrics.dll /var/lib/jellyfin/plugins/AppleMusic/
   
   # 重启 Jellyfin 服务
   sudo systemctl restart jellyfin
   ```

## 使用方法

1. **启用插件**
   - 在 Jellyfin 控制面板 -> 管理员设置 -> 插件中启用 "Apple Music Lyrics"

2. **配置设置**
   - 访问插件配置页面调整参数
   - 启用/禁用背景模糊、色彩混合等效果
   - 调整字体大小和其他视觉参数

3. **播放音乐**
   - 在"Now Playing"视图中欣赏 Apple Music 风格的歌词显示

## 技术架构

### 后端（C#/.NET）
- `Plugin.cs` - 主插件类，定义基本信息
- `PluginConfiguration.cs` - 配置模型
- `AppleLyricsController.cs` - 静态资源和 API 端点
- `AppleLyricsService.cs` - 后台服务
- `LyricsScriptInjectionMiddleware.cs` - 脚本注入中间件

### 前端（JavaScript）
- `init.js` - 初始化脚本，加载和启动歌词组件
- `ConfigPage.html` - 配置页面 UI
- `amll-core.js` - Apple Music Like Lyrics 库核心
- `amll-core.css` - 样式表
- `amll-react.js` - React 集成

## API 端点

### 静态资源
- `GET /applelyrics/core.js` - 核心 JavaScript
- `GET /applelyrics/core.css` - 样式表
- `GET /applelyrics/react.js` - React 集成
- `GET /applelyrics/init.js` - 初始化脚本

### 配置 API
- `GET /applelyrics/config` - 获取配置
- `POST /applelyrics/config` - 保存配置

### 数据 API
- `GET /applelyrics/lyrics/{itemId}` - 获取歌词
- `GET /applelyrics/album-info/{itemId}` - 获取专辑信息

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `IsEnabled` | bool | true | 启用插件 |
| `EnableBackgroundBlur` | bool | true | 启用背景模糊 |
| `BlurAmount` | int | 30 | 模糊程度（0-100） |
| `EnableDynamicBlending` | bool | true | 启用动态色彩混合 |
| `FontSize` | int | 32 | 歌词字体大小（10-100） |
| `EnableAutoFetch` | bool | true | 自动获取歌词 |

## 扩展和自定义

### 集成第三方歌词源

修改 `AppleLyricsController.cs` 中的 `GetLyrics` 方法，集成你的歌词源：

```csharp
[HttpGet("lyrics/{itemId}")]
public async Task<ActionResult> GetLyrics(string itemId, string? format = "lrc")
{
    // 从第三方 API 获取歌词
    var lyrics = await FetchLyricsFromThirdParty(itemId);
    return Ok(lyrics);
}
```

### 自定义 UI 样式

编辑 `Resources/web/init.js` 中的样式定义，或者创建自己的 CSS 文件并通过 API 加载。

## 故障排除

### 插件未加载
- 检查 Jellyfin 日志：`/var/log/jellyfin/`
- 确保 DLL 位于正确的插件目录
- 验证 Jellyfin 版本兼容性

### 歌词不显示
- 检查浏览器控制台是否有错误（F12 -> Console）
- 验证 `/applelyrics/` 端点是否可访问
- 确认歌词数据源配置正确

### 背景效果不工作
- 检查是否启用了背景模糊选项
- 验证专辑封面是否正确加载
- 查看浏览器开发者工具中的网络请求

## 项目结构

```
JellyfinAppleLyrics/
├── Plugin.cs                              # 主插件类
├── PluginConfiguration.cs                 # 配置模型
├── AppleLyricsController.cs               # API 控制器
├── AppleLyricsService.cs                  # 后台服务
├── LyricsScriptInjectionMiddleware.cs     # 脚本注入中间件
├── ConfigurationPageProvider.cs           # 配置页面提供程序
├── ServiceCollectionExtensions.cs         # 依赖注入扩展
├── JellyfinAppleLyrics.csproj             # 项目文件
├── Resources/
│   └── web/
│       ├── init.js                        # 初始化脚本
│       ├── ConfigPage.html                # 配置页面
│       ├── amll-core.js                   # Apple Music Lyrics 库
│       ├── amll-core.css                  # 样式表
│       └── ...（其他资源文件）
├── bin/                                    # 构建输出
├── obj/                                    # 编译中间文件
└── README.md                               # 本文件
```

## 许可证

本项目采用 GPLv3 许可证。请参阅 `LICENSE` 文件了解详情。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- 感谢 [Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) 项目提供的核心库
- 感谢 Jellyfin 社区的支持和指导

## 相关资源

- [Jellyfin 插件文档](https://docs.jellyfin.org/general/plugins/index.html)
- [Jellyfin API 文档](https://api.jellyfin.org/)
- [Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)

---

**注意**：这是一个社区项目，不隶属于 Jellyfin 官方或 Apple Inc.
