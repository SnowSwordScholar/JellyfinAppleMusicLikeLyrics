#!/bin/bash

################################################################################
# Jellyfin Apple Music Like Lyrics - 自动发布脚本
# 功能：
# 1. 编译项目
# 2. 打包 DLL 为 ZIP
# 3. 计算 MD5 校验和
# 4. 更新 manifest.json
# 5. 创建 Git tag
# 6. 推送到 GitHub 并创建 Release
################################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_requirements() {
    log_info "检查必要工具..."
    
    local missing_tools=()
    
    if ! command -v dotnet &> /dev/null; then
        missing_tools+=("dotnet")
    fi
    
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if ! command -v md5sum &> /dev/null && ! command -v md5 &> /dev/null; then
        missing_tools+=("md5sum or md5")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        log_error "请安装后重试"
        exit 1
    fi
    
    log_success "所有必要工具已就绪"
}

# 获取当前版本
get_current_version() {
    # 从 .csproj 文件读取版本
    VERSION=$(grep -oP '(?<=<Version>)[^<]+' JellyfinAppleLyrics.csproj | head -1)
    if [ -z "$VERSION" ]; then
        log_error "无法从 JellyfinAppleLyrics.csproj 读取版本号"
        exit 1
    fi
    echo "$VERSION"
}

# 获取版本号（支持自动增加或手动指定）
get_version() {
    local current_version=$(get_current_version)
    
    # 输出到 stderr，避免污染返回值
    echo "" >&2
    echo -e "当前版本: ${BLUE}$current_version${NC}" >&2
    echo "" >&2
    echo -e "请选择版本更新方式:" >&2
    echo -e "  1) 补丁版本 (Patch: x.x.X)" >&2
    echo -e "  2) 次要版本 (Minor: x.X.0)" >&2
    echo -e "  3) 主要版本 (Major: X.0.0)" >&2
    echo -e "  4) 手动输入版本号" >&2
    echo -e "  5) 使用当前版本 ($current_version)" >&2
    echo "" >&2
    
    read -p "请选择 [1-5]: " choice
    
    IFS='.' read -ra VERSION_PARTS <<< "$current_version"
    major="${VERSION_PARTS[0]}"
    minor="${VERSION_PARTS[1]}"
    patch="${VERSION_PARTS[2]}"
    
    local NEW_VERSION=""
    
    case $choice in
        1)
            patch=$((patch + 1))
            NEW_VERSION="$major.$minor.$patch"
            ;;
        2)
            minor=$((minor + 1))
            NEW_VERSION="$major.$minor.0"
            ;;
        3)
            major=$((major + 1))
            NEW_VERSION="$major.0.0"
            ;;
        4)
            read -p "请输入新版本号 (格式: x.y.z): " NEW_VERSION
            if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                log_error "版本号格式无效"
                exit 1
            fi
            ;;
        5)
            NEW_VERSION="$current_version"
            log_warning "使用当前版本，将覆盖现有 release"
            read -p "确认继续? [y/N]: " confirm
            if [[ ! $confirm =~ ^[Yy]$ ]]; then
                log_info "已取消"
                exit 0
            fi
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
    
    # 只输出版本号到 stdout
    echo "$NEW_VERSION"
}

# 获取 changelog
get_changelog() {
    local version=$1
    
    # 输出到 stderr
    echo "" >&2
    echo -e "${BLUE}[INFO]${NC} 请输入此版本的 changelog (输入空行结束):" >&2
    echo "提示: 可以输入多行，每行一个更新点" >&2
    echo "" >&2
    
    local changelog=""
    while IFS= read -r line; do
        [ -z "$line" ] && break
        if [ -z "$changelog" ]; then
            changelog="$line"
        else
            changelog="$changelog\n$line"
        fi
    done
    
    if [ -z "$changelog" ]; then
        changelog="Version $version release"
    fi
    
    # 只输出 changelog 到 stdout
    echo "$changelog"
}

# 更新项目文件中的版本号
update_project_version() {
    local version=$1
    local version_with_build="${version}.0"
    
    log_info "更新 .csproj 文件版本号为 $version..."
    
    # 使用 sed 更新版本号
    sed -i.bak "s|<Version>.*</Version>|<Version>$version</Version>|" JellyfinAppleLyrics.csproj
    sed -i.bak "s|<AssemblyVersion>.*</AssemblyVersion>|<AssemblyVersion>$version_with_build</AssemblyVersion>|" JellyfinAppleLyrics.csproj
    sed -i.bak "s|<FileVersion>.*</FileVersion>|<FileVersion>$version_with_build</FileVersion>|" JellyfinAppleLyrics.csproj
    
    rm -f JellyfinAppleLyrics.csproj.bak
    
    log_success "版本号已更新"
}

# 编译项目
build_project() {
    log_info "开始编译项目..."
    
    # 清理旧的构建
    rm -rf bin/Release
    
    # 编译
    /home/snow/.dotnet/dotnet build --configuration Release
    
    if [ $? -ne 0 ]; then
        log_error "编译失败"
        exit 1
    fi
    
    log_success "编译成功"
}

# 打包 DLL
create_package() {
    local version=$1
    
    # 输出日志到 stderr
    log_info "创建 ZIP 包..." >&2
    
    local dll_path="bin/Release/net8.0/JellyfinAppleLyrics.dll"
    local zip_name="JellyfinAppleLyrics.dll.zip"
    
    if [ ! -f "$dll_path" ]; then
        log_error "找不到 DLL 文件: $dll_path" >&2
        exit 1
    fi
    
    # 创建 releases 目录
    mkdir -p releases
    
    # 打包（静默输出）
    cd bin/Release/net8.0
    zip -j "../../../releases/${zip_name}" JellyfinAppleLyrics.dll >/dev/null 2>&1
    cd ../../..
    
    log_success "ZIP 包创建成功: releases/${zip_name}" >&2
    
    # 只输出文件路径
    echo "releases/${zip_name}"
}

# 计算 MD5 校验和
calculate_checksum() {
    local file=$1
    
    # 输出日志到 stderr
    log_info "计算 MD5 校验和..." >&2
    
    local checksum=""
    if command -v md5sum &> /dev/null; then
        checksum=$(md5sum "$file" | awk '{print $1}')
    elif command -v md5 &> /dev/null; then
        checksum=$(md5 -q "$file")
    else
        log_error "无法计算 MD5 校验和" >&2
        exit 1
    fi
    
    log_success "MD5: $checksum" >&2
    
    # 只输出校验和
    echo "$checksum"
}

# 更新 manifest.json
update_manifest() {
    local version=$1
    local checksum=$2
    local changelog=$3
    local github_user="SnowSwordScholar"
    local repo_name="JellyfinAppleMusicLikeLyrics"
    
    log_info "更新 manifest.json..."
    
    local version_with_build="${version}.0"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local source_url="https://github.com/${github_user}/${repo_name}/releases/download/v${version}/JellyfinAppleLyrics.dll.zip"
    
    # 转义 changelog 中的特殊字符，并将 \n 转换为实际换行
    local escaped_changelog=$(echo -e "$changelog" | jq -Rs .)
    
    # 使用 jq 更新 manifest
    local new_version=$(jq -n \
        --arg version "$version_with_build" \
        --argjson changelog "$escaped_changelog" \
        --arg targetAbi "10.10.0.0" \
        --arg sourceUrl "$source_url" \
        --arg checksum "$checksum" \
        --arg timestamp "$timestamp" \
        '{
            version: $version,
            changelog: $changelog,
            targetAbi: $targetAbi,
            sourceUrl: $sourceUrl,
            checksum: $checksum,
            timestamp: $timestamp
        }')
    
    # 读取现有 manifest，移除旧版本（如果存在），添加新版本到开头
    jq --argjson newver "$new_version" \
       '.[0].versions = ([$newver] + (.[0].versions | map(select(.version != $newver.version))))' \
       manifest.json > manifest.json.tmp
    
    mv manifest.json.tmp manifest.json
    
    log_success "manifest.json 已更新"
}

# 提交更改
commit_changes() {
    local version=$1
    
    log_info "提交更改到 Git..."
    
    # 只提交版本文件和 manifest，不提交 releases 目录
    git add JellyfinAppleLyrics.csproj manifest.json
    git commit -m "Release version $version

- Updated version to $version
- Updated manifest.json with new release
"
    
    log_success "更改已提交"
}

# 创建 Git tag
create_tag() {
    local version=$1
    local changelog=$2
    
    local tag="v$version"
    
    log_info "创建 Git tag: $tag..."
    
    # 检查 tag 是否已存在
    if git rev-parse "$tag" >/dev/null 2>&1; then
        log_warning "Tag $tag 已存在"
        read -p "是否删除并重新创建? [y/N]: " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            git tag -d "$tag"
            git push origin ":refs/tags/$tag" 2>/dev/null || true
        else
            log_info "跳过 tag 创建"
            return
        fi
    fi
    
    # 创建带注释的 tag
    git tag -a "$tag" -m "Release $version

$changelog"
    
    log_success "Tag 创建成功"
}

# 推送到 GitHub
push_to_github() {
    local version=$1
    
    log_info "推送到 GitHub..."
    
    # 推送 commits
    git push origin main
    
    # 推送 tags
    git push origin "v$version"
    
    log_success "推送成功"
}

# 创建 GitHub Release
create_github_release() {
    local version=$1
    local changelog=$2
    local zip_file=$3
    
    log_info "创建 GitHub Release..."
    
    local tag="v$version"
    
    # 检查是否安装了 gh CLI
    if ! command -v gh &> /dev/null; then
        log_warning "未安装 GitHub CLI (gh)"
        log_info "请手动访问 GitHub 创建 Release，或安装 gh CLI"
        log_info "下载链接: https://cli.github.com/"
        return
    fi
    
    # 检查是否已登录
    if ! gh auth status &> /dev/null; then
        log_warning "未登录 GitHub CLI"
        log_info "请运行: gh auth login"
        return
    fi
    
    # 创建 release
    echo -e "$changelog" | gh release create "$tag" \
        "$zip_file" \
        --title "Release $version" \
        --notes-file - \
        --repo "SnowSwordScholar/JellyfinAppleMusicLikeLyrics"
    
    if [ $? -eq 0 ]; then
        log_success "GitHub Release 创建成功！"
        log_info "访问: https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/releases/tag/$tag"
    else
        log_error "GitHub Release 创建失败"
        log_info "请手动在 GitHub 上创建 Release 并上传文件"
    fi
}

# 主函数
main() {
    echo ""
    echo "========================================"
    echo "  Jellyfin Apple Music Lyrics Release  "
    echo "========================================"
    echo ""
    
    # 检查是否在项目根目录
    if [ ! -f "JellyfinAppleLyrics.csproj" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 检查必要工具
    check_requirements
    
    # 检查 Git 状态
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "工作目录有未提交的更改"
        git status --short
        echo ""
        read -p "是否继续? [y/N]: " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            log_info "已取消"
            exit 0
        fi
    fi
    
    # 获取版本号
    VERSION=$(get_version)
    echo ""
    log_info "目标版本: ${GREEN}$VERSION${NC}"
    
    # 获取 changelog
    CHANGELOG=$(get_changelog "$VERSION")
    
    echo ""
    echo "========================================"
    echo "发布信息确认:"
    echo "----------------------------------------"
    echo -e "版本号: ${GREEN}$VERSION${NC}"
    echo "----------------------------------------"
    echo "Changelog:"
    echo -e "${BLUE}$CHANGELOG${NC}"
    echo "========================================"
    echo ""
    
    read -p "确认发布? [y/N]: " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "已取消"
        exit 0
    fi
    
    # 更新版本号
    update_project_version "$VERSION"
    
    # 编译项目
    build_project
    
    # 打包
    ZIP_FILE=$(create_package "$VERSION")
    
    # 计算校验和
    CHECKSUM=$(calculate_checksum "$ZIP_FILE")
    
    # 更新 manifest
    update_manifest "$VERSION" "$CHECKSUM" "$CHANGELOG"
    
    # 提交更改
    commit_changes "$VERSION"
    
    # 创建 tag
    create_tag "$VERSION" "$CHANGELOG"
    
    # 推送到 GitHub
    push_to_github "$VERSION"
    
    # 创建 GitHub Release
    create_github_release "$VERSION" "$CHANGELOG" "$ZIP_FILE"
    
    echo ""
    echo "========================================"
    log_success "发布完成！"
    echo "========================================"
    echo ""
    echo -e "版本: ${GREEN}v$VERSION${NC}"
    echo "ZIP: $ZIP_FILE"
    echo "MD5: $CHECKSUM"
    echo ""
    echo "下一步:"
    echo "1. 验证 GitHub Release: https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/releases"
    echo "2. 测试下载和安装"
    echo "3. 通知用户更新"
    echo ""
}

# 运行主函数
main "$@"
