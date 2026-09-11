# 功能 README：release2 打包与 EXE 发布

## 版本隔离

- package.json 版本为 0.2.0。
- 第一版源码入口继续保留为 main.cjs、index.html 和 renderer.js。
- 第二版使用 main-v2.cjs、preload-v2.cjs、index-v2.html 和 renderer-v2.js。
- 第一版产物保留在 release/。
- 第二版产物输出到 release2/。
- 便携版文件名为 Remielle-Pet-release2-0.2.0-x64.exe。

这样重新打包 release2 不会覆盖第一版 EXE。

## 检查与打包

~~~powershell
npm run check
npm run dist:portable
~~~

npm run check 会执行 v1 和 v2 单元测试、Spine 资源检查、瞳孔骨骼检查、星星图标检查和版本隔离检查。

## 图标

assets/remielle-star.svg 是可编辑源文件，造型参考 v1：粉紫渐变圆角方块中放置白色四角星。scripts/generate-star-icon.mjs 使用 Node 内置模块生成 256 × 256 的透明 PNG，不需要额外图片依赖。窗口、系统托盘和 Windows 打包配置统一使用 assets/remielle-star.png。

## 仓库中的可运行文件

.gitignore 只允许 release/*.exe 和 release2/*.exe 进入 Git，自动忽略 builder 配置、解包目录等中间产物。提交前应确认单个 EXE 小于 GitHub 100 MiB 文件上限。

普通用户应下载 release2 中的最新版。release 中的文件仅用于第一版归档。

## 发布前验证

1. npm run check 全部通过。
2. 启动开发版并检查设置面板、缩放、输入装饰、视线和拖动。
3. 完成待办，检查 d_win、c 和彩纸。
4. 启动 release2 便携 EXE，确认图标、托盘和本地资源。
5. 记录 EXE 大小与 SHA256，并写入项目交付说明。
6. 提交两个 release 目录下需要公开下载的 EXE，再推送到 GitHub。
