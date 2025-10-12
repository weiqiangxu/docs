---
title: tcp粘包
tags:
  - network
categories:
  - network
---

> 理解什么是tcp粘包以及如何解决粘包的问题

# tcp 粘包

[TCP黏包](https://www.topgoer.com/%E7%BD%91%E7%BB%9C%E7%BC%96%E7%A8%8B/socket%E7%BC%96%E7%A8%8B/TCP%E9%BB%8F%E5%8C%85.html)

### 什么是粘包

```
多次 net.Conn.Write 数据在服务端被当成同一份数据解析
```

### 什么情况下会出现

```
1. 客户端将两段数据合并起来发送导致粘包 (Nagle算法一种改善网络传输效率的算法)
2. 接收端缓冲区将数据缓存，然后通知应用层取数据
```

### 解决办法

```
封包

客户端和服务端遵循统一中封装和拆包的协议
```

### http是如何解决tcp粘包的问题的呢