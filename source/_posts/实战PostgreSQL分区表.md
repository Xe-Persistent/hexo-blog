---
title: 实战PostgreSQL分区表
date: 2023-04-20 15:31:47
tags:
    - 数据库
categories: 学习笔记
keywords: "PostgreSQL, pgsql, 分区表"
description: 本文详细介绍了PostgreSQL分区表的用法，以及在实际项目中它是如何部署的
---
# 前言
随着项目使用年限的增长，数据库的数据量与日俱增，数据库查询也变得越来越慢。对于许多应用数据库来说，随着时间推移，一部分数据会作为历史数据来使用，并且它们的重要性逐渐降低。如果能够在查询时只查最近产生的数据，数据库查询速度将会大幅提高。此外，当一个数据表大小达到一定程度时，索引的性能也会降低，就如同一本书，当它的字数足够多，厚度也变得相当厚时，即使通过目录来查找阅读相应的文字也相当费劲。这种情况下，我们可以引入分区表，也就是将数据表划分，进而分而治之。

# 术语介绍

## 概述
表的划分指的是将逻辑上的一个大表分成一些小的物理上的分表，将数据分散到不同的子表中，并通过父表建立关联关系，从而实现数据表的分区。

- 主表/父表/Master Table
: 该表是创建子表的模板。从数据的查询操作上看，它与普通表没有什么区别，但实际上所有数据都将储存在子表中，主表仅仅只是一个模板。

- 子表/分区表/Child Table/Partition Table
: 子表继承并从属于一个主表，子表中存储所有的数据。主表与分区表属于一对多的关系，也就是说，一个主表包含多个分区表，而一个分区表只从属于一个主表。

## 声明式划分
PostgreSQL提供了`PARTITION BY`子句指定如何把一个表划分成称为分区的片段，被划分的表被称作分区表。`PARTITION BY`子句由分区方法以及用作分区键的列或者表达式列表组成。

所有被插入到分区表的行将被基于分区键的值路由到分区中。每个分区都有一个由其分区边界定义的数据子集。目前PQSQL支持的分区方法有范围、列表以及哈希。

分区本身也可能被定义为分区表，这种用法被称为子分区。分区可以有自己的与其他分区不同的索引、约束以及默认值。

无法把一个常规表转换成分区表，反之亦然。不过，可以把一个包含数据的常规表或者分区表作为分区加入到另一个分区表，或者从分区表中移走一个分区把它变成一个独立的表。

PostgreSQL支持以下3种声明式分区形式：

- 范围划分
: 通过一个或一组分区键来划分表，每个分区键设定一个区间范围，不同的分区的范围之间没有重叠。例如，我们可以根据日期范围划分，或者根据特定业务对象的标识符划分。

- 列表划分
: 通过显式地列出每一个分区中出现的键值来划分表。

- 哈希划分
: 通过为每个分区指定模数和余数来划分表。每个分区所持有的行都满足相同条件：该行分区键的值除以一个指定的模数将产生一个指定的余数。

> 事实上，分区表还可以使用表继承来实现，具体方式详见[PostgreSQL文档](http://www.postgres.cn/docs/12/ddl-partitioning.html#DDL-PARTITIONING-IMPLEMENTATION-INHERITANCE)，本文不作讨论。

## 分区表的特性
- 分区表的`CHECK`约束和`NOT NULL`约束总是会被其所有的分区所继承。不允许在分区表上创建标记为`NO INHERIT`的`CHECK`约束。

- 只要分区表中不存在分区，则支持使用`ONLY`仅在分区表上增加或者删除约束。当分区存在时是不支持仅在分区表上增加或删除约束的，分区表自身的约束可以增加（如果它们不出现在父表中）和删除。

- 分区表并不直接拥有任何数据，因此无法在分区表上使用`TRUNCATE ONLY`。

- 分区表不能有在父表中不存在的列，反之同理。在使用`CREATE TABLE`创建分区时不能指定列，在事后使用`ALTER TABLE`时也不能为分区增加列。只有当表的列正好匹配父表时，才能使用`ALTER TABLE ... ATTACH PARTITION`将它作为分区加入。

- 如果`NOT NULL`约束在父表中存在，那么不能删除分区表的列上对应的`NOT NULL`约束。

## 分区表的优势
- 在某些情况下查询性能能够显著提升，特别是当一些经常访问的数据行分布在一个分区或者少数几个分区时，划分可以取代索引的主导列、减小索引尺寸以及使索引中访问压力大的部分更有可能被放在缓存中。

- 当查询或更新一个分区的大部分数据行时，可以通过该分区上的一个顺序扫描来取代分散到整个表上的索引和随机访问，这样可以改善性能。

- 如果批量操作的需求是在分区设计时就规划好的，则批量装载和删除可以通过增加或者去除分区来完成。执行`ALTER TABLE DETACH PARTITION`或者使用`DROP TABLE`删除一个分区远比批量操作数据要快。

- 很少使用的数据分区可以被迁移到便宜且较慢的存储介质上。

一个表在何种情况下能够从划分获益取决于实际应用，一个经验法则是当表的尺寸超过了数据库服务器物理内存时，划分会为表带来好处。

## 分区表的限制
- 没有办法创建跨越所有分区的约束，只能单个约束每个子表。

- 分区表上的唯一约束必须包括所有分区键列，存在此限制是因为PostgreSQL只能每个子表中分别实施唯一性。

- 只需要在子表上定义`BEFORE ROW`触发器，父表上不需要。

- 不允许在同一个分区树中混杂临时关系和持久关系。因此，如果分区表是持久的，则其分区也必须是持久的，反之亦然。在使用临时关系时，分区树的所有成员都必须来自于同一个会话。

## 创建分区表
假定我们正在为一个大型的冰激凌公司构建数据库。该公司需要了解每天的最高气温以及每天每个区域的冰激凌销售情况。通常，我们会设计这样的表：

```sql
CREATE TABLE measurement (
    city_id         int not null,
    logdate         date not null,
    peaktemp        int,
    unitsales       int
);
```

这个表的主要用途是为管理层准备在线报告，因此大部分查询只会访问上周、上个月或者前一季度的数据。为了减少需要被存放的旧数据量，我们决定只保留最近3年的数据。在每个月的开始我们会删除掉最早的那个月的数据。在这种情况下我们可以使用分区表技术来帮助我们满足对`measurement`表的所有不同需求。

要在这种情况下使用声明式分区，可采用下面的步骤：

1. 通过指定`PARTITION BY`子句把`measurement`表创建为分区表，该子句包括分区方法（这个例子中是`RANGE`）以及用作分区键的列。一方面可以在分区键中使用多列进行范围分区，当然，这通常会导致分区数量比较多，其中每一个分区都比较小。另一方面，使用较少的列会通过粗粒度的分区策略得到较少数量的分区。

```sql
CREATE TABLE measurement (
    city_id         int not null,
    logdate         date not null,
    peaktemp        int,
    unitsales       int
) PARTITION BY RANGE (logdate);
```

2. 创建分区。每个分区的定义必须指定对应于父表的分区方法和分区键的边界。注意，如果指定的边界使得新分区的值会与已有分区中的值重叠，则会导致错误。向父表中插入无法映射到任何现有分区的数据也会导致错误，这种情况下应该增加一个合适的新分区。

分区以普通表或者外部表的方式创建。可以为每个分区单独指定表空间`TABLESPACE`和存储参数。

没有必要创建表约束来描述分区的分区边界条件，因为分区约束会自动地隐式地从分区边界说明中生成。

```sql
CREATE TABLE measurement_y2006m02 PARTITION OF measurement
    FOR VALUES FROM ('2006-02-01') TO ('2006-03-01');

CREATE TABLE measurement_y2006m03 PARTITION OF measurement
    FOR VALUES FROM ('2006-03-01') TO ('2006-04-01');

...
CREATE TABLE measurement_y2007m11 PARTITION OF measurement
    FOR VALUES FROM ('2007-11-01') TO ('2007-12-01');

CREATE TABLE measurement_y2007m12 PARTITION OF measurement
    FOR VALUES FROM ('2007-12-01') TO ('2008-01-01')
    TABLESPACE fasttablespace;

CREATE TABLE measurement_y2008m01 PARTITION OF measurement
    FOR VALUES FROM ('2008-01-01') TO ('2008-02-01')
    WITH (parallel_workers = 4)
    TABLESPACE fasttablespace;
```

3. 在分区表的父表上创建一个索引，还有其他需要的索引（索引并不是必需的，但是大部分数据库应用场景中它都能发挥作用）。这会自动在每个分区上创建一个索引，并且后来创建或者关联的任何分区也将会包含该索引。

```sql
CREATE INDEX ON measurement (logdate);
```

4. 确保`enable_partition_pruning`配置参数在`postgresql.conf`中没有被禁用。如果被禁用，查询将不会按照想要的方式被优化。

## 维护分区表
通常在初始定义分区表时不会把所有需要的分区都建立好，因为后续可能需要移除旧分区的数据并且为新数据周期性地增加新分区。分区表的最大优势之一就是可以通过修改分区结构来轻松地完成这些任务，而不是批量删除或迁移大量数据。

移除旧数据最简单的选择是删除掉不再需要的分区：

```sql
DROP TABLE measurement_y2006m02;
```

这可以非常快地删除数百万行记录，因为它不需要逐个删除每个记录。不过要注意上面的命令需要从父表上拿到`ACCESS EXCLUSIVE`锁。

另一种通常更好的选项是把分区从分区表中移除，但是保留它作为一个独立的表：

```sql
ALTER TABLE measurement DETACH PARTITION measurement_y2006m02;
```

这允许在它被删除之前在其数据上执行进一步的操作，如使用`COPY`、`pg_dump`或类似工具备份数据。这也是把数据聚集成较小的格式、执行其他数据操作或者运行报表的好时机。

类似地，我们可以增加一个新分区来处理新数据。我们可以在分区表中创建一个空分区，就像上面创建的初始分区那样：
```sql
CREATE TABLE measurement_y2008m02 PARTITION OF measurement
    FOR VALUES FROM ('2008-02-01') TO ('2008-03-01')
    TABLESPACE fasttablespace;
```

我们可以在分区的父表上创建索引，并自动将其应用于整个层次结构。这非常便利，因为不仅现有分区将自动创建索引，而且将来创建的任何分区都将自动创建索引。但是创建这样一个分区索引时，不可以使用`CONCURRENTLY`限定符。为了避免创建索引时的长时间锁，可以对父表使用`CREATE INDEX ON ONLY ...`，此时索引只会在父表上创建，并且子表不会自动创建该索引。子表上的索引可以使用`CONCURRENTLY`单独创建，然后使用`ALTER INDEX ... ATTACH PARTITION ...`关联到父索引。一旦所有子表的索引附加到父索引，父索引将自动生效。例如：
```sql
CREATE INDEX measurement_usls_idx ON ONLY measurement (unitsales);

CREATE INDEX measurement_usls_200602_idx
    ON measurement_y2006m02 (unitsales);
ALTER INDEX measurement_usls_idx
    ATTACH PARTITION measurement_usls_200602_idx;
```

该操作也可以使用在`UNIQUE`和`PRIMARY KEY`约束中; 当创建约束时隐式创建索引。例如：
```sql
ALTER TABLE ONLY measurement ADD UNIQUE (city_id, logdate);

ALTER TABLE measurement_y2006m02 ADD UNIQUE (city_id, logdate);
ALTER INDEX measurement_city_id_logdate_key
    ATTACH PARTITION measurement_y2006m02_city_id_logdate_key;
```

# 应用
## 需求场景
在一个项目中，使用PostgreSQL11存储了大量的设备能耗数据，数据量达到了上亿行，查询效率极低，考虑将其转换成分区表存储数据。

能耗数据`pecdeviceenergy`结构如下：
| **columns**      | **data type** |
|------------------|---------------|
| aggregationcycle | integer       |
| dataid           | bigint        |
| deviceid         | bigint        |
| energydata       | double        |
| logicalid        | integer       |
| logtime          | bigint        |

## 解决方案
原表DDL如下：
```sql
create table pecdeviceenergy_bak
(
    id  bigint default nextval('public.pecdeviceenergy_id_seq'::regclass) not null
    constraint pecdeviceenergy_bak_pkey
        primary key,
    aggregationcycle integer,
    dataid           bigint,
    deviceid         bigint,
    energydata       double precision,
    logicalid        integer,
    logtime          bigint
);
```

为了不影响切换成分区表机制后数据的正常录入，新的分区表应与原表结构保持一致，比较合适的分区规则是按`logtime`字段分区，为每个月的数据建一个子表；
```sql
CREATE TABLE IF NOT EXISTS public.pecdeviceenergy
(
    id               bigserial NOT NULL,
    aggregationcycle integer,
    dataid           bigint,
    deviceid         bigint,
    energydata       double precision,
    logicalid        integer,
    logtime          bigint,
    constraint pecdeviceenergy_pkey
        primary key (id, logtime)
) partition by range (logtime);
```

在此基础上，给父表建立必要的索引，保证子表的查询效率。新增的分区或者通过`ATTACH PARTITION`关联的分区都会自动创建相应的索引。
```sql
create index pecdeviceenergy_query_index on pecdeviceenergy (deviceid, logtime, aggregationcycle);
```

建立父表后，就可以开始建立子表了。实际上，建立索引和建立子表的步骤可以互换，不影响最终的表结构。
```sql
CREATE TABLE partition.pecdeviceenergy_2022_01 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1640966400000) TO (1643644800000);
CREATE TABLE partition.pecdeviceenergy_2022_02 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1643644800000) TO (1646064000000);
CREATE TABLE partition.pecdeviceenergy_2022_03 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1646064000000) TO (1648742400000);
CREATE TABLE partition.pecdeviceenergy_2022_04 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1648742400000) TO (1651334400000);
CREATE TABLE partition.pecdeviceenergy_2022_05 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1651334400000) TO (1654012800000);
CREATE TABLE partition.pecdeviceenergy_2022_06 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1654012800000) TO (1656604800000);
CREATE TABLE partition.pecdeviceenergy_2022_07 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1656604800000) TO (1659283200000);
CREATE TABLE partition.pecdeviceenergy_2022_08 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1659283200000) TO (1661961600000);
CREATE TABLE partition.pecdeviceenergy_2022_09 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1661961600000) TO (1664553600000);
CREATE TABLE partition.pecdeviceenergy_2022_10 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1664553600000) TO (1667232000000);
CREATE TABLE partition.pecdeviceenergy_2022_11 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1667232000000) TO (1669824000000);
CREATE TABLE partition.pecdeviceenergy_2022_12 PARTITION OF public.pecdeviceenergy FOR VALUES FROM (1669824000000) TO (1672502400000);
...
```
随后将旧表的数据导入至新表中。这里有多种方式可以达到目的，如批量插入、借助存储过程、使用`COPY`、`pg_dump`等等。此处使用最简单的批量插入操作，因为数据量非常大，所以需尽量避免在任务高峰期时执行，以免影响数据库其它事务的正常执行。
```sql
insert INTO public.pecdeviceenergy(select * FROM public.pecdeviceenergy_bak);
```

最后将父表的主键`id`序列设置为所有`id`的最大值，避免新数据`id`重新从1开始记录。
```sql
select max(public.pecdeviceenergy_bak.id)
from public.pecdeviceenergy_bak;
ALTER SEQUENCE public.pecdeviceenergy_id_seq1 RESTART WITH ...;
```
至此，完成了将数据表`pecdeviceenergy`从普通表迁移至分区表的操作，可以通过`EXPLAIN`语句测试查询是否命中索引并执行`SELECT`语句观察查询效率是否提升。
```sql
explain
SELECT 'pecdeviceenergy' as modelLabel,
             id,
             aggregationcycle,
             dataid,
             deviceid,
             energydata,
             logicalid,
             logtime
      FROM public.pecdeviceenergy
      WHERE (deviceid in (9871, 9872, 9873, 9888, 9889, 9890, 9925, 9926, 9927, 9933, 9934, 9869, 9909, 9931, 9932) AND
             dataid = 4000004 AND logtime >= 1669824000000 AND logtime < 1672502400000 AND aggregationcycle = 7)
         OR (deviceid in (9871, 9872, 9873, 9888, 9889, 9890, 9925, 9926, 9927, 9933, 9934, 9869, 9909, 9931, 9932) AND
             dataid = 4000004 AND logtime >= 1669824000000 AND logtime < 1672502400000 AND aggregationcycle = 12)
         OR (deviceid in (9871, 9872, 9873, 9888, 9889, 9890, 9925, 9926, 9927, 9933, 9934, 9869, 9909, 9931, 9932) AND
             dataid = 4000004 AND logtime = 1669824000000 AND aggregationcycle = 14);
```

# 小结
## 建表建议
- 分区键离散，可以使用`PARTITION BY LIST`，按字符串匹配决定落入哪个分区。

- 分区键连续，比如整形、日期等，可以使用`PARTITION BY RANGE`。

- 分区键数据随机无规律或规律简单，可以使用`PARTITION BY HASH`，用`hash`函数打散数据。

- 分区键数据随机有规律，规律复杂，可以使用多级混合分区，使数据平均分散、减少耦合。

- 每个分区都是一个普通PG表：
: 可以指定表空间：例如按月份分区的场景，可以把历史非活跃数据通过表空间指定到慢速廉价存储上，新的热数据保存到快速存储上。  
可以指定并发度：给数据表设置并发度`parallel_workers`，让查询自动使用并行查询。

## 查询建议
- 不带分区键的查询或带分区键但涉及大部分分区表的查询会使执行计划成倍增长，在分区表很多时会消耗大量内存，生成执行计划的时间也会变长。存在几千个分区时可能`Planning time`会超过`Execution time`。

- 分区数量的增长应该在设计时就有预期，根据表大小评估，一般最好不要上千。

- 分区间最好是没有数据依赖（比如按月份分区可以很方便的删除某一个分区），如果删除一个分区需要把部分数据调整到其他分区，新增一个分区需要从其他分区拿数据，这样效率会很差。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [5.11. 表分区](http://www.postgres.cn/docs/12/ddl-partitioning.html)
- [PostgreSQL数据库表分区介绍-四种分区方式](https://blog.csdn.net/qq_38567039/article/details/119751897)
- [postgresql 创建分区表 以及拆分分区表（修改分区）](https://blog.csdn.net/yang_z_1/article/details/117730158)
- [Postgresql分区表大量实例与分区建议（LIST / RANGE / HASH / 多级混合分区）](https://cloud.tencent.com/developer/article/2123226)
