---
title: openvswitch实验环境
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - openvswitch
  - docker
categories:
  - openvswitch
date: 2021-03-14 18:40:12
excerpt: 搭建doocker环境理解openvswitch的各个小功能
sticky: 1
---

1. 准备linux环境

- [openvswitch如何安装](https://weiqiangxu.github.io/2023/06/02/cni/openvswitch%E5%AE%89%E8%A3%85/)
- [docker离线安装](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/docker%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85/)也可以直接使用yum等包管理工具在线安装

2. 准备镜像

``` dockerfile
# alpine-ovs
FROM alpine:3.16.0

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
apk add vim tcpdump iperf iproute2
```

``` bash
docker build -t alpine-ovs .
```

2. 创建容器

``` bash
docker network  create --subnet=192.168.101.0/24 ovs-net
```

``` bash
docker run -it -d --net ovs-net --ip 192.168.101.2 --name ns2 alpine-ovs sh
# 查看容器ns2在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns2_default_if} && ip link set ${ns2_default_if} name veth1-ns2 && ip link set  veth1-ns2 up

docker run -it -d --net ovs-net --ip 192.168.101.3 --name ns3 alpine-ovs sh
# 查看容器ns3在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns3_default_if} && ip link set ${ns3_default_if} name veth1-ns3 && ip link set  veth1-ns3 up

docker run -it -d --net ovs-net --ip 192.168.101.4 --name ns4 alpine-ovs sh
# 查看容器ns4在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns4_default_if} && ip link set ${ns4_default_if} name veth1-ns4 && ip link set  veth1-ns4 up

docker run -it -d --net ovs-net --ip 192.168.101.5 --name ns5 alpine-ovs sh
# 查看容器ns5在宿主机网卡的pair端口
ifconfig | grep veth
# 更改网卡端口名称
ip link set down ${ns5_default_if} && ip link set ${ns5_default_if} name veth1-ns5 && ip link set  veth1-ns5 up
```


3. ovs建桥承接docker容器流量

``` bash
# 查看网桥
# 会发现网桥后面有3个网络插口
brctl show

# 现在我们把这3个网卡从docker创建的网桥拔出来
# brctl delif ${bridge_name} veth1-ns2 veth1-ns3 veth1-ns4 veth1-ns5
brctl delif br-a644ca66224e veth1-ns2 veth1-ns3 veth1-ns4 veth1-ns5

# 使用 ovs 创建的网桥
ovs-vsctl add-br ovs-br1

# 将3个容器的对端网卡插入到 ovs网桥
ovs-vsctl add-port ovs-br1 veth1-ns2
ovs-vsctl add-port ovs-br1 veth1-ns3
ovs-vsctl add-port ovs-br1 veth1-ns4
ovs-vsctl add-port ovs-br1 veth1-ns5
```

4. 查看当前ovs桥网络

``` bash
# 查看ovs的桥配置
$ ovs-vsctl show

2645a736-d14f-4284-9418-9aed1a914dd2
    Bridge ovs-br1
        Port veth1-ns3
            Interface veth1-ns3
        Port veth1-ns4
            Interface veth1-ns4
        Port veth1-ns5
            Interface veth1-ns5
        Port veth1-ns2
            Interface veth1-ns2
        Port ovs-br1
            Interface ovs-br1
                type: internal
    ovs_version: "2.17.6"
```

``` bash
# 查看ovs桥端口配置
$ ovs-ofctl show ovs-br1

OFPT_FEATURES_REPLY (xid=0x2): dpid:00000a79f12bb540
n_tables:254, n_buffers:0
capabilities: FLOW_STATS TABLE_STATS PORT_STATS QUEUE_STATS ARP_MATCH_IP
actions: output enqueue set_vlan_vid set_vlan_pcp strip_vlan mod_dl_src mod_dl_dst mod_nw_src mod_nw_dst mod_nw_tos mod_tp_src mod_tp_dst
 1(veth1-ns2): addr:3a:0c:fe:17:69:ac
     config:     0
     state:      0
     current:    10GB-FD COPPER
     speed: 10000 Mbps now, 0 Mbps max
 2(veth1-ns3): addr:9a:a2:fd:dd:4b:a8
     config:     0
     state:      0
     current:    10GB-FD COPPER
     speed: 10000 Mbps now, 0 Mbps max
 3(veth1-ns4): addr:22:40:eb:a6:8b:16
     config:     0
     state:      0
     current:    10GB-FD COPPER
     speed: 10000 Mbps now, 0 Mbps max
 4(veth1-ns5): addr:4e:ee:72:dc:77:69
     config:     0
     state:      0
     current:    10GB-FD COPPER
     speed: 10000 Mbps now, 0 Mbps max
 LOCAL(ovs-br1): addr:0a:79:f1:2b:b5:40
     config:     0
     state:      0
     speed: 0 Mbps now, 0 Mbps max
OFPT_GET_CONFIG_REPLY (xid=0x4): frags=normal miss_send_len=0
```

``` bash
# 查看流表
ovs-ofctl dump-flows ovs-br1
 cookie=0x0, duration=1628.095s, table=0, n_packets=10, n_bytes=756, priority=0 actions=NORMAL
```