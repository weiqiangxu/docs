---
title: DHCP
tags:
  - network
categories:
  - network
---


### DHCP概念

DHCP（Dynamic Host Configuration Protocol）是一种网络协议，用于自动分配IP地址和其他网络配置参数给计算机设备。静态IP地址是由管理员手动分配给设备的固定IP地址，不通过DHCP协议进行动态分配。

### 静态IP

##### 1.更新网卡配置文件

```bash
# 系统信息
$ hostnamectl
        Virtualization: kvm
    Operating System: openEuler 22.03 (LTS-SP1)
    Kernel: Linux 5.10.0-136.12.0.86.oe2203sp1.x86_64
        Architecture: x86-64

# 网卡配置
vi /etc/sysconfig/network-scripts/ifcfg-ens8
```
#### 2.网卡配置内容

```bash
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
BOOTPROTO=static
DEFROUTE=no
IPV4_FAILURE_FATAL=no
NAME=enp8s0
DEVICE=enp8s0
ONBOOT=yes
IPADDR=192.168.1.7
NETMASK=255.255.255.0
GATEWAY=192.168.1.1
```

#### 3.重启网络服务

```bash
systemctl restart network
```