---
title: 实战pgBackRest
date: 2023-05-11 16:21:50
tags:
    - 服务器
    - 数据库
categories: 经验分享
keywords: "PostgreSQL, pgBackRest, 备份"
---
pgBackRest是一款开源的备份还原工具，目标旨在为备份和还原提供可靠易用的备份。

操作系统：CentOS 7.9
pgBackRest版本：v2.37
PostgreSQL版本：v11.5

# 约定
本文中使用两台服务器分别作为数据库服务器和备份服务器，数据库服务器主机命名为pg-primary、备份服务器主机命名为repository。

为了方便后续维护，在两台服务器上修改hosts文件，每台服务器添加一条ip为对方服务器的host记录：

```bash
$ sudo vim /etc/hosts
```

在数据库服务器上添加以下记录：

```
repository-server-ip repository
```

其中`repository-server-ip`为备份服务器ip，例如：`10.12.137.123 repository`

在备份服务器上添加以下记录：

```
database-server-ip pg-primary
```

其中`database-server-ip`为数据库服务器ip，例如：`10.12.137.29 pg-primary`

# 配置步骤

1. 将pgBackRest源代码编译成二进制文件pgbackrest。（编译过程略）

2. 为了避免与postgres用户混淆，在备份服务器上创建用户pgbackrest

```bash
$ sudo groupadd pgbackrest
$ sudo adduser -g pgbackrest -n pgbackrest
```

为pgbackrest用户设置一个密码

```bash
$ sudo passwd pgbackrest
```

3. 将pgbackrest二进制文件部署到/usr/bin目录下，并赋予访问权限

```bash
$ sudo chmod 755 /usr/bin/pgbackrest
$ sudo chown pgbackrest:pgbackrest /usr/bin/pgbackrest
```

4. 在备份服务器上创建pgBackRest配置文件、目录和仓库

```bash
$ sudo mkdir -p -m 770 /var/log/pgbackrest
$ sudo chown pgbackrest:pgbackrest /var/log/pgbackrest
$ sudo mkdir -p /etc/pgbackrest
$ sudo mkdir -p /etc/pgbackrest/conf.d
$ sudo touch /etc/pgbackrest/pgbackrest.conf
$ sudo chmod 640 /etc/pgbackrest/pgbackrest.conf
$ sudo chown pgbackrest:pgbackrest /etc/pgbackrest/pgbackrest.conf
$ sudo mkdir -p /var/lib/pgbackrest
$ sudo chmod 750 /var/lib/pgbackrest
$ sudo chown pgbackrest:pgbackrest /var/lib/pgbackrest
```

5. 在备份服务器上使用pgbackrest用户生成ssh密钥

```bash
$ sudo -u pgbackrest mkdir -m 750 /home/pgbackrest/.ssh
$ sudo -u pgbackrest ssh-keygen -f /home/pgbackrest/.ssh/id_rsa -t rsa -N ""
```

在数据库服务器上使用postgres用户生成ssh密钥

```bash
$ sudo -u postgres mkdir -m 750 -p /var/lib/pgsql/.ssh
$ sudo -u postgres ssh-keygen -f /var/lib/pgsql/.ssh/id_rsa -t rsa -N ""
```

> 注意：pgbackrest用户的主目录是/home/pgbackrest；postgres用户的主目录是/var/lib/pgsql。最好将ssh密钥生成在各自用户的主目录下。

6. 在两台服务器之间交换公钥

在备份服务器上：

```bash
$ cat /home/pgbackrest/.ssh/id_rsa.pub | ssh postgres@pg-primary "cat >> ~/.ssh/authorized_keys"
```

在数据库服务器上：

```bash
$ cat /var/lib/pgsql/.ssh/id_rsa.pub | ssh pgbackrest@repository "cat >> ~/.ssh/authorized_keys"
```

7. 在两台服务器上测试无密码连接

在备份服务器上：

```bash
$ sudo -u pgbackrest ssh postgres@pg-primary
```

在数据库服务器上：

```bash
$ sudo -u postgres ssh pgbackrest@repository
```

8. 配置备份服务器

```bash
$ sudo vim /etc/pgbackrest/pgbackrest.conf
```

写入下列配置项：

```
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
log-level-console=info
log-level-file=detail
start-fast=y
stop-auto=y
delta=y

[db1]
pg1-database=Matterhorn_HNHB
pg1-path=/var/lib/pgsql/11/data
pg1-host=10.12.137.29
pg1-port=25433
pg1-user=postgres
```

9. 配置数据库服务器，步骤与配置备份服务器相似

先部署pgbackrest二进制文件、然后创建目录：

```bash
$ sudo chmod 755 /usr/bin/pgbackrest
$ sudo mkdir -p -m 770 /var/log/pgbackrest
$ sudo chown postgres:postgres /var/log/pgbackrest
$ sudo mkdir -p /etc/pgbackrest
$ sudo mkdir -p /etc/pgbackrest/conf.d
$ sudo touch /etc/pgbackrest/pgbackrest.conf
$ sudo chmod 640 /etc/pgbackrest/pgbackrest.conf
$ sudo chown postgres:postgres /etc/pgbackrest/pgbackrest.conf
$ sudo mkdir -p /var/lib/pgbackrest
$ sudo chmod 750 /var/lib/pgbackrest
$ sudo chown postgres:postgres /var/lib/pgbackrest
```

再写入配置项：

```bash
$ sudo vim /etc/pgbackrest/pgbackrest.conf
```

写入下列配置项：

```
[global]
repo1-host=10.12.137.124
repo1-host-user=pgbackrest
repo1-path=/var/lib/pgbackrest
log-level-console=info
log-level-file=detail

[db1]
pg1-path=/var/lib/pgsql/11/data
```

10. 在数据库服务器上，更新postgresql.conf文件

```bash
$ sudo vim /var/lib/pgsql/11/data/postgresql.conf
```

找到对应配置项，进行如下更改：

```
archive_mode = on
archive_command = 'pgbackrest --stanza=db1 archive-push %p'
wal_level = replica
```

然后重启postgresql服务

```bash
$ systemctl restart postgresql-11.service
```

# 备份步骤

## 执行备份

在备份服务器上创建节点

```bash
$ sudo -u pgbackrest pgbackrest --stanza=db1 stanza-create
```

检查配置和节点信息

```bash
$ sudo -u pgbackrest pgbackrest --stanza=db1 check
```

在备份服务器上创建第一份备份，该备份为全量备份

```bash
$ sudo -u pgbackrest pgbackrest --stanza=db1 backup
```

数据库修改后，创建第二份备份，该备份为增量备份

```bash
$ sudo -u pgbackrest pgbackrest --stanza=db1 backup
```

可通过以下命令查看备份节点的情况

```bash
$ sudo -u pgbackrest pgbackrest --stanza=db1 info
```

## 定时备份

现场环境可以考虑配置一个定时任务来定时执行数据备份。linux内置的cron进程能帮我们实现这些需求，cron搭配shell脚本，非常复杂的指令也没有问题。

`crontab`是用于管理linux定时任务的命令。`crontab`命令语法如下：

```
crontab [-u username]  // 省略用户表示操作当前用户的crontab
    -e      (编辑工作表)
    -l      (列出工作表里的命令)
    -r      (删除工作表)
```

crontab使用的cron表达式和java相比有一些差别，crond不能指定秒，时间格式如下：

```
f1 f2 f3 f4 f5 program
```

其中`f1`是表示分钟，`f2`表示小时，`f3`表示一个月份中的第几日，`f4`表示月份，`f5`表示一个星期中的第几天，`program`表示要执行的程序或shell脚本。

当`f1`为`*`时表示每分钟都要执行，`f2`为`*`时表示每小时都要执行，其余依此类推。

当`f1`为`a-b`时表示从第a分钟到第b分钟这段时间内要执行，`f2`为`a-b`时表示从第a到第b小时都要执行，其余依此类推。

当`f1`为`*/n`时表示每n分钟执行一次，`f2`为`*/n`表示每n小时执行一次，其余依此类推。

当`f1`为`a, b, c, ...`时表示第a, b, c, ...分钟要执行，`f2`为`a, b, c, ...`时表示第a, b, c, ...个小时要执行，其余依此类推。


## 执行还原

最基本的还原命令如下：

```bash
$ sudo -u postgres pgbackrest --stanza=demo restore
```

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [pgBackRest User Guide](https://pgbackrest.org/user-guide.html)
