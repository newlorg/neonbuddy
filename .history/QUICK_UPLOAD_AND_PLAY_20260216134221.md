# 快速上传并手机试玩（最简版）

## 1. 在 GitHub 新建仓库

1. 打开 GitHub，点击 `New repository`
2. 仓库名建议：`neonbuddy`
3. 不勾选 `Add README`、`.gitignore`、`license`
4. 创建完成后，复制仓库地址（HTTPS）

## 2. 把这个压缩包内容解压到一个新文件夹

例如：`C:\dev\neonbuddy`

## 3. 推送到 GitHub

在该文件夹打开终端，执行：

```bash
git init
git add .
git commit -m "init neonbuddy app"
git branch -M main
git remote add origin https://github.com/<你的用户名>/neonbuddy.git
git push -u origin main
```

## 4. 在 GitHub 自动打 APK

1. 打开仓库 `Actions`
2. 选择 `Build Android APK`
3. 点击 `Run workflow`
4. 等待构建完成（约 5-15 分钟）
5. 在该次任务页下载 `Artifacts`：
   - `rushlab-neonbuddy-debug-apk`

## 5. 手机安装试玩

1. 把下载的 APK 发到手机
2. 手机上点击安装（首次需要允许“安装未知应用”）
3. 安装后打开应用，即可试玩

## 6. 常见问题

1. Actions 构建失败：点开失败日志发给我，我可以继续帮你修。
2. 手机提示“禁止安装”：在手机设置里开启对应应用来源的安装权限。
