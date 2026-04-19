# Linux 结构组成

> Linux的文件系统目录结构理解，从内核到应用程序大致组成

## 一、Linux 系统架构

### 1.1 Linux 系统组成

Linux系统一般有四个主要部分：**内核（Kernel）**、**Shell**、**文件系统**、**应用程序**。

```mermaid
graph TB
    subgraph 用户空间
        A[应用程序]
        B[Shell]
    end
    
    subgraph 内核空间
        C[系统调用接口]
        D[进程管理]
        E[内存管理]
        F[设备驱动程序]
        G[文件系统]
        H[网络管理]
    end
    
    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    
    I[硬件设备] --> F
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#ffb,stroke:#333,stroke-width:2px
    style E fill:#ffb,stroke:#333,stroke-width:2px
    style F fill:#ffb,stroke:#333,stroke-width:2px
    style G fill:#ffb,stroke:#333,stroke-width:2px
    style H fill:#ffb,stroke:#333,stroke-width:2px
```

- **Shell** 是系统的用户界面，提供了用户与内核进行交互操作的接口，它接收用户输入的命令并将它送到内核去执行。

### 1.2 Linux 内核组成

Linux内核主要由以下部分组成：

```mermaid
flowchart TB
    subgraph Linux内核
        A[系统调用接口 SCI] --> B[进程管理]
        A --> C[内存管理 MM]
        A --> D[设备驱动程序]
        A --> E[文件系统 VFS]
        A --> F[网络管理]
    end
    
    B --> G[进程调度]
    B --> H[进程间通信]
    
    C --> I[虚拟内存]
    C --> J[内存映射]
    
    D --> K[字符设备驱动]
    D --> L[块设备驱动]
    D --> M[网络设备驱动]
    
    E --> N[ext4文件系统]
    E --> O[xfs文件系统]
    E --> O2[btrfs文件系统]
    
    F --> P[TCP IP协议栈]
    F --> Q[网络套接字]
```

| 组件 | 功能描述 |
|------|----------|
| **进程管理** | 创建、调度、终止进程，管理CPU时间片分配 |
| **内存管理** | 虚拟内存管理、内存映射、交换空间管理 |
| **设备驱动程序** | 与硬件设备交互的接口 |
| **文件系统** | 管理和访问磁盘上的文件 |
| **网络管理** | TCP/IP协议栈、网络套接字 |
| **系统调用接口** | 用户空间与内核空间的桥梁 |

## 二、虚拟文件系统（VFS）

### 2.1 VFS 概述

虚拟文件系统（Virtual File System）是Linux内核中的一个软件层，提供了 `open`、`close`、`read`、`write` 等统一的API，隐藏了各种具体文件系统的实现细节。

```mermaid
flowchart LR
    subgraph 用户空间
        A[应用程序]
    end
    
    subgraph VFS虚拟层
        B[open] --> C[read]
        C --> D[write]
        D --> E[close]
    end
    
    subgraph 具体文件系统
        F[ext4] 
        G[xfs]
        H[btrfs]
        I[ntfs]
    end
    
    A --> B
    B --> F
    B --> G
    B --> H
    B --> I
    
    F --> J[磁盘]
    G --> J
    H --> J
    I --> J
```

### 2.2 Linux 文件类型

| 文件类型 | 描述 | 示例 |
|----------|------|------|
| **普通文件** | 纯文本文件或二进制文件 | 代码、脚本、可执行文件 |
| **目录文件** | 存储文件的唯一地方 | `/home`, `/usr` |
| **链接文件** | 指向同一个文件或目录 | 软链接、硬链接 |
| **设备文件** | 与系统外设相关 | `/dev/sda`, `/dev/null` |
| **管道文件** | 提供进程间通信 | 命名管道（FIFO） |
| **套接字文件** | 与网络通信相关 | `/var/run/docker.sock` |

```mermaid
graph TD
    A[Linux文件类型] --> B[普通文件]
    A --> C[目录文件]
    A --> D[链接文件]
    A --> E[设备文件]
    A --> F[管道文件]
    A --> G[套接字文件]
    
    B --> B1[纯文本]
    B --> B2[二进制]
    
    D --> D1[软链接]
    D --> D2[硬链接]
    
    E --> E1[字符设备]
    E --> E2[块设备]
```

## 三、Linux 目录结构

### 3.1 目录层次结构

```mermaid
graph TB
    ROOT["/ 根目录"]
    ROOT --> BIN["/bin 基础命令"]
    ROOT --> SBIN["/sbin 系统管理命令"]
    ROOT --> ETC["/etc 系统配置"]
    ROOT --> HOME["/home 用户目录"]
    ROOT --> ROOT_Home["/root 管理员目录"]
    ROOT --> VAR["/var 可变数据"]
    ROOT --> USR["/usr 用户程序"]
    ROOT --> TMP["/tmp 临时文件"]
    ROOT --> PROC["/proc 进程信息"]
    ROOT --> DEV["/dev 设备文件"]
    ROOT --> LIB["/lib 系统库"]
    
    USR --> USR_BIN["/usr/bin 用户命令"]
    USR --> USR_LIB["/usr/lib 用户库"]
    USR --> USR_LOCAL["/usr/local 本地安装"]
    
    VAR --> VAR_LOG["/var/log 日志"]
    VAR --> VAR_SPOOL["/var/spool 队列"]
    VAR --> VAR_CACHE["/var/cache 缓存"]
```

### 3.2 主要目录说明

| 目录 | 用途 |
|------|------|
| `/bin` | 基础用户命令，如 `ls`、`cp`、`mv` |
| `/sbin` | 系统管理命令，如 `fdisk`、`mkfs` |
| `/etc` | 系统配置文件，如 `passwd`、`fstab` |
| `/home` | 普通用户的家目录 |
| `/root` | 管理员（root）的家目录 |
| `/var` | 可变数据：日志、缓存、队列等 |
| `/usr` | 用户程序和库文件 |
| `/tmp` | 临时文件 |
| `/proc` | 进程信息和内核数据结构 |
| `/dev` | 设备文件 |
| `/lib` | 系统共享库 |

## 四、相关疑问

### 4.1 apt 和 apt-get 的关系

- **apt-get**：最早的包管理后端工具，功能强大但用户友好性较差
- **apt**：Debian 在 apt-get 基础上开发的更现代的命令行工具，提供了更友好的交互界面
- **关系**：apt 底层仍然调用 apt-get，提供更好的用户体验

### 4.2 rpm、apt、yum 的关系

| 包管理工具 | 发行版 | 底层命令 |
|------------|--------|----------|
| **rpm** | RHEL、CentOS | 底层包管理命令 |
| **yum** | CentOS 6/7 | 基于 rpm 的包管理器 |
| **dnf** | RHEL 8、CentOS 8 | yum 的下一代版本 |
| **apt** | Debian、Ubuntu | 底层 dpkg 的包管理器 |
| **apt-get** | Debian、Ubuntu | apt 的底层命令 |

```mermaid
flowchart TB
    subgraph Debian系
        A[apt-get] --> B[dpkg]
        B --> C[.deb包]
    end
    
    subgraph RHEL系
        D[yum/dnf] --> E[rpm]
        E --> F[.rpm包]
    end
```

## 五、相关资料

- [一文带你全面掌握Linux系统体系结构](https://www.zhihu.com/collection/307882235)