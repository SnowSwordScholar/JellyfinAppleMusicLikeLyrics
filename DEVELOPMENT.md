# Jellyfin Apple Music Lyrics - 开发者指南

## 项目概述

这是一个为 Jellyfin 媒体服务器开发的插件，在 web 客户端的 "Now Playing" 视图中实现 Apple Music 风格的歌词显示和动态背景效果。

## 架构设计

### 系统框架

```
┌─────────────────────────────────────────────────────┐
│           浏览器 (Web 客户端)                         │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │  JavaScript 初始化脚本 (init.js)            │   │
│  │  - 加载Apple Music Like Lyrics库            │   │
│  │  - 监听Now Playing页面                     │   │
│  │  - 渲染歌词和背景                          │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  REST API 调用  (/applelyrics/*)                    │
├─────────────────────────────────────────────────────┤
│           Jellyfin 服务器 (.NET)                     │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │  AppleLyricsController                      │   │
│  │  - 提供 JS/CSS/WASM 资源                    │   │
│  │  - 配置 API 端点                            │   │
│  │  - 歌词数据 API                             │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  LyricsScriptInjectionMiddleware            │   │
│  │  - 拦截HTML响应                            │   │
│  │  - 注入初始化脚本                          │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  AppleLyricsService                         │   │
│  │  - 后台服务初始化                          │   │
│  │  - 配置管理                                 │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 项目结构

```
JellyfinAppleLyrics/
├── 后端代码
│   ├── Plugin.cs                    # 主插件类
│   ├── PluginConfiguration.cs       # 配置模型
│   ├── AppleLyricsController.cs     # API 控制器
│   ├── AppleLyricsService.cs        # 后台服务
│   ├── LyricsScriptInjectionMiddleware.cs  # 脚本注入中间件
│   ├── ConfigurationPageProvider.cs # 配置页面提供程序
│   └── ServiceCollectionExtensions.cs      # 依赖注入扩展
│
├── 前端代码
│   └── Resources/web/
│       ├── init.js                  # 初始化脚本
│       ├── ConfigPage.html          # 配置页面
│       ├── amll-core.js             # Apple Music Like Lyrics 核心库
│       ├── amll-core.css            # 样式表
│       ├── amll-react.js            # React 集成
│       └── 其他资源文件 (WASM, CSS 等)
│
├── 配置文件
│   ├── JellyfinAppleLyrics.csproj   # 项目文件
│   ├── .gitignore                   # Git 忽略文件
│
├── 文档
│   ├── README.md                    # 项目说明
│   ├── DEPLOYMENT.md                # 部署指南
│   ├── DEVELOPMENT.md               # 开发者指南（本文件）
│
├── 脚本
│   ├── install.sh                   # Linux/macOS 安装脚本
│   └── install.bat                  # Windows 安装脚本
│
└── 构建输出
    └── bin/Release/net8.0/          # 编译的DLL和依赖
```

## 核心模块详解

### 1. Plugin.cs - 主插件类

**职责**：
- 定义插件的基本信息（名称、ID、描述）
- 管理插件的生命周期
- 存储插件实例供全局访问

**关键代码**：
```csharp
public class Plugin : BasePlugin<PluginConfiguration>
{
    public static Plugin? Instance { get; private set; }
    public override Guid Id => new Guid("a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6");
    public override string Name => "Apple Music Lyrics";
}
```

### 2. PluginConfiguration.cs - 配置模型

**职责**：
- 定义可配置的参数
- 提供默认值
- 支持配置的序列化和反序列化

**可配置参数**：
- `IsEnabled` - 启用/禁用插件
- `EnableBackgroundBlur` - 启用背景模糊
- `BlurAmount` - 模糊程度(0-100)
- `EnableDynamicBlending` - 启用动态色彩混合
- `FontSize` - 歌词字体大小
- `EnableAutoFetch` - 自动获取歌词

### 3. AppleLyricsController.cs - API 控制器

**职责**：
- 提供静态资源（JS、CSS、WASM）
- 处理配置API请求
- 提供歌词和专辑信息端点

**关键端点**：
```
GET  /applelyrics/core.js           # 核心 JavaScript
GET  /applelyrics/core.css          # 样式表
GET  /applelyrics/init.js           # 初始化脚本
GET  /applelyrics/config            # 获取配置
POST /applelyrics/config            # 保存配置
GET  /applelyrics/lyrics/{itemId}   # 获取歌词
GET  /applelyrics/album-info/{itemId}  # 获取专辑信息
```

### 4. LyricsScriptInjectionMiddleware.cs - 脚本注入中间件

**职责**：
- 拦截HTML响应
- 在 `</head>` 之前注入初始化脚本
- 只在特定路径注入（web 客户端）

**工作流程**：
1. 接收 HTTP 请求
2. 检查响应内容类型是否为 HTML
3. 读取响应内容
4. 在 `</head>` 标签前插入脚本标签
5. 返回修改后的响应

### 5. init.js - 前端初始化脚本

**职责**：
- 加载 Apple Music Like Lyrics 库
- 监听 Now Playing 页面的出现
- 初始化歌词显示和背景效果
- 管理全局配置

**核心功能**：
- `loadScript()` - 异步加载JavaScript
- `loadStyle()` - 加载样式表
- `initLyricPlayer()` - 初始化歌词播放器
- `waitForNowPlayingPage()` - 等待页面就绪
- `setupNowPlayingLyrics()` - 设置歌词显示
- `updateBackgroundFromAlbum()` - 更新背景
- `extractDominantColor()` - 提取主色调

## 开发流程

### 构建项目

```bash
export PATH="/home/snow/.dotnet:$PATH"
cd /home/snow/JellyfinAppleLyrics
dotnet restore
dotnet build --configuration Release
```

### 调试

1. **本地开发**：
```bash
# 启用详细日志
export JELLYFIN_LOG_LEVEL=DEBUG
dotnet run
```

2. **浏览器调试**：
   - 打开 F12 开发者工具
   - 检查 Console 标签中的日志
   - 查看 Network 标签中的请求
   - 检查 Sources 标签中的脚本

3. **服务器日志**：
```bash
sudo journalctl -u jellyfin -f --grep="AppleMusic"
```

## 扩展开发

### 添加新的配置选项

1. **更新 PluginConfiguration.cs**：
```csharp
public class PluginConfiguration : BasePluginConfiguration
{
    public bool YourNewOption { get; set; } = true;
}
```

2. **在 ConfigPage.html 中添加 UI**：
```html
<div class="form-group">
    <input type="checkbox" id="yourNewOption" checked>
    <label for="yourNewOption">Your New Option</label>
</div>
```

3. **在 init.js 中使用**：
```javascript
if (config.yourNewOption) {
    // 执行逻辑
}
```

### 集成第三方歌词源

1. **修改 AppleLyricsController.cs**：
```csharp
[HttpGet("lyrics/{itemId}")]
public async Task<ActionResult> GetLyrics(string itemId)
{
    var lyrics = await FetchFromThirdParty(itemId);
    return Ok(lyrics);
}
```

2. **在 init.js 中调用**：
```javascript
const lyrics = await fetch(`/applelyrics/lyrics/${itemId}`)
    .then(r => r.json());
```

### 自定义 UI 样式

1. **创建自定义 CSS 文件**：
```css
.appleMusicLyrics {
    /* 自定义样式 */
}
```

2. **在 init.js 中加载**：
```javascript
await loadStyle('/applelyrics/custom.css');
```

## 性能优化

### 前端优化
- 使用异步脚本加载避免阻塞
- 缓存DOM查询结果
- 使用事件委托减少事件监听器数量
- 避免频繁的DOM操作

### 后端优化
- 使用嵌入式资源减少磁盘I/O
- 启用响应缓存
- 使用连接池管理数据库连接
- 异步处理长时间操作

## 测试

### 单元测试

创建 `JellyfinAppleLyrics.Tests/` 项目：

```bash
dotnet new xunit -n JellyfinAppleLyrics.Tests
cd JellyfinAppleLyrics.Tests
dotnet add reference ../JellyfinAppleLyrics/JellyfinAppleLyrics.csproj
```

### 集成测试

```bash
# 在本地 Jellyfin 实例上测试
docker run -d \
  -p 8096:8096 \
  -v jellyfin_data:/var/lib/jellyfin \
  -v jellyfin_cache:/var/cache/jellyfin \
  -v jellyfin_log:/var/log/jellyfin \
  jellyfin/jellyfin:latest
```

## 版本控制

### 语义版本（Semantic Versioning）

- **主版本**：不兼容的API变更
- **次版本**：新增功能，向后兼容
- **补丁版本**：错误修复

示例：`1.2.3`

### 更新日志

在 `CHANGELOG.md` 中记录所有变更：

```markdown
## [1.0.0] - 2025-11-07
### Added
- 初始版本发布
- Apple Music 风格歌词显示
- 动态背景模糊效果
- 配置页面

### Fixed
- 修复脚本注入问题
```

## 发布流程

1. 更新版本号
2. 更新 CHANGELOG.md
3. 构建项目
4. 创建 Git 标签
5. 发布到 GitHub Releases

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 常见问题

### Q: 如何调试插件加载问题？

A: 检查 Jellyfin 日志和浏览器控制台：
```bash
sudo journalctl -u jellyfin | grep -i "apple\|lyrics\|error"
```

### Q: 如何修改歌词显示样式？

A: 编辑 `Resources/web/init.js` 中的 CSS 字符串或创建独立的 CSS 文件。

### Q: 支持哪些歌词格式？

A: 当前支持基本的 LRC 格式，可以扩展支持 ASS、VTT 等格式。

### Q: 如何处理多语言UI？

A: 在 ConfigPage.html 中添加语言选择器，使用JavaScript动态更新文本。

## 相关资源

- [Jellyfin 官方文档](https://docs.jellyfin.org/)
- [Jellyfin 插件开发](https://docs.jellyfin.org/general/plugins/)
- [Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)
- [.NET 开发文档](https://learn.microsoft.com/dotnet/)

## 许可证

本项目采用 GPLv3 许可证。

---

**最后更新**：2025-11-07
