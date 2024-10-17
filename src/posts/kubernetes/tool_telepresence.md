---
title: telepresence基本使用
tags:
  - telepresence
categories:
  - kubernetes
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
---

### 常用命令

```
telepresence version
telepresence connect
```

### 集群连接

```
$ telepresence connect
```

### 开发和调试现有的服务

```
# 远程流量发送到本地服务

# $SERVICE_NAME 是本地服务名称
# $LOCAL_PORT 是服务在本地工作站上运行的端口
# $REMOTE_PORT 是服务在集群中侦听的端口

telepresence intercept $SERVICE_NAME --port $LOCAL_PORT:REMOTE_PORT
```

### 验证集群是否连接成功

```
ping [$service_name].[$namespace].svc.cluster.local

ping login.user.svc.cluster.local
```


### 参考资料
[github telepresence](https://github.com/telepresenceio/telepresence)
[本机连接到远程 Kubernetes 集群](https://kubernetes.io/zh-cn/docs/tasks/debug/debug-cluster/local-debugging/)

