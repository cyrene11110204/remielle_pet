# 蕾米桌宠

一个 Windows 透明桌宠：使用项目内的 Spine 4.2 动画展示蕾米，在头顶提供粉色渐变待办对话框，并把待办保存在本机。

## 快速开始

需要 Node.js 20 或更高版本。

```powershell
npm install
npm start
```

常用命令：

```powershell
npm test           # 运行待办和动画状态机测试
npm run check      # 测试并检查 Spine 资源
npm run dist       # 生成 Windows NSIS 安装包
npm run dist:portable # 生成便携版
```

构建产物位于 `release/`。首次 `npm install` 会把 Spine Player 4.2 的浏览器运行文件复制到 `vendor/`，因此运行时不依赖 CDN 或网络。

## 使用方式

- 在对话框输入待办并按回车或 `＋` 添加。
- 点击待办左侧圆框切换完成状态，移入后可点右侧 `×` 删除。
- 鼠标移到蕾米身上会从思考切换为抬头思考；持续悬停会切换为可怜可爱的抬头动作。
- 点击“开始创作”播放拿笔准备和创作动画，再次点击播放创作完成与高兴动画。
- 点击 `☼` 开灯或关灯；点击 `–` 隐藏到系统托盘。
- 拖动对话框标题栏可移动桌宠，右键桌宠或托盘图标可打开系统菜单。

## 功能文档

- [桌面窗口与托盘](docs/features/desktop-window.md)
- [Spine 动画状态机](docs/features/spine-animation.md)
- [待办事项对话框](docs/features/todo-dialog.md)
- [交互、数据与无障碍](docs/features/interaction-and-data.md)
- [打包与发布](docs/features/build-and-release.md)

## 项目结构

```text
spine/                 Spine 工程、JSON、图集与备用图片
src/main/              Electron 主进程、透明窗口、托盘与安全 IPC
src/renderer/          桌宠界面、样式和交互
src/shared/            可测试的待办存储与动画状态机
scripts/               运行库复制、资源校验脚本
tests/                 Node 内置测试
docs/features/         每项功能对应的 README 文档
vendor/                安装依赖后生成的本地 Spine Player 文件
```

## 素材与运行库说明

应用只读取 `spine/Q蕾米.json`、`spine/leimi.atlas`、`spine/leimi.png` 和 `spine/read.png`；`.spine` 源工程保留用于后续编辑。Spine Runtime 的使用需遵守 Esoteric Software 的运行库许可，发布者也应确认拥有角色美术及动画素材的使用权。
