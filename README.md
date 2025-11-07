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

## ⚠️ 重要：Docker 用户必读

**此插件需要修改 Jellyfin 的 `index.html` 文件来注入 JavaScript。** 如果你使用 Docker 运行 Jellyfin，**必须挂载 `index.html` 文件**：

### Docker 命令行

```bash
docker run -d \
  --name jellyfin \
  -v /path/to/jellyfin/config:/config \
  -v /path/to/jellyfin/config/index.html:/jellyfin/jellyfin-web/index.html \
  # ... 其他配置
  jellyfin/jellyfin
```

### Docker Compose

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin
    volumes:
      - /path/to/jellyfin/config:/config
      - /path/to/jellyfin/config/index.html:/jellyfin/jellyfin-web/index.html
      # ... 其他 volumes
```

**没有这个挂载，插件将无法工作！**

## 快速开始

### 编译

```bash
cd JellyfinAppleLyrics
dotnet restore
dotnet build --configuration Release
```

### 安装步骤

#### 1. 安装插件 DLL

##### Linux/macOS

```bash
sudo mkdir -p /var/lib/jellyfin/plugins/AppleMusic
sudo cp bin/Release/net8.0/JellyfinAppleLyrics.dll /var/lib/jellyfin/plugins/AppleMusic/
sudo chown jellyfin:jellyfin /var/lib/jellyfin/plugins/AppleMusic/JellyfinAppleLyrics.dll
```

##### Windows

```powershell
New-Item -ItemType Directory "C:\ProgramData\Jellyfin\data\plugins\AppleMusic" -Force
Copy-Item "bin\Release\net8.0\JellyfinAppleLyrics.dll" "C:\ProgramData\Jellyfin\data\plugins\AppleMusic\"
```

##### Docker

```bash
docker cp bin/Release/net8.0/JellyfinAppleLyrics.dll <container_id>:/config/plugins/AppleMusic/
```

#### 2. 重启 Jellyfin

```bash
# Linux systemd
sudo systemctl restart jellyfin

# Docker
docker restart <container_id>

# Windows
Restart-Service JellyfinServer
```

#### 3. 注入脚本到 index.html

安装插件后，插件会**自动**尝试修改 `index.html`。但如果自动注入失败（特别是 Docker 用户），需要**手动**编辑：

##### 方法 A：自动注入（推荐）

1. 进入 Jellyfin 控制面板 -> 插件 -> Apple Music Lyrics
2. 插件会在初始化时自动尝试注入脚本
3. 重启 Jellyfin 以应用更改

##### 方法 B：手动注入

编辑 `index.html` 文件（Docker 用户编辑 `/path/to/config/index.html`）：

```bash
# 找到 </body> 标签前，添加：
<script plugin="Apple Music Lyrics" src="../applelyrics/init.js" defer></script>
</body>
```

完整示例：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- ... Jellyfin 的 head 内容 ... -->
</head>
<body>
    <div id="apphost"></div>
    <!-- ... 其他脚本 ... -->
    <script plugin="Apple Music Lyrics" src="../applelyrics/init.js" defer></script>
</body>
</html>
```

#### 4. 再次重启 Jellyfin

```bash
# 应用 index.html 的更改
sudo systemctl restart jellyfin  # Linux
docker restart <container_id>    # Docker
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

### 🚫 插件已安装但没有效果

#### 1. 检查脚本是否已注入

打开 `index.html` 文件（Docker 用户：`/path/to/config/index.html`），在文件末尾 `</body>` 标签前应该能看到：

```html
<script plugin="Apple Music Lyrics" version="x.x.x" src="../applelyrics/init.js" defer></script>
</body>
```

**如果没有**，说明自动注入失败，请按照上面的"方法 B：手动注入"步骤操作。

#### 2. Docker 用户特别检查

确认 `index.html` 挂载成功：

```bash
docker inspect <container_name> | grep index.html
```

应该能看到：
```
"/path/to/config/index.html:/jellyfin/jellyfin-web/index.html"
```

#### 3. 检查浏览器控制台

按 `F12` 打开开发者工具 -> Console 标签页，应该能看到：

```
[AppleMusic] Init script loaded
[AppleMusic] Script injection initialized
[AppleMusic] Waiting for Now Playing page...
```

**如果看不到这些日志**：
- 脚本可能没有加载
- 检查 Network 标签页，搜索 `init.js`，查看是否返回 404
- 确认插件 DLL 已正确安装

#### 4. 检查插件是否已启用

进入 Jellyfin 控制面板 -> 插件 -> Apple Music Lyrics -> 确认"启用插件"选项已勾选

### 🌐 浏览器报错

如果浏览器控制台出现类似错误：

```
TypeError: 'get persisted' called on an object that does not implement interface PageTransitionEvent
```

**这是浏览器扩展冲突，不是插件问题。** 解决方法：

1. 在隐私/无痕模式下测试
2. 禁用浏览器扩展（特别是广告拦截器、隐私保护扩展）
3. 换个浏览器测试

### 🎵 脚本加载但没有视觉效果

1. **确认正在播放音乐**（不是视频）
2. 检查插件配置：
   ```
   控制面板 -> 插件 -> Apple Music Lyrics
   确认"启用插件"已勾选
   ```
3. 清除浏览器缓存：`Ctrl+Shift+Delete`
4. 硬刷新页面：`Ctrl+F5` (Windows/Linux) 或 `Cmd+Shift+R` (Mac)
5. 查看浏览器控制台是否有 JavaScript 错误

### 📝 插件未加载到 Jellyfin

检查 Jellyfin 日志：

```bash
# Linux
tail -f /var/log/jellyfin/jellyfin.log | grep -i "apple\|lyrics"

# Docker
docker logs -f <container_id> | grep -i "apple\|lyrics"
```

应该能看到：

```
[INF] --- JellyfinAppleLyrics Plugin: Listing Embedded Resource Names ---
[INF] Found embedded resource: JellyfinAppleLyrics.Resources.web.init.js
[INF] Found embedded resource: JellyfinAppleLyrics.Resources.web.ConfigPage.html
```

**如果没有这些日志**：
- DLL 可能没有放在正确的位置
- 检查文件权限：`ls -la /var/lib/jellyfin/plugins/AppleMusic/`
- 重启 Jellyfin

### 🔧 手动验证 API 端点

测试插件的 REST API 是否工作：

```bash
# 测试配置端点
curl http://localhost:8096/applelyrics/config

# 测试脚本端点
curl http://localhost:8096/applelyrics/init.js
```

如果返回 404，说明插件没有正确加载。

### 🆘 仍然无法解决？

提交 Issue 时请提供：

1. Jellyfin 版本：`http://localhost:8096/web/index.html#!/dashboard` -> 关于
2. 浏览器版本和操作系统
3. 部署方式（Docker/裸机）
4. Jellyfin 日志（带有 `[AppleMusic]` 或 `[INF]` 前缀的相关行）
5. 浏览器控制台的完整错误信息（F12 -> Console）
6. `index.html` 中是否包含插件的 `<script>` 标签

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

