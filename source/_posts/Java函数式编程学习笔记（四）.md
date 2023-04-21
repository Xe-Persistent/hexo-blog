---
title: Java函数式编程学习笔记（四）
date: 2023-01-28 14:17:45
tags:
    - 后端
    - Java
    - Stream
categories: 学习笔记
keywords: "Java, Stream"
---
# 前言
前段时间，我参与了一些Java统计程序的编写，同时开发了获取这些统计结果的接口。在这些逻辑中，我大量使用`Stream`流对数据进行分类、筛选、整理和统计，使用到了和之前有所不同的`Stream`操作，在这里进行总结。

# 统计合计值
统计总和是统计程序或页面展示数据里常见的内容，与之前所讲的统计数量不同的是，总和的概念不局限于元素的数量，它还可能是元素一个字段数据的合计，这时仅使用`Collectors.counting()`是不能满足需求的。因此，此处引入了针对`IntStream`、`LongStream`和`DoubleStream`的`sum()`方法以及`summingInt()`、`summingLong()`方法满足业务需求。
## 直接输出

```java
response.setCount(entry.getValue().stream().mapToLong(MoEventCount::getCount).sum());
response.setLowDuration(lowVoltageList.stream().mapToInt(VoltageFluctuation::getDuration).sum() / 60d);
```

这里取元素需要统计的字段，使用`mapToLong()`或`mapToInt()`转换成对应的`LongStream`或`IntStream`后，再使用`sum()`方法输出合计值。

## 分类后输出

```java
Map<Integer, Integer> collectVolDurationMap = queryList.stream()
        .collect(Collectors.groupingBy(VoltageFluctuation::getVoltageLowerLimit,
                Collectors.summingInt(VoltageFluctuation::getDuration)));
Map<Long, Long> logTimeMap = list.stream()
        .collect(Collectors.groupingBy(VoltageFluctuation::getLogTime,
                Collectors.summingLong(VoltageFluctuation::getDuration)));
```

这里在`groupingBy`的映射函数中使用`summingInt()`或`summingLong()`，统计了一个分类下的合计值，整合了直接输出时的逻辑。

# 给数据打上标签

```java
return queryList.stream().collect(Collectors.toMap(
        x -> String.valueOf(x.getLogTime()) + x.getAggregationType() + x.getAggregationCycle(),
        x -> x, (x1, x2) -> x2));
```

这种操作常见于将数据库中查到的数据根据需要取用的场景，代价是内存开销比较大，当数据量很大时需慎用。

# 查找最大值

```java
Optional<LoadRateValue> maxValue = loadRateValues.stream()
        .filter(d -> Objects.nonNull(d.getValue()))
        .max(Comparator.comparingDouble(LoadRateValue::getValue));
```

与之前所讲的`findFirst()`类似，这里取一个集合中的最大值，返回一个`Optional`，当元素存在时，执行后续`ifPresent`方法中的逻辑。此外还可以引入`orElse()`方法以指定元素不存在时的缺省值。

# peek与foreach
项目代码中有这样一段逻辑：

```java
dataLogPoiDeviceIdMap.putAll(dataLogPoiResult.getData().stream()
        .peek(it -> {
            if (Objects.isNull(it.getDataBasePoi()) && Objects.isNull(it.getCachePoi())) {
                it.setDataBasePoi(DateUtils.computeStartOfHour(System.currentTimeMillis()));
                it.setCachePoi(DateUtils.computeStartOfHour(System.currentTimeMillis()));
            }
            if (Objects.isNull(it.getDataBasePoi())) {
                it.setDataBasePoi(globalStartTime);
            }
            if (Objects.isNull(it.getCachePoi())) {
                it.setCachePoi(globalStartTime);
            }
        })
        .collect(Collectors.groupingBy(it -> Math.max(it.getDataBasePoi(), it.getCachePoi())))
);
```

这里使用到了`peek()`方法。在`Stream`中，`peek()`与`foreach`都能遍历一个集合的元素，它们的区别是：`peek()`是中间操作，不会对每个元素进行处理；而`foreach()`是最终操作，保证对`Stream`里的每个元素都应用某个方法。

出于性能考虑，`Stream`被设计为**元素只有在最终操作需要时才会被处理**。如果没有最终操作的*拉动*，那么在`Stream`中就没有操作会真正执行。

上面的例子中，`.collect(Collectors.groupingBy())`就是一个最终操作，而且这个操作会*拉动*所有元素。这样一来，每个元素都会被应用`peek()`方法，所以放在这里没有问题。

事实上，`peek()`最合适的用法是打印流经的每个元素的状态，如日志或某个字段，例如下面这段代码：

```java
Stream.of("one", "two", "three", "four")
        .filter(e -> e.length() > 3)
        .peek(e -> System.out.println("Filtered value: " + e))
        .map(String::toUpperCase)
        .peek(e -> System.out.println("Mapped value: " + e))
        .collect(Collectors.toList());
```

如果要对这段项目代码做改进，可以将`dataLogPoiResult.getData()`这个集合中的元素做`foreach()`操作，然后将结果用`Collectors.groupingBy()`做分类，最后放在`putAll()`方法中，这样代码可读性和可靠性都会增加。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [Java stream中peek()的合理用法](https://blog.csdn.net/VoisSurTonChemin/article/details/122378636)
