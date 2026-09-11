# 功能 README：安装、打包与发布

## 安装依赖

```powershell
npm install
```

`postinstall` 会把 Spine Player 的压缩 JS/CSS 复制到 `vendor/`。该目录必须存在才能通过资源检查或运行桌宠。

## 本地检查

```powershell
npm run check
```

检查内容包括纯逻辑单元测试、Spine 4.2 版本、八个必需动画、atlas 贴图引用、备用图片和本地运行库。

## Windows 构建

```powershell
npm run dist
```

生成可选择安装目录的 NSIS 安装包。便携版使用：

```powershell
npm run dist:portable
```

产物位于 `release/`。构建配置在 `package.json` 的 `build` 字段中，应用图标暂用 `spine/read.png`。

## 发布前检查清单

1. 确认 Spine Runtime 许可和全部角色素材授权适用于发布场景。
2. 在目标 Windows 版本上验证透明窗口、系统托盘和鼠标穿透。
3. 验证高 DPI、双显示器及显示器断开后的位置恢复。
4. 安装包如对外分发，建议加入代码签名以减少 Windows 安全提示。

## Windows 符号链接权限

`electron-builder` 首次解压 `winCodeSign` 时，可能因其中附带的 macOS 符号链接而提示“客户端没有所需的特权”。这不是项目代码或签名证书错误。启用 Windows“开发者模式”后重新构建，或从管理员终端运行构建命令即可。该工具在本项目中只用于写入 EXE 图标和版本信息；未配置证书时会明确显示 `signing is skipped`。
