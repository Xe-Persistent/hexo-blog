---
title: 如何重构if-else写出优雅高效代码
date: 2022-06-27 14:10:07
tags:
    - Java
    - 开发
categories: 经验分享
keywords: "Java, if, else, 重构"
description: if-else语句是计算机编程语言当中一种条件分支语句，在项目开发中频繁使用，但是它的滥用会导致代码可读性的下降，这篇文章会用几种典型案例告诉你如何用if-else写出易于维护的优雅高效代码
copyright: false
---
# 为什么我们写的代码都是if-else？
程序员想必都经历过这样的场景：刚开始自己写的代码很简洁，逻辑清晰，函数精简，没有一个`if-else`。可随着代码逻辑不断完善和业务的瞬息万变，比如需要对入参进行类型和值进行判断；这里要判断下字段是否为`null`；不同类型执行不同的流程，落地到具体实现只能不停地加`if-else`来处理。渐渐地，代码变得越来越庞大，函数越来越长，代码行数也迅速突破上千行，维护难度也越来越大，到后期基本达到一种难以维护的状态。

**虽然我们都很不情愿写出满屏`if-else`的代码，可逻辑上就是需要特殊判断，很绝望，可也没办法避免啊。**

其实回头看看自己的代码，写`if-else`无外乎两种场景：**异常逻辑处理和不同状态处理。**

两者最主要的区别是：**异常逻辑处理说明只能一个分支是正常流程，而不同状态处理都所有分支都是正常流程。**

## 代码if-else代码太多有什么缺点？
缺点相当明显了：

1. 最大的问题是代码逻辑复杂，维护性差，极容易引发bug。
2. 如果使用`if-else`，说明`if`分支和`else`分支的重视是同等的，但大多数情况并非如此，容易引起误解和理解困难。

## 是否有好的方法优化？如何重构？
方法肯定是有的。重构`if-else`时，心中每时每刻把握一个原则：

**尽可能地维持正常流程代码在最外层。**

意思是说，可以写`if-else`语句时一定要尽量保持主干代码是正常流程，避免嵌套过深。

怎么理解？举两个例子：

> 举例一：异常逻辑处理

```java
Object obj = getObj();
if (obj != null) {
    // do something
} else {
    // do something
}
```

> 举例二：状态处理

```java
Object obj = getObj();
if (obj.getType == 1) {
    // do something
} else if (obj.getType == 2) {
    // do something
} else {
    // do something
}
```

第一个例子`if (obj != null)`是异常处理，是代码健壮性判断，只有`if`里面才是正常的处理流程，`else`分支是出错处理流程；

而第二个例子不管`type`等于1、2还是其他情况，都属于业务的正常流程。

对于这两种情况，重构的方法也不一样。实现的手段有：*减少嵌套*、*移除临时变量*、*条件取反判断*、*合并条件表达式*等。

下面针对不同情形举几个实例来讲解这些重构方法。

# 异常逻辑处理型重构

## 实例一：合并条件表达式
重构前：

```java
double disablityAmount() {
    if (_seniority < 2) {
        return 0;
    }
    if (_monthsDisabled > 12) {
        return 0;
    }
    if (_isPartTime) {
        return 0;
    }
    // do something
}
```

重构后：

```java
double disablityAmount() {
    if (_seniority < 2 || _monthsDisabled > 12 || _isPartTime)
        return 0;
    // do something
}
```

这里的重构手法叫**合并条件表达式**：如果有一系列条件测试都得到相同结果，将这些结果测试合并为一个条件表达式。

这个重构手法简单易懂，带来的效果也非常明显，能有效地较少`if`语句，减少代码量逻辑上也更加易懂。

## 实例二：移除临时变量
重构前：

```java
double getPayAmount() {
    double result;
    if (_isDead) {
        result = deadAmount();
    } else {
        if (_isSeparated) {
            result = separatedAmount();
        } else {
            if (_isRetired) {
                result = retiredAmount();
            } else {
                result = normalPayAmount();
            }
        }
    }
    return result;
}
```

重构后：

```java
double getPayAmount() {
    if (_isDead) {
        return deadAmount();
    }
    if (_isSeparated) {
        return separatedAmount();
    }
    if (_isRetired) {
        return retiredAmount();
    }
    return normalPayAmount();
}
```

怎么样？比对两个版本，会发现重构后的版本逻辑清晰，简洁易懂。

和重构前到底有什么区别呢？

最大的区别是**减少`if-else`嵌套**。

可以看到，最初的版本`if-else`最深的嵌套有三层，看上去逻辑分支非常多，进到里面基本都要被绕晕。其实，仔细想想嵌套内的`if-else`和最外层并没有关联性，完全可以提取最顶层，改为平行关系，而非包含关系。`if-else`数量没有变化，但是逻辑清晰明了，一目了然。

另一个重构点是**废除了`result`临时变量，直接`return`返回**。好处也显而易见：直接结束流程，缩短异常分支流程。原来的做法先赋值给`result`最后统一`return`，那么对于最后`return`的值到底是哪个函数返回的结果不明确，增加了一层理解难度。

总结重构的要点：**如果`if-else`嵌套没有关联性，直接提取到第一层，一定要避免逻辑嵌套太深。尽量减少临时变量改用`return`直接返回。**

## 实例三：条件取反判断
重构前：

```java
public double getAdjustedCapital() {
    double result = 0.0;
    if (_capital > 0.0) {
        if (_intRate > 0 && _duration > 0) {
            result = (_income / _duration) * ADJ_FACTOR;
        }
    }
    return result;
}
```

第一步，运用第一招：减少嵌套和移除临时变量。

```java
public double getAdjustedCapital() {
    if (_capital <= 0.0) {
        return 0.0;
    }
    if (_intRate > 0 && _duration > 0) {
        return (_income / _duration) * ADJ_FACTOR;
    }
    return 0.0;
}
```

这样重构后，还不够，因为主要的语句`(_income / _duration) * ADJ_FACTOR`在`if`内部，并非在最外层，根据优化原则「*尽可能地维持正常流程代码在最外层*」，可以再继续重构。

```java
public double getAdjustedCapital() {
    if (_capital <= 0.0) {
        return 0.0;
    }
    if (_intRate <= 0 || _duration <= 0) {
        return 0.0;
    }
    return (_income / _duration) * ADJ_FACTOR;
}
```

这才是好的代码风格，逻辑清晰，一目了然，没有`if-else`嵌套难以理解的流程。

这里用到的重构方法是：**将条件反转使异常情况先退出，让正常流程维持在主干流程**。

## 实例四：减少if-else嵌套
重构前：

```java
// 查找年龄大于18岁且为男性的学生列表 
public ArrayList<Student> getStudents(int uid) {
    ArrayList<Student> result = new ArrayList<Student>();
    Student stu = getStudentByUid(uid);
    if (stu != null) {
        Teacher teacher = stu.getTeacher();
        if (teacher != null) {
            ArrayList<Student> students = teacher.getStudents();
            if (students != null) {
                for (Student student : students) {
                    if (student.getAge() > = 18 && student.getGender() == MALE) {
                        result.add(student);
                    }
                }
            } else {
                logger.error("获取学生列表失败");
            }
        } else {
            logger.error("获取老师信息失败");
        }
    } else {
        logger.error("获取学生信息失败");
    }
    return result;
}
```

典型的「箭头型」代码，最大的问题是**嵌套过深**，解决方法是异常条件先退出，保持主干流程是核心流程。

重构后：

```java
// 查找年龄大于18岁且为男性的学生列表
public ArrayList<Student> getStudents(int uid) {
    ArrayList<Student> result = new ArrayList<Student>();
    Student stu = getStudentByUid(uid);
    if (stu == null) {
        logger.error("获取学生信息失败");
        return result;
    }
    Teacher teacher = stu.getTeacher();
    if (teacher == null) {
        logger.error("获取老师信息失败");
        return result;
    }
    ArrayList<Student> students = teacher.getStudents();
    if (students == null) {
        logger.error("获取学生列表失败");
        return result;
    }
    for (Student student : students) {
        if (student.getAge() > 18 && student.getGender() == MALE) {
            result.add(student);
        }
    }
    return result;
}
```

# 状态处理型重构

## 实例一：封装成内部函数
重构前：

```java
double getPayAmount() {
    Object obj = getObj();
    double money = 0;
    if (obj.getType == 1) {
        ObjectA objA = obj.getObjectA();
        money = objA.getMoney() * obj.getNormalMoneryA();
    } else if (obj.getType == 2) {
        ObjectB objB = obj.getObjectB();
        money = objB.getMoney() * obj.getNormalMoneryB() + 1000;
    }
}
```

重构后：

```java
double getPayAmount() {
    Object obj = getObj();
    if (obj.getType == 1) {
        return getType1Money(obj);
    } else if (obj.getType == 2) {
        return getType2Money(obj);
    }
}

double getType1Money(Object obj) {
    ObjectA objA = obj.getObjectA();
    return objA.getMoney() * obj.getNormalMoneryA();
}

double getType2Money(Object obj) {
    ObjectB objB = obj.getObjectB();
    return objB.getMoney() * obj.getNormalMoneryB() + 1000;
}
```

这里使用的重构方法是：**把`if-else`内的代码都封装成一个内部函数**。内部函数的好处是屏蔽内部实现，缩短`if-else`分支的代码。代码结构和逻辑上清晰，能一下看出来每一个条件下实现的功能。

## 实例二：用多态取代条件表达式
针对状态处理的代码，一种优雅的做法是「*《重构》推荐做法*」**用多态取代条件表达式**。

> 你手上有个条件表达式，它根据对象类型的不同而选择不同的行为。将这个表达式的每个分支放进一个子类内的覆写函数中，然后将原始函数声明为抽象函数。

重构前：

```java
double getSpeed() {
    switch (_type) {
        case EUROPEAN:
            return getBaseSpeed();
        case AFRICAN:
            return getBaseSpeed() - getLoadFactor() * _numberOfCoconuts;
        case NORWEGIAN_BLUE:
            return (_isNailed) ? 0 : getBaseSpeed(_voltage);
    }
}
```

重构后：

```java
class Bird {
    abstract double getSpeed();
}

class European extends Bird {
    double getSpeed() {
        return getBaseSpeed();
    }
}

class African extends Bird {
    double getSpeed() {
        return getBaseSpeed() - getLoadFactor() * _numberOfCoconuts;
    }
}

class NorwegianBlue extends Bird {
    double getSpeed() {
        return (_isNailed) ? 0 : getBaseSpeed(_voltage);
    }
}
```

可以看到，使用多态后直接没有了`if-else`，但使用多态对原本代码修改过大，需要下一番功夫才行。最好在设计之初就使用多态方式。

# 小结
`if-else`代码是每一个程序员最容易写出的代码，同时也是最容易被写烂的代码，稍不注意，就产生一堆难以维护和逻辑混乱的代码。

针对条件型代码重构时刻把握一个原则：

**尽可能地维持正常流程代码在最外层，保持主干流程是正常核心流程。**

为维持这个原则，合并条件表达式可以有效地减少`if`语句数目，减少嵌套能减少深层次逻辑，异常条件先退出自然而然主干流程就是正常流程。

针对状态处理型重构方法有两种：一种是把不同状态的操作封装成内部函数，简短`if-else`内代码行数；另一种是利用面向对象多态特性直接干掉了条件判断。

现在回头看看自己的代码，犯了哪些典型错误，赶紧运用这些重构方法重构代码吧！

---
**非常感谢你的阅读，辛苦了！**

---
本文转自CSDN博主「yinnnnnnn」的文章[6个实例详解如何把if-else代码重构成高质量代码](https://blog.csdn.net/qq_35440678/article/details/77939999)
