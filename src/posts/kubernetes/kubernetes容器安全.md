---
title: kubernetes容器安全
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-04-23 18:40:12
excerpt: 介绍k8s操作系统底层资源分割逻辑
sticky: 1
hide: false
---


### 课题

- 容器在k8s是什么

``` bash
轻量级的虚拟化技术，可以打包应用程序及其依赖项，使其更易于部署和管理
k8s支持多种容器运行时（Container Runtime），包括Docker、containerd、CRI-O等
```

- 容器运行时Container Runtime是什么意思

``` txt
一种软件，其主要任务是负责在操作系统上启动和管理容器
容器运行时通常通过调用操作系统提供的系统调用 - 来创建和管理容器
一般和容器编排工具（例如Kubernetes）协同工作，实现容器的自动化部署、扩缩容等
常见容器运行时有：Docker容器引擎、rkt、containerd等
```

- Kubernetes中的容器可能会有哪些安全风险

``` txt
1. 容器之间共享主机系统的资源,可能会通过共享文件或进程来获取其他容器中的敏感信息
2. 容器的容量限制不够严格
3. 容器镜像来源不可信
4. 容器网络安全风险,比如需要访问外部网络或者其他容器
5. 容器数据持久化缺少加密
6. Kubernetes容器默认以高权限运行，容器内进程的文件系统和主机文件系统是共享的
```

- 模拟docker的容器A非法访问容器B的资源
- NetworkNamespace是在Linux内核中实现的一种机制，用于隔离网络资源，例如网络接口、路由表和iptables规则等
- kata是什么
- 容器逻辑上分割，物理上的资源区隔的设计是什么样的
- kubernetes的安全策略，如容器隔离、网络策略、RBAC设计是什么样的
- iSula是什么
- iSula+StratoVirt安全容器是什么
- 在容器执行top命令看到宿主机进程，为什么
- containerd和docker什么关系，有架构图吗
- runc、cri、运行时是什么
- 容器网络安全是怎么样的
- k8s的设计的架构图
- docker架构图
- Istios是第二代Service Mesh的代表
- Service Mesh服务网格是一种用于解决微服务架构中服务之间通信的问题的技术
- namespace和cgroups标准是什么
- OCI(Open Container Initiative)(开放容器计划)是什么涉及哪些内容
- Kubernetes的CRI(Container Runtime Interface)的容器运行时接口是什么意思
- shim的设计:作为适配器将自身容器运行时接口适配到 Kubernetes 的 CRI 接口(dockershim就是Kubernetes对接Docker到CRI接口)
- CGroup是Control Groups限制\记录\隔离进程组所使用的物理资源
- Name Space是什么
- Busy Box是什么
- k3s是什么
- Kernel是什么
- 如何添加并使用docker的runtime和查看当前docker支持的runtime
- docker使用kata runtime 抛出异常 cannot program address in sandbox interface because it conflicts with existing route
- Qemu是什么
- KVM是什么
- KVM 要求 CPU 支持虚拟化扩展，例如 Intel VT 或 AMD-V。如果您的 CPU 不支持这些扩展，则无法使用 KVM
- Kata Containers如何配置使用QEMU
- Kata Runtime使用Firecracker
- QEMU path (/usr/bin/qemu-kvm) does not exist
``` bash
$ yum install -y qemu
```
- Fedora 和 Centos 和 ky10.aarch64是什么关系
- modprobe是干嘛的
- docker run --runtime kata-runtime && Could not access KVM kernel module
- 怎么判断cpu是否支持KVM
- linux的命名空间是什么
``` bash
命名空间是Linux内核中的一个概念，它可以将不同的系统资源隔离开来，比如网络、进程空间等。
通过将容器连接到特定的网络命名空间中，可以实现容器与特定网络资源的隔离和互通
```

- kata-containerd 和 kvm 是什么关系
- kata-containerd 可以不依赖kvm吗
- 使用docker时候用的runtime是kata-runtime 但是不想依赖kvm怎么实现
- kata containerd 怎么运行需要什么条件
- KataContainers和Docker如何集成
- kvm_intel是干嘛的
- 如何判断当前aarch64支持ARM Hyp
- kata runtime可以不需要kvm吗，怎么实现
- x86_64, amd64	Intel VT-x, AMD SVM 是什么意思
- aarch64 ("arm64")	ARM Hyp 是什么意思

- mac 怎么判断 arm64（aarch64）架构是否支持ARM Hypervisor

``` bash
# 输出1表示支持虚拟化
$ sysctl kern.hv_support
```
- kvm 和 ARM Hypervisor什么关系

``` txt
KVM和ARM Hypervisor都是虚拟化技术，用于在处理器上创建虚拟化环境。

KVM是用于x86架构的开源虚拟化解决方案，而ARM Hypervisor是用于ARM架构的虚拟化解决方案。

在ARM架构中，ARM Hypervisor被用于虚拟化环境和资源，它允许多个操作系统同时运行在单个ARM处理器上，每个操作系统都在自己的虚拟机中运行。
ARM Hypervisor通过使用虚拟地址空间映射等技术来隔离不同的虚拟机之间的资源，从而保证每个虚拟机的安全性和独立性。

与此类似，KVM也是一种虚拟化解决方案，它可以在x86架构的处理器上运行多个虚拟机，并将物理资源映射到虚拟机中。
KVM通过模拟多种硬件设备，如网络适配器和存储控制器等，为虚拟机提供与物理主机相同的环境，从而保证虚拟机的稳定性和性能。

总之，KVM和ARM Hypervisor都是虚拟化技术，它们可以在不同的架构上将物理主机资源虚拟化为多个虚拟机，并支持多个操作系统同时运行。
相比于x86架构，ARM Hypervisor在ARM架构上提供了更高效和安全的虚拟化环境。
```

- kvm 和 Intel VT-x, AMD SVM是什么关系

``` txt
Intel VT-x和AMD SVM是虚拟化技术的硬件支持，可以使操作系统在虚拟机中以更高效率的方式运行。
kvm是一种基于虚拟化技术的虚拟机监视器，可以在支持Intel VT-x或AMD SVM的处理器上运行。
kvm通过硬件虚拟化技术实现虚拟化，提供更高效的虚拟化性能。

因此，Intel VT-x和AMD SVM是支持kvm运行的基础。
```

- 虚拟化研究中KVM和QEMU的区别

``` txt

QEMU（Quick Emulator）是一个独立的开源虚拟机软件，纯软件的实现（处理器虚拟化、内存虚拟、虚拟设备模拟）

Qemu利用KVM提供的LibKvm应用程序接口，通过ioctl系统调用创建和运行虚拟机

QEMU在上层，KVM在下层

KVM(Kernel-based Virtual Machine)是基于虚拟化扩展（Intel VT或AMD-V）的X86硬件平台实现的Linux的全虚拟化解决方案

KVM是x86的东西
```

- 网桥是什么

``` txt
网络设备，连接多个网络。
转发不同网络之中的数据流。
工作在OSI模型的第二层：数据链路层
通过物理地址（MAC地址）识别网络设备来传递数据包
```

- 网段是什么

``` txt 
网络地址范围 (表示方式：IP地址和子网掩码)；
同一网段的设备可互相通信
不同网段需要路由器等设备才可痛心
```

- rootfs是什么

- Guest Kernel是什么

- Virtio是什么

- 阿里巴巴的ACK是什么意思

``` txt
阿里的ACK的全称是Alibaba Cloud ACK（Alibaba Cloud Container Service for Kubernetes）。
```

### 课题方向

1. 容器哪里不安全了
2. 目前的解决方案是什么样的
3. 解决方案的使用怎样可达到更好的效果
4. 一些常见的兼容性、性能测试覆盖一下

> Containerd 实现了 Kubernetes 容器运行时接口 (CRI)
> BuildKit 是一种开源工具，它从 Dockerfile 获取指令并“构建”Docker 映像
> OCI (Open Container Initiative) 开放容器计划（容器规范的开放标准）
> CRI (Container Runtime Interface) 容器运行时接口，定义了 Kubernetes 与容器运行时之间的接口和协议
> CRI-O 是实现了CRI和OCI，实现 OCI 和 CRI，等于是containerd

### 架构图

![什么是k8s的CRI-O](/images/什么是k8s的CRI-O.png)
![早期的k8s与docker](/images/早期的k8s与docker.png)
![containerd集成cri-containerd-shim后架构图](/images/containerd集成cri-containerd-shim后架构图.png)
![docker和containerd关系](/images/docker和containerd关系.png)
![docker依赖k8s标准](/images/docker依赖k8s标准.png)
![k8s-v1.20-24分离docker-shim](/images/k8s-v1.20-24分离docker-shim.png)
![k8s-v1.20之前内置docker-shim](/images/k8s-v1.20之前内置docker-shim.png)
![k8s-v1.24之后自行安装cri-dockerd](/images/k8s-v1.24之后自行安装cri-dockerd.png)
![k8s分离docker-shim](/images/k8s分离docker-shim.png)
![k8s与docker分离的初步计划](/images/k8s与docker分离的初步计划.png)
![kubelet和containerd简化调用链过程](/images/kubelet和containerd简化调用链过程.png)
![kubelet与容器运行时](/images/kubelet与容器运行时.png)
![kubelet与cri内部结构](/images/k8s分离docker-shim.png)

### 相关资料

[github.com/containerd](https://github.com/containerd/containerd/blob/main/docs/getting-started.md)
[zhihu/什么是 Service Mesh](https://zhuanlan.zhihu.com/p/61901608)
[PhilCalcado/Pattern: Service Mesh](https://philcalcado.com/2017/08/03/pattern_service_mesh.html)
[官网运行时container-runtimes](https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/)
[csdn剖析容器docker运行时-说的太细致了](https://blog.csdn.net/m0_57776598/article/details/126963904)
[csdn之IaaS/PaaS/SaaS/DaaS的区别-说的太好了](https://blog.csdn.net/yangyijun1990/article/details/108694011)
[知乎/container之runc](https://zhuanlan.zhihu.com/p/279747954)
[从零开始入门 K8s | Kata Containers 创始人带你入门安全容器技术](https://zhuanlan.zhihu.com/p/122247284)
[如何在 Kubernetes 集群中集成 Kata](https://cloud.tencent.com/developer/article/1730700)
[Docker，containerd，CRI，CRI-O，OCI，runc 分不清？看这一篇就够了 - 写的太好了](https://www.dtstack.com/bbs/article/258)
[huweihuang/Kata-container简介](https://www.huweihuang.com/kubernetes-notes/runtime/kata/kata-container.html)
[kata-containd和docker集成](https://blog.51cto.com/u_11979904/5676073)
[如何给docker添加runtime支持](https://blog.51cto.com/u_11979904/5676073)
[博客园-KataContainers和Docker的集成](https://www.cnblogs.com/fanqisoft/p/12096904.html)
[https://www.qemu.org/](https://www.qemu.org/)
[sandbox interface because it conflicts with existing route](https://github.com/kata-containers/runtime/issues/935)
[虚拟化研究中KVM和QEMU的区别-这个图画的很哇塞哦](https://www.scholat.com/vpost.html?pid=7294)
[k8s官方讲解有多少种CRI](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-node/container-runtime-interface.md)
[非常细致描述kata的优势](https://blog.51cto.com/u_15682248/5806851)

### gVisor和Kata Containers都是用于提供容器运行时隔离性的开源技术选项。以下是它们各自的优缺点：

#### gVisor的优点：
- gVisor 使用了一个特殊的沙箱机制，可以提供更高的隔离性和安全性。
- gVisor可以在Linux容器内运行，而无需对宿主机进行特殊设置。
- gVisor的性能比Kata Containers更快。

#### gVisor的缺点：
- gVisor还是一个比较新的项目，尚未被广泛测试和采用。
- gVisor需要的内存和CPU资源比Kata Containers更多。
- 系统调用频繁的情况下gvisor的性能差

#### Kata Containers的优点：
- Kata Containers运行在轻量级虚拟机中，可以提供与传统虚拟机相似的隔离性和安全性。
- Kata Containers基于OCI标准，可以无缝地与Docker等容器工具集成。
- Kata Containers比gVisor更易于部署和使用。
- Kata Containers的启动时间通常在几百毫秒到一秒左右。

#### Kata Containers的缺点：
- Kata Containers的启动速度比gVisor慢（但kata速度仍然非常快，通常在毫秒级别），因为它需要启动轻量级虚拟机。
- 由于使用了轻量级虚拟机，Kata Containers的性能比gVisor略低。

需要注意的是，以上优缺点只是大概的总结，实际的情况可能会因特定的使用场景和需求而发生变化。