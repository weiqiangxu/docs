---
title: kubernetes基础问题
tags:
  - kubernetes
categories:
  - kubernetes
---

> 常见的k8s问题汇总巩固基础

1. 集群的cluser ip 可以直接访问吗
2. network policy
3. describe svc的时候endpoint可以直接访问吗
4. host network模式
5. cluster级别和namespace级别
6. pod的ip和service的cluster ip关系
7. cluster ip 可以访问吗 pod的ip可以访问吗
8. metadata\selector\label\annotations分别是干嘛的他们之间的关系是什么
9. k8s的cert-manager下的pod是干嘛的（证书的更新、颁发、管理）
10. k8s运行起来需要哪些组件（Mater组件、Node组件）
    ```s
    要在Kubernetes上成功运行应用程序，需要部署以下组件：
    1. Kubernetes Master组件：
      - kube-apiserver：提供Kubernetes API，并处理集群管理的核心功能。
      - kube-controller-manager：负责运行控制器，监控集群状态并处理集群级别的任务。
      - kube-scheduler：负责为Pod选择合适的节点进行调度。

    2. Kubernetes Node组件：
      - kubelet：在每个节点上运行，负责管理和执行Pod的生命周期。
      - kube-proxy：负责实现Kubernetes服务的网络代理和负载均衡功能。
      - 容器运行时：如Docker、containerd等，负责在节点上启动和管理容器。

    3. etcd：分布式键值存储系统，用于保存Kubernetes集群的状态和配置。

    4. Kubernetes网络插件：用于实现Pod之间和Pod与外部网络的通信，常见的插件有Calico、Flannel、Weave等。

    5. 可选组件：
      - kube-dns/coredns：为集群中的服务提供DNS解析。
      - Kubernetes Dashboard：提供Web界面用于管理和监控集群。
      - Ingress Controller：用于处理集群中的入口流量，并将流量路由到相应的服务。

    除了以上核心组件，还可以根据需要添加其他组件和功能，如日志收集器、监控系统等。总之，以上组件是构成一个基本的Kubernetes集群所必需的组件，它们共同协作来实现容器编排和应用程序管理。
    ```
11. k8s的权限管理是怎么样的
12. kube-proxy是干嘛的
13. kube-proxy的源码我应该怎么读，分哪几块理解，kube-proxy的设计是怎么样的
14. k8s初始运行多少个pod
    ```txt
    cert-manager
    kube-system\csi-cephfsplugin  存储标准
    kube-system\elastic-autoscaler-manager
    kube-systeme\etcd
    kube-system\kube-apiserver
    kube-system\kube-controller-manager
    kube-system\kube-flannel
    kube-system\traefik
    kube-system\web-kubectl
    kube-system\resourcequota-webhook-manage
    ```
15. 运行一个k8s，需要安装在宿主机的软件有哪些，比如cni插件二进制脚本需要安装在宿主机上
    ```bash
    在宿主机上安装和运行Kubernetes（k8s）集群，需要以下软件和工具：

    1. 容器运行时（Container Runtime）：Kubernetes支持多个容器运行时，如Docker、containerd、CRI-O等。你需要在宿主机上安装所选容器运行时，并确保其能与Kubernetes集成。

    2. kubeadm：这是一个用于部署和管理Kubernetes集群的命令行工具，需要在宿主机上进行安装。

    3. kubelet：这是Kubernetes集群中每个节点上的主要组件，负责管理容器的生命周期和运行状态。kubeadm会自动安装和配置kubelet。

    4. kubectl：这是Kubernetes的命令行工具，用于与集群进行交互、管理和监控。你需要在宿主机上安装kubectl。

    5. CNI插件：CNI（Container Network Interface）是Kubernetes网络模型的一部分，它定义了容器网络如何与宿主机和其他容器进行通信。你需要选择一个CNI插件，如Flannel、Calico、Weave等，并将其二进制脚本安装在宿主机上。每个节点上的CNI插件负责为容器提供网络连接。

    此外，如果你使用的是容器运行时Docker，那么你还需要在宿主机上安装Docker Engine。注意，Docker Engine与Docker CLI是两个不同的组件，你只需要安装Docker Engine。
    ```
16. k8s的kubelet是一个常驻进程吗，它会和集群的哪些组件通讯，通讯的方式有哪些
17. k8s之中除了`/etc/kubernetes`文件夹还有哪些关于k8s的配置文件
18. 宿主机上k8s相关的配置文件有哪些，比如/etc/kubernetes
    ```bash
    Kubernetes的配置文件在宿主机上主要包括以下几个目录和文件：
    1. `/etc/kubernetes`：这个目录包含了Kubernetes主要的配置文件，其中一些重要的文件包括：
      - `/etc/kubernetes/kubelet.conf`：kubelet的配置文件，用于指定kubelet与Kubernetes API Server通信的参数和证书信息。
      - `/etc/kubernetes/admin.conf`和`/etc/kubernetes/kubeconfig`：Kubernetes管理员用户的配置文件，用于和Kubernetes API Server进行认证和授权。
      - `/etc/kubernetes/bootstrap-kubelet.conf`：kubelet在启动时使用的配置文件，用于节点加入集群时的认证和授权。
      - `/etc/kubernetes/pki`：存放集群的证书和密钥文件，用于内部通信的加密和身份验证。

    2. `/etc/cni/net.d`：此目录包含了容器网络接口（CNI）插件的配置文件，用于设置容器的网络连接和路由。

    3. `/etc/containerd`：这个目录包含了containerd的配置文件，containerd是Kubernetes默认的容器运行时。

    4. `/etc/docker/daemon.json`：如果使用Docker作为容器运行时，这个文件是Docker Daemon的配置文件，可以包含Docker相关的配置参数。

    上述目录中的配置文件对于Kubernetes的正常运行和配置非常重要。在配置Kubernetes集群时，这些文件需要正确配置和管理，以确保集群的稳定性和功能的正常实现。
    ```
19. k8s的权限管理是怎么样的,和cluster级别namespace级别是什么关系
    ```bash
    Kubernetes (k8s) 的权限管理是通过访问控制模型来实现的，主要涉及以下两个层级的权限控制：

    1. Cluster 级别：在 k8s 中，集群级别的权限是指对整个集群资源的访问权限。这包括对节点、命名空间、存储卷等集群级别对象的管理权限。集群管理员负责分配和管理这些权限，并可以使用 Role-Based Access Control (RBAC) 来定义集群级别的角色和角色绑定，以控制用户或服务账号对集群资源的访问权限。

    2. Namespace 级别：命名空间是 k8s 中用于隔离不同工作负载和资源的逻辑分区。Namespace 级别的权限是指对特定命名空间内资源的访问权限。每个命名空间都可以有自己的角色和角色绑定，并且可以使用 RBAC 来定义和管理这些权限。命名空间管理员可以控制用户或服务账号的访问权限，并限制它们只能在特定命名空间内进行操作。

    总结来说，Cluster 级别的权限控制集中管理对整个集群资源的访问权限，而 Namespace 级别的权限控制更加细粒度，可以根据特定命名空间的需求对资源的访问进行限制。实际上，Cluster 级别的权限是作为一个基础权限，而命名空间级别的权限则是在基础权限之上进行的补充和限制。
    ```
20. 如何查看k8s的资源cluster级别还是namespace级别
    ```bash
    要查看 Kubernetes 中资源的级别，可以使用 kubectl 命令行工具，并结合资源的 API 对象来查询。

    1. 查看 Cluster 级别资源：
      - 查看集群中的所有节点：`kubectl get nodes`
      - 查看集群中的所有命名空间：`kubectl get namespaces`
      - 查看集群中的所有存储卷：`kubectl get pv`
      - 查看集群中的所有角色：`kubectl get roles --all-namespaces`
      - 查看集群中的所有角色绑定：`kubectl get rolebindings --all-namespaces`

    2. 查看 Namespace 级别资源：
      - 查看指定命名空间中的所有资源：`kubectl get all -n <namespace>`（例如 `kubectl get pods -n default`）
      - 查看指定命名空间中的所有角色：`kubectl get roles -n <namespace>`
      - 查看指定命名空间中的所有角色绑定：`kubectl get rolebindings -n <namespace>`

    运行以上命令后，将根据资源的级别和命名空间的范围返回相应的结果。如果查询结果为空，则表示该级别或命名空间中没有对应的资源。****
    ```
21. k8s之中node  namespace是集群级别资源，pod是namespace级别资源是吗
22. crd如何定义集群级别资源
23. k8s之中cluster级别的资源是不是无法为其分配在某一个namespace下面
24. ClusterRole、ClusterRoleBinding是什么，和k8s的权限有什么关系
25. 解释一下`kubectl get ClusterRole`的结果是什么
26. ClusterRole指的是角色是吗，ClusterRoleBinding表示哪些对象拥有哪些角色是吗
27. 如何更改CluserRole更改角色权限
28. ClusterRole指的是角色是吗，ClusterRoleBinding表示哪些对象拥有哪些角色是吗
    ```bash
    ClusterRole（集群角色）指的是一组权限，用于定义在整个集群中可以执行的操作.
    ClusterRoleBinding（集群角色绑定）则用于将角色绑定给特定的用户、服务账号或组，并指定它们具有的权限.
    ```
29. k8s的kube-proxy是常驻的吗，是必须的吗
    ```bash
    kube-proxy是Kubernetes中的一个核心组件，它负责处理集群内部的网络通信。kube-proxy通过实现服务发现和负载均衡来将请求转发到集群中的正确Pod。

    kube-proxy通常是作为一个常驻进程运行在每个节点上的。
    
    它通过监视Kubernetes API服务器中的Service和Endpoints对象的变化情况，并相应地更新本地的iptables规则或IPVS规则来实现负载均衡。
    因此，kube-proxy运行的状态对于集群的正常运行是必要的。

    总结：kube-proxy是常驻的，并且是Kubernetes集群正常运行所必需的。
    ```
30. kube-proxy是以pod的形式运行还是在宿主机上常驻进程的形式运行
    ```bash
    简单来说kube-proxy是监听svc和endpoint的变更，维护相关ipvs或者iptables的规则

    kube-proxy可以以pod的形式运行，也可以在宿主机上作为常驻进程运行。

    在较早的Kubernetes版本中，kube-proxy是以常驻进程的形式运行在宿主机上的。它监视Kubernetes集群中的服务和端口，并将流量转发到正确的目标。这种方式需要在每个节点上单独启动和管理kube-proxy进程。

    从Kubernetes v1.14版本开始，kube-proxy可以以pod的形式运行。这个pod通常与kubelet一起运行在每个节点上，作为DaemonSet的一部分。以pod的形式运行kube-proxy可以更好地与Kubernetes的整体架构和生命周期管理集成，而且可以由Kubernetes自动进行调度和管理。
    ```
31. k8s的coredns如何安装使用，是必须的吗，如何可以将baidu.com指向某一个特定的ip
32. ingress controller是干嘛的如何使用，跟Traefik什么关系 和[ingress-nginx](https://kubernetes.github.io/ingress-nginx/deploy/)有什么关系
33. k8s的selector只认pod的metadata.labels是吗
34. k8s 的高可用如何实现的
   Master 节点的高可用：包括 Kubernetes API Server、etcd 存储、Controller Manager 和 Scheduler.
   Node 节点的高可用：多个节点上运行相同的工作负载来实现冗余
   容器的高可用：副本集 (ReplicaSet) 和水平自动扩缩容 (Horizontal Pod Autoscaling) 来确保容器的高可用性
35. k8s的集群的Master节点高可用是如何实现的
36. k8s的有状态应用有哪些，有状态指的是哪些状态
        K8s（Kubernetes）的有状态应用指的是可以存储和维护数据状态的应用。与无状态应用不同，有状态应用需要保存一些持久化的数据，例如数据库中的数据、文件系统中的文件等。K8s中常见的有状态应用包括：
        1. 数据库：如MySQL、PostgreSQL、MongoDB等。
        2. 缓存系统：如Redis、Memcached等。
        3. 文件存储系统：如Ceph、GlusterFS等。
        4. 消息队列：如Kafka、RabbitMQ等。
        5. 日志系统：如ELK（Elasticsearch、Logstash、Kibana）等。
        6. 分布式文件系统：如HDFS（Hadoop Distributed File System）等。

        这些有状态应用需要在容器中持久化存储数据，以便在容器重启或迁移时能够保留数据状态。K8s提供了一些机制来支持有状态应用的持久化存储需求，例如通过持久卷（Persistent Volume）和持久卷声明（Persistent Volume Claim）来实现数据的持久化存储和动态分配。

37. k8s的Controller Manager 和 Scheduler分别是干嘛的，底层逻辑是什么
        Kubernetes (k8s)的Controller Manager和Scheduler是Kubernetes的两个核心组件，负责集群的自动化管理和任务调度。

        - Controller Manager（控制器管理器）：Kubernetes的Controller Manager负责运行各种控制器来监控集群的状态，并确保集群中期望的状态与实际状态保持一致。控制器包括Replication Controller、Deployment Controller、StatefulSet Controller、DaemonSet Controller等。Controller Manager通过定期与API服务器进行通信来获取集群状态，并根据需要创建、更新或删除相应的资源对象。

        - Scheduler（调度器）：Kubernetes的Scheduler负责将新的Pod（容器组）分配到集群中的节点上。调度器基于一组配置策略以及集群资源的可用性信息，选择最合适的节点来运行新的Pod。调度器将Pod绑定到目标节点，并将任务分配给相关的工作节点上的Kubelet进行处理。Scheduler会考虑节点资源利用率、节点亲和性、Pod的资源需求等因素来进行调度决策。

        底层逻辑如下：
        - Controller Manager的底层逻辑通过监听API服务器上的事件，根据事件触发的规则，在集群中创建、更新或删除相应的资源对象，以确保集群状态保持一致。它还通过与API服务器进行定期通信来获取集群状态，并监控资源对象的健康状态。
        - Scheduler的底层逻辑基于一组预先定义的策略，通过与API服务器进行通信获取集群状态以及每个节点的资源信息。Scheduler会评估Pod的资源需求和节点的可用资源情况，根据策略选择最合适的节点，并将Pod绑定到目标节点上。

        总之，Controller Manager和Scheduler是Kubernetes核心组件，负责集群的自动化管理和任务调度，保证集群状态一致性和高效资源利用。

38. k8s node的状态no-ready的时候如何解决问题，如何快速刷新这个node状态
39. k8s的节点异常出现NodeHasSufficientMemory怎么解决