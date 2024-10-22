---
title: kata&firecracker环境搭建
tags:
  - kubernetes
categories:
  - kubernetes
---

### 一、环境

``` bash
[root@VM-8-4-centos ~]# uname -a
Linux x86_64 GNU/Linux

# 需要支持虚拟化：有输出表示支持
$ egrep '(vmx|svm)' /proc/cpuinfo |wc -l

# 需要安装kvm
$ lsmod | grep kvm
# kvm_intel  376832  11
# kvm  1015808  1 kvm_intel

# dev设备
$ ll /dev/kvm
```

### 二、安装包

``` txt
kata-static-3.0.2-x86_64.tar.xz
```

### 三、文档地址

- [kata-containers/3.0.2-如何与containerd集成](https://github.com/kata-containers/kata-containers/blob/3.0.2/docs/how-to/containerd-kata.md)
- [containerd-v1.7.0安装snapshotters.devmapper](https://github.com/containerd/containerd/blob/v1.7.0/docs/snapshotters/devmapper.md)
- [kata-containerd/v3.0.2](https://github.com/kata-containers/kata-containers/releases/tag/3.0.2)
- [kata-container和containerd安装](https://github.com/kata-containers/kata-containers/blob/main/docs/install/container-manager/containerd/containerd-install.md)


### 四、安装kata-containers

``` bash
# 下载安装包
$ /home/kata-static-3.0.2-x86_64.tar.xz

# 解压至根目录
$ tar -xvf  kata-static-3.0.2-x86_64.tar.xz -C /

# 验证可用
$ kata-runtime check --no-network-checks
$ kata-runtime --show-default-config-paths
$ kata-runtime kata-env
```

### 五、配置containerd

``` yml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
  runtime_type = "io.containerd.kata.v2"
  privileged_without_host_devices = true
  pod_annotations = ["io.katacontainers.*"]
  container_annotations = ["io.katacontainers.*"]
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata.options]
    ConfigPath = "/opt/kata/share/defaults/kata-containers/configuration.toml"
```
[containerd.plugins.cri.runtimes.kata配置说明](https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/containerd-kata.md#kata-containers-as-a-runtimeclass)

``` bash
# 重启containerd服务
$ systemctl daemon-reload
$ systemctl start containerd 
```

``` bash 
$ containerd config dump | grep kata
```

### 六、运行容器

``` bash
$ sudo ctr image pull docker.io/library/busybox:latest
$ sudo ctr run --runtime "io.containerd.kata.v2" --rm -t docker.io/library/busybox:latest test-kata uname -r
```

### 七、使用firecracker创建容器


[how-to-use-kata-containers-with-firecracker](https://github.com/kata-containers/kata-containers/blob/3.0.2/docs/how-to/how-to-use-kata-containers-with-firecracker.md)

``` bash
# devmapper非常重要
# devmapper非常重要
$ sudo ctr plugins ls | grep devmapper

# 创建符号连接否则containerd找不到kata
$ sudo ln -s /home/opt/kata/bin/containerd-shim-kata-v2 /usr/bin/containerd-shim-kata-v2
```

``` bash
# 创建kata-fc
$ touch /usr/local/bin/containerd-shim-kata-fc-v2

$ cat <<EOF > /usr/local/bin/containerd-shim-kata-fc-v2
#!/bin/bash
KATA_CONF_FILE=/opt/kata/share/defaults/kata-containers/configuration-fc.toml /opt/kata/bin/containerd-shim-kata-v2 $@
EOF
```

``` bash
# containerd.plugin.devmapper需要安装
$ ctr images pull --snapshotter devmapper docker.io/library/ubuntu:latest
$ ctr run --snapshotter devmapper --runtime io.containerd.run.kata-fc.v2 -t --rm docker.io/library/ubuntu:latest test-kata-fc
$ ctr run --snapshotter devmapper --runtime io.containerd.run.kata.v2 -t --rm docker.io/library/ubuntu:latest test-kata-qemu
$ ctr run --snapshotter devmapper --runtime io.containerd.run.runc.v2 -t --rm docker.io/library/ubuntu:latest test-kata-runc

# [root ~]# ctr c ls
# CONTAINER         IMAGE                              RUNTIME                         
# test-kata-fc      docker.io/library/ubuntu:latest    io.containerd.run.kata-fc.v2    
# test-kata-qemu    docker.io/library/ubuntu:latest    io.containerd.run.kata.v2  
```

``` bash
# 宿主机上查看进程
$ ps -ef | grep test-kata-fc
$ ps -ef | grep test-kata-qemu
```

### 八、比较qemu和firecracker的性能

``` bash
$ ps -ef
```

### Q&A

- kata-rc怎么和containerd集成

``` txt
kata runtime独立仓库(v1.5) 之前出的一个兼容fc的脚本
新版本3.0需要了
```

- kata-runtime和kata-containerd什么关系

``` txt
kata-container 包含 kata-runtime
```

- containerd怎么集成kata-rc

- containerd怎么安装扩展plugins.devmapper

- containerd刚刚安装的时候没有配置文件怎么生成

``` bash
$ containerd config default > /etc/containerd/config.toml
```
- kata-runtime刚刚生成没有配置文件怎么处理
- containerd 怎么添加扩展
- containerd的devmapper是什么来的
- CNI怎么安装，etc/cni/net.d/这个文件夹下面的配置是怎么填写的

- rootfs not found

[https://github.com/kata-containers/kata-containers/issues/6784](https://github.com/kata-containers/kata-containers/issues/6784)

- kata container amd64下载

[https://github.com/kata-containers/kata-containers/issues/6776](https://github.com/kata-containers/kata-containers/issues/6776)

- containerd.plugin.snapshotter的devmapper是什么

``` txt
containerd.plugin.snapshotter的devmapper是一个存储驱动程序，它使用devmapper技术在宿主机上创建镜像和容器快照。
它允许容器在宿主机上使用基于写时复制（Copy-on-Write）的快照技术，以减少磁盘空间和I/O使用。
devmapper是Docker默认使用的存储驱动程序之一，也可以在containerd中使用。
```

- snapshotter是什么

``` txt
在Containerd中，snapshotter是一个用于管理和创建容器根文件系统（rootfs）以及容器快照的组件。
当容器创建时，snapshotter会根据指定的镜像，创建一个只读的rootfs，并在其上添加一个可写层，以允许容器进行修改。
snapshotter还负责为容器创建快照，这可以提供可恢复性和备份能力。
Containerd支持多个snapshotter驱动程序，如devmapper、overlayfs和btrfs等，以满足不同的需求和环境。
```

- ctr对容器的操作

``` bash
# 停止所有容器
$ ctr tasks kill -a -s 9 container_id

# 删除容器
$ ctr c rm $(ctr c list -q)
```
- yum 

```
cat /etc/os-release
cd /etc/yum.repos.d/
```

- Fedora RedHat Ubuntu CentOS Debian之间的区别和联系是什么
``` txt
Fedora、RedHat、Ubuntu、CentOS和Debian都是常见的Linux发行版，它们之间有以下区别和联系：

1. Fedora是由Red Hat公司赞助的社区开发的Linux发行版，Red Hat则是一家提供商业Linux产品的公司。CentOS是基于Red Hat Enterprise Linux (RHEL)源代码的开源发行版，而Ubuntu和Debian是完全独立的发行版。

2. Fedora、RedHat和CentOS都使用RPM软件包管理系统，而Ubuntu和Debian使用DEB软件包管理系统。

3. Fedora和Ubuntu都是面向桌面和开发者的发行版，而RedHat和CentOS主要面向企业服务器市场，而Debian则更多用于开发者和服务器上。

4. Fedora和Ubuntu都有免费版和商业版，而RedHat和CentOS则主要提供商业版。

5. Fedora和Ubuntu更新频繁，每6个月发布一次新版本，而RedHat和CentOS更新周期较长，通常每2-3年发布一次新版本，Debian则更新周期更为稳定。

但它们都是基于Linux内核的操作系统。
```
- Fedora RedHat Ubuntu CentOS Debian 关系图
- linux分区操作
- ubuntu 安装yum 可以吗
- Linux两大系列debian和redhat
- yum repolist all干嘛的

### 相关资料

[kata-firecracker和docker的集成](https://github.com/kata-containers/documentation/wiki/Initial-release-of-Kata-Containers-with-Firecracker-support)
[kata-containers/3.0.2/crictl创建容器](https://github.com/kata-containers/kata-containers/blob/3.0.2/docs/how-to/run-kata-with-crictl.md)
[ubuntu安装使用yum-更新yumde软件源地址即可](https://blog.csdn.net/m0_70885101/article/details/127271416)
[清华大学开源软件镜像站](https://mirrors.tuna.tsinghua.edu.cn/)