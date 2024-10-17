---
title: ApiGatway设计
index_img: /images/bg/文章通用.png
tags:
  - golang
categories:
  - golang
date: 2023-04-11 09:40:12
excerpt: 理解golang的web服务之中api gatway扮演的角色，它的设计和应用
hide: true
---

# API_Getway

1. API Gateway 演进
```
背景: 微服务和客户端直接通信
1. 强耦合（各个微服务变更，都需要知会前端）
2. 多个微服务之前协议需要统一（具体指的是响应值错误码数据结构等）
3. 不利于微服务局部弹性扩容
```
2. API Gateway 可以做到的事情
```
隔离 - 屏蔽内部细节和外部客户端
超时控制 - 控制响应最大时长
重试 - 屏蔽客户端当内部异常时自动重试
限流
过载保护
熔断
降级
负载均衡
```
### 推荐解决方案
[https://apisix.apache.org/](https://apisix.apache.org/)
> Apache APISIX 基于 NGINX 和 etcd。与传统的 API Gateway 相比，APISIX 具有动态路由和热加载插件等特性
<hr/>

# API 管理
[https://linter.aip.dev/](https://linter.aip.dev/)
```
proto 代码独立仓库部署
1. 各业务proto文件独立维护
2. 统一仓库存储proto文件，独立git库 (也是目前自己在用的一个)
```

<hr/>

# API 设计

```
gRPC使用proto作为描述文件
业务域（Business Domain）
资源路径（Resource Path）  = 业务域 + 资源相对路径
```

[轻量级微服务框架 go-kratos/kratos](https://github.com/go-kratos/kratos/blob/main/README_zh.md)

[proto文件放哪里合适](https://mp.weixin.qq.com/s/cBXZjg_R8MLFDJyFtpjVVQ)

[google API设计指南中文版](https://www.bookstack.cn/read/API-design-guide/API-design-guide-README.md)

[protobuf规范](https://go-kratos.dev/docs/guide/api-protobuf/)