---
title: Java函数式编程学习笔记（三）
date: 2022-09-30 15:58:06
tags:
    - 后端
    - Java
    - Stream
categories: 学习笔记
keywords: "Java, Stream"
---
# 前言
时隔三个月，我终于回归到技术博客写作中了。这段时间我经历了一个半月的应届生新员工培训，之后接续实习期间完成的工作，继续进行业务需求的开发。由于开发时实在分不出精力撰写文章，博客也被闲置了将近3个月，在此期间博客仅部署了两次平台框架版本的例行升级。

言归正传，最近在业务逻辑编写工作中用到了不少Stream流和Lambda函数，根据不同业务需求编写不同功能的Lambda函数，能够输出各种不同的数据结构，从而满足业务逻辑的需求。在此进行一个小小的总结。这篇文章中的每个代码片段都是我在实际开发中编写的，希望能对各位读者有些帮助。

# 经典案例
```java
Set<Integer> alarmIdSet = realTimeData.entrySet().stream().filter(it -> Objects.nonNull(it.getValue()) && it.getValue() > 0)
        .map(it -> Integer.valueOf(it.getKey()))
        .collect(Collectors.toSet());
```

# 对象List转Map
```java
Map<Long, Integer> preInspectionMap = preInspectionList.stream()
        .collect(Collectors.toMap(PreInspectionDTO::getId, PreInspectionDTO::getDeviceType));
```

```java
return apiResult.getData().stream()
        .collect(Collectors.toMap(it -> it.getMonitoredLabel() + "_" + it.getMonitoredId(),
        it -> it,
        (v1, v2) -> v2));
```

# 分组
```java
Map<Long, List<SystemEventStatisticsVo>> eventGroups = systemEventStatisticsVos.stream()
        .collect(Collectors.groupingBy(SystemEventStatisticsVo::getLogtime));
```

```java
Map<Long, Long> preInspectionEventMap = eventList.stream().
        collect(Collectors.groupingBy(SystemEventDTO::getObjectId, Collectors.counting()));

Map<String, Long> hiddenDangerMap = hiddenDangerAccountList.stream()
        .collect(Collectors.groupingBy(it -> roomIdName.get(it.getRoomId()), Collectors.counting()));
```

```java
Map<Integer, Long> enterpriseGroups = enterpriseList.stream().collect(
        Collectors.groupingBy(it -> Objects.isNull(it.getEnterprisefacilityinstallstatus()) ?
                -1 : it.getEnterprisefacilityinstallstatus(), Collectors.counting()));
```

```java
Map<Long, List<Long>> roomPreInspectionMap = preInspectionList.stream()
        .collect(Collectors.groupingBy(PreInspectionDTO::getRoomId,
                Collectors.mapping(PreInspectionDTO::getId, Collectors.toList())));
```
# 统计数量
```java
resultMap.merge(EquipmentTypeEnum.of(preInspectionTypeMap.get(it.getObjectId())), 1L, Long::sum);

resultMap.merge(ConfirmEventStatusEnum.of(it.getConfirmEventStatus()), 1L, Long::sum);
```

```java
Integer eventCount = eventList.stream().map(SystemEventStatisticsVo::getCount)
        .reduce(0, Integer::sum);
```

```java
long eventCount = roomPreInspectionList.stream().reduce(0L, (total, it) -> {
    long eventNum = Objects.isNull(preInspectionEventMap.get(it)) ? 0L : preInspectionEventMap.get(it);
    return total + eventNum;
});
```

# Optional的使用
```java
public List<LoadCurveVo> totalLoadCurve() {
    long nowTime = System.currentTimeMillis();
    String startTime = DateUtil.toString(DateUtil.getDayStart(nowTime), DateUtil.DEFAULT_DATE_TIME_FORMAT);
    String endTime = DateUtil.toString(DateUtil.toDefault(nowTime), DateUtil.DEFAULT_DATE_TIME_FORMAT);
    TrendSearchListVo queryParams = new TrendSearchListVo();
    queryParams.setStartTime(startTime);
    queryParams.setEndTime(endTime);
    queryParams.setInterval(60);
    queryParams.setMeterConfigs(loadCurveParams);
    Result<List<TrendDataVo>> queryResult = deviceDataService.queryTrendCurveData2(queryParams);
    if (!queryResult.isSuccess()) {
        throw new DefaultPowerException(queryResult.getMsg());
    }
    List<TrendDataVo> data = queryResult.getData();
    if (CollectionUtils.isEmpty(data)) {
        return Collections.emptyList();
    }
    return loadCurveParams.stream()
            .map(l -> {
                LoadCurveVo loadCurveVo = new LoadCurveVo();
                loadCurveVo.setName(l.getName());
                Optional<TrendDataVo> first = data.stream().filter(d -> paramsIsEquals(d, l)).findFirst();
                first.ifPresent(trendDataVo -> loadCurveVo.setDataList(trendDataVo.getDataList()));
                return loadCurveVo;
            }).collect(Collectors.toList());
}
```

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [使用Stream - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/1252599548343744/1322402873081889)
