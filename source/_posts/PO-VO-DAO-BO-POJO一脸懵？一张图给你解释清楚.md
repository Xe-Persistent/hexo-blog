---
title: PO、VO、DAO、BO、POJO一脸懵？一张图给你解释清楚
date: 2023-04-25 16:37:07
tags: 
    - Java
categories: 经验分享
keywords: "PO, VO, DAO, BO, POJO, Java, Bean"
copyright: false
---
# 前言
《阿里巴巴Java开发规范》关于领域模型的部分介绍如下：

## 分层领域模型规约

- DO(Data Object)
: 此对象的属性与数据库表结构一一对应，通过`DAO`层向上传输数据源对象。

- DTO(Data Transfer Object)
: 数据传输对象，`Service`或`Manager`向外传输的对象。

- BO(Business Object)
: 业务对象，由`Service`层输出的封装业务逻辑的对象。

- AO(ApplicationObject)
: 应用对象，在`Web`层与`Service`层之间抽象的复用对象模型，极为贴近展示层，复用度不高。

- VO(View Object)
: 显示层对象，通常是`Web`层向模板渲染引擎层传输的对象。

- Query
: 数据查询对象，各层接收上层的查询请求。注意超过`2`个参数的查询封装，禁止使用`Map`类来传输。

## 领域模型命名规约

- 数据对象
: `xxxDO`，`xxx`即为数据表名。

- 数据传输对象
: `xxxDTO`，`xxx`为业务领域相关的名称。

- 展示对象
: `xxxVO`，`xxx`一般为网页名称。

- `POJO`是`DO/DTO/BO/VO`的统称，禁止命名成`xxxPOJO`。

先看一张各个对象间的关系图，有个印象：

![Java Bean关系图](https://testingcf.jsdelivr.net/gh/Xe-Persistent/CDN-source/image/post/java-beans/java-beans.webp)

然后，再来慢慢解释各个对象的作用。

# Java Bean
## VO
> View Object的缩写

用于表示前端的展示对象；相比与`PO`（数据库映射对象），`VO`对象与前端交互的数据可能需要经过过滤、拆分、聚合等操作；比方说部分不需要展示的数据，`VO`层将其剔除后返回；如果数据来源于多个地方，也将会在`VO`对象进行聚合再返回。

遵循Java Bean的规范，其拥有`Getter/Setter`方法。

## DTO
> Data Transfer Object的缩写

数据传输对象；`DTO`主要协调于各个服务之间，用于数据的转换和传输；比如，数据库有`20`个字段，但实际业务只需要`5`个，那么就可以借助`DTO`对`PO`对象进行传输；避免数据库结构的暴露，并减少不必要的数据交互。

遵循Java Bean的规范，其拥有`Getter/Setter`方法。

## BO
> Business Object的缩写

表示一个业务对象；`BO`包含了一些业务逻辑，通常用于封装对`DAO`、`RPC`等相关的调用，同时还可以进行`PO`、`VO`、`DTO`之间的数据转换；

`BO`通常都是位于业务层，并提供了基本的业务操作；在设计上属于被服务层业务逻辑调用的对象，一段业务的执行，可能需要多个`BO`对象的相互配合才能完成。

## PO
> Persistent Object的缩写

表示着Java对象与数据库之间的映射关系；其仅用于表示数据，并没有任何的数据操作；

遵循Java Bean的规范，其拥有`Getter/Setter`方法。

## DAO
> Data Access Object的缩写

通过`DAO`配合`PO`对象进行数据库访问，其中包含了增删改查等一系列的数据库操作，`DAO`一般在持久层，其完全封装了数据库的行为，并对外提供方法，上层通过它访问数据完全不需要关心数据库的任何信息。

## POJO
> Plain Ordinary Java Object的缩写

表示一个简单Java对象；一个Java类只要遵循Java Bean的规范，并赋予`Getter/Setter`方法，就是一个`POJO`；

只是在不用的场景，不同的功能和定义下，`POJO`会演变为`PO`、`VO`、`DTO`等。

---
**非常感谢你的阅读，辛苦了！**

---
本文转自微信公众号「一行Java」
