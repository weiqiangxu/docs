---
title: Loki服务安装
tags:
  - loki
categories:
  - kubernetes
---

### 一、安装步骤

1. 安装[helm](https://github.com/helm/helm/releases)工具
2. 访问 [artifacthub](https://artifacthub.io/) 添加 loki [repo](https://artifacthub.io/packages/helm/grafana/loki?modal=install)
3. 导出helm包 grafana/loki version 5.6.4
4. 修改helm包增加 scrape config 增加采集目标
5. helm包重新打包
6. 安装在k8s

### 二、开始安装

1. 安装helm

在k8s集群中安装helm，可以使用以下命令：

- [https://github.com/helm/helm/releases](https://github.com/helm/helm/releases)

只需要二进制程序下载后移动到 `/usr/local/bin` 目录。


2. 添加loki repo helm charts 仓库

``` bash
$ helm repo add grafana https://grafana.github.io/helm-charts
```

3. 导出helm包修改自定义采集路径

``` bash
$ helm pull grafana/loki --version 5.6.4 --destination=./

loki-5.6.4.tgz
```

4. 增加 scrape config 给 promtail 添加采集目标

``` bash
$ helm pull grafana/promtail --version 6.11.3 --destination=./
# 解压 promtail-6.11.3.tgz
$ tar xvf promtail-6.11.3.tgz
$ cd promtail && vim values.yaml
```
``` yml
# 添加 extraScrapeConfigs 和 目录挂载
extraScrapeConfigs: |
  - job_name: log
    static_configs:
    - targets:
        - localhost
      labels:
        job: audit
        __path__: /var/log/audit/*log
```

``` yml
# 添加目录挂载
defaultVolumes:
  - name: audit
    hostPath:
      path: /var/log/audit
defaultVolumeMounts:
  - name: audit
    mountPath: /var/log/audit
    readOnly: true
```

``` bash
# 重新打包(可以在 Chart.yaml 更改 version)
$ helm package .

# 打包后生成helm包文件
promtail-6.11.3.tgz 
```

5. 将文件上传至主机后安装helm包

``` bash
$ helm install promtail-6.11.3.tgz 
$ helm uninstall promtail
# 安装在命名空间下
$ helm install promtail -n grafana ./promtail-6.11.3.tgz 
```

6. 创建service直接外部访问loki的api接口

- [kubernetes.io之如何使用service NodePort](https://kubernetes.io/zh-cn/docs/concepts/services-networking/service/)

``` bash
# 查看loki的详细的label
$ kubectl describe pod loki-0 -n loki
```

``` yml
apiVersion: v1
kind: Service
metadata:
  name: loki-service
  namespace: grafana              # 注意和 pod 命名空间一致
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: loki  # 指向pod的筛选项Labels
  ports:
  - name: loki-port
    protocol: TCP
    port: 80
    targetPort: 3100              # 目标是 loki 服务端口 3100
    nodePort: 30009
```

``` bash
# 应用svc服务
$ kubectl apply -f loki-service.yml

# 进 loki pod
$ kubectl exec -it loki-0  -n loki -- /bin/sh

# 获取所有命名空间中的所有服务（Service）的网络终点（Endpoint）列表
$ kubectl get endpoints -A
$ kubectl get svc -A
```

### 三、服务查看

``` bash
$ curl http://loki:30019/loki/api/v1/query_range?query={job="audit"}|json
$ curl http://loki:30019/loki/api/v1/series
```

### Q&A

##### 1.Kubernetes的meta_kubernetes_pod_node_name和meta_kubernetes_namespace和meta_kubernetes_pod_name标签 是什么意思，在哪里配置的

##### 2.scrape_configs解析

``` yml
relabel_configs:
- source_labels:
- __meta_kubernetes_pod_node_name
target_label: __host__
- action: labelmap
regex: __meta_kubernetes_pod_label_(.+)
- action: replace
replacement: $1
separator: /
source_labels:
- __meta_kubernetes_namespace
- __meta_kubernetes_pod_name
target_label: job
```

这段代码是promtail的scrape_configs的relabel_configs部分的一个示例，其具体含义如下：

1. `source_labels: __meta_kubernetes_pod_node_name` 指定了需要从哪个标签中获取数据，这里是meta_kubernetes_pod_node_name。
2. `target_label: __host__` 指定了将要生成的新标签的名称，这里是host。
3. `action: labelmap` 表示对标签进行映射操作。
4. `regex: __meta_kubernetes_pod_label_(.+)` 指定了匹配到的正则表达式，其中__meta_kubernetes_pod_label_是标签的前缀，后面的(.+)则是匹配标签的值。
5. `action: replace` 指定了对标签进行替换操作。
6. `replacement: $1` 表示用匹配到的第一个分组（即(.+)中的内容）来替换目标标签中的内容。
7. `separator: /` 表示使用斜线来分隔替换后的标签值。
8. `source_labels: __meta_kubernetes_namespace` 和 `__meta_kubernetes_pod_name` 指定需要从哪些标签中获取数据，这里是meta_kubernetes_namespace和meta_kubernetes_pod_name。
9. `target_label: job` 指定了将要生成的新标签的名称，这里是job。

综上所述，这段代码的作用是从Kubernetes的meta_kubernetes_pod_node_name和meta_kubernetes_namespace和meta_kubernetes_pod_name标签中获取数据，并将其替换成新的标签__host__和job，以便更好地组织和过滤日志。
