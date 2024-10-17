---
title: kubernetes审计日志
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-05-23 18:40:12
excerpt: 介绍审计日志相关配置项，示例如何开启并且如何将审计日志打到标准输出
sticky: 1
hide: false
---

### 一、审计日志的策略

1. 日志记录阶段

kube-apiserver 是负责接收及相应用户请求的一个组件，每一个请求都会有几个阶段，每个阶段都有对应的日志，当前支持的阶段有：
- RequestReceived - apiserver 在接收到请求后且在将该请求下发之前会生成对应的审计日志
- ResponseStarted - 在响应 header 发送后并在响应 body 发送前生成日志。这个阶段仅为长时间运行的请求生成（例如 watch）
- ResponseComplete - 当响应 body 发送完并且不再发送数据
- Panic - 当有 panic 发生时生成

>  apiserver 的每一个请求理论上会有三个阶段的审计日志生成

2. 日志记录级别

- None - 不记录日志。
- Metadata - 只记录 Request 的一些 metadata (例如 user, timestamp, resource, verb 等)，但不记录 Request 或 Response 的body。
- Request - 记录 Request 的 metadata 和 body。
- RequestResponse - 最全记录方式，会记录所有的 metadata、Request 和 Response 的 body。

3. 日志记录策略

- 一个请求不要重复记录，每个请求有三个阶段，只记录其中需要的阶段
- 不要记录所有的资源，不要记录一个资源的所有子资源
- 系统的请求不需要记录，kubelet、kube-proxy、kube-scheduler、kube-controller-manager 等对 kube-apiserver 的请求不需要记录
- 对一些认证信息（secerts、configmaps、token 等）的 body 不记录

### 二、启用审计日志

1. 在宿主机创建文件

``` bash
$ mkdir -p /etc/kubernetes/audit/
$ touch /etc/kubernetes/audit/audit-policy.yaml
```

``` yml
# /etc/kubernetes/audit/audit-policy.
apiVersion: audit.k8s.io/v1
kind: Policy
# ResponseStarted 阶段不记录
omitStages:
  - "ResponseStarted"
rules:
  # 记录用户对 pod 和 statefulset 的操作
  - level: RequestResponse
    resources:
    - group: ""
      resources: ["pods","pods/status"]
    - group: "apps"
      resources: ["statefulsets","statefulsets/scale"]
  # kube-controller-manager、kube-scheduler 等已经认证过身份的请求不需要记录
  - level: None
    userGroups: ["system:authenticated"]
    nonResourceURLs:
    - "/api*"
    - "/version"
  # 对 config、secret、token 等认证信息不记录请求体和返回体
  - level: Metadata
    resources:
    - group: "" # core API group
      resources: ["secrets", "configmaps"]
```

2. 配置静态pod记录审计日志

``` bash
$ vim /etc/kubernetes/manifests/kube-apiserver.yaml
```

``` yml
# 日志文件保留7天，并保留最近的5个备份。
# 如果日志文件大小超过100MB，它也将被轮转。当日志文件到达最大保留时间或备份数时，较旧的日志文件将被删除。
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit/audit-policy.yaml            # 审计日志配置
    - --audit-log-path=/var/log/containers/audit.log                         # 输出到标准输出
    - --audit-log-format=json                                                # 输出格式json
    - --audit-log-maxage=7
    - --audit-log-maxbackup=5
    - --audit-log-maxsize=100
```

``` bash
# 日志文件展示
$ ls /var/log/containers/ | grep audit

audit-2023-06-05T07-12-55.439.log # 备份文件最大100MB
audit-2023-06-05T07-12-52.231.log # 备份文件
audit-2023-06-05T07-12-55.891.log # 备份文件
audit-2023-06-05T07-12-58.439.log # 备份文件
audit-2023-06-05T07-12-58.786.log # 备份文件
audit. # 最新的日志文件，超过100MB会自动轮转
```

``` yml
# 创建两个卷etc-audit && audit-log分别挂载容器内的两个路径
volumeMounts:
- mountPath: /etc/kubernetes/audit
  name: etc-audit
  readOnly: true
- mountPath: /var/log/containers/
  name: audit-log
```

``` yml
# 将两个卷 etc-audit && audit-log 分别挂载至宿主机
volumes:
- hostPath:
    path: /etc/kubernetes/audit
    type: DirectoryOrCreate
  name: etc-audit
- hostPath:
    path: /var/log/containers
    type: DirectoryOrCreate
  name: audit-log
```

> 更改了之后会自动重启 kube-apiserver

3. 审计日志查看

``` bash
$ kubectl get pod -A
$ kubectl logs kube-apiserver-k8s-master -n kube-system -f
```

### 相关疑问

- 开启审计日志后时不时会有2条日志是干嘛的

```json
# ResponseComplete /api/v1/namespaces/kube-system/configmaps?watch=true,"user":{"username":"system:node:k8s-master"}
# RequestReceived /api/v1/namespaces/kube-system/configmaps?watch=true, "user":{"username":"system:node:k8s-master"}
```

### 参考资料

[kubernertes安装](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/%E5%A6%82%E4%BD%95%E5%AE%89%E8%A3%85kubernetes/)
[简书/kubernetes 审计日志功能](https://www.jianshu.com/p/8117bc2fb966)
[任务/日志监控/审计](https://kubernetes.io/zh-cn/docs/tasks/debug/debug-cluster/audit/)