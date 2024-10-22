---
title: MySQL集群搭建
tags:
  - kubernetes
categories:
  - kubernetes
---

### 开源安装包

[artifacthub.io/packages/helm/bitnami/mysql](https://artifacthub.io/packages/helm/bitnami/mysql)

```bash
# global.storageClass 存储类
# secondary.replicaCount 从节点数量
# MySQL的架构可以是独立的（standalone）或者是复制（replication）

helm install mysql-cluster \
    oci://registry-1.docker.io/bitnamicharts/mysql \
    --set global.storageClass=nfs-client \
    --set architecture=replication \
    --set secondary.replicaCount=2 
```

### 常用命令

1. 通过chart包查看镜像命令：`helm tmeplate <chart包> | grep image`
2. 查看helm的参数`helm get value <chart包>`


[实战Kubernetes StatefulSet -- MySQL主从集群搭建](https://cloud.tencent.com/developer/article/2031851)