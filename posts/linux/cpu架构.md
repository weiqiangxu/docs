# CPU 架构

## 一、CPU 两大派系

```mermaid
graph TB
    A[CPU架构] --> B[X86系]
    A --> C[ARM系]
    
    B --> B1[x86]
    B --> B2[AMD64]
    B --> B3[x86-64]
    
    C --> C1[ARM]
    C --> C2[ARM-V8]
    C --> C3[AArch64]
```

## 二、主要 CPU 体系结构

```mermaid
flowchart TB
    A[四大CPU体系结构] --> B[ARM]
    A --> C[x86/Atom]
    A --> D[MIPS]
    A --> E[PowerPC]
    
    B --> B11[苹果]
    B --> B12[高通]
    B --> B13[联发科]
    B --> B14[海思]
    
    C --> C11[Intel]
    C --> C12[AMD]
    
    D --> D1[龙芯]
    
    E --> E1[IBM]
```

## 三、指令集架构详解

### 3.1 X86 架构

| 类型 | 说明 |
|------|------|
| **x86** |  Intel/AMD 32位处理器 |
| **AMD64** | AMD 64位处理器 |
| **x86-64** | Intel/AMD 64位处理器（兼容32位） |

### 3.2 ARM 架构

```mermaid
flowchart LR
    A[ARMv8] --> B[AArch64<br/>64位执行状态]
    A --> C[AArch32<br/>32位执行状态]
```

| 类型 | 说明 |
|------|------|
| **ARM** | 32位处理器 |
| **ARM-V8** | 支持64位的ARM架构 |
| **AArch64** | ARMv8的64位执行状态 |

### 3.3 Darwin 系统

Darwin 是一个由苹果公司（Apple Inc.）开发的 UNIX 操作系统，基于 ARM 架构。

## 四、Go 语言支持的架构列表

```mermaid
flowchart TB
    subgraph 常见架构
        A1[darwin/arm64]
        A2[darwin/amd64]
        A3[linux/arm64]
        A4[linux/amd64]
    end
    
    subgraph 移动端
        B1[android/386]
        B2[android/amd64]
        B3[android/arm]
        B4[android/arm64]
        B5[ios/amd64]
        B6[ios/arm64]
    end
    
    subgraph 其他
        C1[windows/386]
        C2[windows/amd64]
        C3[windows/arm64]
        C4[freebsd/arm64]
        C5[openbsd/amd64]
    end
```

| 平台 | 架构 | 说明 |
|------|------|------|
| **darwin** | amd64, arm64 | macOS |
| **linux** | 386, amd64, arm, arm64 | 常见服务器 |
| **windows** | 386, amd64, arm | PC |
| **android** | 386, amd64, arm, arm64 | Android |

```bash
# 查看 Go 支持的所有架构
go tool dist list
```

## 五、相关资料

- [CPU_X86架构和ARM架构入门篇](https://cloud.tencent.com/developer/article/1862717)
- [x86-64、amd64、arm、aarch64 都是些什么](https://blog.csdn.net/qq_24433609/article/details/125991550)