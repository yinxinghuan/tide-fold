# Tide Fold 技术文档

## 1. 技术栈

- Vite 6、TypeScript、原生 DOM/CSS。
- WebGPU compute + WGSL：上游 MLS‑MPM 每帧执行两次 P2G / grid update / G2P，并保留 SPH 作为 `?baseline=1` 的原始调试选项。
- WebGPU screen-space fluid rendering：粒子深度、双边深度滤波、厚度累加、Gaussian 滤波、cubemap 折射与最终合成。
- Web Audio API 负责真实触摸后的低频确认；幽灵演示不发声。
- Vite `base:'./'`，cubemap 位于 `public/cubemap/`，构建可部署到任意子路径。

## 2. 目录结构

- `main.ts`：WebGPU adapter/device/context、上游 buffer/pipeline 组装、模式切换、帧循环与产品控制器接线。
- `mls-mpm/`：原作 70,000 粒子 MLS‑MPM simulator 与六个 compute shader。
- `sph/`：原作 SPH simulator、radix grid search 和 compute shader，仅 baseline UI 可切换。
- `render/`：原作 screen-space fluid renderer 与深度、厚度、滤波、球体及最终流体 WGSL。
- `camera.ts`、`common.ts`：相机矩阵和共享 render uniforms；产品模式关闭相机输入，baseline 保持原行为。
- `product.ts`：双指捏合识别、折叠状态机、双语隐藏手势提示、音频与 WebGPU 错误恢复。
- `index.html`、`style.css`：产品轻 HUD、边界线、Material `touch_app` 引导，以及 `?baseline=1` 原作表单。
- `public/cubemap/`：上游六面环境贴图；`_qa/ui/` 保存基线、引导、释放、短屏和错误证据。

## 3. 核心模块

`main()` 固定上游默认 MLS‑MPM 中档：箱体 `[40,30,60]`、70,000 粒子、距离 70、FOV 45°、粒子半径 0.6。`MLSMPMSimulator.execute()` 每帧重复两次 clearGrid → P2G1 → P2G2 → updateGrid → G2P → copyPosition，随后 `FluidRenderer.execute()` 生成深度、厚度、滤波和折射画面。

产品模式把 `TideFoldExperience.targetRatio` 接到原 `realBoxSize[2]`；向内闭合仍沿用上游每帧最大 `-0.007`，向外恢复限为 `+0.018`。`Camera` 改用 Pointer Events 并在产品模式开启，单指/鼠标旋转；`TideFoldExperience` 只在两个触点存在时按起始距离与当前距离之差计算折叠，任一指松开即释放。状态为 `loading → idle → folding/ready → release → recovery → idle`，不自动演示。

语言优先读取 `localStorage.game_locale`，否则按 `navigator.language` 选择 zh/en。WebGPU 缺失、adapter 缺失或 `device.lost` 进入同一错误层；`?qa-error=1` 可稳定复验错误状态。`?baseline=1` 跳过产品控制器，恢复原 Box width、粒子显示、MLS‑MPM/SPH 和相机输入。

## 4. 扩展点

- 改粒子数量、箱体和原相机：`main.ts` 的 `mlsmpm*Params` 与 `camera.reset()`；改后必须重新做 baseline 对照。
- 改折叠阈值、最小宽度和恢复时间：`product.ts` 的 `.42`、`.48`、`.72`、180/1650 ms，以及 `main.ts` 的 `-.007` / `+.018`。
- 改水体材质与滤波：`render/*.wgsl` 与 `render/fluidRender.ts`；这些属于原作视觉合同，不能作为普通 UI 调参随意改动。
- 改 HUD、双尺寸构图和引导轨迹：`index.html`、`style.css`；Google Material 手指路径保持统一。
- 改音频：`product.ts` 的 `TideAudio`；AudioContext 必须继续只由真实输入唤醒。
- 改发布元数据：`meta.json`、项目 UUID meta、games 目录条目和两份 `poster.png`。
