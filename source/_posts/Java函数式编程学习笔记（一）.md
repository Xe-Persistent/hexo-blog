---
title: Java函数式编程学习笔记（一）
date: 2022-05-20 15:14:47
tags:
    - Java
    - 开发
categories: 学习笔记
keywords: "Java, Lambda"
description: 本文记录了我从初次接触Java函数式编程和Lambda表达式到开始在实际项目中运用这段时间的学习过程
---
# 前言
最近在项目中需要使用一些基于MyBatis-Plus封装的CRUD接口，阅读一些文档和代码后发现在Java代码中偶尔会见到C++代码里的**类作用域符号**`::`和`->`**运算符**，查阅资料才了解到这两个符号在Java领域里属于函数式编程的语法内容，于是写下这篇博客以记录这段时间的学习过程。

# Java函数式编程
## 什么是函数式编程？
函数式编程是一种**抽象程度很高**的编程范式，纯粹的函数式编程语言编写的函数没有变量，因此，任意一个函数，只要输入是确定的，输出就是确定的，这种函数我们称为**没有副作用的函数**。而允许使用变量的程序设计语言，由于函数内部的变量状态不确定，同样的输入，可能得到不同的输出，因此，这种函数是**有副作用的**。

函数式编程的一个特点就是，允许把**函数本身**作为参数传入另一个函数，还允许返回一个函数。函数式编程是把函数作为**基本运算单元**，函数可以作为变量，可以接收函数，还可以返回函数。

历史上研究函数式编程的理论是**Lambda演算**，所以我们经常把支持函数式编程的编码风格称为**Lambda表达式**。

## Lambda表达式
Lambda表达式是表示可传递**匿名函数**的一种简洁方式，Lambda表达式没有名称，但是有参数列表、函数主体、返回类型，还可能有一个可以抛出的异常列表。它是Java 8新增的特性，有了它，我们再也不用像以前那样写一堆笨重的匿名类代码了。

在Java中，我们经常遇到**单方法接口**，即***一个接口***只定义了***一个方法***，例如：

> - Comparator
>
> - Runnable
>
> - Callable

对于单方法接口，我们称之为`FunctionalInterface`，用**注解**`@FunctionalInterface`标记。以`Comparator`为例，我们想要调用`Arrays.sort()`时，可以传入一个`Comparator`实例，以匿名类方式编写如下：

```java
Arrays.sort(array, new Comparator<String>() {
　　public int compare(String s1, String s2) {
　　    return s1.compareTo(s2);
　　}
});
```

上述写法非常繁琐。从Java 8开始，我们可以用Lambda表达式替换单方法接口。改写上述代码如下：

```java
Arrays.sort(array, (s1, s2) -> {
　　return s1.compareTo(s2);
});
```

观察Lambda表达式的写法，它只需要写出**方法定义**：

```java
(s1, s2) -> {
　　return s1.compareTo(s2);
}
```

其中，参数是`(s1, s2)`，参数类型可以省略，因为编译器可以**自动推断出`String`类型**。`-> { ... }`表示方法体，所有代码写在内部即可。Lambda表达式没有`class`定义，因此写法非常简洁。

如果只有一行`return ...`的代码，可以用更简单的写法，即**省略方法体的括号**：

```java
Arrays.sort(array, (s1, s2) -> s1.compareTo(s2));
```

## 方法引用
方法引用是Java8中引入的新特性，它提供了一种**引用方法而不执行方法**的方式，可以让我们重复使用现用方法的定义，作为某些Lambda表达式的另一种更简洁的写法。

当你需要方法引用时，将目标引用放在**分隔符**`::`前，方法的名称放在**分隔符**`::`后。方法名称后**不需要加括号**，因为我们并没有实际调用它。方法引用提高了代码的可读性，也使逻辑更加清晰。

可以构建方法引用的场景有四种：

### 静态方法
指向**静态方法**的引用，语法：`类名::静态方法名`，类名放在**分隔符**`::`前，静态方法名放在**分隔符**`::`后。例如：

```java
(String str) -> Integer.parseInt(str)
```

使用方法引用以后，可以简写为：

```java
Integer::parseInt
```

### 内部对象的实例方法
指向Lambda表达式**内部对象**的实例方法的引用，语法：`类名::实例方法名`，类名放在**分隔符**`::`前，实例方法名放在**分隔符**`::`后。例如：

```java
(Equipment equipment) -> equipment.getBrand()
```

使用方法引用以后，可以简写为：

```java
Equipment::getBrand
```

### 外部对象的实例方法
指向Lambda表达式**外部对象**的实例方法的引用，语法：`实例名::实例方法名`，类名放在**分隔符**`::`前，实例方法名放在**分隔符**`::`后。例如：

```java
String type = "STR";
Predicate<String> predicate = (String str) -> type.equals(str);
System.out.println(predicate.test("STR"));
```

其中，`type`是一个Lambda表达式外部的局部变量，使用方法引用以后，可以简写为：

```java
String type = "STR";
Predicate<String> predicate = type::equals;
System.out.println(predicate.test("STR"));
```

### 构造方法
指向**构造方法**的引用，语法：`类名::new`，类名放在**分隔符**`::`前，new放在**分隔符**`::`后。例如：

```java
(String brand, String type) -> new Equipment(brand, type)
```

使用方法引用以后，可以简写为：

```java
Equipment::new
```

# 应用
## 背景
在一个数据库表中，存在**一对多**的E-R关系，对父表新增一条数据时，子表的若干条数据需要关联父表的这行数据；进一步地，需要在对父表删除一行数据时，与其关联的若干条要被**同步删除**，以保证数据之间的约束。

## 思路
首先分析父表与子表的关联关系，找出子表是与父表的哪一个字段关联的，这样即可根据父表的字段找到子表的数据，随后即可删除子表的数据。在编写业务逻辑时需注意：先删除子表数据，后删除父表数据。

## 应用场景
使用其他业务方法得到一个由子表数据组成的实体数组时，需要根据每个实体的`id`进行删除。传统的写法是使用`for`循环遍历这个数组，在循环体中写一行sql语句删除逐行数据，这种写法需要创建多个临时变量储存临时数据，较为繁琐，也显得代码块较为臃肿。利用Java函数式编程的新特性即可简化代码。

## 解决方案
创建`Stream`储存该实体数组进行流式处理，代替`for`循环，使用`map`将数组中的每个实体转换为实体对应的`id`。`map`方法又可接收`Function`接口对象的方法引用，无需创建实例即可引用方法，进一步减少了代码量。

## 实例
假设已得到一个实体数组：
```java
List<EmissionCalcParamDTO> emissionCalcParams
```

现调用一个入参为数组的`deleteBatchIds()`方法，它是MyBatis-Plus提供的接口，用于删除多行数据。调用前需先判断数组是否为空，写法如下：

```java
if (CollectionUtils.isNotEmpty(emissionCalcParams)) {
    emissionSourceCalcParamMapper.deleteBatchIds(emissionCalcParams.stream()
        .map(EmissionCalcParamDTO::getId)
        .collect(Collectors.toList()));
}
```

上面的代码在把实体转换为`id`后又将其组合成数组，作为`deleteBatchIds()`的入参，可以说用一行代码解决了传统写法十几行的工作量。
> 注意，上述编码过程中还使用到了`Stream`流和`map`方法，并使用`MyBatis-Plus`简化数据库操作，上述代码基于`Spring Boot`框架进行编写。对于上述使用到的技术，我将在后面的文章中详细介绍。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [函数式编程 - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/1252599548343744/1255943847278976)
