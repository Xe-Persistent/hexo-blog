---
title: 如何禁用或移除Windows Defender？
date: 2023-10-16 14:32:36
tags: 杂记
categories: 经验分享
keywords: "禁用, 移除, Windows, Defender"
description: 这篇文章用于汇总从搜索引擎上收集的禁用和卸载Windows Defender的零散方法
---
# 写在前面
这篇文章用于汇总从搜索引擎上收集的禁用Windows Defender的零散方法。由于Windows Defender杀毒效果一般，其实时保护功能有时会占用非常多的系统资源，我在每次重装系统后第一时间都会将其禁用和卸载。

> 注意：本文记录的内容仅适用于Windows 10

> 在此声明，禁用杀毒软件会导致你的系统安全处于危险之中，不建议普通用户这么操作！

# 使用组策略禁用Windows Defender
该方法的好处是可恢复，当你需要再次使用，你可以重新恢复Windows Defender。

> 注意：如果你的Windows 10是家庭版，请下载[启用Windows 10 Home组策略脚本](https://gcore.jsdelivr.net/gh/Xe-Persistent/CDN-source/file/post/remove-windows-defender/WindowsDefenderRemoveScript.zip)来安装组策略。下载解压后是一个Windows批处理文件`gpedit-enabler.bat`，请右键单击该文件，选择**以管理员权限运行**。

1. 按`WIN+R`调出运行，然后输入`gpedit.msc`，点击确定
2. 然后在策略组中依此展开**计算机管理-管理模板-Windows组件-Windows Defender**
3. 然后找到**关闭Windows Defender**，双击后设置为**已启用**，然后应用并确定即可

# 使用批处理脚本完全卸载Windows Defender
如果你想完全卸载Windows Defender，不留任何相关服务，避免和其他软件冲突，你可以使用以下方法。但是注意，此方法不可逆，如果使用了，Windows Defender就不能再恢复。

1. 下载移除Windows Defender的[专用脚本](https://gcore.jsdelivr.net/gh/Xe-Persistent/CDN-source/file/post/remove-windows-defender/gpedit-enabler.zip)
2. 下载后解压，右键单击`Uninstall.cmd`后，选择**以管理员权限运行**

脚本内容：
```bat
@echo off
cd /d "%~dp0"
echo Uninstalling ...
CLS
install_wim_tweak.exe /o /l
install_wim_tweak.exe /o /c "Windows-Defender" /r


install_wim_tweak.exe /h /o /l
echo It should be uninstalled. Please reboot Windows 10.
pause
```
该脚本是是利用`install_wim_tweak.exe`调用系统API来卸载Windows Defender这个Windows核心组件。该脚本必须以管理员权限才能正常运行。

3. 执行完成后，重启计算机，就可以看到Windows Defender已经完全消失了。与此同时，组策略中与Windows Defender有关的内容也消失了

# 关闭Windows安全中心
禁用或卸载后，如果不想在状态栏看到Windows安全中心，可以参照下面的方法将其关闭。

1. 按`WIN+R`调出运行，然后输入`regedit`，点击确定
2. 定位到`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\SecurityHealthService`
3. 在右侧找到`start`一项，双击将数值数据一栏改为**4**即可

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [如何禁用或者完全移除Windows Defender？](https://www.reneelab.com.cn/forbidden-windows-defender.html)
- [如何关闭Windows Defender](https://zhuanlan.zhihu.com/p/30675056)
