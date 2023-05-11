---
title: Java函数式编程学习笔记（二）
date: 2022-05-27 16:25:45
tags:
    - Java
    - 开发
categories: 学习笔记
keywords: "Java, Stream"
---
# 前言
上次我们谈到，在Java代码中使用`Lambda`可以显著减少代码量，提高开发效率。那么在Java项目开发过程中，还有一个非常好用的接口：`Stream Api`，我们叫它`Stream`流。

> 注意：这个`Stream`不同于`java.io`的`InputStream`和`OutputStream`，它代表的是若干个任意Java对象元素的序列，这一点特性和`Collection`有点相似，但是`Stream`并不会真正存储这些元素，而是根据需要来实时计算和存储，真正的计算通常发生在最终结果的输出，是一种`惰性计算`。

`Stream`使用一种类似用`SQL`语句从数据库查询数据的直观方式来提高Java集合运算逻辑的编码效率，让我们能够写出**高效率**、**干净**、**简洁**的代码。在使用它的时候，我感受到了前所未有的便利。

# Stream流
## 什么是Stream？
`Stream`是一个来自数据源的元素队列并支持转换与聚合操作。

- **元素**是特定类型的对象，它们形成一个队列。Java中的`Stream`并不会存储元素，而是按需计算。
- **数据源**是流的来源。可以是`集合`，`数组`，`I/O channel`，产生器`generator`等。
- **转换操作**与**聚合操作**是类似SQL语句一样的操作，可以使用`map`, `filter`, `reduce`, `find`, `match`, `sorted`等方法将一个`Stream`转换成另一个`Stream`。

`Stream`还有两个区别于`Collection`的基本特征：

- **Pipelining**: 中间操作都会返回一个流对象，而不是最终的集合等结构。这样多个操作可以串联成一个管道，如同流式风格(`fluent style`)。这样做可以对操作进行优化，比如延迟执行(`laziness`)和短路(`short-circuiting`)。
- **内部迭代**： 以前我们对集合遍历都是通过`Iterator`或者`For-Each`代码块的方式, 显式的在集合外部进行迭代，这叫做外部迭代。`Stream`提供了内部迭代的方式，通过上面介绍的**转换与聚合操作**实现。

## 创建Stream
我们可以通过许多方式将常见的结构转换成`Stream`来使用。

### Stream.of()
创建`Stream`最简单的方式是直接用`Stream.of()`静态方法，传入可变参数即创建了一个能输出确定元素的`Stream`：

```java
public class Main {
    public static void main(String[] args) {
        Stream<String> stream = Stream.of("A", "B", "C", "D");
        // forEach()方法相当于内部循环调用，
        // 可传入符合Consumer接口的void accept(T t)的方法引用：
        stream.forEach(System.out::println);
    }
}
```

虽然这种方式基本上没啥实质性用途，但测试的时候很方便。

### 基于数组或Collection
第二种创建`Stream`的方法是基于一个数组或者`Collection`，这样该`Stream`输出的元素就是数组或者Collection持有的元素：

```java
public class Main {
    public static void main(String[] args) {
        Stream<String> stream1 = Arrays.stream(new String[] { "A", "B", "C" });
        Stream<String> stream2 = List.of("X", "Y", "Z").stream();
        stream1.forEach(System.out::println);
        stream2.forEach(System.out::println);
    }
}
```

事实上，所有`Collection`都可以轻松地转换成`Stream`，只需调用`stream()`方法即可。

```java
public class Main {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        Stream<String> stream1 = list.stream();
        Set<String> set = new HashSet<>();
        Stream<String> stream2 = set.stream();
        Vector<String> vector = new Vector<>();
        Stream<String> stream3 = vector.stream();
    }
}
```

上述两种创建`Stream`的方法都是把一个现有的序列变为`Stream`，它的元素是固定的。

### 基于Supplier
创建`Stream`还可以通过`Stream.generate()`方法，它需要传入一个`Supplier`对象：

```java
Stream<String> s = Stream.generate(Supplier<String> sp);
```

基于`Supplier`创建的`Stream`会不断调用`Supplier.get()`方法来不断产生下一个元素，这种`Stream`保存的不是元素，而是算法，它可以用来表示无限序列。

例如，我们编写一个能不断生成自然数的`Supplier`，它的代码非常简单，每次调用`get()`方法，就生成下一个自然数：

```java
public class Main {
    public static void main(String[] args) {
        Stream<Integer> natual = Stream.generate(new NatualSupplier());
        // 注意：无限序列必须先变成有限序列再打印:
        natual.limit(20).forEach(System.out::println);
    }
}

class NatualSupplier implements Supplier<Integer> {
    int n = 0;
    public Integer get() {
        n++;
        return n;
    }
}
```

> 因为Java的范型不支持基本类型，所以我们无法用`Stream<int>`这样的类型，会发生编译错误。为了保存`int`，只能使用`Stream<Integer>`，但这样会产生频繁的装箱、拆箱操作。为了提高效率，Java标准库提供了`IntStream`、`LongStream`和`DoubleStream`这三种使用基本类型的`Stream`，它们的使用方法和范型`Stream`没有大的区别，设计这三个`Stream`的目的是提高运行效率。

## 操作Stream
前面提到，我们可以通过一些转换与聚合操作对`Stream`进行一些处理，来达到处理数据的目的。我们通常把`Stream`的操作写成**链式操作**，这样显得代码更简洁。

### 使用map
`map`方法是最常用的转换操作。它能够把一种操作运算，映射到一个序列的每一个元素上，可以将一种元素类型转换成另一种元素类型。

例如，对`x`计算它的平方，可以使用函数`f(x) = x * x`。我们把这个函数映射到一个序列`1，2，3，4，5`上，就得到了另一个序列`1，4，9，16，25`：

```java
Stream<Integer> s1 = Stream.of(1, 2, 3, 4, 5);
Stream<Integer> s2 = s1.map(n -> n * n);
```

利用`map()`，不但能完成数学计算，对于字符串操作，以及任何Java对象都是非常有用的。例如：

```java
public class Main {
    public static void main(String[] args) {
        List.of("  Apple ", " pear ", " ORANGE", " BaNaNa ")
                .stream()
                .map(String::trim) // 去空格
                .map(String::toLowerCase) // 变小写
                .forEach(System.out::println); // 打印
    }
}
```

### 使用filter
`filter()`是另一种转换操作，它能够对一个`Stream`的每个元素进行判断，不满足条件的就被过滤掉了，剩下的满足条件的元素就构成了一个新的`Stream`。

例如，我们对`1，2，3，4，5`这个`Stream`调用`filter()`，传入的测试函数`f(x) = x % 2 != 0`用来判断元素是否是奇数，这样就过滤掉偶数，只剩下奇数，因此我们得到了另一个序列`1，3，5`：

```java
public class Main {
    public static void main(String[] args) {
        IntStream.of(1, 2, 3, 4, 5, 6, 7, 8, 9)
                .filter(n -> n % 2 != 0)
                .forEach(System.out::println);
    }
}
```

`filter()`除了常用于数值外，也可应用于任何Java对象。例如，从一组给定的`LocalDate`中过滤掉工作日，以得到休息日：

```java
public class Main {
    public static void main(String[] args) {
        Stream.generate(new LocalDateSupplier())
                .limit(31)
                .filter(ldt -> ldt.getDayOfWeek() == DayOfWeek.SATURDAY || ldt.getDayOfWeek() == DayOfWeek.SUNDAY)
                .forEach(System.out::println);
    }
}

class LocalDateSupplier implements Supplier<LocalDate> {
    LocalDate start = LocalDate.of(2020, 1, 1);
    int n = -1;
    public LocalDate get() {
        n++;
        return start.plusDays(n);
    }
}
```

### 使用reduce
`reduce()`是一种聚合操作，它可以把一个`Stream`的所有元素按照聚合函数聚合成一个结果。我们以一个简单的求和运算为例：

```java
public class Main {
    public static void main(String[] args) {
        int sum = Stream.of(1, 2, 3, 4, 5, 6, 7, 8, 9)
                .reduce(0, (acc, n) -> acc + n);
        System.out.println(sum); // 45
    }
}
```

可见，`reduce()`方法有两个参数，第一个参数是一个初始值，第二个参数是聚合函数。`reduce()`操作首先初始化结果为指定值（这里是`0`），紧接着，`reduce()`对每个元素依次调用`(acc, n) -> acc + n`，其中，`acc`是上次计算的结果。

我们还可以把求和改成求积，代码也十分简单：

```java
public class Main {
    public static void main(String[] args) {
        int s = Stream.of(1, 2, 3, 4, 5, 6, 7, 8, 9)
                .reduce(1, (acc, n) -> acc * n);
        System.out.println(s); // 362880
    }
}
```

> 注意：计算求积时，初始值必须设置为`1`。

除了可以对数值进行累积计算外，灵活运用`reduce()`也可以对Java对象进行操作。下面的代码演示了如何将配置文件的每一行配置通过`map()`和`reduce()`操作聚合成一个`Map<String, String>`：

```java
public class Main {
    public static void main(String[] args) {
        // 按行读取配置文件:
        List<String> props = List.of("profile=native", "debug=true", "logging=warn", "interval=500");
        Map<String, String> map = props.stream()
                // 把k=v转换为Map[k]=v:
                .map(kv -> {
                    String[] ss = kv.split("\\=", 2);
                    return Map.of(ss[0], ss[1]);
                })
                // 把所有Map聚合到一个Map:
                .reduce(new HashMap<String, String>(), (m, kv) -> {
                    m.putAll(kv);
                    return m;
                });
        // 打印结果:
        map.forEach((k, v) -> {
            System.out.println(k + " = " + v);
        });
    }
}
```

### 其他操作
除了前面介绍的常用操作外，`Stream`还提供了一系列非常有用的方法。

#### 排序
对`Stream`的元素进行排序十分简单，只需调用`sorted()`方法：

```java
public class Main {
    public static void main(String[] args) {
        List<String> list = List.of("Orange", "apple", "Banana")
            .stream()
            .sorted()
            .collect(Collectors.toList());
        System.out.println(list);
    }
}
```

此方法要求`Stream`的每个元素必须实现`Comparable`接口。如果要自定义排序，传入指定的`Comparator`即可：

```java
List<String> list = List.of("Orange", "apple", "Banana")
    .stream()
    .sorted(String::compareToIgnoreCase)
    .collect(Collectors.toList());
```

#### 去重
对一个`Stream`的元素进行去重，可以直接用`distinct()`：

```java
List.of("A", "B", "A", "C", "B", "D")
    .stream()
    .distinct()
    .collect(Collectors.toList()); // [A, B, C, D]
```

#### 截取
截取操作常用于把一个无限的`Stream`转换成有限的`Stream`，`skip()`用于跳过当前`Stream`的前`N`个元素，`limit()`用于截取当前`Stream`最多前`N`个元素：

```java
List.of("A", "B", "C", "D", "E", "F")
    .stream()
    .skip(2) // 跳过A, B
    .limit(3) // 截取C, D, E
    .collect(Collectors.toList()); // [C, D, E]
```

#### 合并
将两个`Stream`合并为一个`Stream`可以使用`Stream`的静态方法`concat()`：

```java
Stream<String> s1 = List.of("A", "B", "C").stream();
Stream<String> s2 = List.of("D", "E").stream();
// 合并:
Stream<String> s = Stream.concat(s1, s2);
System.out.println(s.collect(Collectors.toList())); // [A, B, C, D, E]
```

#### flatMap
如果`Stream`的元素是集合：

```java
Stream<List<Integer>> s = Stream.of(
        Arrays.asList(1, 2, 3),
        Arrays.asList(4, 5, 6),
        Arrays.asList(7, 8, 9));
```

由上面三个`List`组成的`Stream`形成了一个二维数组的形式，而我们希望把上述`Stream`转换为`Stream<Integer>`，就可以使用`flatMap()`：
```java
Stream<Integer> i = s.flatMap(list -> list.stream());
```
因此，所谓`flatMap()`，是指把`Stream`的每个元素（这里是`List`）映射为`Stream`，然后合并成一个新的`Stream`，即把二维数组转成一维的。

#### 并行
通常情况下，对`Stream`的元素进行处理是单线程的，即一个一个元素进行处理。但是很多时候，我们希望可以并行处理`Stream`的元素，因为在元素数量非常大的情况，并行处理可以大大加快处理速度。

把一个普通`Stream`转换为可以并行处理的`Stream`非常简单，只需要用`parallel()`进行转换：

```java
Stream<String> s = ...
String[] result = s.parallel() // 变成一个可以并行处理的Stream
        .sorted() // 可以进行并行排序
        .toArray(String[]::new);
```

或者直接在创建`Stream`时使用`parallelStream()`方法，为集合创建并行流：

```java
List list = ...
Stream<String> s = list.parallelStream() // 生成一个可以并行处理的Stream
        .sorted() // 可以进行并行排序
```

#### 其他聚合方法
除了`reduce()`和`collect()`外，`Stream`还有一些常用的聚合方法：

- `count()`：用于返回元素个数；
- `max(Comparator<? super T> cp)`：找出最大元素；
- `min(Comparator<? super T> cp)`：找出最小元素。

针对`IntStream`、`LongStream`和`DoubleStream`，还额外提供了以下聚合方法：

- `sum()`：对所有元素求和；
- `average()`：对所有元素求平均数。

还有一些方法，用来测试`Stream`的元素是否满足以下条件：

- `boolean allMatch(Predicate<? super T>)`：测试是否所有元素均满足测试条件；
- `boolean anyMatch(Predicate<? super T>)`：测试是否至少有一个元素满足测试条件。

最后一个常用的方法是`forEach()`，它可以循环处理`Stream`的每个元素，我们经常传入`System.out::println`来打印`Stream`的元素：

```java
Stream<String> s = ...
s.forEach(str -> {
    System.out.println("Hello, " + str);
});
```

## 输出Stream
我们使用`Stream`对数据进行了处理，最后就需要输出`Stream`里的元素了。

在此之前，我们先对之前介绍的操作分个类：一类是转换操作，即把一个`Stream`转换为另一个`Stream`，例如`map()`和`filter()`，另一类是聚合操作，即对`Stream`的每个元素进行计算，得到一个确定的结果，例如`reduce()`。

大家有没有注意到，在介绍`reduce()`方法时，我们用`reduce()`编写了求和与求积运算，它们返回的并不是另一个`Stream`，而是一个值`sum`。因此，上面两种操作的区别就是：转换操作并不会触发任何计算；而聚合操作会立刻促使`Stream`输出它的每一个元素，并依次纳入计算，以获得最终结果。所以，我们可以使用聚合操作输出`Stream`。

### 输出为List
`reduce()`只是一种聚合操作，如果我们希望把`Stream`的元素保存到集合，例如`List`，因为`List`的元素是确定的Java对象，因此，把`Stream`变为`List`不是一个转换操作，而是一个聚合操作，它会强制`Stream`输出每个元素。

下面的代码演示了如何将一组`String`先过滤掉空字符串，然后把非空字符串保存到`List`中：

```java
public class Main {
    public static void main(String[] args) {
        Stream<String> stream = Stream.of("Apple", "", null, "Pear", "  ", "Orange");
        List<String> list = stream.filter(s -> s != null && !s.isBlank()).collect(Collectors.toList());
        System.out.println(list);
    }
}
```

把Stream的每个元素收集到`List`的方法是调用`collect()`并传入`Collectors.toList()`对象，它实际上是一个`Collector`实例，通过类似`reduce()`的操作，把每个元素添加到一个收集器中，这里实际上是`ArrayList`。

类似的，`collect(Collectors.toSet())`可以把`Stream`的每个元素收集到`Set`中。

### 输出为数组
把Stream的元素输出为数组和输出为`List`类似，我们只需要调用`toArray()`方法，并传入数组的*构造方法*：

```java
List<String> list = List.of("Apple", "Banana", "Orange");
String[] array = list.stream().toArray(String[]::new);
```

注意到传入的*构造方法*是`String[]::new`，它的签名实际上是`IntFunction<String[]>`定义的`String[] apply(int)`，即传入`int`参数，获得`String[]`数组的返回值。

### 输出为Map
如果我们要把`Stream`的元素收集到`Map`中，就稍微麻烦一点。因为对于每个元素，添加到`Map`时都需要`key`和`value`，因此，我们要指定两个映射函数，分别把元素映射为`key`和`value`：

```java
public class Main {
    public static void main(String[] args) {
        Stream<String> stream = Stream.of("APPL:Apple", "MSFT:Microsoft");
        Map<String, String> map = stream
                .collect(Collectors.toMap(
                        // 把元素s映射为key:
                        s -> s.substring(0, s.indexOf(':')),
                        // 把元素s映射为value:
                        s -> s.substring(s.indexOf(':') + 1)));
        System.out.println(map);
    }
}
```

### 分组输出
`Stream`还有一个强大的分组功能，可以按组输出。我们看下面的例子：

```java
public class Main {
    public static void main(String[] args) {
        List<String> list = List.of("Apple", "Banana", "Blackberry", "Coconut", "Avocado", "Cherry", "Apricots");
        Map<String, List<String>> groups = list.stream()
                .collect(Collectors.groupingBy(s -> s.substring(0, 1), Collectors.toList()));
        System.out.println(groups);
    }
}
```
分组输出使用`Collectors.groupingBy()`，它需要提供两个函数：一个是分组的`key`，这里使用`s -> s.substring(0, 1)`，表示只要首字母相同的`String`分到一组，第二个是分组的`value`，这里直接使用`Collectors.toList()`，表示输出为`List`，上述代码运行结果如下：

> A=[Apple, Avocado, Apricots],  
> B=[Banana, Blackberry],  
> C=[Coconut, Cherry]  

## 小结
`Stream`提供的常用操作有：

| 类型   | 方法                                                                   |
|:-----|:---------------------------------------------------------------------|
| 转换操作 | `map()`，`filter()`，`sorted()`，`distinct()`                           |
| 合并操作 | `concat()`，`flatMap()`                                               |
| 并行处理 | `parallel()`                                                         |
| 聚合操作 | `reduce()`，`collect()`，`count()`，`max()`，`min()`，`sum()`，`average()` |
| 其他操作 | `allMatch()`，`anyMatch()`，`forEach()`                                |

# 应用
## 需求规格
在项目中，需要编写这样的业务逻辑：根据一串`id`在数据库中查询并返回与`id`匹配的数据；或者再复杂一些，在一个表中根据`id`查到数据，然后根据这些数据的其他字段查询另一个表的数据。在这些逻辑中，需要保证代码拥有较高的可读性和健壮性，保证数据库表或者`DTO`入参产生变化时，相应的业务代码不需要做大的改动。

## 解决方案
使用`Stream`代替`for`循环遍历数组，使用`map`可以从数据库表一行数据里提取出一个`id`字段，再用`collect`将其转换为`List`。

使用`Stream`存储`id`时，如果用这些`id`查询到了多行数据，有可能会返回由`List`组成的`Stream`，这时就可以用`flatMap`，将它们转换成单行数据组成的`Stream`。

## 实例
假设已得到一个实体数组：
```java
List<EmissionCalcParamDTO> emissionCalcParams
```

我们可以使用`Stream`轻松地获取这些实体的`id`，只需在`map`中传入`getter`方法：

```java
List<Long> paramIdList = emissionCalcParams.stream()
        .map(EmissionCalcParamDTO::getId)
        .collect(Collectors.toList());
```

之后，可以根据这些`id`在数据库中查询另一个表的数据，这里使用了MyBatis-Plus的条件构造器编写查询条件。

```java
List<DetermineDTO> determineList = new LambdaQueryChainWrapper<>(determineMapper)
        .eq(DetermineDTO::getObtainingMethod, 2)
        .in(DetermineDTO::getCalcParamId, paramIdList)
        .list();
```

最后，根据这些数据里的字段，返回第三个表的数据：

```java
return determineList.stream()
        .map(DetermineDTO::getDeviceId)
        .map(this::getDeviceById)
        .collect(Collectors.toList());
```

可以注意到，这些`map`传入了`getter`方法和内部方法，对`Stream`进行多次转换，最终得到我们想要的结果。

再来看另一个实例。这次我们根据id获取到的数据是由`List`组成的，需要将它们转换成单行数据，即去除它们的分组。我们可以使用`flatMap`，把`Stream`的每个`List`映射为`Stream`，然后合并成一个新的`Stream`，只需传入`Collection`的内部方法`stream()`即可。

```java
return deviceList.stream().map(MonitoringDeviceDTO::getId)
        .map(this::getRecordByDevice)
        .flatMap(Collection::stream)
        .collect(Collectors.toList());
```

# 题外话
我编写Java代码使用的`IDE`是`IntelliJ IDEA`。在编写`Stream`的链式操作时适当换行，`IDEA`可以将每一行链式操作得到的**数据类型**显示在行末，清晰地展现出`Stream`的`Pipelining`特点，非常有助于阅读和编写代码。

此外，`IDEA`内置的`Lombok`插件（小辣椒）可以自动生成类的`getter`与`setter`方法，不需要手动重复编写，需要时直接调用就好，且代码自动补全功能会在这些自动生成的方法图标右下角显示一个小辣椒，非常有趣。

---
**非常感谢你的阅读，辛苦了！**

---
参考文章： (感谢以下资料提供的帮助)
- [使用Stream - 廖雪峰的官方网站](https://www.liaoxuefeng.com/wiki/1252599548343744/1322402873081889)
- [Java 8 Stream | 菜鸟教程](https://www.runoob.com/java/java8-streams.html)
