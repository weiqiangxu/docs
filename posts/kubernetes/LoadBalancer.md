# Kubernetes LoadBalancer与网络插件

## 目录

- [一、Kubernetes网络模型](#一kubernetes网络模型)
- [二、CNI插件概述](#二cni插件概述)
- [三、Flannel插件](#三flannel插件)
- [四、Cilium插件](#四cilium插件)
- [五、Pod到Service网络路径](#五pod到service网络路径)
- [六、Service类型与暴露方式](#六service类型与暴露方式)
- [七、LoadBalancer插件](#七loadbalancer插件)
- [八、网络架构总览](#八网络架构总览)
- [九、相关资料](#九相关资料)

---

## 一、Kubernetes网络模型

### 1.1 网络原则

Kubernetes网络模型遵循以下原则：

| 原则 | 说明 |
|------|------|
| Pod间通信 | 每个Pod都有独立的IP，Pod间可直接通信 |
| 节点与Pod通信 | 节点与Pod可直接通信，无需NAT |
| Pod内部通信 | 同一Pod内的容器通过localhost通信 |
| Service抽象 | Service提供稳定的虚拟IP，屏蔽后端Pod变化 |

### 1.2 网络分层架构

```mermaid
flowchart TD
    subgraph External[外部网络]
        Client[客户端]
    end

    subgraph L4[L4负载均衡层]
        LB[LoadBalancer]
        NodePort[NodePort]
    end

    subgraph L7[L7 Ingress层]
        Ingress[Ingress Controller]
    end

    subgraph SVC[Service层]
        VIP[ClusterIP]
        EP[Endpoints]
    end

    subgraph PodNet[Pod网络]
        subgraph Node1[Node1]
            P1[Pod1]
            P2[Pod2]
        end
        subgraph Node2[Node2]
            P3[Pod3]
        end
    end

    subgraph Node[节点网络]
        CNI[CNI插件]
        KP[Kube-proxy]
    end

    Client --> LB
    Client --> NodePort
    Client --> Ingress
    LB --> VIP
    NodePort --> KP
    Ingress --> SVC
    VIP --> EP
    EP --> P1
    EP --> P2
    EP --> P3
    KP --> CNI
```

---

## 二、CNI插件概述

### 2.1 CNI定义

CNI（Container Network Interface）是Kubernetes网络插件的标准接口：

| 组件 | 说明 |
|------|------|
| CNI插件 | 负责为Pod分配IP地址，实现网络连通 |
| CNI配置文件 | 定义网络名称、插件类型、子网分配 |
| 插件类型 | Bridge、Host-local、Flannel、Cilium等 |

### 2.2 主流CNI插件对比

| 插件 | 模式 | 性能 | 安全 | 功能 |
|------|------|------|------|------|
| Flannel | VXLAN/UDP | 中等 | 一般 | 基础网络 |
| Cilium | eBPF | 高 | 高 | 透明加密、网络策略、限速 |
| Calico | BGP/IPIP | 高 | 高 | 网络策略、带宽管理 |
| Weave | 加密隧道 | 中等 | 高 | 自动发现、加密 |

---

## 三、Flannel插件

### 3.1 架构原理

Flannel是Kubernetes最常用的CNI插件之一，使用Overlay网络实现跨节点通信：

```mermaid
flowchart TD
    subgraph NodeA[宿主机A 10.16.203.47]
        subgraph PodNetA[Pod网络]
            PA1[Pod A1 10.244.0.10]
            PA2[Pod A2 10.244.0.11]
        end
        CNA[cni0 10.244.0.1/24]
        F1A[flannel.1 10.244.0.0/32]
        VPA1[veth pair]
        VPA2[veth pair]
    end

    subgraph NodeB[宿主机B 10.16.203.55]
        subgraph PodNetB[Pod网络]
            PB1[Pod B1 10.244.1.10]
        end
        CNB[cni0 10.244.1.1/24]
        F1B[flannel.1 10.244.1.0/32]
        VPB1[veth pair]
    end

    PA1 --> VPA1
    VPA1 --> CNA
    PA2 --> VPA2
    VPA2 --> CNA
    CNA --> F1A
    F1A -->|VXLAN封装| F1B
    F1B --> CNB
    CNB --> VPB1
    VPB1 --> PB1
```

### 3.2 通信流程

**同节点通信（Pod A1 → Pod A2）**：
1. Pod A1发送数据包到目的IP 10.244.0.11
2. 容器内的路由表将数据包发往cni0网桥
3. cni0网桥根据MAC地址直接转发到veth pair
4. 数据包到达Pod A2

**跨节点通信（Pod A1 → Pod B1）**：
1. Pod A1发送数据包到目的IP 10.244.1.10
2. 路由匹配到目标网段10.244.1.0/24
3. 数据包发送到flannel.1网卡
4. flannel.1通知flanneld进程
5. flanneld将数据包封装为VXLAN UDP报文
6. 通过宿主机物理网卡发送到目标节点
7. 目标节点flanneld解封装，交给flannel.1
8. flannel.1转发到cni0，最终到达Pod B1

### 3.3 后端类型

| 类型 | 说明 | 端口 |
|------|------|------|
| VXLAN | 推荐使用，Linux内核支持 | 8472 |
| UDP | 性能较差，仅用于调试 | 8285 |
| host-gw | 直接路由，性能好但需二层连通 | - |
| aws-vpc | AWS环境专用 | - |

---

## 四、Cilium插件

### 4.1 架构原理

Cilium是基于eBPF（Extended Berkeley Packet Filter）的高性能网络插件：

```mermaid
flowchart TD
    subgraph Kernel[Linux内核]
        subgraph eBPF[eBPF程序]
            XDP[XDP程序]
            TC[TC程序]
            Maps[eBPF Maps]
        end
    end

    subgraph Cilium[Cilium Agent]
        Agent[Cilium Agent]
        CNP[CiliumNetworkPolicy]
        Endpoint[Endpoint管理]
    end

    subgraph CRI[容器运行时]
        Container[Container]
    end

    Agent -->|加载| XDP
    Agent -->|加载| TC
    Agent -->|管理| Maps
    XDP -->|处理| Packet[数据包]
    TC -->|处理| Packet
    Packet --> Container
```

### 4.2 eBPF工作原理

```mermaid
flowchart LR
    subgraph Packet[数据包]
        direction TB
        ETH[以太网头]
        IP[IP头]
        PORT[端口]
    end

    subgraph Hooks[eBPF Hook点]
        direction TB
        XDP[XDP - 网络驱动层]
        TC_INGRESS[TC Ingress]
        SCHED[调度点]
        TC_EGRESS[TC Egress]
    end

    Packet --> XDP
    XDP -->|转发/丢弃| Decision[决策]
    Decision --> TC_INGRESS
    TC_INGRESS --> SCHED
    SCHED --> TC_EGRESS
```

### 4.3 Flannel与Cilium对比

| 对比项 | Flannel | Cilium |
|--------|---------|--------|
| 数据平面 | VXLAN Overlay | eBPF |
| 性能 | 中等 | 高（零拷贝、XDP） |
| 网络策略 | 依赖kube-proxy | 原生支持L3-L7策略 |
| 加密 | 无 | 透明WireGuard加密 |
| 可观测性 | 基础指标 | 完整可观测性 |
| 依赖 | 无特殊依赖 | 需要较高内核版本 |

### 4.4 Cilium核心优势

1. **XDP（Express Data Path）**：在网卡驱动层处理数据包，性能接近线速
2. **透明加密**：基于WireGuard的内端到端加密
3. **身份安全**：基于工作负载身份的细粒度安全策略
4. **服务感知**：eBPF直接感知服务变化，无需iptables

---

## 五、Pod到Service网络路径

### 5.1 路径总览

```mermaid
sequenceDiagram
    participant Client as 客户端Pod
    participant Net as 容器网络
    participant CNI as CNI插件
    participant KProxy as Kube-proxy
    participant EP as Endpoints
    participant Backend as 后端Pod

    Client->>Net: 访问Service IP
    Net->>CNI: 查找路由
    CNI->>KProxy: 命中iptables规则
    KProxy->>EP: 查询后端Pod列表
    EP-->>KProxy: 返回Pod IP列表
    KProxy->>KProxy: 负载均衡选择
    KProxy->>Backend: 转发到目标Pod
```

### 5.2 kube-proxy模式

| 模式 | 原理 | 性能 |
|------|------|------|
| iptables | 规则匹配 | O(n) |
| IPVS | 哈希表查找 | O(1) |
| kernelspace | 内核空间处理 | 高 |

### 5.3 Service到Endpoints

```mermaid
flowchart TD
    subgraph SVC[Service]
        VIP[ClusterIP 10.96.0.100]
        Selector[Label Selector]
    end

    subgraph EP[Endpoints]
        IP1[10.244.0.10:80]
        IP2[10.244.0.11:80]
        IP3[10.244.1.10:80]
    end

    subgraph Pods[Pods]
        P1[Pod app=nginx]
        P2[Pod app=nginx]
        P3[Pod app=nginx]
    end

    Selector -->|匹配| P1
    Selector -->|匹配| P2
    Selector -->|匹配| P3
    P1 -->|对应| IP1
    P2 -->|对应| IP2
    P3 -->|对应| IP3
```

---

## 六、Service类型与暴露方式

### 6.1 Service类型对比

| 类型 | ClusterIP | NodePort | LoadBalancer | ExternalName |
|------|-----------|----------|--------------|--------------|
| 访问范围 | 集群内部 | 集群外部 | 集群外部 | 集群外部 |
| 虚拟IP | ✓ | ✓ | ✓ | ✗ |
| 端口范围 | 自动分配 | 30000-32767 | 云厂商分配 | - |
| 依赖 | 无 | 无 | 云厂商支持 | 无 |

### 6.2 NodePort原理

```mermaid
flowchart LR
    Client[客户端] -->|:30080| Node[Node IP:30080]
    Node --> KProxy[kube-proxy]
    KProxy --> SVC[Service VIP]
    SVC --> EP[Endpoints]
    EP --> Pod1[Pod1]
    EP --> Pod2[Pod2]
```

### 6.3 LoadBalancer原理

```mermaid
flowchart LR
    Client[客户端] --> LB[Cloud LB]
    LB --> Node1[Node1:80]
    LB --> Node2[Node2:80]
    LB --> Node3[Node3:80]
    Node1 --> SVC1[Service]
    Node2 --> SVC2[Service]
    Node3 --> SVC3[Service]
    SVC1 --> Pod1[Pod1]
    SVC2 --> Pod2[Pod2]
    SVC3 --> Pod3[Pod3]
```

---

## 七、LoadBalancer插件

### 7.1 云厂商插件

| 插件 | 云平台 | 说明 |
|------|--------|------|
| Cloud Provider | AWS/GCP/Azure | K8s内置支持 |
| Cloud Controller Manager | 多云 | 官方云控制器 |
| CBS/CNS | 腾讯云 | 腾讯云CBS插件 |
| ALB Ingress | 阿里云 | 阿里云ALB |

### 7.2 私有环境插件

| 插件 | 说明 |
|------|------|
| MetalLB | 适用于裸金属服务器的LoadBalancer |
| Cilium LB | Cilium内置负载均衡 |
| kube-vip | 虚拟IP负载均衡 |

### 7.3 MetalLB架构

```mermaid
flowchart TD
    subgraph External[外部网络]
        Client[客户端]
    end

    subgraph K8s[K8s集群]
        subgraph LB[MetalLB]
            Speaker[Speaker组件]
            Controller[Controller组件]
        end

        subgraph SVC[Service]
            VIP[分配的VIP]
        end

        subgraph Nodes[Node节点]
            Nginx[Nginx Pod]
        end
    end

    Client -->|访问VIP| VIP
    VIP -->|ARP/NDP| Speaker
    Speaker -->|转发| Nginx
    Controller -->|管理| VIP
```

**工作原理**：
1. MetalLB Controller监听Service创建事件
2. 从配置的地址池中分配IP给LoadBalancer类型Service
3. Speaker组件通过ARP/NDP（Layer2模式）或BGP（Layer3模式）广播IP
4. 客户端请求到达VIP，被转发到对应节点

### 7.4 kube-vip架构

```mermaid
flowchart TD
    subgraph K8s[K8s集群]
        VIP[虚拟IP 192.168.1.100]
        subgraph Master[Master节点]
            API[API Server]
            KubeVIP[kube-vip]
        end

        subgraph Workers[Worker节点]
            P1[Pod1]
            P2[Pod2]
        end
    end

    Client[客户端] --> VIP
    VIP --> KubeVIP
    KubeVIP -->|健康检查| P1
    KubeVIP -->|健康检查| P2
```

---

## 八、网络架构总览

### 8.1 完整流量路径

```mermaid
flowchart TD
    subgraph Client[外部客户端]
        HTTP[HTTP请求]
    end

    subgraph L7[L7层]
        Ingress[Ingress Controller]
        Rewrite[重写规则]
    end

    subgraph SVC[Service层]
        VIP[ClusterIP]
        KProxy[kube-proxy]
        EP[Endpoints]
    end

    subgraph Pod[数据平面]
        CNI[CNI插件]
        Pod1[Pod Instance]
    end

    HTTP -->|域名路由| Ingress
    Ingress -->|路径匹配| Rewrite
    Rewrite -->|转发到VIP| VIP
    VIP --> KProxy
    KProxy --> EP
    EP --> CNI
    CNI --> Pod1
```

### 8.2 组件职责矩阵

| 层级 | 组件 | 职责 |
|------|------|------|
| 接入层 | Ingress/Nginx/Traefik | HTTP/HTTPS路由、SSL终结 |
| 负载均衡 | LoadBalancer/NodePort | 流量入口、跨节点分发 |
| 服务发现 | Service/Endpoints | 虚拟IP、Pod寻址 |
| 流量控制 | kube-proxy | iptables/IPVS规则 |
| 网络插件 | Flannel/Cilium | Pod网络、跨节点通信 |

### 8.3 插件选型建议

| 场景 | 推荐插件 | 原因 |
|------|----------|------|
| 简单集群 | Flannel + MetalLB | 部署简单，资源占用低 |
| 高性能场景 | Cilium | eBPF高性能，原生安全策略 |
| 多租户安全 | Calico | 成熟的网络策略， BGP支持 |
| 混合云 | Flannel + Cloud LB | 兼容性好 |

---

## 九、相关资料

- [Kubernetes网络官方文档](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/networking/)
- [Flannel官方文档](https://github.com/flannel-io/flannel)
- [Cilium官方文档](https://docs.cilium.io/)
- [MetalLB官方文档](https://metallb.universe.tf/)
- [kube-vip官方文档](https://kube-vip.io/)
- [CNI插件对比](https://itnext.io/benchmark-results-of-kubernetes-network-plugins-cni-over-kubernetes-1-19-1b6516f05435)
