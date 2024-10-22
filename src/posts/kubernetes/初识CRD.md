---
title: 初识CRD
icon: object-group
order: 2
category:
  - kubernetes
tag:
  - kubernetes
---

### 1.创建自定义资源

``` bash
$ touch resourcedefinition.yaml
```

``` yml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # 名字必需与下面的 spec 字段匹配，并且格式为 '<名称的复数形式>.<组名>'
  name: crontabs.stable.example.com
spec:
  # 组名称，用于 REST API: /apis/<组>/<版本>
  group: stable.example.com
  # 列举此 CustomResourceDefinition 所支持的版本
  versions:
    - name: v1
      # 每个版本都可以通过 served 标志来独立启用或禁止
      served: true
      # 其中一个且只有一个版本必需被标记为存储版本
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                cronSpec:
                  type: string
                image:
                  type: string
                replicas:
                  type: integer
  # 可以是 Namespaced 或 Cluster
  scope: Namespaced
  names:
    # 名称的复数形式，用于 URL：/apis/<组>/<版本>/<名称的复数形式>
    plural: crontabs
    # 名称的单数形式，作为命令行使用时和显示时的别名
    singular: crontab
    # kind 通常是单数形式的驼峰命名（CamelCased）形式。你的资源清单会使用这一形式。
    kind: CronTab
    # shortNames 允许你在命令行使用较短的字符串来匹配资源
    shortNames:
    - ct
```

``` bash
# 一个名为 crontab 的 API 对象，可在 Kubernetes API 中进行 CRUD（创建、读取、更新和删除）操作
# "/apis/stable.example.com/v1/namespaces/*/crontabs/..." 是一个 RESTful API 端点的路径
# 表示在 Kubernetes 集群中创建一个名为 "crontabs" 的资源，该资源位于所有 Kubernetes 命名空间中
$ kubectl apply -f resourcedefinition.yaml
```

``` bash
$ kubectl get CronTab
$ kubectl get ct
```

``` bash
$ touch my-crontab.yaml
```

``` yml
# 创建定制对象
apiVersion: "stable.example.com/v1"
kind: CronTab
metadata:
  name: my-new-cron-object
spec:
  cronSpec: "* * * * */5"
  image: my-awesome-cron-image
```

``` bash
$ kubectl apply -f my-crontab.yaml
$ kubectl get crontab
$ kubectl get ct -o yaml
```

``` bash
# 删除CRD CronTab
$ kubectl delete -f resourcedefinition.yaml
```

### 2.相关资料

[Kubernetes文档/概念/扩展Kubernetes/扩展KubernetesAPI/定制资源](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
[Kubernetes文档/使用CustomResourceDefinition扩展KubernetesAPI](https://kubernetes.io/zh-cn/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)

### QA

- k8s的spec.scope干嘛的
   Kubernetes中的spec.scope用于指定资源对象的范围，例如Pod的范围可以是cluster（集群级别）或namespace（命名空间级别）。这个参数通常用于为用户控制资源对象的访问范围，以确保安全性和隔离性。
   如果spec.scope设置为namespace，则只能在同一命名空间中访问该资源对象。如果设置为cluster，则可以在整个集群中访问该资源对象。

- k8s的metadata是干嘛的
    Kubernetes (k8s) 的 metadata 是为了给 Kubernetes 对象提供元数据，即对象的描述信息。其中包括：
    1. 名称 (name)：对象的名称。
    2. 命名空间 (namespace)：对象所处的命名空间。
    3. 标签 (labels)：用于标识和分类对象。
    4. 注释 (annotations)：提供额外的对象描述信息，用于描述对象的详细信息。
    这些元数据信息在 Kubernetes 中非常重要，可以被用于对象的管理、监视、访问控制和自动化操作等方面。例如，使用标签 (labels) 可以轻松地对多个对象进行批量管理或筛选，并使用注释 (annotations) 来记录对象的详细信息，便于后续跟踪和管理。

- k8s的spec是什么
    在 Kubernetes（k8s）中，`spec` 是指 Kubernetes 对象中的“规格”或“规范”（specification）。它描述了 Kubernetes 对象的所需状态和属性。`spec` 是 Kubernetes 对象的一部分，包括 Kubernetes 中的各种对象，如 Pod，Deployment，Service，Namespace 等等。
    `spec` 一般由用户提供，用于描述 Kubernetes 对象的期望状态。例如，对于一个 Deployment 对象，`spec` 可以指定所部署的容器镜像、容器数量、滚动更新策略等。而对于一个 Pod 对象，`spec` 可以指定容器镜像、容器的命令和参数、容器间的通信方式等。
    `spec` 是 Kubernetes 控制器的核心输入对象。Kubernetes 控制器根据 `spec` 中的规范，将 Kubernetes 对象的实际状态调整为用户期望的状态。如果实际状态与 `spec` 中规定的状态不匹配，则 Kubernetes 控制器会根据设定的策略进行自动修复，以达到用户期望的状态。
    总之，`spec` 提供了 Kubernetes 对象的期望状态和属性，是 Kubernetes 控制器自动管理和操作 Kubernetes 对象的关键输入。


[github/code-generator](https://github.com/kubernetes/code-generator)
[code-generator简单介绍](https://juejin.cn/post/7096484178128011277)
[kubernetes/sample-controller](https://github.com/kubernetes/sample-controller)