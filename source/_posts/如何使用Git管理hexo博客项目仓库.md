---
title: 如何使用Git管理hexo博客项目仓库
date: 2022-06-07 10:36:37
tags:
    - Git
    - 博客
categories: 经验分享
keywords: "Git, 博客"
---
# 前言
在日常写博客的时候，我一般会在多台电脑上写作，然后在本地生成静态页面，部署到`GitHub Page`；此外，博客的源代码也需要在多台电脑之间同步，保证在部署页面时的一致性。因此，管理好博客的远程仓库是非常有必要的。今天就和大家分享一下，我平时是如何管理hexo博客项目仓库的。

# 管理分支
hexo博客项目的使用环境为个人项目，因此无需过多关注多人协作情况下`Git`的注意事项。我们完全可以自己定义一套规矩，在写作时遵守即可。

`hexo deploy`命令会强行覆盖远程仓库的静态页面文件，因此有必要将页面文件与源代码分开存储。可以另外创建一个仓库，也可以新建一个分支，两个分支存储不同的文件。我使用的方案是新建一个分支。

## 使用不同分支
在博客的根目录下找到`_config.yml`文件，修改`deploy`配置如下：

```yml
deploy:
    type: git
    repository: // 填写你的仓库地址
    branch: master
```

这时，`hexo deploy`命令会将站点文件推送至默认的`master`分支。我们可以在`GitHub`中新建一个`hexo`分支，在本地也新建一个`hexo`分支，然后切换至`hexo`分支，将源代码`push`到远程的`origin/hexo`上，并将其设置为默认分支。这样的好处是每次执行`git clone`命令时无需关注克隆的是哪一个分支，因为默认克隆的是源代码而不是站点文件。之后，每次执行`hexo deploy`，都会创建一个提交信息为部署时间的commit，并刷新页面。

于是，`hexo`分支的提交历史反映了我们对博客的页面做出的改动，`master`分支的提交历史反映了页面的更新历史。

## 合并修改
当我在一台电脑上写作或修改源代码并推送至远程仓库后，如果要在另一台电脑上继续作业，正确的做法是先执行`git fetch`命令拉取远程仓库的代码，再执行`git pull`命令同步之前做的修改，保证一致性后再完成工作。如果我不小心忘记这一次同步呢？直接在本地继续工作，然后提交。如果修改的不是前一台电脑更改的文件，那倒不会产生什么影响，只需要补做前面同步的操作即可。如果恰好修改了前一台电脑更改的文件，那么显然会产生冲突。

在多人协助的项目中，冲突也是时有发生，我们一般会采用执行`git merge`命令然后手动解决冲突的方式，这样会在分支上产生一个分叉，然后合并，同时产生一条`merge`信息提示这里曾进行过合并，`Git`会完整记录下我们对分支进行的每一次提交。

然而，对于个人项目，我不希望我的分支产生多余的分叉，我想要让历史提交记录保持一条干净的直线，这时可以使用`git rebase`命令代替`git merge`，将本地的修改放到远程仓库上次修改的后面，使博客的更新历史既符合时间线又不产生分叉。

# 管理提交信息
上面提到，分支上的每一次提交就是博客更新的时间线。除了保证分支的提交历史清晰可辨，提交的信息也要做到言简意赅。一般来说，提交信息要写明这次提交修改了哪些内容，并尽可能地简洁，这样在浏览分支的提交历史时，能清楚地明白每次提交做了什么事情。

## 使用amend
当我在本地做了一些修改后进行了一次commit，之后又做了一些修改，想将这两次的修改合并到一个commit中，这时可以使用`--amend`参数，加到`git commit`后面，同时还能修改上一次提交时的提交信息。

如果已经将上一次修改push到了远程仓库，我们也能使用`git commit --amend`命令，但执行`git push`命令时，需要加上`--force`参数强制推送到远程仓库

使用`WebStorm`时，只需在commit界面勾选`amend`复选框即可。如果需要强制推送，在push时展开按钮选择`force push`即可。

## 使用rebase
如果需要修改前几次的提交信息，可以使用`git rebase -i`命令，具体使用方法如下：

```powershell
git rebase -i HEAD~2 // 2 表示最近两条commit
git rebase -i {commitID} // 例如 git rebase -i d95ddfb
git rebase -i --root // 表示从第一条commit开始编辑
```

> 指定`HEAD~`后面的数字表示编辑最近若干条commit  
> 指定`commit ID`表示编辑这条commit之前的记录  
> 指定--root参数表示从第一条commit开始编辑

执行rebase命令后，会出现rebase的编辑窗口，窗口底下会有提示怎么操作。

这里有几种修改选项：

- `pick`：保留该commit
- `reword`：保留该commit，但我需要修改该commit的Message
- `edit`：保留该commit，但我要停下来修改该提交(包括修改文件)
- `squash`：将该commit和前一个commit合并
- `fixup`：将该commit和前一个commit合并，但我不要保留该提交的注释信息
- `exec`：执行shell命令
- `drop`：丢弃这个commit

按字母`O`键进入编辑状态，开始修改内容。

按`Esc`键退出编辑状态，可以输入各种命令，最常用的是输入`:q`直接退出，输入`:wq`进行保存并退出。

修改完成后，执行`git push --force`命令推送至远程仓库即可。

## UI交互式rebase
上面使用命令行窗口编辑提交信息的操作非常繁琐，如果使用`WebStorm`来操作会非常简单。只需打开`Git`标签页，在中间的分支上选择你要编辑的起始commit，右键选择`Interactively Rebase From Here`，然后在弹出的窗口中编辑每一条要修改的commit即可。

## 重置代码
如果遇到严重的问题，想要强制拉取并覆盖本地代码，可以使用`git reset`将本地分支重置到远程分支的最新提交。

```powershell
git fetch --all
git reset --hard origin/hexo
```

# 使用Gitmoji
此外，我们还可以在每条提交信息前插入一些约定好的`emoji`表情，使得commit信息更加生动形象。因为是使用在`Git`里的，所以被称为`Gitmoji`。我节选了一些内容，更多用法可以参考它的[官网](https://gitmoji.dev/)。

| emoji | emoji代码                | 说明              |
|-------|------------------------|-----------------|
| 🎨    | :art:                  | 改进代码结构/代码格式     |
| ⚡️    | :zap:                  | 提升性能            |
| 🔥    | :fire:                 | 移除代码或文件         |
| 🐛    | :bug:                  | 修复bug           |
| ⏪     | :rewind:               | 回退修改            |
| 📦    | :package:              | 上传已经完成编译或者打包的项目 |
| 👽    | :alien:                | API发生改变         |
| 🚚    | :truck:                | 移动或者重命名文件       |
| 📄    | :page_facing_up:       | 添加或者升级证书        |
| 💥    | :boom:                 | 有结构性破坏的修改       |
| 🍱    | :bento:                | 添加资源            |
| 🔍    | :mag:                  | 改进搜索方式          |
| 🥅    | :goal_net:             | 发现错误            |
| 💫    | :dizzy:                | 添加了动画           |
| 🗑    | :wastebasket:          | 过期代码需要被清理       |
| 🚑    | :ambulance:            | 关键补丁            |
| ✨     | :sparkles:             | 引入新的功能          |
| 📝    | :memo:                 | 写README文档       |
| 🚀    | :rocket:               | 部署功能            |
| 💄    | :lipstick:             | 更新UI和样式文件       |
| 🎉    | :tada:                 | 初次提交            |
| 🔖    | :bookmark:             | 发行/版本标签         |
| ⬆️    | :arrow_up:             | 升级依赖            |
| ⬇️    | :arrow_down:           | 降级依赖            |
| ➕     | :heavy_plus_sign:      | 添加依赖            |
| ➖     | :heavy_minus_sign:     | 删除依赖            |
| 🔨    | :hammer:               | 重构              |
| 🐳    | :whale:                | Docker 相关工作     |
| 🔧    | :wrench:               | 修改配置文件          |
| 🌐    | :globe_with_meridians: | 国际化与本地化         |
| ✏️    | :pencil2:              | 修复typo          |

# 小结
- 博客项目使用两个分支分别存储源代码和站点文件，两个分支的提交历史分别反映了博客的页面改动与页面的更新历史；
- 使用`Git`命令可以合并commit、修改commit信息。使用`WebStorm`操作更加方便；
- 使用`Gitmoji`可以生动形象地描述commit内容。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [Rebase - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/896043488029600/1216289527823648)
- [git rebase详解](https://blog.csdn.net/weixin_42310154/article/details/119004977)
- [Git 如何修改历史 Commit message](https://zhuanlan.zhihu.com/p/401811121)
- [Git修改commit信息方法大全](https://blog.csdn.net/weixin_43314519/article/details/123317135)
