# 霓虹搭子：RushLab（跨端 MVP）

基于 `霓虹搭子.md` 的产品方向，已搭建一个可在 iOS / Android 同步运行的 Expo React Native 项目骨架，覆盖以下核心模块：

- `4v4 能量争夺战` 快节奏对局演示（4分钟节奏 + 追击机制）
- `搭子系统`（高默契推荐、双排任务推进）
- `潮流工坊`（喷漆/贴纸/动作/称号组合 + 高光文案生成）
- `赛季与经济系统`（通行证、货币、任务、激励广告）
- `社区挑战图 + 街区团 + LiveOps` 内容循环
- 中英文切换（为后续全球化发布预留）

## 1. 安装依赖

```bash
npm install
```

PowerShell 若遇到执行策略导致 `npm` 报错，请使用：

```bash
npm.cmd install
```

## 2. 关于你看到的 npm 警告

`npm warn deprecated ...` 这类提示通常是**间接依赖**（依赖的依赖）给出的生命周期警告，不代表项目不可运行。

判断标准：

1. `npm install` 是否最终成功（你的是成功：`added 863 packages`）
2. `npm audit` 是否存在运行时高危漏洞

本项目当前检查结果为 `0 vulnerabilities`（高危为 0），所以不需要为了这些 warning 立即改业务代码。

## 3. 启动开发服务

```bash
npm run start
```

或：

```bash
npm.cmd run start
```

## 4. 安卓真机试玩（不是 Expo Go 预览）

你要的是“可安装试玩”，推荐两条路径：

### 路径 0（最省心）：GitHub 自动打 APK

如果本地环境总是卡构建，直接走 GitHub Actions：

1. 把代码推到 GitHub 仓库。
2. 进入仓库 `Actions` -> `Build Android APK` -> `Run workflow`。
3. 构建完成后在该任务的 `Artifacts` 下载 `rushlab-neonbuddy-debug-apk`。
4. 把 APK 传到安卓手机安装即可试玩。

补充：

- 已支持 tag 发布：推送 `v1.0.0` 这类 tag 后，工作流会自动把 APK 挂到 GitHub Release。
- 工作流文件：`.github/workflows/android-apk.yml`

### 路径 A：本地开发包（USB 直装，调试最快）

前提：

1. 安装 Android Studio（含 SDK、platform-tools）
2. 手机开启开发者选项 + USB 调试
3. `adb devices` 能看到设备

执行：

```bash
npm run android
```

说明：

- 这会安装一个原生 Android App 到你的手机（不是 Expo Go）
- 但开发包运行时仍会连接本机 Metro 服务（适合边改边玩）

### 路径 B：生成 APK 安装包（更接近测试发行）

项目已加入 `eas.json`，可直接打 internal APK。

1. 登录 Expo 账号：

```bash
npx eas-cli login
```

2. 触发 Android 内测包构建：

```bash
npx eas-cli build -p android --profile preview
```

3. 构建完成后下载 `.apk`，安装到安卓手机即可试玩（不依赖 Expo Go）。

### 路径 C：本地离线构建 APK（绕过 EAS 上传网络问题）

如果你在 EAS 上传阶段反复遇到 `ECONNRESET`，可直接本地打包：

1. 先执行（已做过可跳过）：

```bash
npx expo prebuild --platform android
```

2. 直接在项目根目录执行：

```bash
npm run android:release
```

3. 构建完成后，APK 路径：

```text
android/app/build/outputs/apk/release/app-release.apk
```

4. 安装到真机（USB 调试开启）：

```bash
npm run android:release:install
```

## 5. 常见报错处理（你当前遇到的）

1. `bash: .\\gradlew.bat: command not found`

- 你在 Git Bash 里用了 PowerShell 风格路径。
- 用 `./gradlew.bat`，或直接用 `npm run android:release`（推荐）。

2. `bash: adb: command not found`

- 未安装 Android SDK Platform-Tools 或未配置 PATH。
- 安装 Android Studio 后确保安装：
  - Android SDK Platform-Tools
  - Android SDK Build-Tools
  - Android SDK Command-line Tools

3. `java: command not found`

- 未安装 JDK，或 `JAVA_HOME` 未配置。
- 可用 Android Studio 自带 JBR 作为 Java 运行时。

4. `Failed to upload ... ECONNRESET`（EAS）

- 网络到 `storage.googleapis.com` 中断，和项目代码无关。
- 解决：换网络/VPN 后重试，或改用上面的“路径 C 本地离线构建”。

## 6. iOS 运行

1. 需要 macOS + Xcode（Windows 上无法本地编译 iOS）
2. 在 macOS 上拉取本项目后执行：

```bash
npm run ios
```

## 7. 项目结构

```text
.
├── App.tsx
├── eas.json
├── src
│   ├── components
│   ├── data
│   ├── screens
│   ├── store
│   ├── theme
│   └── types
└── 霓虹搭子.md
```

## 8. 迭代建议（下一步）

1. 对接实时联网对战（Photon/Firebase/自建网关）
2. 增加账号体系与云存档
3. 接入埋点与 A/B 实验平台
4. 接入推送与召回运营链路
