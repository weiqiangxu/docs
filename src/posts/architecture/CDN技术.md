---
title: CDN
tags:
  - CDN
categories:
  - 分布式
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
---


### CDN

1. CDN是什么
```
内容分发网络（Content Delivery Network，简称CDN）

克服单机系统输出带宽及并发能力不足的缺点

全局负载均衡技术将用户的访问指向离用户最近的服务器
```

2. 主要技术手段
```
高速缓存

镜像服务器
```

> Internet的统计表明，超过80%的用户经常访问的是20%的网站的内容


3. CDN的工作原理

```
DNS解析 域名到IP地址的转换

CDN加速的域名为www.a.com

当终端用户（北京）发起HTTP请求时

域名解析请求发送至阿里云DNS调度系统，并为请求分配最佳节点IP地址

通过DNS分查找离用户最近的CDN节点（边缘服务器）的IP

CDN上并没有缓存资源，则会到源站请求资源，并缓存到CDN节点上

CDN缓存清理，让新的请求直接到OSS，实现缓存一致性
```

> CDN边缘节点会检测用户请求数据的缓存是否过期，如果没有过期，则直接响应用户请求，此时一个完成http请求结束；如果已经过期那么CDN还需要向源站发出回源请求（back to the source request）,来拉取最新的数据

### 关键术语

```
CDN边缘节点

源站



淘宝整个图片的访问链路有三级缓存（客户端本地、CDN L1、CDN L2）

一致性hash

CDN边缘IP
```

### OSS
```
Operation Support Systems

操作支持系统
```


[知乎 - CDN是什么？使用CDN有什么优势？](https://www.zhihu.com/question/36514327?rf=37353035)