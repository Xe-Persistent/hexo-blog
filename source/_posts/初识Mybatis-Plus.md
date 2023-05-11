---
title: 初识MyBatis-Plus
date: 2022-05-30 14:12:50
tags: 
    - Java
    - 数据库
categories: 学习笔记
keywords: "Java, MyBatis-Plus"
---
# 前言
在前面的Java学习笔记中，我提到过两次`MyBatis-Plus`，可能大家已经对这个名词有些耳熟。我对它的定义是：一个方便的操作数据库功能的工具包。

在它的官方文档上写道：`MyBatis-Plus`是一个`MyBatis`的增强工具，在`MyBatis`的基础上**只做增强不做改变**，为简化开发、提高效率而生。`MyBatis`与`MyBatis-Plus`都是`ORM`框架（*对象-关系映射框架*），对象和关系数据是业务实体的两种表现形式，业务实体在内存中表现为**对象**，在数据库中表现为**关系数据**。内存中的对象之间存在关联和继承关系，而在数据库中，关系数据无法直接表达多对多关联和继承关系。因此，对象-关系映射框架(`ORM`)一般以中间件的形式存在，主要实现对象到关系数据库数据的映射。

当我们编写一个应用程序时，我们可能会写特别多数据访问层的代码，从数据库添加、删除、读取对象信息，而这些代码都是重复的，如果使用`ORM`则会大大减少重复性代码。在使用`MyBatis-Plus`的时候，我总是为之惊叹：原来数据库操作能这么简单！于是我写下这篇文章记录它的一些使用方法。

# 应用
将`MyBatis-Plus`引入`Spring`项目非常容易，网上有许多实例，在此不做讲解。接下来，我主要介绍如何使用`MyBatis-Plus`的条件构造器编写业务逻辑。大体上，`MyBatis-Plus`从数据库表到前端接口的业务流程是`数据库表->DTO->Mapper->Service->Controller`，因此，我将顺着这条流程依次讲解每个环节要使用`MyBatis-Plus`编写哪些代码。

## 数据库表
我以一个存储测量设备的数据库表为例，编写与它相关的增删改查接口。下面是它的表结构：
> MonitoringDevice

| 字段         | 数据类型    | 注释   |
|------------|---------|------|
| id         | bigint  | 设备id |
| name       | varchar | 设备名  |
| model      | varchar | 设备型号 |
| type       | varchar | 设备类型 |
| illustrate | varchar | 说明   |
| location   | varchar | 设备位置 |
| accuracy   | varchar | 测量精度 |
| frequency  | varchar | 校正频率 |

此外，还有一些与该表存在关联的其他数据表，主要通过**外键**与其关联，在此不做举例。

## DTO
`DTO`即数据传输对象，是数据从后端传输到前端的载体。大体上，一个`DTO`要包含一个数据库表的部分或所有字段信息。为了减少重复代码，我将这些表的重复字段单列出一个`ModelDTO`，让其他的`DTO`继承这个`ModelDTO`。建议使用`Lombok`插件提供的`@Data`注解，可以为`DTO`的私有成员自动生成`getter`和`setter`方法。

> ModelDTO.java

```java
@Data
public class ModelDTO {

    private String name;

    private Long id;
}
```

> MonitoringDeviceDTO.java
```java
@EqualsAndHashCode(callSuper = true)
@TableName("monitoringdevice")
@Data
public class MonitoringDeviceDTO extends ModelDTO {
    private String model;

    private String type;

    private String illustrate;

    private String location;

    private String accuracy;

    private String frequency;
}
```

## Mapper
`Mapper`的编写非常简单，只需继承`BaseMapper`即可，以`MonitoringDeviceMapper`为例：

> MonitoringDeviceMapper.java
```java
@Mapper
public class MonitoringDeviceMapper extends BaseMapper<MonitoringDeviceDTO> {

}
```

## Service
事实上，这些`Mapper`继承`BaseMapper`后已经为我们提供了默认的`CRUD`接口和一些默认方法。当这些接口和方法不满足我们需要的功能时，就需要自行编写`Service`。
> `CRUD`是指做计算处理时的增加(`Create`)、读取查询(`Retrieve`)、更新(`Update`)和删除(`Delete`)几个单词的首字母简写。代表了数据库或持久层的基本操作功能。

定义`Service`类时，在私有变量`Mapper`前加上`@Autowired`注解。

> MonitoringDeviceService.java
```java
@Service
public class MonitoringDeviceService {
    @Autowired
    private MonitoringDeviceMapper monitoringDeviceMapper;
}
```

### 增加和编辑数据
首先是增加和编辑数据的逻辑。这里为了便于维护代码，我定义了`RequestBody`作为两个方法的入参。

在增加方法中，我添加了判断入参字段是否合法的逻辑，然后调用`insert()`方法插入一行数据。

由于`DTO`与`RequestBody`都是`JavaBean`，可以使用`BeanUtils`的`copyProperties()`方法将`RequestBody`的参数复制给`DTO`。

```java
public Boolean addDevice(AddMonitoringDeviceReq device) {
    if (!DetermineEnum.isInclude(device.getType())) {
        throw new ParamException("参数不支持");
    }
    MonitoringDeviceDTO instance = new MonitoringDeviceDTO();
    BeanUtils.copyProperties(device, instance);
    monitoringDeviceMapper.insert(instance);
    return true;
}
```

在编辑方法中，使用链式条件构造器`LambdaQueryChainWrapper`根据传入的实体`id`查询`Device`表中是否有对应的数据，`eq()`定义了一个相等条件进行查询，再使用`exists()`方法返回布尔值，以判断查询到的数据是否存在，最后调用`insert()`方法即可。
> 注意：`insert()`会自动根据数据是否存在，即插入的是否为重复行，若不存在则新增一条数据，若存在则编辑该条数据。

```java
public MonitoringDeviceDTO editDevice(EditMonitoringDeviceReq device) {
    boolean exists = new LambdaQueryChainWrapper<>(monitoringDeviceMapper)
            .eq(MonitoringDeviceDTO::getId, device.getId()).exists();
    if (!exists) {
        throw new NotFoundException("设备不存在");
    }
    MonitoringDeviceDTO instance = new MonitoringDeviceDTO();
    BeanUtils.copyProperties(device, instance);
    return monitoringDeviceMapper.insert(instance);
}
```

### 查询数据
然后是查询数据的逻辑。首先是最简单的根据`id`获取数据，只需调用`selectById()`默认方法即可。

```java
public MonitoringDeviceDTO getDeviceById(Long deviceId) {
    if (Objects.isNull(deviceId)) {
        return null;
    }
    return monitoringDeviceMapper.selectById(deviceId);
}
```
之后是根据`Determine`表的字段查询数据。由于`Determine`表是通过外键`deviceId`与该表的`id`进行关联的，要查询`Device`表的数据，首先要获得`Determine`表的`deviceId`字段，按照这个逻辑编写条件构造器即可，使用`one()`返回一行数据，之后调用前面的`getDeviceById()`方法，传入获得的`deviceId`。

```java
public MonitoringDeviceDTO getDeviceByParamId(Long paramId) {
    if (Objects.isNull(paramId)) {
        return null;
    }
    return getDeviceById(new LambdaQueryChainWrapper<>(determineMapper)
            .eq(DetermineDTO::getCalcParamId, paramId)
            .one().getDeviceId());
}
```

然后是根据设备类型批量获取数据，同样使用`eq()`定义相等查询条件，使用`list()`返回多行数据，以`list`数组的形式作为返回值。

```java
public List<MonitoringDeviceDTO> getDeviceByType(String type) {
    if (!DetermineEnum.isInclude(type)) {
        throw new ParamException("类型不支持");
    }
    return new LambdaQueryChainWrapper<>(monitoringDeviceMapper)
            .eq(MonitoringDeviceDTO::getType, type).list();
}
```

最后是一个相对复杂的多表联合查询的方法。根据`Source`表的`id`获取与之关联的若干个`CalcParam`，再依次获取这些`CalcParam`的id，存入`paramIdList`，然后在`Determine`表中查询`ObtainingMethod`字段为2、且`CalcParamId`与刚才`paramIdList`匹配的数据行，最后根据这些`Determine`获取设备。

在上面这串逻辑中，除了前面提到的`eq()`相等条件外，还使用到了`in()`匹配字段条件，并在其中穿插使用`Stream`处理和转换数据，是一次`MyBatis-Plus`与`Stream`的综合运用。

```java
public List<MonitoringDeviceDTO> getDeviceBySource(Long sourceId) {
    boolean exists = new LambdaQueryChainWrapper<>(emissionSourceMapper)
            .eq(EmissionSourceDTO::getId, sourceId).exists();
    if (!exists) {
        throw new NotFoundException("数据不存在");
    }
    List<EmissionCalcParamDTO> emissionCalcParams = emissionSourceCalcParamMapper
            .selectList(new QueryWrapper<>(EmissionCalcParamDTO.class)
                    .treeNode(ModelLabelConstant.EMISSION_SOURCE, sourceId));
    if (CollectionUtils.isEmpty(emissionCalcParams)) {
        throw new DefaultCarbonException("参数异常");
    }
    List<Long> paramIdList = emissionCalcParams.stream()
            .map(EmissionCalcParamDTO::getId)
            .collect(Collectors.toList());
    List<DetermineDTO> determineList = new LambdaQueryChainWrapper<>(determineMapper)
            .eq(DetermineDTO::getObtainingMethod, 2)
            .in(DetermineDTO::getCalcParamId, paramIdList)
            .list();
    return determineList.stream()
            .map(DetermineDTO::getDeviceId)
            .map(this::getDeviceById)
            .collect(Collectors.toList());
}
```

### 删除数据
最后是删除数据的逻辑，删除`Device`表的数据同时要删除与其关联的`MaintenanceRecord`表数据，先根据id查询`MaintenanceRecord`表中拥有与之相同的`deviceId`外键的数据，再转换成`id`，使用`deleteBatchIds()`方法批量删除即可，最后调用`deleteById()`方法删除设备。

```java
public Boolean deleteDevice(Long deviceId) {
    List<MaintenanceRecordDTO> records = maintenanceRecordService.getRecordByDeviceId(deviceId);
    if (CollectionUtils.isNotEmpty(records)) {
        monitoringDeviceMapper.deleteBatchIds(records.stream()
                .map(MaintenanceRecordDTO::getId)
                .collect(Collectors.toList()));
    }
    return monitoringDeviceMapper.deleteById(deviceId) == 1;
}
```

## Controller
一般使用`Spring`框架的`RestController`向前端提供接口，根据不同的接口类型添加`@PostMapping`、`@GetMapping`等注解。同时通过`Swagger UI`展示和调试接口。

> MonitoringDeviceController.java
```java
@RestController
@RequestMapping("demo/device")
@Api(value = "demo/device", tags = "测量设备接口")
public class MonitoringDeviceController {
    @Autowired
    private MonitoringDeviceService deviceService;

    @PostMapping("add")
    @ApiOperation(value = "新增设备")
    public Result<Boolean> addDevice(@RequestBody @Validated AddMonitoringDeviceReq device) {
        return Result.ok(deviceService.addDevice(device));
    }

    @PutMapping("edit")
    @ApiOperation(value = "编辑设备")
    public Result<MonitoringDeviceDTO> editDevice(@RequestBody EditMonitoringDeviceReq device) {
        return Result.ok(deviceService.editDevice(device));
    }

    @GetMapping("getById")
    @ApiOperation(value = "获取设备")
    public Result<MonitoringDeviceDTO> getDeviceById(@RequestParam Long deviceId) {
        return Result.ok(deviceService.getDeviceById(deviceId));
    }

    @DeleteMapping("delete")
    @ApiOperation(value = "删除设备")
    public Result<Boolean> deleteDevice(@RequestParam Long deviceId) {
        return Result.ok(deviceService.deleteDevice(deviceId));
    }
}
```

# 条件构造器的其他方法
| 方法名         | SQL                      | 实例                                                             | SQL实例                                              |
|:------------|:-------------------------|:---------------------------------------------------------------|:---------------------------------------------------|
| eq          | 等于=                      | eq("name", "老王)                                                | name = '老王'                                        |
| ne          | 不等于<>                    | ne("name", "老王)                                                | name <> '老王'                                       |
| gt          | 大于>                      | gt("age", 18)                                                  | age > 18                                           |
| e           | 大于等于>=                   | ge("age", 18)                                                  | age >= 18                                          |
| t           | 小于<                      | It("age", 18)                                                  | age < 18                                           |
| e           | 小于<=                     | le("age", 18)                                                  | age <= 18                                          |
| between     | BETWEEN 值1 AND 值2        | between("age", 18, 30)                                         | age between 18 and 30                              |
| notBetween  | NOT BETWEEN 值1 AND 值2    | notBetween("age", 18, 30)                                      | age not between 18 and 30                          |
| like        | LIKE '%值%'               | like("name", "王")                                              | name like '%王%'                                    |
| notLike     | NOT LIKE '%值%'           | notLike("name", "王")                                           | name not like '%王%'                                |
| likeLeft    | LIKE '%值'                | likeLeft("name", "王")                                          | name like '%王'                                     |
| likeRight   | LIKE '值%'                | likeRight("name", "王")                                         | name like '王%'                                     |
| isNull      | 字段 IS NULL               | isNull("name")                                                 | name is null                                       |
| isNotNull   | 字段 IS NOT NULL           | isNotNull("name")                                              | name is not null                                   |
| in          | 字段 IN (v0, v1, ...)      | in("age", {1, 2, 3})                                           | age in (1, 2, 3)                                   |
| notIn       | 字段 NOT IN (v0, v1, ...)  | notIn("age", {1, 2, 3})                                        | age not in (1, 2, 3)                               |
| inSql       | 字段 IN(sql语句)             | inSql("id", "select id from table where id < 3")               | id in (select id from table where id < 3)          |
| notInSql    | 字段 NOT IN (sql语句)        | notInSql("id", "select id from table where id < 3")            | age not in (select id from table where id < 3)     |
| groupBy     | 分组 GROUP BY 字段, ...      | groupBy("id", "name")                                          | group by id, name                                  |
| orderByAsc  | 排序 ORDER BY 字段, ... ASC  | orderByAsc("id", "name")                                       | order by id ASC, name ASC                          |
| orderByDesc | 排序 ORDER BY 字段, ... DESC | orderByDesc("id", "name")                                      | order by id DESC, name DESC                        |
| orderBy     | 排序 ORDER BY 字段, ...      | orderBy(true, true, "id", "name")                              | order by id ASC, name ASC                          |
| having      | HAVING (sql语句)           | having("sum(age) > {0}", 11)                                   | having sum(age) > 11                               |
| or          | 拼接 OR                    | eq("id", 1).or().eq("name", "老王")                              | id = 1 or name = '老王                               |
| and         | AND 嵌套                   | and(i -> i.eq("name", "李白").ne("status", "活着"))                | and (name = '李白' and status <> '活着')               |
| apply       | 拼接sql                    | apply("date_format(dateColumn, '%Y-%m-%d')={0}", "2008-08-08") | date_format(dateColumn,'%Y-%m-%d') = '2008-08-08') |
| last        | 无视优化规则直接拼接到sql的最后        | last("limit 1")                                                |                                                    |
| exists      | 拼接 EXISTS (sql语句)        | exists("select id from table where age = 1")                   | exists (select id from table where age = 1)        |
| notExists   | 拼接 NOT EXISTS (sql语句)    | notExists("select id from table where age = 1")                | not exists (select id from table where age = 1)    |
| nested      | 正常嵌套不带AND或者0R            | nested(i -> i.eq("name", "李白"). ne("status", "活着"))            | (name = '李白' and status <> '活着')                   |

# 小结
- `MyBatis-Plus`从数据库表到前端接口的业务流程是`数据库表->DTO->Mapper->Service->Controller`；
- `DTO`是数据传输对象，表示数据库里的关系数据；
- `Mapper`封装了基础的`CRUD`接口，提供了基础的数据库操作；
- `Service`在`Mapper`的基础上提供条件构造器，便于我们编写复杂的数据库操作；
- `Controller`将接口提供给前端调用，通常使用`Spring`提供的`RestController`。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [ORM框架简介](https://blog.csdn.net/papima/article/details/78219000)
- [MyBatis-Plus LambdaQueryWrapper使用说明](https://blog.csdn.net/qlzw1990/article/details/116996422)
- [MyBatis plus 之 QueryWrapper、LambdaQueryWrapper、LambdaQueryChainWrapper](https://adong.blog.csdn.net/article/details/122154137)
