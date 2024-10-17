---
title: containerd安装
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-05-06 18:40:12
excerpt: 安装containerd和扩展
sticky: 1
---

### 一、环境

``` bash
[root🐳 ~]# uname -a
# Linux ming-computer 5.15.0-71-generic #78~20.04.1-Ubuntu SMP Wed Apr 19 
# 11:26:48 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux
```


### 二、官网地址

[containerd-v1.7.0/docs/getting-started](https://github.com/containerd/containerd/blob/v1.7.0/docs/getting-started.md)
[runc/v1.1.7](https://github.com/opencontainers/runc/releases/tag/v1.1.7)
[containernetworking/plugins-CNI-v1.2.0](https://github.com/containernetworking/plugins/releases/tag/v1.2.0)

### 三、下载并安装runc\CNI\containerd

``` bash
# runc安装
$ install -m 755 runc.amd64 /usr/local/sbin/runc
```

``` bash
# CNI安装
$ mkdir -p /opt/cni/bin
$ tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.2.0.tgz
```

``` bash
# containerd安装至/usr/local
# Note: no work in Alpine Linux.
$ tar Cxzvf /usr/local containerd-1.1.7-linux-amd64.tar.gz
```

``` bash
# 验证containerd安装
$ whereis containerd
$ containerd --version
```
### 四、配置containerd

1. 生成默认配置

``` bash
# 创建文件夹
$ mkdir -p /etc/containerd
$ containerd config default > /etc/containerd/config.toml
# 查看配置
$ containerd config dump
```

2. cni配置生成

``` bash
# 查看cni配置目录
$ cat /etc/containerd/config.toml | grep cni

# plugins["io.containerd.grpc.v1.cri"].cni.conf_dir
# 配置目录 /etc/cni/net.d
```

``` bash
$ mkdir -p /etc/cni/net.d
# 生成配置文件
$ cat <<EOF > /etc/cni/net.d/10-mynet.conf
{
        "cniVersion": "0.2.0",
        "name": "mynet",
        "type": "bridge",
        "bridge": "cni0",
        "isGateway": true,
        "ipMasq": true,
        "ipam": {
                "type": "host-local",
                "subnet": "172.19.0.0/24",
                "routes": [
                        { "dst": "0.0.0.0/0" }
                ]
        }
}
EOF
```

2. systemd

``` bash
$ mkdir -p /usr/local/lib/systemd/system/
$ touch /usr/local/lib/systemd/system/containerd.service
```

然后拷贝内容 [containerd.service](https://raw.githubusercontent.com/containerd/containerd/main/containerd.service) 到 /usr/local/lib/systemd/system/containerd.service, 然后运行:

``` bash
$ systemctl daemon-reload
$ systemctl enable --now containerd
$ systemctl status containerd
```

### 五、测试containerd运行容器

``` bash
$ sudo ctr image pull docker.io/library/busybox:latest
$ sudo ctr run --cni -t --rm docker.io/library/busybox:latest hello sh
```


### Q&A

##### 1.如何查看containerd的插件有哪些

``` bash
$ ctr plugin ls
```

##### 2.如何离线安装golang

要在Linux系统上离线安装Golang，您可以按照以下步骤操作：
1. 在具有Internet连接的计算机上下载[Golang二进制文件包（tar.gz或zip格式）](https://go.dev/dl/)
2. 将下载的文件包复制到您的离线Linux计算机。您可以使用USB驱动器或其他外部存储设备完成此操作
3. 在Linux计算机上解压缩文件包并将其移动到适当的位置，例如`/usr/local/bin`目录
``` bash
$ tar -C /usr/local -xzf go1.19.10.linux-arm64.tar.gz
```
4. 在`/etc/profile`文件中添加Golang环境变量。将以下行添加到文件底部，将`<install-dir>`替换为您的Golang安装目录：
``` bash
$ echo 'export PATH=$PATH:/usr/local/go/bin' | tee -a /etc/profile
```
5. 保存并关闭文件后，使用以下命令使配置更改生效：
``` bash
$ source /etc/profile
```
6. 验证Golang是否正确安装并可以使用：
``` bash
$ go version
```

### 相关文章

[https://www.cni.dev/](https://www.cni.dev/)
[cni/net.d的containerd配置文件示例](https://github.com/kubernetes/website/blob/dev-1.24/content/en/docs/tasks/administer-cluster/migrating-from-dockershim/troubleshooting-cni-plugin-related-errors.md#an-example-containerd-configuration-file)
[kata-containers的cri-tools的CNI默认配置](https://github.com/kata-containers/kata-containers/blob/3.0.2/docs/how-to/containerd-kata.md#configuration-for-cri-tools)
[containerd-v1.7.0安装snapshotters.devmapper](https://github.com/containerd/containerd/blob/v1.7.0/docs/snapshotters/devmapper.md)