# Jellyfin Apple Music Like Lyrics

<div align="center">

<img src="icon.png" alt="Jellyfin Apple Music Like Lyrics Logo" width="200"/>

<br/>

![Jellyfin](https://img.shields.io/badge/Jellyfin-10.10.0+-00A4DC?style=flat-square&logo=jellyfin&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)
![GitHub release](https://img.shields.io/github/v/release/SnowSwordScholar/JellyfinAppleMusicLikeLyrics?style=flat-square)

[![Release](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/actions/workflows/release.yml/badge.svg)](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/actions/workflows/release.yml)
[![Build](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/actions/workflows/build.yml/badge.svg)](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/actions/workflows/build.yml)

为 Jellyfin 网页客户端带来 **Apple Music 风格的歌词显示体验**。

[安装指南](#-安装) • [配置说明](#️-配置) • [故障排除](#-故障排除) • [开发文档](#-开发)

</div>

---

## Apple Music 风格歌词
用于 Jellyfin 服务器，通过注入 index.html 并 Hook Jellyfin 原来的音乐播放页面，提供了Apple Music 样式的歌词界面。本项目依赖 [Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) ，目前已经在歌词中实现了比较优雅的Hook，并可以通过 WebUI 详细的调节各项动画参数


<details>
<summary><b>✨ 功能特性</b></summary>

### 🎵 Apple Music 风格歌词
- **优雅的歌词渲染**：平滑滚动动画，完美同步播放进度
- **响应式字体大小**：自动适配横屏/竖屏，支持自定义活跃/非活跃歌词字体
- **渐变模糊效果**：活跃歌词周围的歌词行自动应用渐变模糊，突出当前歌词
- **弹簧动画**：可调速度的自然弹性动画过渡

### 🎨 动态视觉效果
- **智能背景模糊**：基于专辑封面的高斯模糊背景（0-100px 可调）
- **可定制透明度**：独立控制活跃/非活跃歌词的透明度和亮度
- **发光与阴影**：活跃歌词发光效果，可调节强度
- **颜色和滤镜**：精细控制模糊、亮度、阴影等视觉参数

### ⚙️ 灵活配置
- **Web UI 配置**：通过 Jellyfin 插件设置页面轻松调整所有参数
- **调试模式**：可选的详细日志输出，便于问题排查
- **自动歌词获取**：支持 Jellyfin 内置歌词系统
- **点击跳转**：点击歌词行即可跳转到对应时间点
</details>

## 📸 演示

推荐同时安装主题：https://github.com/alexyle/jellyfin-theme ，这样上下栏将会有透明的高斯玻璃效果。在下面的演示中，双方都安装了此主题

### PC 端效果对比

<table>
<tr>
<td width="50%" align="center"><b>Before (原版)</b></td>
<td width="50%" align="center"><b>After (Apple Music 风格)</b></td>
</tr>
<tr>
<td><img src="assets/Befor_PC.png" alt="PC端原版效果"/></td>
<td><img src="assets/After_PC.png" alt="PC端Apple Music风格效果"/></td>
</tr>
</table>

### 移动端效果对比

<table>
<tr>
<td width="50%" align="center"><b>Before (原版)</b></td>
<td width="50%" align="center"><b>After (Apple Music 风格)</b></td>
</tr>
<tr>
<td><img src="assets/Before_moble.png" alt="移动端原版效果" width="150"/></td>
<td><img src="assets/After_moble.png" alt="移动端Apple Music风格效果" width="150"/></td>
</tr>
</table>

### 视频演示

<details>
<summary><b>🎥 点击展开查看视频演示</b></summary>

<br/>

**PC 端效果**

https://github.com/user-attachments/assets/MV_PC.mp4

**移动端效果**

https://github.com/user-attachments/assets/MV_moble.mp4

</details>

## 🔧 系统要求

- **Jellyfin**: 10.10.0 或更高版本
- **浏览器**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **编译环境** (仅开发者): .NET 8.0 SDK

## 📦 安装

### 方法一：通过 Jellyfin 插件仓库（推荐）


1. 打开 Jellyfin 管理后台
2. 导航到 **控制面板 > 插件 > 存储库**
3. 添加自定义存储库：
   - 名称: `Apple Music Like Lyrics @SnowSwordScholar`
   - URL: `https://raw.githubusercontent.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/main/manifest.json`
4. 前往 **插件目录**，搜索 "Apple Music Lyrics",如果没有出现可以多次打开或者重启 Jellyfin
5. 点击安装并重启 Jellyfin

### 方法二：手动安装

#### 1. 下载插件

从 [Releases](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/releases) 页面下载最新的 `JellyfinAppleLyrics.dll.zip`

#### 2. 安装 DLL
此处可以 必应/Google/问AI  

#### 3. 重启 Jellyfin



插件会在 Jellyfin 启动时自动注入必要的脚本。如果自动注入失败，请查看[故障排除](#-故障排除)部分。

## 🎛️ 配置

安装后，前往 **Jellyfin 控制面板 > 插件 > Apple Music Lyrics** 进行配置。

### 主要配置选项

#### 字体设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 横屏字体大小 | 32px | 桌面/横屏模式下的基础字体大小 |
| 竖屏字体大小 | 24px | 移动端/竖屏模式下的基础字体大小 |
| 横屏活跃字体 | 48px | 当前播放歌词的字体大小（横屏） |
| 竖屏活跃字体 | 36px | 当前播放歌词的字体大小（竖屏） |

#### 背景设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 背景模糊 | 60px | 专辑封面背景的模糊程度（0-100） |
| 背景亮度 | 0.8 | 背景亮度系数（0.0-2.0） |

#### 非活跃歌词设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 非活跃亮度 | 0.85 | 非活跃歌词的亮度（0.0-2.0） |
| 非活跃透明度 | 0.65 | 非活跃歌词的透明度（0.0-1.0） |
| 非活跃模糊 | 0.5px | 非活跃歌词的模糊程度（0-10） |
| 非活跃阴影 | 0.0 | 非活跃歌词的阴影强度（0.0-1.0） |

#### 活跃歌词设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 活跃亮度 | 1.15 | 活跃歌词的亮度（0.0-2.0） |
| 活跃透明度 | 0.9 | 活跃歌词的透明度（0.0-1.0） |
| 活跃发光强度 | 0.35 | 活跃歌词的发光效果强度（0.0-1.0） |
| 活跃阴影强度 | 0.0 | 活跃歌词的阴影强度（0.0-1.0） |
| 活跃模糊 | 0.0px | 活跃歌词的模糊程度（0-10） |

#### 渐变模糊设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 启用渐变模糊 | ✓ | 活跃歌词周围应用渐变模糊效果 |
| 渐变模糊量 | 1.0 | 渐变模糊的强度（0-10） |

#### 动画设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 滚动动画时长 | 1000ms | 歌词滚动动画的持续时间 |
| 弹簧动画速度 | 1.0 | 弹簧动画的速度系数（0.1-5.0） |
| Transform 时长 | 300ms | 样式变换过渡时间 |
| 横屏活跃位置 | 0.30 | 活跃歌词在屏幕中的位置（0-1，0=顶部） |
| 竖屏活跃位置 | 0.35 | 移动端活跃歌词位置 |

#### 其他设置
| 选项 | 默认值 | 说明 |
|------|--------|------|
| 自动获取歌词 | ✓ | 自动从 Jellyfin 获取歌词 |
| 启用调试模式 | ✗ | 在浏览器控制台输出详细日志 |



## 🎮 使用

1. 在 Jellyfin 中播放音乐
2. 点击播放器底部的**歌词**图标
3. 享受 Apple Music 风格的歌词体验！

**小技巧**：
- 点击任意歌词行可跳转到该时间点
- 启用调试模式之后打开 F12 控制台可查看详细运行信息
- 调整活跃歌词位置以适应不同屏幕比例

## 🛠️ 故障排除

### 插件未加载

**检查插件状态**：
```bash
# Linux
ls -la /where/u/install/jellyfin/plugins/JellyfinAppleMusicLikeLyrics/
```

**检查 Jellyfin 日志**：
```bash
# Linux
tail -f /var/log/jellyfin/jellyfin.log | grep -i "apple\|lyrics"

# Docker
docker logs -f <container> | grep -i "apple\|lyrics"
```

应该看到类似日志：
```
[INF] Discovered plugin JellyfinAppleMusicLikeLyrics
[INF] Loaded plugin: Apple Music Like Lyrics
```

### 歌词页面无效果
目前已知在有些时候仍然不能正常 Hook 到位，可以通过点击歌曲详细页面的歌词按键或者点击下一首来进入到 Hook 后的页面


**1. 检查浏览器控制台（F12）**

前往设置启用调试模式后，应该看到：
```
[AMLL DEBUG] Initializing...
[AMLL DEBUG] Configuration loaded
[AMLL DEBUG] Lyrics page detected
```

**2. 检查脚本注入**

打开浏览器开发工具 > Network > 搜索 `init.js`，状态应为 `200 OK`


**3. 硬刷新页面**

- Windows/Linux: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 歌词不同步

1. 检查音频文件是否包含正确的歌词元数据
2. 验证 Jellyfin 媒体库已正确扫描歌词
3. 确保歌词时间戳格式正确（`[mm:ss.xx]`）

### 性能问题

如果遇到卡顿：  
   - 关闭渐变模糊应当可以减少大部分的占用
1. 降低背景模糊值（推荐 40-60）
2. 减少渐变模糊量（推荐 0.5-1.5）
3. 增加滚动动画时长（推荐 800-1200ms）
4. 关闭浏览器硬件加速（不推荐）

### 仍无法解决？

提交 [Issue](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/issues) 时请提供：

- Jellyfin 版本
- 浏览器版本和操作系统
- 部署方式（Docker/裸机）
- 插件版本
- Jellyfin 日志（相关部分）
- 浏览器控制台日志（F12 > Console）
- 重现步骤

## 🧑‍💻 开发

### 从源代码构建

**环境要求**：
- .NET 8.0 SDK
- Git

**步骤**：

```bash
# 克隆仓库
git clone https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics.git
cd JellyfinAppleMusicLikeLyrics

# 恢复依赖
dotnet restore

# 构建插件
dotnet build --configuration Release

# 输出位置
ls bin/Release/net8.0/JellyfinAppleLyrics.dll
```

### 项目结构

```
JellyfinAppleMusicLikeLyrics/
├── Plugin.cs                          # 插件主类
├── PluginConfiguration.cs             # 配置模型（所有可调参数）
├── AppleLyricsController.cs           # REST API 控制器
├── AppleLyricsService.cs              # 后台服务
├── ConfigurationPageProvider.cs       # 配置页面提供者
├── LyricsScriptInjectionMiddleware.cs # 中间件（注入脚本）
├── ScriptInjector.cs                  # 脚本注入器
├── ServiceCollectionExtensions.cs     # 依赖注入扩展
├── Resources/web/
│   ├── init.js                        # 初始化脚本
│   ├── lyrics-amll.js                 # 核心歌词渲染逻辑
│   └── ConfigPage.html                # 配置页面 HTML
├── LICENSE                            # AGPL-3.0 许可证
└── README.md                          # 本文件
```

### API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/applelyrics/init.js` | GET | 初始化脚本 |
| `/applelyrics/lyrics-amll.js` | GET | 核心歌词渲染库 |
| `/applelyrics/config` | GET | 获取当前配置 |
| `/applelyrics/config` | POST | 保存配置（JSON Body） |

**示例：获取配置**
```bash
curl http://localhost:8096/applelyrics/config
```

**示例：更新配置**
```bash
curl -X POST http://localhost:8096/applelyrics/config \
  -H "Content-Type: application/json" \
  -d '{"FontSizeLandscape":36,"EnableDebugMode":true}'
```

### 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

**代码规范**：
- 遵循 C# 编码约定
- JavaScript 使用 2 空格缩进
- 所有公共 API 必须有 XML 文档注释
- 提交信息使用英文，清晰描述更改内容

## 📜 许可证

本项目采用 [AGPL-3.0 许可证](LICENSE)。

### 关键要点

- ✅ **自由使用**：可以自由使用、修改和分发
- ✅ **开源要求**：如果你修改并分发，必须开源你的修改
- ✅ **网络使用**：如果通过网络提供服务，也必须开源
- ❌ **专有闭源**：不能将本项目用于闭源商业软件

详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

本项目基于以下优秀开源项目：

- **[Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)** (AGPL-3.0)  
  提供核心歌词渲染逻辑和视觉效果算法

- **[Jellyfin](https://github.com/jellyfin/jellyfin)** (GPL-2.0)  
  开源媒体服务器平台

感谢所有开源贡献者的辛勤工作！

## 🔗 相关链接

- [GitHub 仓库](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics)
- [问题追踪](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/issues)
- [发布页面](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/releases)
- [Jellyfin 官网](https://jellyfin.org)
- [Jellyfin 插件开发文档](https://jellyfin.org/docs/general/server/plugins/)



---

## ⚖️ 免责声明

### 简化版免责声明

**⚠️ 重要提示：**

- ✅ 本插件是开源社区项目，**不隶属于 Jellyfin 或 Apple Inc.**
- ✅ 按"现状"提供，**无任何保证**
- ✅ 使用风险**自行承担**
- ✅ 开发者**不承担任何责任**
- ✅ 必须遵守 **AGPL-3.0 许可证**
- ✅ 商业使用需**开源并提供源代码**
- ✅ 使用前请**备份数据**并**充分测试**
- ✅ 仅用于**合法拥有的媒体内容**

**使用即表示同意上述所有条款。**

---

<details>
<summary><b>📋 点击展开完整法律声明</b></summary>

<br/>

### 法律声明

本软件（"Jellyfin Apple Music Like Lyrics"，以下简称"本插件"）是一个开源项目，按"现状"提供，不附带任何明示或暗示的保证。使用本插件即表示您同意以下条款：

#### 1. 使用风险承担

- 本插件由社区贡献者开发和维护，**不隶属于 Jellyfin 官方团队或 Apple Inc.**
- 使用本插件的所有风险由用户自行承担
- 开发者不对因使用本插件而导致的任何直接、间接、附带、特殊、惩罚性或后果性损害负责，包括但不限于：
  - 数据丢失或损坏
  - 服务器性能下降
  - 系统不稳定
  - 第三方服务中断
  - 任何其他技术或业务损失

#### 2. 知识产权声明

- 本插件的名称中包含"Apple Music"字样，仅用于描述其提供的功能风格，**不表示与 Apple Inc. 有任何关联、认可或赞助关系**
- "Apple Music"是 Apple Inc. 在美国和其他国家的注册商标
- "Jellyfin"是 Jellyfin 项目的商标
- 本项目尊重所有相关商标权，任何对商标的使用均符合合理使用原则

#### 3. 许可证合规

- 本插件采用 [AGPL-3.0 许可证](LICENSE)
- 基于 [Apple Music Like Lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics) 项目（AGPL-3.0）
- 用户必须遵守 AGPL-3.0 许可证的所有条款
- 任何修改和分发必须同样采用 AGPL-3.0 许可证并公开源代码
- 通过网络提供服务时必须向用户提供源代码访问权限

#### 4. 第三方组件

本插件使用以下第三方组件，各组件受其各自许可证约束：

- **Apple Music Like Lyrics** - AGPL-3.0 许可证
- **Jellyfin Server** - GPL-2.0 许可证
- **.NET 8.0** - MIT 许可证
- **其他依赖项** - 详见各自的许可证文件

用户有责任确保遵守所有相关第三方许可证的条款。

#### 5. 无担保声明

根据 AGPL-3.0 许可证第 15 条和第 16 条：

**在适用法律允许的范围内，本软件按"现状"提供，不附带任何形式的明示或暗示保证，包括但不限于：**

- 适销性保证
- 特定用途适用性保证
- 不侵权保证
- 通过使用或交易产生的保证

**开发者不保证：**
- 本插件将满足您的需求
- 本插件将不间断或无错误运行
- 任何缺陷或错误将被修复
- 本插件与特定硬件或软件配置兼容

#### 6. 责任限制

**在任何情况下，本插件的开发者、贡献者或版权持有人均不对以下情况承担责任：**

1. **数据安全**：任何因使用本插件导致的数据丢失、泄露或损坏
2. **系统稳定性**：因本插件引起的系统崩溃、性能下降或服务中断
3. **兼容性问题**：与其他软件、插件或系统的不兼容
4. **升级影响**：Jellyfin 或相关组件升级后的功能失效
5. **间接损失**：业务中断、利润损失、商誉损害或其他间接、特殊或后果性损害

#### 7. 用户责任

使用本插件时，用户承诺：

1. **遵守法律**：遵守所在司法管辖区的所有适用法律法规
2. **版权保护**：不使用本插件侵犯他人的知识产权
3. **合法内容**：仅对合法拥有或有权使用的媒体内容使用本插件
4. **风险评估**：在生产环境使用前进行充分的测试和评估
5. **数据备份**：使用前备份所有重要数据
6. **许可证遵守**：遵守 AGPL-3.0 许可证的所有要求

#### 8. 免责条款的地域限制

某些司法管辖区不允许排除或限制某些保证或责任。在这些地区，上述免责声明和责任限制可能不完全适用于您。在此情况下，这些免责声明和限制将在适用法律允许的最大范围内适用。

#### 9. 商业使用

如果您计划将本插件用于商业用途：

1. 必须遵守 AGPL-3.0 许可证的所有要求
2. 必须向服务用户提供源代码访问权限
3. 不得将本插件作为专有商业产品的一部分闭源销售
4. 建议咨询专业法律顾问以确保合规

#### 10. 安全声明

- 本插件需要注入 JavaScript 到 Jellyfin 的 web 界面
- 用户应当理解此类注入的潜在安全影响
- 建议仅从官方 GitHub 仓库或可信源获取本插件
- 开发者会尽力确保代码安全，但不对安全漏洞承担责任
- 发现安全问题请通过 GitHub Issues 报告（敏感问题请私下联系）

#### 11. 更新与维护

- 本插件作为开源项目维护，不保证持续更新
- 开发者保留随时停止维护的权利
- 不保证与未来版本的 Jellyfin 或依赖组件兼容
- 用户应当准备在必要时自行维护或寻找替代方案

#### 12. 联系方式

- **问题报告**：https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/issues
- **源代码**：https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics

#### 13. 免责声明的效力

本免责声明是本插件使用条款的组成部分。通过下载、安装、复制或使用本插件，您承认已阅读、理解并同意受本免责声明约束。如果您不同意这些条款，请勿使用本插件。

</details>

---
---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star！**

Made with ❤️ by [SnowSwordScholar](https://github.com/SnowSwordScholar)

本项目与 Apple Inc. 或 Jellyfin 项目无任何官方关联。

</div>

