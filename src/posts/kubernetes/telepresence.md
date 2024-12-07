---
title: telepresence
tags:
  - telepresence
categories:
  - kubernetes
---

### 1.常用命令

```
telepresence version
telepresence connect
```

### 2.集群连接

```
$ telepresence connect
```

### 3.开发和调试现有的服务

```
# 远程流量发送到本地服务

# $SERVICE_NAME 是本地服务名称
# $LOCAL_PORT 是服务在本地工作站上运行的端口
# $REMOTE_PORT 是服务在集群中侦听的端口

telepresence intercept $SERVICE_NAME --port $LOCAL_PORT:REMOTE_PORT
```

### 4.验证集群是否连接成功

```
ping [$service_name].[$namespace].svc.cluster.local

ping login.user.svc.cluster.local
```

### 5.kubecm

> 管理kube config的

### 6.安装多个config | 常用指令

```
cd ~/.kube/ && mkdir tmp && cd tmp
vim develop
vim testing
cd ..
kubecm -m tmp

# 合并多个配置为一个
kubecm merge -f [$dir]
kubecm merge -f tmp

kubecm swtich

telepresence quit -u -r
telepresence connect
```

### 参考资料

- [阿里云开发者社区/Kubecm:管理你的kubeconfig](https://developer.aliyun.com/article/738438)
- [github telepresence](https://github.com/telepresenceio/telepresence)
- [本机连接到远程 Kubernetes 集群](https://kubernetes.io/zh-cn/docs/tasks/debug/debug-cluster/local-debugging/)
- [kubecm Github Link](https://github.com/sunny0826/kubecm)
- [kubecm.cloud/](https://kubecm.cloud/)
