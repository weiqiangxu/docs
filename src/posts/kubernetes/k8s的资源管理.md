---
hide: true
---
# k8s的资源管理

### Pod是什么
```
最小执行单元
```

### 资源管理方式

1. 命令式对象管理

2. 命令式对象配置

3. 声明式对象配置 

```
kubectl apply -f nginx-pod.yaml
```


### Pod资源控制器

```
ReplicationController RC：比较原始的Pod控制器，已经被废弃，由ReplicaSet替代。
ReplicaSet RS：保证指定数量的Pod运行，并支持Pod数量变更，镜像版本变更。
Deployment：通过控制ReplicaSet来控制Pod，并支持滚动升级、版本回退。
Horizontal Pod Autoscaler：可以根据集群负载自动调整Pod的数量，实现削峰填谷。
DaemonSet：在集群中的指定Node上都运行一个副本，一般用于守护进程类的任务。
Job：它创建出来的Pod只要完成任务就立即退出，用于执行一次性任务。
CronJob：它创建的Pod会周期性的执行，用于执行周期性的任务。
StatefulSet：管理有状态的应用。
```
### 常用的控制器

1. ReplicaSet
2. CronJob
3. Deployment

### 服务发现资源

1. services 
2. ingress


### 配置资源

1. configmaps
2. secrets