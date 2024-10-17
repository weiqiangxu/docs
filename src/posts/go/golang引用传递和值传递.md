---
title: golang引用传递和值传递
index_img: /images/bg/golang.webp
banner_img: /images/bg/5.jpg
tags:
  - golang
categories:
  - golang
date: 2020-08-20 17:43:12
excerpt: 理解什么是值传递什么是引用传递吗，golang的结构体是值传递吗，切片是引用传递吗
hide: true
---

### 一、为什么说golang的所有数据类型都是值传递

``` txt
Go里面没有引用传递，Go语言是值传递
```

### 二、什么是引用类型和值类型

- 值类型 int\float\bool\string\array\sturct等
- 引用类型 slice\map\channel\interface\func

> 当某一个数据类型作为返回值的时候，如果返回值可以为nil的表示为引用类型

### 相关疑问

#### 1.值传递为什么传递slice会改变原有数据

``` txt 
值类型来说在函数之间传递时候是深拷贝
引用类型来说在函数之间传递是浅拷贝

slice是引用类型，传递的值是底层数组对应的内存地址，所以会改变原有值
```
#### 2.值传递还是引用传递如何区分

在值传递中，函数会将源参数的值复制到一个新的内存位置以供函数内部使用，因此源参数和内部参数指向不同的内存位置。在引用传递中，函数会接收源参数的内存地址，因此内部参数指向与源参数相同的内存位置，因此对其任何更改都会反映在源参数上。

> 主要区分点是：函数内部参数是不是源参数的拷贝

golang都是值传递，但有些时候函数内部可以改变到函数外部源参数，这是因为有些数据是引用类型，引用类型变量值就是原始值的指针，函数浅拷贝以后内部变量值是原始值的指针，所以更改会改变到外部的参数，但本质来说，函数在参数传递之后仍然是指拷贝了一份，将函数源参数值拷贝到函数内部赋值。

### 参考资料

[kancloud.cn/pshizhsysu/值类型和引用类型是什么](https://www.kancloud.cn/pshizhsysu/golang/2139494)
[又拍云知乎-Golang是值传递还是引用传递](https://zhuanlan.zhihu.com/p/509431611)
[码农在新加坡-Golang是值传递还是引用传递](https://zhuanlan.zhihu.com/p/542218435)