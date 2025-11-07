# Jellyfin Apple Music Lyrics 插件部署指南

## 前提条件

- Jellyfin 10.10.0 或更高版本
- .NET 8.0 或更高版本（用于编译）
- Linux、Windows 或 macOS 系统

## 快速开始

### 1. 编译插件

```bash
cd /home/snow/JellyfinAppleLyrics
export PATH="/home/snow/.dotnet:$PATH"
dotnet restore
dotnet build --configuration Release
```

编译输出位置：`bin/Release/net8.0/JellyfinAppleLyrics.dll`

### 2. 安装到 Jellyfin

#### Linux/macOS

```bash
# 创建插件目录
sudo mkdir -p /var/lib/jellyfin/plugins/AppleMusic

# 复制编译好的DLL
sudo cp bin/Release/net8.0/JellyfinAppleLyrics.dll /var/lib/jellyfin/plugins/AppleMusic/

# 设置正确的权限
sudo chown -R jellyfin:jellyfin /var/lib/jellyfin/plugins/AppleMusic

# 重启Jellyfin服务
sudo systemctl restart jellyfin
```

#### Windows

```powershell
# 创建插件目录
New-Item -ItemType Directory -Path "C:\ProgramData\Jellyfin\data\plugins\AppleMusic" -Force

# 复制编译好的DLL
Copy-Item "bin\Release\net8.0\JellyfinAppleLyrics.dll" "C:\ProgramData\Jellyfin\data\plugins\AppleMusic\"

# 重启Jellyfin服务
Restart-Service -Name JellyfinServer
```

#### Docker

```bash
# 将DLL复制到Docker卷中
docker cp bin/Release/net8.0/JellyfinAppleLyrics.dll <container_id>:/var/lib/jellyfin/plugins/AppleMusic/

# 重启容器
docker restart <container_id>
```

### 3. 验证安装

1. 打开 Jellyfin 管理面板
2. 进入 **设置 -> 管理员 -> 插件**
3. 查看是否列出 "Apple Music Lyrics" 插件
4. 确认插件状态为启用

### 4. 配置插件

1. 在插件列表中点击 "Apple Music Lyrics" 插件
2. 在配置页面中调整设置：
   - 启用/禁用插件
   - 调整背景模糊程度
   - 设置歌词字体大小
   - 启用/禁用自动获取歌词

3. 点击 "Save Settings" 保存配置

### 5. 使用插件

1. 播放音乐或播客
2. 进入 "Now Playing" 视图
3. 应该看到 Apple Music 风格的歌词和动态背景效果

## 故障排除

### 插件不显示

**问题**：插件列表中看不到 "Apple Music Lyrics"

**解决方案**：
```bash
# 检查Jellyfin日志
tail -f /var/log/jellyfin/jellyfin.log

# 检查插件文件权限
ls -la /var/lib/jellyfin/plugins/AppleMusic/

# 确保DLL文件存在且有执行权限
file /var/lib/jellyfin/plugins/AppleMusic/JellyfinAppleLyrics.dll
```

### 歌词不显示

**问题**：Now Playing 视图中不显示歌词

**解决方案**：
1. 打开浏览器开发者工具（F12）
2. 检查 Console 标签中是否有错误
3. 查看 Network 标签，确认 `/applelyrics/` 请求是否返回 200
4. 检查 Jellyfin 日志中是否有相关错误

```bash
# 查看最近的错误日志
grep -i "applemusic\|lyrics" /var/log/jellyfin/jellyfin.log
```

### API 端点无法访问

**问题**：`/applelyrics/core.js` 返回 404

**解决方案**：
1. 确保 DLL 已正确加载
2. 检查嵌入资源是否正确包含在 DLL 中：
   ```bash
   unzip -l JellyfinAppleLyrics.dll | grep "applemusic\|AppleMusic"
   ```
3. 重新编译并重新安装

## 更新插件

### 更新到最新版本

```bash
# 停止Jellyfin
sudo systemctl stop jellyfin

# 删除旧的DLL
sudo rm /var/lib/jellyfin/plugins/AppleMusic/JellyfinAppleLyrics.dll

# 编译最新版本
cd /path/to/JellyfinAppleLyrics
export PATH="/home/snow/.dotnet:$PATH"
dotnet build --configuration Release

# 复制新的DLL
sudo cp bin/Release/net8.0/JellyfinAppleLyrics.dll /var/lib/jellyfin/plugins/AppleMusic/

# 启动Jellyfin
sudo systemctl start jellyfin
```

## 卸载插件

### Linux/macOS

```bash
# 停止Jellyfin
sudo systemctl stop jellyfin

# 删除插件目录
sudo rm -rf /var/lib/jellyfin/plugins/AppleMusic

# 启动Jellyfin
sudo systemctl start jellyfin
```

### Windows

```powershell
# 停止Jellyfin服务
Stop-Service -Name JellyfinServer

# 删除插件目录
Remove-Item -Path "C:\ProgramData\Jellyfin\data\plugins\AppleMusic" -Recurse -Force

# 启动Jellyfin服务
Start-Service -Name JellyfinServer
```

## 日志输出示例

### 正常启动

```
[2025-11-07 22:30:45.123 +00:00] [INF] [AppleMusic] Service starting...
[2025-11-07 22:30:45.456 +00:00] [INF] [AppleMusic] Service started successfully
[2025-11-07 22:30:45.789 +00:00] [INF] [AppleMusic] Plugin initialized with config:
[2025-11-07 22:30:45.789 +00:00] [INF]   - Enabled: True
[2025-11-07 22:30:45.789 +00:00] [INF]   - Background Blur: True
[2025-11-07 22:30:45.789 +00:00] [INF]   - Blur Amount: 30px
[2025-11-07 22:30:45.789 +00:00] [INF]   - Dynamic Blending: True
[2025-11-07 22:30:45.789 +00:00] [INF]   - Font Size: 32px
```

### 错误示例

```
[2025-11-07 22:30:45.123 +00:00] [ERR] [AppleMusic] Error starting service
```

## 性能考虑

- 插件使用嵌入式资源，不会额外占用磁盘空间
- 脚本注入在客户端执行，不会显著增加服务器负载
- 可以在配置页面禁用不需要的效果以提高性能

## 安全注意事项

- 插件在合法的 Jellyfin 插件系统中运行
- 所有 API 调用都在 Jellyfin 的授权框架内
- 建议定期更新 Jellyfin 和相关依赖

## 支持和反馈

- 项目主页：https://github.com/yourusername/JellyfinAppleLyrics
- 提交 Issue：https://github.com/yourusername/JellyfinAppleLyrics/issues
- 讨论区：[Jellyfin 论坛](https://forum.jellyfin.org/)

---

**最后更新**：2025-11-07
