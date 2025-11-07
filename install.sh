#!/bin/bash

# Jellyfin Apple Music Lyrics 插件安装脚本
# 使用方法: ./install.sh [jellyfin_path]
# 示例: ./install.sh /var/lib/jellyfin

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
JELLYFIN_PATH="${1:-/var/lib/jellyfin}"
JELLYFIN_USER="${2:-jellyfin}"
JELLYFIN_GROUP="${3:-jellyfin}"

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Jellyfin Apple Music Lyrics Installer   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# 检查脚本是否以root身份运行
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ 此脚本必须以root身份运行${NC}"
   echo "使用: sudo $0 $@"
   exit 1
fi

# 检查Jellyfin目录是否存在
if [ ! -d "$JELLYFIN_PATH" ]; then
    echo -e "${RED}✗ Jellyfin目录不存在: $JELLYFIN_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}→ 配置信息:${NC}"
echo "  Jellyfin路径: $JELLYFIN_PATH"
echo "  用户: $JELLYFIN_USER"
echo "  用户组: $JELLYFIN_GROUP"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DLL_PATH="$SCRIPT_DIR/bin/Release/net8.0/JellyfinAppleLyrics.dll"

# 检查DLL文件
if [ ! -f "$DLL_PATH" ]; then
    echo -e "${RED}✗ DLL文件不存在: $DLL_PATH${NC}"
    echo -e "${YELLOW}→ 需要先编译项目:${NC}"
    echo "   cd $SCRIPT_DIR"
    echo "   export PATH=\"/home/snow/.dotnet:\$PATH\""
    echo "   dotnet build --configuration Release"
    exit 1
fi

echo -e "${GREEN}✓ DLL文件找到${NC}"

# 停止Jellyfin
echo ""
echo -e "${YELLOW}→ 停止Jellyfin服务...${NC}"
if systemctl is-active --quiet jellyfin; then
    systemctl stop jellyfin
    echo -e "${GREEN}✓ Jellyfin已停止${NC}"
else
    echo -e "${YELLOW}⚠ Jellyfin服务未运行${NC}"
fi

# 创建插件目录
PLUGIN_DIR="$JELLYFIN_PATH/plugins/AppleMusic"
echo ""
echo -e "${YELLOW}→ 创建插件目录: $PLUGIN_DIR${NC}"
mkdir -p "$PLUGIN_DIR"
echo -e "${GREEN}✓ 目录已创建${NC}"

# 复制DLL
echo ""
echo -e "${YELLOW}→ 复制插件文件...${NC}"
cp "$DLL_PATH" "$PLUGIN_DIR/"
cp "$SCRIPT_DIR/bin/Release/net8.0/JellyfinAppleLyrics.deps.json" "$PLUGIN_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/bin/Release/net8.0/JellyfinAppleLyrics.pdb" "$PLUGIN_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ 文件已复制${NC}"

# 设置权限
echo ""
echo -e "${YELLOW}→ 设置文件权限...${NC}"
chown -R "$JELLYFIN_USER:$JELLYFIN_GROUP" "$PLUGIN_DIR"
chmod -R 755 "$PLUGIN_DIR"
echo -e "${GREEN}✓ 权限已设置${NC}"

# 启动Jellyfin
echo ""
echo -e "${YELLOW}→ 启动Jellyfin服务...${NC}"
systemctl start jellyfin
sleep 2
if systemctl is-active --quiet jellyfin; then
    echo -e "${GREEN}✓ Jellyfin已启动${NC}"
else
    echo -e "${RED}✗ Jellyfin启动失败${NC}"
    echo "检查日志: sudo journalctl -u jellyfin -n 50"
    exit 1
fi

# 显示完成信息
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        安装完成！                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}后续步骤:${NC}"
echo "1. 打开 Jellyfin 管理面板"
echo "2. 进入 设置 -> 管理员 -> 插件"
echo "3. 在列表中查找 \"Apple Music Lyrics\""
echo "4. 点击插件进行配置"
echo "5. 播放音乐，享受 Apple Music 风格的歌词显示"
echo ""
echo -e "${YELLOW}故障排除:${NC}"
echo "查看日志: sudo journalctl -u jellyfin -f"
echo "插件日志: grep -i 'applemusic' /var/log/jellyfin/jellyfin.log"
echo ""
