# 功能 README：release2 打包与 GitHub Release 发布

## 版本隔离

- package.json 版本为 0.2.1。
- 第一版源码入口继续保留为 main.cjs、index.html 和 renderer.js。
- release2 使用 main-v2.cjs、preload-v2.cjs、index-v2.html 和 renderer-v2.js。
- 本地构建输出到 release2/。
- 便携版文件名为 Remielle-Pet-release2-0.2.1-x64.exe。

0.2.1 是 release2 的拖动修复版本，不覆盖第一版源码。

## 检查与打包

~~~powershell
npm run check
npm run dist:portable
~~~

npm run check 会执行 v1 和 v2 单元测试、Spine 资源检查、瞳孔骨骼检查、星星图标检查、原生整窗拖动检查和版本隔离检查。

## 图标

assets/remielle-star.svg 是可编辑源文件，造型参考 v1：粉紫渐变圆角方块中放置白色四角星。scripts/generate-star-icon.mjs 生成 256 × 256 PNG；窗口、系统托盘和 Windows 打包配置统一使用 assets/remielle-star.png。

## 为什么 EXE 不直接提交进 Git

GitHub 的普通 Git 推送不适合分发较大的二进制文件，clone 或 pull 也会被无意义地拖慢。因此 `.gitignore` 忽略 release/ 和 release2/ 中的本机构建产物，源码通过 Git 推送，EXE 通过 GitHub Release 的 Assets 上传。

## 使用 GitHub CLI 发布

先完成一次 GitHub CLI 登录：

~~~powershell
gh auth login
~~~

登录后，在仓库根目录执行：

~~~powershell
gh release create release2 release2/Remielle-Pet-release2-0.2.1-x64.exe --title "release2 0.2.1" --notes-file RELEASE_NOTES_release2.md
~~~

如果 release2 标签已经存在，替换 Assets 中的同名文件：

~~~powershell
gh release upload release2 release2/Remielle-Pet-release2-0.2.1-x64.exe --clobber
~~~

## 发布前验证

1. npm run check 全部通过。
2. 分别在 70%、100%、130% 宠物尺寸下拖动宠物。
3. 拖动前后确认宠物和对话框距离不变，跨不同 DPI 显示器时也检查一次。
4. 检查设置面板、输入装饰、视线、完成动画和彩纸。
5. 启动便携 EXE，确认图标、托盘和本地资源。
6. 记录 EXE 大小与 SHA256，并同步到 README 和 EXE 使用说明。
7. 推送源码提交，再用 GitHub CLI 上传 EXE 到 Release。
