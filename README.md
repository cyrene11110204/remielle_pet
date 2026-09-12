# 蕾米桌宠

一个 Windows 透明桌宠：使用项目内的 Spine 4.2 动画展示蕾米，在头顶提供粉色渐变待办对话框，并把待办和个性化设置保存在本机。

当前版本为 0.2.1 / release2。第一版源码继续保留；0.2.1 是修复透明窗口拖动分层问题的 release2 补丁版，不覆盖第一版。

## 直接下载使用

不需要安装 Node.js，也不需要会编程。打开 [GitHub Releases](https://github.com/cyrene11110204/remielle_pet/releases)，在最新版的 Assets 中下载 `Remielle-Pet-release2-0.2.1-x64.exe`，然后双击运行。

第一次使用请阅读：[EXE 使用说明](EXE使用说明.md)。第一版源码仍保留在仓库历史中，普通用户请下载功能更完整的 release2。

release2 0.2.1 发布文件：

- 文件：`Remielle-Pet-release2-0.2.1-x64.exe`
- 大小：90,434,814 字节（约 86.25 MiB）
- SHA256：`9E649E9569FFACF5987CABB8603963D90F870B5C2F83FBE66E2E0DC942B39E41`

## release2 功能

- 设置按钮：分别调整宠物与备忘框大小、开关视线跟随，自选悬浮操作栏中的创作、灯光和隐藏按钮。
- 清爽桌面：操作栏不使用时完全隐藏，只保留宠物和待办事项。
- 动画轮换：新增待办后在拿笔创作和抬头思考反馈之间轮换。
- 完成庆祝：播放 `d_win -> c` 动画，同时落下粉色、紫色和黄色彩纸。
- 输入趣味：输入待办时播放思考动作，并冒出问号、四角星、爱心、思考气泡和铅笔，装饰层不会占用 Spine 动画轨道。
- 视线追踪：使用模型的两只瞳孔微动骨骼跟随全屏鼠标，创作和庆祝动画中自动减弱。
- 自由拖动：待办标题和宠物身体都使用 Electron 的 Windows 原生拖动区域，由系统把整扇透明窗口作为一个表面移动。
- 紧凑布局：备忘框会随两个缩放比例保持在宠物头顶附近；拖动不再逐帧重绘分离图层，因此两者不会越拖越远。
- 粉色四角星图标：窗口、托盘和打包程序统一使用清单标题旁粉紫渐变圆角方块 + 白色四角星的图标。
- 本地保存：待办、窗口位置、宠物大小、备忘框大小和其他设置重启后继续保留。

## 动画分配

| 动画 | 用途 |
| --- | --- |
| `a` | 默认思考、鼠标离开后的基础状态 |
| `a_win` | 新增待办后的拿笔准备反馈，与抬头思考轮换 |
| `b` | 抬头思考、输入待办时的反馈 |
| `c` | 看着本子高兴、待办完成后的庆祝状态 |
| `d` | 开始创作、创作模式循环 |
| `d_win` | 创作完成或待办完成后的完成反馈 |
| `e` | 可爱又可怜地抬头，用于悬停变化和隐藏前反馈 |
| `light` | 开灯叠加动画，由悬浮操作栏控制 |

## 使用设置

点击待办框右上方的设置按钮即可：

- 宠物大小和备忘框大小都可在 70% 到 130% 之间独立调整；
- 可关闭视线跟随；
- 可决定悬浮操作栏是否显示开始创作开灯和隐藏；
- 可一键恢复默认设置。

操作栏只在鼠标悬停宠物时出现。拖动待办标题空白处或直接拖动宠物，都能移动整个桌宠窗口。

## 本地开发

需要 Node.js 20 或更高版本：

```powershell
npm install
npm start
```

运行自动检查：

```powershell
npm run check
```

生成无需安装的便携 EXE：

```powershell
npm run dist:portable
```

产物位于 `release2/`。Spine Player 浏览器运行文件保存在 `vendor/`，应用运行时不依赖 CDN。

## 功能文档

第一版文档继续保留在 `docs/features/`。release2 新增文档：

- [设置与个性化](docs/features/settings-and-customization.md)
- [动画反馈、Emoji 与彩纸](docs/features/feedback-effects.md)
- [视线跟踪与窗口拖动](docs/features/gaze-and-drag.md)
- [release2 打包与 EXE 发布](docs/features/build-and-release2.md)

## 主要目录

```text
assets/                release2 星星图标
release/               第一版可运行 EXE
release2/              第二版可运行 EXE
scripts/               素材与发布校验脚本
spine/                 Spine 动画素材
src/main/              Electron 主进程与预加载脚本
src/renderer/          v1、v2 页面和交互
src/shared/            待办、设置和动画状态逻辑
tests/                 自动测试
vendor/                本地 Spine Player 运行文件
```

## 素材来源

Spine 动画素材来源：[Bilibili BV1NAKN6MEHi](https://www.bilibili.com/video/BV1NAKN6MEHi)。

应用使用 Spine Runtime，发布与再分发时应同时遵守 Esoteric Software 的运行库许可及素材来源页面标注的要求。