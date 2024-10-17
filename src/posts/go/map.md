---
title: map原理解析
tags:
  - GO原理
categories:
  - go
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### 术语

1. 哈希表
2. 哈希桶
3. 取模法 \ 与运算法
4. 哈希冲突（开放地址法、拉链法）
5. 哈希冲突影响效率（散列均匀的哈希函数减少哈希冲突的发生、哈希表扩容也可以有效保障哈希读写效率）
6. 存储键值对数目与哈希桶数目比值-负载因子
7. 扩容时候分配新桶，需要迁移旧桶到新桶 - 渐进式扩容


### go

1. 与运算
2. 负载因子6.5默认
3. 翻倍扩容\等量扩容 （等量扩容用于很多键值对被删除时候让内存排列更加紧凑）

# GO实现

1. map类型变量本质上是 hmap (键值对数目、桶、旧桶)
2. map使用的桶结构是 bmap （k、v、可以继续用于存储的溢出桶 ）




[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)
[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)