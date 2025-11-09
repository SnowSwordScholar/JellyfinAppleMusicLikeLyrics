# GitHub Actions 工作流说明

## Release 工作流

### 触发条件
当推送以 `v` 开头的 tag 时自动触发，例如：`v1.0.6`

### 工作流程

1. **签出代码** - 获取完整的 git 历史记录
2. **设置 .NET 环境** - 安装 .NET 8.0
3. **提取版本和 Changelog** - 从 tag 注释中提取变更日志
4. **还原依赖** - 运行 `dotnet restore`
5. **编译项目** - 以 Release 模式编译
6. **验证 DLL** - 确保编译产物存在
7. **创建 ZIP 包** - 将 DLL 打包为 `JellyfinAppleLyrics.dll.zip`
8. **计算校验和** - 计算 MD5 校验和
9. **更新 manifest.json** - 自动更新插件清单文件
10. **提取 Changelog** - 为 Release 准备变更日志
11. **提交并推送 manifest** - 将更新后的 manifest.json 推送回 main 分支
12. **创建 GitHub Release** - 发布新版本并上传文件

### 自动化功能

✅ **自动编译和打包** - 无需手动构建  
✅ **自动计算校验和** - 确保文件完整性  
✅ **自动更新 manifest.json** - 保持插件仓库最新  
✅ **自动创建 Release** - 包含完整的安装说明  
✅ **从 tag 提取 Changelog** - changelog 来自 git tag 注释  

### 使用方法

#### 1. 使用 release.sh 脚本（推荐）

```bash
./release.sh
```

脚本会自动：
- 更新版本号
- 编译项目
- 打包 DLL
- 更新 manifest.json
- 创建 git tag（包含 changelog）
- 推送到 GitHub

推送后，GitHub Actions 会自动创建 Release。

#### 2. 手动发布

```bash
# 1. 更新版本号（在 .csproj 文件中）
# 2. 提交更改
git add JellyfinAppleLyrics.csproj
git commit -m "chore: bump version to 1.0.6"

# 3. 创建带注释的 tag
git tag -a v1.0.6 -m "Release 1.0.6

- 新增功能 1
- 修复 bug 2
- 优化性能 3"

# 4. 推送 tag
git push origin v1.0.6
```

### Changelog 格式

Tag 注释的第一行是标题（会被跳过），从第三行开始是 changelog 内容。

**示例：**

```
Release 1.0.6

- 新增 Apple Music 风格歌词显示
- 修复横屏模式下字体大小问题
- 优化动画性能
- 添加深色模式支持
```

### 注意事项

1. **Tag 格式** - 必须以 `v` 开头，例如 `v1.0.6`
2. **Changelog** - 建议在 tag 注释中详细描述更改
3. **版本号** - .csproj 中的版本号应与 tag 一致（去掉 v 前缀）
4. **Manifest 更新** - 工作流会自动推送 manifest.json 到 main 分支

### 权限配置

工作流需要以下权限：
- `contents: write` - 创建 Release 和推送 commits

GitHub Actions 使用 `GITHUB_TOKEN` 自动处理身份验证。

### 故障排除

**问题：工作流未触发**
- 检查 tag 是否以 `v` 开头
- 确认 tag 已成功推送到 GitHub

**问题：无法推送 manifest.json**
- GitHub Actions 的 `GITHUB_TOKEN` 有推送权限
- 检查分支保护规则是否阻止了 bot 推送

**问题：编译失败**
- 检查 .NET 版本是否正确（需要 8.0）
- 确认所有依赖都在 .csproj 中声明

### 输出产物

每次成功运行后会生成：
1. **GitHub Release** - 包含 ZIP 文件和详细说明
2. **更新的 manifest.json** - 自动推送到 main 分支
3. **MD5 校验和** - 显示在 Release 说明中

### 相关文件

- `.github/workflows/release.yml` - 工作流定义
- `release.sh` - 本地发布脚本
- `manifest.json` - Jellyfin 插件清单
- `JellyfinAppleLyrics.csproj` - 项目文件
