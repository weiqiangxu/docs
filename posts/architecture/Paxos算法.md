# Paxos 算法

> Paxos 是 Leslie Lamport 于 1998 年提出的共识算法，是现代分布式共识算法的鼻祖，Raft、Zab、Multi-Paxos 均源于其思想。本文系统讲解 Basic Paxos 与 Multi-Paxos 的原理、流程与工程实践。

## 目录

- [一、问题背景](#一问题背景)
- [二、核心概念](#二核心概念)
- [三、Basic Paxos 流程](#三basic-paxos-流程)
- [四、Multi-Paxos](#四multi-paxos)
- [五、活锁与优化](#五活锁与优化)
- [六、与 Raft 对比](#六与-raft-对比)
- [七、工程实践](#七工程实践)
- [八、相关资料](#八相关资料)

## 一、问题背景

分布式系统中，多个节点需要对某个值达成一致。面临的挑战：

- 节点可能宕机
- 网络可能丢包、延迟、分区
- 消息可能乱序

Paxos 算法在**允许少数节点故障**的前提下，保证：
1. **一致性（Safety）**：被选中的值只有一个，所有学习到的节点值相同
2. **可用性（Liveness）**：只要多数节点存活，最终能达成一致

## 二、核心概念

### 2.1 三种角色

```mermaid
flowchart LR
    Proposer[Proposer<br/>提议者] -->|发起提案| Acceptor
    Acceptor[Acceptor<br/>接受者] -->|投票| Proposer
    Acceptor -->|通知| Learner[learner<br/>学习者]
```

| 角色 | 职责 |
|------|------|
| **Proposer** | 提出提案，协调共识过程 |
| **Acceptor** | 参与投票，决定提案是否被接受 |
| **Learner** | 接受最终决议，不参与投票 |

实际部署中，一个节点可同时担任三种角色。

### 2.2 提案（Proposal）

提案由 **提案编号** 和 **值** 组成：

```
Proposal = (N, V)
N: 提案编号，全局唯一且递增
V: 提议的值
```

### 2.3 多数派（Quorum）

任何决议都需要**多数派**（N/2 + 1）的 Acceptor 同意。任意两个多数派必有交集，这是一致性的基础。

```mermaid
flowchart LR
    subgraph 5节点
        A1[A1]
        A2[A2]
        A3[A3]
        A4[A4]
        A5[A5]
    end
    Q1[多数派1<br/>A1 A2 A3] -.-> A1
    Q1 -.-> A2
    Q1 -.-> A3
    Q2[多数派2<br/>A3 A4 A5] -.-> A3
    Q2 -.-> A4
    Q2 -.-> A5
    Q1 x--x Q2
    Note over Q1,Q2: 必有交集 A3
```

## 三、Basic Paxos 流程

### 3.1 两阶段

Paxos 通过两个阶段达成共识：

| 阶段 | 名称 | 目的 |
|------|------|------|
| Phase 1 | Prepare | 争取提议权，了解已接受的提案 |
| Phase 2 | Accept | 让 Acceptor 接受自己的提案 |

### 3.2 Phase 1：Prepare

```mermaid
sequenceDiagram
    participant P as Proposer
    participant A1 as Acceptor1
    participant A2 as Acceptor2
    participant A3 as Acceptor3

    P->>A1: Prepare(N)
    P->>A2: Prepare(N)
    P->>A3: Prepare(N)
    Note over A1,A3: 检查 N 是否大于已承诺的最大编号
    A1-->>P: Promise(N, null)
    A2-->>P: Promise(N, null)
    A3-->>P: Promise(N, accepted_proposal)
    Note over P: 收到多数 Promise，进入 Phase 2
```

**Proposer 行为**：
1. 选择比之前更大的编号 N
2. 向所有 Acceptor 发送 `Prepare(N)`

**Acceptor 行为**：
- 如果 N > 已承诺的最大编号：
  - 承诺不再接受编号小于 N 的提案
  - 返回 `Promise(N, 已接受的最高编号提案)`（若有）
- 否则拒绝

### 3.3 Phase 2：Accept

```mermaid
sequenceDiagram
    participant P as Proposer
    participant A1 as Acceptor1
    participant A2 as Acceptor2
    participant A3 as Acceptor3

    Note over P: 根据Promise返回值确定V
    P->>A1: Accept(N, V)
    P->>A2: Accept(N, V)
    P->>A3: Accept(N, V)
    A1-->>P: Accepted(N)
    A2-->>P: Accepted(N)
    A3-->>P: Accepted(N)
    Note over P: 收到多数 Accepted，决议达成
    P->>A1: 通知 Learner
    P->>A2: 通知 Learner
    P->>A3: 通知 Learner
```

**Proposer 决定 V 的规则**：
1. 若收到的 Promise 中有已接受的提案，选择**编号最大**的那个值作为 V
2. 若都是 null，使用自己提议的值

**Acceptor 行为**：
- 如果未违背之前的承诺（N >= 已承诺编号），接受提案
- 否则拒绝

### 3.4 完整示例

```mermaid
sequenceDiagram
    participant P1 as Proposer1 (N=1)
    participant P2 as Proposer2 (N=2)
    participant A1 as Acceptor1
    participant A2 as Acceptor2
    participant A3 as Acceptor3

    P1->>A1: Prepare(1)
    P1->>A2: Prepare(1)
    A1-->>P1: Promise(1, null)
    A2-->>P1: Promise(1, null)
    P2->>A2: Prepare(2)
    P2->>A3: Prepare(2)
    A2-->>P2: Promise(2, null)
    Note over A2: 承诺不再接受小于2的提案
    A3-->>P2: Promise(2, null)

    P1->>A1: Accept(1, V1)
    P1->>A2: Accept(1, V1)
    A1-->>P1: Accepted(1, V1)
    A2-->>P1: Rejected (已承诺 N=2)

    P2->>A2: Accept(2, V2)
    P2->>A3: Accept(2, V2)
    A2-->>P2: Accepted(2, V2)
    A3-->>P2: Accepted(2, V2)
    Note over P2: 决议 V2 达成
```

## 四、Multi-Paxos

Basic Paxos 只能对**单个值**达成共识。实际系统需要连续对一系列值达成共识（如日志复制）。

### 4.1 朴素方案

对每个值运行一次 Basic Paxos，开销巨大（两次磁盘 fsync + 多次 RPC）。

### 4.2 优化思路：选主

```mermaid
flowchart TD
    A[Multi-Paxos] --> B[选出一个稳定的 Leader]
    B --> C[Leader 直接跳过 Phase 1]
    C --> D[只对每个新值执行 Phase 2]
    D --> E[Leader 故障时重新选主]
```

**关键优化**：
- Leader 选出后，后续提案跳过 Prepare 阶段
- Leader 用更高的编号 N，所有 Acceptor 默认承诺
- 仅在 Leader 切换时才需要重新执行 Phase 1

### 4.3 流程

```mermaid
sequenceDiagram
    participant L as Leader
    participant A1 as Acceptor1
    participant A2 as Acceptor2
    participant A3 as Acceptor3

    Note over L: 选主阶段（一次性）
    L->>A1: Prepare(N)
    L->>A2: Prepare(N)
    L->>A3: Prepare(N)
    A1-->>L: Promise(N, null)
    A2-->>L: Promise(N, null)
    A3-->>L: Promise(N, null)

    Note over L: 后续提案直接 Phase 2
    loop 每个新值
        L->>A1: Accept(N, i, V)
        L->>A2: Accept(N, i, V)
        L->>A3: Accept(N, i, V)
        A1-->>L: Accepted
        A2-->>L: Accepted
    end
```

其中 `i` 是日志位置（slot）。

## 五、活锁与优化

### 5.1 活锁问题

两个 Proposer 交替提升编号，互相打断，导致永远无法达成一致：

```mermaid
sequenceDiagram
    participant P1
    participant P2
    participant A

    P1->>A: Prepare(1)
    P2->>A: Prepare(2)
    P1->>A: Accept(1, V1)
    A-->>P1: Rejected (承诺了 N=2)
    P1->>A: Prepare(3)
    P2->>A: Accept(2, V2)
    A-->>P2: Rejected (承诺了 N=3)
    Note over P1,P2: 无限循环...
```

### 5.2 解决方案

- **随机退避**：失败后随机等待一段时间再重试
- **选主**：选出一个 Leader，避免多个 Proposer 竞争（Multi-Paxos 推荐）

## 六、与 Raft 对比

| 维度 | Paxos | Raft |
|------|-------|------|
| **目标** | 理论正确性证明 | 工程易理解性 |
| **角色** | Proposer/Acceptor/Learner | Leader/Follower/Candidate |
| **日志** | 无明确日志模型 | 强Leader日志复制 |
| **成员变更** | 复杂 | 联合共识（简化版） |
| **可读性** | 极差（论文晦涩） | 好（论文清晰） |
| **工程实现** | 难（如 Chubby） | 易（如 etcd） |

```mermaid
flowchart LR
    A[共识算法演进] --> B[Paxos 1998]
    B --> C[Multi-Paxos]
    B --> D[Zab 2008]
    B --> E[Raft 2014]
    E --> F[etcd / Consul]
    C --> G[Google Chubby]
```

## 七、工程实践

### 7.1 Google Chubby

- 分布式锁服务，基于 Paxos
- 客户端通过 Chubby 选主，避免多个客户端竞争
- GFS、BigTable 都依赖 Chubby

### 7.2 Phxpaxos（微信）

- C++ 实现的 Paxos 库
- 支持 Multi-Paxos
- 微信内部广泛使用

### 7.3 PaxosStore（微信）

- 基于 Paxos 的高可用 KV 存储
- 每个分片独立 Paxos 组

### 7.4 实现难点

1. **日志空洞处理**：Leader 故障后可能有空洞，需要补全
2. **成员变更**：动态调整成员列表复杂
3. **快照与日志压缩**：避免日志无限增长
4. **网络分区恢复**：分区恢复后状态合并

## 八、相关资料

- [The Part-Time Parliament - Leslie Lamport 1998](https://lamport.org/pubs/lamport-paxos.pdf)
- [Paxos Made Simple - Leslie Lamport](https://lamport.org/pubs/paxos-simple.pdf)
- [Paxos Made Live - Google](https://static.googleusercontent.com/media/research.google.com/zh-CN/archive/paxos_made_live.pdf)
- 《分布式系统：概念与设计》George Coulouris
- [Raft 论文中文翻译](https://github.com/maemual/raft-zh_cn)
