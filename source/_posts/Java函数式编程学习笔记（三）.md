---
title: Java函数式编程学习笔记（三）
date: 2022-09-30 15:58:06
tags:
    - Java
    - 开发
categories: 学习笔记
keywords: "Java, Stream"
---
# 前言
时隔三个月，我终于回归到技术博客写作中了。这段时间我经历了一个半月的应届生新员工培训，之后接续实习期间完成的工作，继续进行业务需求的开发。由于开发时实在分不出精力撰写文章，博客也被闲置了将近3个月，在此期间博客仅部署了两次平台框架版本的例行升级。

言归正传，最近在业务逻辑编写工作中用到了不少`Stream`流和`Lambda`函数。使用不同的`Stream`操作、编写不同功能的`Lambda`函数，能够输出各式各样的数据结构，从而满足业务逻辑的需求。于是写下这篇文章以作总结。这篇文章中的每个代码片段都是我在实际开发中编写的，希望能对各位有些帮助。

> Talk is cheap, show me the code.

# 经典案例

```java
Set<Integer> alarmIdSet = realTimeData.entrySet().stream().filter(it -> Objects.nonNull(it.getValue()) && it.getValue() > 0)
        .map(it -> Integer.valueOf(it.getKey()))
        .collect(Collectors.toSet());
```

这段代码是`Stream`流非常常见的使用案例，把常见的`fliter`、`map`、`collect`方法都用到了，最终将一个`Map`的`EntrySet`转换成所需条件的`KeySet`。
> 对`Stream`流不太了解的同学，可以查阅与本文同一专题的[《Java函数式编程学习笔记（二）》](https://www.dongzhenxian.com/posts/6ccb0645c089.html)。该篇文章较为详细地介绍了`Stream`流的各种操作。

# 对象List转Map

```java
Map<Long, Integer> preInspectionMap = preInspectionList.stream()
        .collect(Collectors.toMap(PreInspectionDTO::getId, PreInspectionDTO::getDeviceType));
```

如果对`Stream`有了基本的了解，那么这段代码就一目了然了，它使用`Collectors.toMap`方法取了一个`POJO`对象的两个属性分别作为`Map`的`Key`与`Value`，最终将对象`List`转换为`Map`。

值得一提的是，当`Collectors.toMap`方法有三个入参时，除了前两个入参表示`Key`和`Value`的映射方法外，第三个入参需传入一个`Lambda`，用于定义当`key`发生冲突时的处理方式。`(v1, v2) -> v2`表示如果新插入的键值对的`Key`已存在，就用这个`Key`的新`Value`替换旧`Value`。下面这段代码就符合这种场景。

```java
return apiResult.getData().stream()
        .collect(Collectors.toMap(it -> it.getMonitoredLabel() + "_" + it.getMonitoredId(),
        it -> it,
        (v1, v2) -> v2));
```

> 对`Lambda`不太了解的同学，可以查阅与本文同一专题的[《Java函数式编程学习笔记（一）》](https://www.dongzhenxian.com/posts/a798ff4a2a23.html)。该篇文章简短地介绍了Java函数式编程的概念和Java 8的`Lambda`特性。

# 分组
Stream拥有强大的分组输出操作，使用`Collectors.groupingBy`方法传入不同`Lambda`即可实现不同功能的归类。这里归纳了三种，分别是**归类为对象List**、**归类并统计数量**、**归类为对象属性List**。

## 归类为对象List

```java
Map<Long, List<SystemEventStatisticsVo>> eventGroups = systemEventStatisticsVos.stream()
        .collect(Collectors.groupingBy(SystemEventStatisticsVo::getLogtime));
```

这是最基本的归类功能，只需在`groupingBy`方法中传入POJO对象的一个属性的`Getter`方法引用，就能按这个属性分组输出`Map`，此时`Map`的`Value`数据类型为对象`List`。

## 归类并统计数量
> 基本案例

```java
Map<Long, Long> preInspectionEventMap = eventList.stream().
        collect(Collectors.groupingBy(SystemEventDTO::getObjectId, Collectors.counting()));
```

> 将方法引用替换为`Lambda`

```java
Map<String, Long> hiddenDangerMap = hiddenDangerAccountList.stream()
        .collect(Collectors.groupingBy(it -> roomIdName.get(it.getRoomId()), Collectors.counting()));
```

> 稍微复杂一点的`Lambda`，内容是条件运算

```java
Map<Integer, Long> enterpriseGroups = enterpriseList.stream().collect(
        Collectors.groupingBy(it -> Objects.isNull(it.getEnterprisefacilityinstallstatus()) ?
                -1 : it.getEnterprisefacilityinstallstatus(), Collectors.counting()));
```

这三段代码都在`groupingBy`方法中传入了一个`Collectors.counting`，用于在分组的同时统计每组元素的数量。

## 归类为对象属性List

```java
Map<Long, List<Long>> roomPreInspectionMap = preInspectionList.stream()
        .collect(Collectors.groupingBy(PreInspectionDTO::getRoomId,
                Collectors.mapping(PreInspectionDTO::getId, Collectors.toList())));
```

这段代码在`groupingBy`方法中传入了一个`Collectors.mapping`，将分组的功能改为输出对象的属性`List`，相当于在归类为对象`List`后将对象`List`额外做了一次`Stream`流的`Map`操作。

# 统计数量
Java中统计数量的逻辑可以使用`for`循环遍历集合来实现，也可以使用`Stream`的`reduce`操作来实现。

## 使用merge

```java
resultMap.merge(EquipmentTypeEnum.of(preInspectionTypeMap.get(it.getObjectId())), 1L, Long::sum);

resultMap.merge(ConfirmEventStatusEnum.of(it.getConfirmEventStatus()), 1L, Long::sum);
```

上面两段代码都是将`Map`中一个`Key`对应的`Value`作为计数器，用`merge`方法实现了累加功能，从而达到统计数量的效果。`merge`方法的三个入参分别是`Key`的取值；每次取到相同`Key`时累加的值；实现累加的`Lambda`或方法引用。

此处`merge`方法的含义为：每次取到相同的`Key`时，在这个`Key`对应的`Value`基础上加`1`。事实上`merge`不止有累加的功能，更多功能还等待着我们去发掘。

## 使用reduce

```java
Integer eventCount = eventList.stream().map(SystemEventStatisticsVo::getCount)
        .reduce(0, Integer::sum);
```

前面说到，`reduce`方法是`Stream`流的一种聚合操作，能将所有元素聚合成一个结果。这里是取了`POJO`对象的`Count`属性并做累加操作，得到所有元素`Count`属性的总和。

```java
long eventCount = roomPreInspectionList.stream().reduce(0L, (total, it) -> {
    long eventNum = Objects.isNull(preInspectionEventMap.get(it)) ? 0L : preInspectionEventMap.get(it);
    return total + eventNum;
});
```

这段代码将一段`Lambda`作为聚合方法，按聚合函数的逻辑输出一个结果。

# 使用Optional

```java
Optional<TrendDataVo> first = data.stream().filter(d -> paramsIsEquals(d, l)).findFirst();
first.ifPresent(trendDataVo -> loadCurveVo.setDataList(trendDataVo.getDataList()));
```

这段代码中，`Optional`的作用是在无法确定一个`Stream`的元素是否存在时定义的一种数据结构。当元素存在时，才执行`ifPresent`方法中的逻辑，是处理NPE或数组越界异常时替代`if`语句的更优雅的一种方法。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [使用Stream - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/1252599548343744/1322402873081889)
