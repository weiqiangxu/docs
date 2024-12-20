---
title: Kubernetes组件
category:
  - docker
tag:
  - docker
---

# Kubernetes 组件介绍

### 一、控制节点

1. API Server 集群操作入口
2. Scheduler 集群资源调度
3. ControllerManager 维护集群状态
4. ETCD 存储资源对象

### 二、工作节点

1. Kubelet 维护容器生命周期
2. KubeProxy 集群内部服务发现和负载均衡
3. Docker 节点上容器操作


### 何谓高可用的k8s

### k8s的相关术语

1. Master
2. Node
3. Pod
4. Controller
5. Service
6. Label
7. NameSpace


### 部署一个k8s的时候组件之间的调用关系

1. k8s启动，master和node信息存储 ETCD
2. API Server : install CMD 发送 master  API Server
3. Scheduler :  Scheduler决定要安装到哪一个Node （etcd查询节点信息按照算法判定）告知API Server
4. Controller-Manager : API Server调用Controller-Manager去调用Node节点安装Nginx
5. Kubelet : Kubelet通知Docker启动Pod
6. Nginx启动后 通过kube-proxy对Pod产生访问代理