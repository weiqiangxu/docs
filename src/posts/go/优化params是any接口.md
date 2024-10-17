---
title: 优化params是any接口
index_img: /images/bg/golang.webp
banner_img: /images/bg/5.jpg
tags:
  - golang
categories:
  - golang
date: 2023-04-20 17:43:12
excerpt: 如何优化参数为范型数据的接口
hide: true
---

### 一、code

``` go
package main

import "fmt"

func main() {
    d := new(DealImplement)
    d.Handle(&User{Name: "hello"})
    d.Handle(&School{SchoolName: "work"})
}

type Deal interface {
    Handle(params Param)
}

type DealImplement struct {
}

func (d *DealImplement) Handle(params Param) {
    fmt.Println(params.String())
}

type Param interface {
    String() string
}

type User struct {
    Name string
}

func (u *User) String() string {
    return "hello"
}

type School struct {
    SchoolName string
}

func (u *School) String() string {
    return "hello"
}
```

> 表面上调用的Deal函数，实际上执行了子类的方法，与java函数中的范型一样，可以设定参数类型 T 必须是 Comparable的实现。

### 二、Java范型

``` java
public static <T extends Comparable<T>> T maximum(T x, T y, T z){                     
      T max = x; // 假设x是初始最大值
      if ( y.compareTo( max ) > 0 ){
         max = y; //y 更大
      }
      if ( z.compareTo( max ) > 0 ){
         max = z; // 现在 z 更大           
      }
      return max; // 返回最大对象
}
```
