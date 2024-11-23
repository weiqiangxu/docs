---
title: 如何安装kubernetes
category:
  - kubernetes
tag:
  - kubernetes
---

> 使用kubeadm搭建kubenertes环境


### 一、环境准备

CentOS 7.6 64bit 2核 2G * 2 ( 操作系统的版本至少在7.5以上 )

- [1.环境准备之 kubernetes v1.26 CRI](https://v1-26.docs.kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/)
- [2.使用部署工具kubeadm安装 kubernetes v1.26](https://v1-26.docs.kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/)

#### 1.防火墙

``` bash
$ systemctl stop firewalld
$ systemctl disable firewalld
$ systemctl status firewalld
```

#### 2.设置主机名

``` bash
# 在master节点执行
$ hostnamectl set-hostname k8s-master

# 在其他节点执行
$ hostnamectl set-hostname k8s-node1

# 查看当前主机名称
$ uname -a
```

#### 3.主机域名解析

``` bash
# 获取本机在本地网络中的ip地址
# ifconfig输出的是 网络接口，各个网络接口
# 一般是ifconfig的第一个网络接口eth0的ipV4
# etho的全称是 Ethernet interface 0,表示第一块以太网网卡的接口
# 还有其他网络接口比如docker0(docker创建的虚拟网络接口用于容器之间、容器与主机通信)
# 网络接口lo全称是loopback：本地回环接口，主机与自己通话用的

# ifconfig的eth0的ipV4

# 注意：这里的IP地址是机器的局域网IP地址
$ cat >> /etc/hosts << EOF
10.16.203.44 k8s-master
EOF

# 查看设置的内容
$ cat /etc/hosts
```

#### 4.统一时间

``` bash
# 查看当前时间
$ date

# ntpdate是一个程序
# 用于在Linux或其他类Unix操作系统中同步计算机时钟与网络时间协议（NTP）服务器的系统时间
# 它可以在启动时自动更新系统时间，或者手动运行以进行时间同步
$ yum install ntpdate -y
$ ntpdate time.windows.com
```

#### 5.关闭selinux

``` bash
# 查看是否安装SELinux模块
# rpm Linux操作系统上管理RPM软件包的命令行工具
$ rpm -q selinux-policy
```

``` bash
#查看selinux是否开启
$ getenforce
```

``` bash
# 永久关闭selinux，需要重启
# 使用sed工具在/etc/selinux/config文件中查找包含“enforcing”的行并将其替换为“disabled”
$ sed -i 's/enforcing/disabled/' /etc/selinux/config
```

``` txt
SELinux（Security-Enhanced Linux） 安全机制，更为细粒度的安全策略控制
要查看SELinux是否启用，可以在终端输入以下命令：getenforce

Enforcing 强制模式
Permissive 宽容模式
Disabled 被禁用
```

#### 6.关闭swap分区

Linux swap分区是一种特殊的分区，为内存不足时提供交换空间，可以将一部分硬盘空间作为虚拟内存使用。当物理内存不足时，系统将部分不常用的数据和进程暂存到swap分区中，以释放物理内存。swap分区对于提高系统的稳定性和可靠性非常重要。

要查看Linux系统中是否存在swap分区，可以使用以下命令：

``` bash
# 没有输出表示当前系统并没有启用swap分区
$ sudo swapon --show

# 关闭已经启用的swap分区
$ sudo swapoff -a

# 重新开启swap分区
$ sudo swapon -a
```


``` bash
# 永久关闭swap分区，需要重启：
# 使用sed工具在/etc/fstab文件中查找任何包含“swap”的行
# 并在每行前加上“#”注释符，从而将它们全部注释掉
$ sed -ri 's/.*swap.*/#&/' /etc/fstab
```
``` bash
# 查看包含swap的行是否已经注释
$ cat /etc/fstab | grep swap
```

#### 7.启用桥接网络模块的IPv6\IPv4数据包过滤功能

``` bash
# 启用桥接网络模块的 IPv6 数据包过滤功能
# 启用桥接网络模块的 IPv4 数据包过滤功能
# 系统会在下次启动时自动加载这些参数
$ cat > /etc/sysctl.d/k8s.conf << EOF
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

# 重新加载系统参数并应用任何更改
# 通常用于修改系统级别的参数，例如内核参数、网络配置等
$ sysctl --system
```

8. 安装

``` bash
# 如果有一些工具没有安装
$ yum install bridge-utils ebtable
$ systemctl restart network.service

# 开启bridge相关的内核模块
# modprobe是Linux中用于加载内核模块的命令
# br_netfilter是Linux内核网络功能的一个模块
# 用于实现网络桥接口的内核网络过滤器功能
$ modprobe br_netfilter

# ip_forward控制Linux内核是否开启IP包转发功能
# 如果不开启，则无法实现网络之间的数据传输
# 开启ip_forward
# 更改为1则永久开启IP包转发功能
# 将下面的net.ipv4.ip_forward的一行的值更改为1
# 如果没有添加一行 net.ipv4.ip_forward = 1
$ cat /etc/sysctl.conf | grep net.ipv4.ip_forward

# 刷新配置
$ sysctl -p

# 验证更改是否成功
$ sysctl -a | grep net.ipv4.ip_forward
```

### 二、安装二进制程序


#### 1.运行时containerd安装

- [containerd v1.7.0 的安装](https://weiqiangxu.github.io/2023/05/06/k8s/containerd%E5%AE%89%E8%A3%85/)

更改镜像地址 /etc/containerd/config.yml:

``` yml
# 注意这里因为网络原因更改sanbox镜像地址否则会无法kubeadm init
[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.5"
```

#### 2.添加kubernetes镜像源yum.repos

``` bash
# 注意下面的mirrors是区分架构的
# 查看当前机器的架构
$ arch

# 访问地址 https://mirrors.aliyun.com/kubernetes/yum/repos 获取所有架构镜像源
# 更改下面的 baseurl
```

``` bash
# 这里需要yum工具
# 注意执行之前确保baseurl后面的镜像源架构是否匹配
$ cat > /etc/yum.repos.d/kubernetes.repo << EOF
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

# 更新缓存
$ yum clean all
$ yum makecache
```

#### 3.安装kubeadm v1.27.1\kubelet v1.27.1\kubectl v1.27.1

``` bash
# 在线安装
$ yum install -y kubelet-1.27.1 kubeadm-1.27.1 kubectl-1.27.1

# 启用kubelet服务,开机自启动
$ systemctl enable kubelet

$ kubeadm version -o json
$ kubelet --version
$ kubectl version -o json

# 移除kubelet的CNI网络插件设置
# 文件`/var/lib/kubelet/kubeadm-flags.env`中
# 将所有的`--network-plugin=cni`字符串替换为空字符串
$ sed -i 's/--network-plugin=cni//' /var/lib/kubelet/kubeadm-flags.env
$ systemctl restart kubelet

# 配置在Kubernetes集群中使用Flannel网络插件时的CNI插件参数
# Flannel是一种软件定义网络（SDN）解决方案，它使用虚拟网络来连接容器和节点
# 需要在集群中的每个节点上配置Flannel CNI插件参数
# 以便容器运行环境能够正确使用Flannel网络插件
$ mkdir -p /etc/cni/net.d
$ cat > /etc/cni/net.d/10-flannel.conf <<EOF
{
  "name": "cbr0",
  "cniVersion": "0.2.0",
  "type": "flannel",
  "delegate": {
    "isDefaultGateway": true
  }
} 
EOF
```

如果你想要离线安装，二进制文件下载可以访问[Kubernetes文档/入门/下载Kubernetes](https://kubernetes.io/releases/download/) 或者 [https://www.downloadkubernetes.com/](https://www.downloadkubernetes.com/)，kubeadm和kubectl可以直接离线二进制文件移动至/usr/bin完成安装，而kubelet需要systemend注册，比较麻烦可以通过离线下载rpm包的方式进行安装.详细说明查看 [kubelet 的 systemd drop-in 文件](https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/kubelet-integration/#the-kubelet-drop-in-file-for-systemd)

``` bash
# 如果需要离线安装建议下载rpm包
$ sudo yum install yum-utils
$ sudo yumdownloader --resolve kubelet-1.27.1 kubeadm-1.27.1 kubectl-1.27.1

# 下载后所有的kubelet-1.27.1-0.x86_64.rpm\kubeadm-1.27.1-0.x86_64.rpm等
# 以及libnetfilter_cthelper-1.0.0-11.el7.x86_64.rpm之类的依赖
# 手动安装文件夹下面所有的rpm包
$ sudo rpm -ivh *.rpm
$ systemctl status kubelet
```

#### 4.安装CNI插件


CNI插件是二进制文件移动到系统环境变量里面完成安装，各个架构下的各个版本下载可以访问[github.com/containernetworking/plugins](https://github.com/containernetworking/plugins/releases)

``` bash
# https://github.com/containernetworking/plugins/releases
# 进入下载页根据架构选择安装包
$ arch
$ aarch64

# AArch64是一种ARMv8架构
$ wget https://github.com/containernetworking/plugins/releases/download/v1.2.0/cni-plugins-linux-arm64-v1.2.0.tgz

# 解压至/opt/cni/bin/
$ tar xvf cni-plugins-linux-arm64-v1.2.0.tgz -C /opt/cni/bin/

# or 先解压，后移动bin,注意这个插件很重要
$ mv /home/cni-plugins-linux-arm64-v1.2.0/* /opt/cni/bin/
```

#### 6.kubeadm初始化集群

``` bash
# 查看k8s所需的镜像
$ kubeadm config images list

# 可以提前拉好镜像
$ kubeadm config images pull --image-repository registry.aliyuncs.com/google_containers

# 部署k8s的master节点
# apiserver-advertise-address更改为部署master的节点的
# 局域网IP地址(默认值是本地网络接口中第一个非回环地址,使用ifconfig查看所有网络接口)
# pod-network-cidr 集群中Pod的IP地址段 常用的有10.244.0.0/16
# service-cidr.集群中Service的IP地址段.默认为10.96.0.0/12
$ kubeadm init \
  --apiserver-advertise-address=192.168.18.100 \
  --image-repository registry.aliyuncs.com/google_containers \
  --kubernetes-version v1.27.1 \
  --service-cidr=10.96.0.0/12 \
  --pod-network-cidr=10.244.0.0/16


# 可以使用简单版本 ,apiserver-advertise-address使用默认值
# 注意v1.27.1搭配docker需要额外安装cri-dockerd 
$ kubeadm init \
  --apiserver-advertise-address=10.16.203.44 \
  --image-repository registry.aliyuncs.com/google_containers \
  --kubernetes-version v1.27.1 \
  --service-cidr=10.96.0.0/12 \
  --pod-network-cidr=10.244.0.0/16 \
  --v=5

### kubueadm init 失败的时候
$ kubeadm reset

# 重新init的时候带上 --v=5 查看详细

# kubeadm生成默认配置并且用来启动
$ kubeadm config print init-defaults > init.default.yaml
$ kubeadm init --config=init.default.yaml
```

``` bash
# 在你执行kubectl get ns之前拷贝一下配置
# 在你执行kubectl get ns之前拷贝一下配置
# 在你执行kubectl get ns之前拷贝一下配置

[root@k8s-master ~]# mkdir -p $HOME/.kube
[root@k8s-master ~]# sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
[root@k8s-master ~]# sudo chown $(id -u):$(id -g) $HOME/.kube/config
[root@k8s-master ~]# kubectl get pod

# 否则会抛异常

[root@k8s-master home]# kubectl get pod
W0522 18:32:07.948191  915987 request.go:1480] the not healthz host trigger to upate base url: localhost:8080:6443
W0522 18:32:07.950403  915987 request.go:1480] the not healthz host trigger to upate base url: localhost:8080:6443
W0522 18:32:07.952802  915987 request.go:1480] the not healthz host trigger to upate base url: localhost:8080:6443
W0522 18:32:07.955076  915987 request.go:1480] the not healthz host trigger to upate base url: localhost:8080:6443
W0522 18:32:07.957487  915987 request.go:1480] the not healthz host trigger to upate base url: localhost:8080:6443
```

``` bash
[root@i-C5B261D3 home]# kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"22", GitVersion:"v1.22.21", GitCommit:"ca62f64bd6397f9ab41f68c22d2d48d87d8edb91", GitTreeState:"clean", BuildDate:"2023-01-15T13:33:59Z", GoVersion:"go1.17.1", Compiler:"gc", Platform:"linux/arm64"}


# 这个不知道为啥 
# 为啥 kube-controller-manager 和 kube-scheduler 是Exited的状态
[root@k8s-master home]# crictl ps -a
CONTAINER           IMAGE               CREATED             STATE               NAME                      ATTEMPT             POD ID
d529ea99a5dda       20654f2150dd5       6 seconds ago       Exited              kube-controller-manager   2                   26d5a6aaca513
bcb291b686f32       717e2b2b33bd0       6 seconds ago       Exited              kube-scheduler            16                  93a27ed44a6fb
efed94a74ba8c       78d0a9e0b092c       17 seconds ago      Running             kube-apiserver            2                   48c0c294eeeca
924e523f0b13c       2252d5eb703b0       17 seconds ago      Running             etcd                      4                   0fe680e794e71
```

``` yml
# 生成的 init.default.yaml 配置
apiVersion: kubeadm.k8s.io/v1beta3
bootstrapTokens:
- groups:
  - system:bootstrappers:kubeadm:default-node-token
  token: abcdef.0123456789abcdef
  ttl: 24h0m0s
  usages:
  - signing
  - authentication
kind: InitConfiguration
localAPIEndpoint:
  # 1.更改为当前局域网IP地址
  advertiseAddress: 10.16.203.44
  bindPort: 6443
nodeRegistration:
  # 2.更改CRI，默认是docker如果用containerd需要更改
  criSocket: /run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
  # 3.更改为hostname
  name: k8s-master
  taints: null
---
apiServer:
  timeoutForControlPlane: 4m0s
apiVersion: kubeadm.k8s.io/v1beta3
certificatesDir: /etc/kubernetes/pki
clusterName: kubernetes
controllerManager: {}
dns: {}
etcd:
  local:
    dataDir: /var/lib/etcd
# 4.更改镜像为国内镜像
imageRepository: registry.aliyuncs.com/google_containers
kind: ClusterConfiguration
# 5.更改目标kubernetes版本
kubernetesVersion: 1.22.0
networking:
  dnsDomain: cluster.local
  # 6.设置集群中Pod的IP地址段
  podSubnet: 172.16.0.0/16
  # 7.设置集群中Service的IP地址段
  serviceSubnet: 10.96.0.0/12
scheduler: {}
```

``` bash
# 执行初始化集群，如果已经初始化集群的则 kubeadm reset 一下
# 注意：kubeadm reset 不会删除 $HOME/.kube
# 所以 kubeadm reset之后手动删除 $HOME/.kube
$ kubeadm init --config=init.default.yaml
```
>  kubeadm reset之后手动删除 $HOME/.kube

``` bash
# 查看集群所有容器
$ crictl ps -a
```

>  为啥 `ctr c list` 查看不到k8s的所有容器呢

``` bash
# 查看contianerd是否正常
# 可能看到/etc/containerd/config.yml的sandbox_image pull fail
# 可以改成 registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.5
$ journalctl -xeu containerd --no-pager

# 监听containerd
$ journalctl -xeu kubelet -f
$ journalctl -xeu containerd -f

# 查看是否有containerd的镜像启动
$ ctr --help
```


- [k8s v1.27.1默认移除dockershim，需要安装cri-dockerd](https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#docker)

``` bash
# 创建成功输出
$ Your Kubernetes control-plane has initialized successfully!

$ kubeadm join 192.168.1.1:6443 --token xxx.xx \
    --discovery-token-ca-cert-hash sha256:xxx
```

#### 7.配置kubectl环境

``` bash
# 配置信息指定Kubernetes API的访问地址、认证信息、命名空间、资源配额以及其他配置参数
$ mkdir -p $HOME/.kube

# 将admin.conf复制到当前用户的$HOME/.kube/config
# kubectl命令在使用时默认使用该文件
# 否则使用kubectl命令时必须明确指定配置文件路径或设置环境变量
$ sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# 将配置文件的所有权赋予给当前用户
$ sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 三、部署集群中Flannel网络插件

``` bash
# 查看节点状态
$ kubectl get nodes

# 使用kubectl工具将kube-flannel.yml文件中定义的Flannel网络插件之中
# Deployment、DaemonSet、ServiceAccount等Kubernetes资源部署到集群中
# 从而为集群中的宿主机和容器、容器间提供网络互联功能
$ wget https://github.com/flannel-io/flannel/releases/download/v0.21.5/kube-flannel.yml
$ kubectl apply -f kube-flannel.yml

# 查看集群pods确认是否成功
$ kubectl get pods -n kube-system

# 查看集群健康状况(显示了控制平面组件
# Control Plane Component）的健康状态
# etcd/kube-apiserver/kube-controller-manager/kube-scheduler
$ kubectl get cs

# 显示集群的相关信息(DNS\证书\密钥等)
$ kubectl cluster-info
```

kubectl怎么安装flannel的,新添加的节点又是如何安装flannel的呢,在文件夹/etc/cni/net.d的配置是如何拷贝的呢,请访问[K8s网络之深入理解CNI](https://zhuanlan.zhihu.com/p/450140876)

### 四、部署nginx服务测试集群

``` bash
# 部署Nginx
$ kubectl create deployment nginx --image=nginx:1.14-alpine

# 暴露端口
$ kubectl expose deployment nginx --port=80 --type=NodePort

# 查看服务状态需要看到nginx服务为running
$ kubectl get pods,svc

# 访问nginx服务需要看到输出Welcome to nginx!
$ curl k8s-master:30185
```

### 五、其他节点部署服务并加入到集群之中

``` bash
# worker node 安装Docker/kubeadm/kubelet/kubectl
# master节点生成token(2小时过期)
$ kubeadm token create --print-join-command

# master节点生成一个永不过期的token
$ kubeadm token create --ttl 0 --print-join-command

# 在worker node执行
# --token：用于新节点加入集群的令牌
# --discovery-token-ca-cert-hash：用于验证令牌的证书哈希值(集群初始化生成)
# --control-plane：如果要将新节点添加到控制平面，则需要指定此选项
# --node-name：指定新节点的名称
$ kubeadm join 192.168.18.100:6443 \
    --token xxx \
    --discovery-token-ca-cert-hash sha256:xxx
```

### 六、相关疑问

- kubeadmn如何重新初始化

``` bash
$ kubeadm reset
```

- 查看pod详情

``` bash
$ kubectl describe pod $pod_name
$ kubectl describe pod nginx-deployment-xxx
$ kubectl describe pod mongodb -n NamespaceName
```

- run/flannel/subnet.env无法找到

``` bash
# 当错误是/run/flannel/subnet.env无法找到时候手动创建subnet.env内容是
$ FLANNEL_NETWORK=10.244.0.0/16
$ FLANNEL_SUBNET=10.244.0.1/24
$ FLANNEL_MTU=1450
$ FLANNEL_IPMASQ=true
```

- docker离线安装包

``` txt
Docker离线安装包官方下载链接：
Docker Engine: https://docs.docker.com/engine/install/binaries/
Docker Compose: https://github.com/docker/compose/releases
Docker Machine: https://github.com/docker/machine/releases
注意：离线安装包的下载可能比在线安装包的下载时间更长，建议选择适合自己网络和设备的安装方式。
```

- 路径的docker.repo是干嘛的

``` bash
$ cd /etc/yum.repos.d/docker.repo 

# etc/yum.repos.d/docker.repo 是一个yum源配置文件，用于添加docker的官方仓库到yum源中。
# 通过该文件，可以使用yum命令在CentOS/RHEL系统中安装、更新、卸载docker软件包
```

- ebtables  和bridge-utils 是干嘛的

   ebtables是一种基于Linux内核的防火墙软件，可以实现在数据包到达网络接口之前或之后对其进行过滤、修改等操作。ebtables是专门用于网桥设备的防火墙，可以识别和处理以太网帧，可以基于MAC地址、VLAN标签等进行过滤和转发操作。

   bridge-utils是一组用于配置和管理Linux内核中的网络桥设备的命令行工具。它可以进行网桥的创建、删除、配置等操作。bridge-utils提供了一些命令行工具，例如brctl，可以用来查询、设置和管理网络桥接口，如添加和删除网桥、添加和删除网桥端口、设置网桥参数等。通过bridge-utils，用户可以方便地搭建以太网桥接网络，实现不同物理网络间的数据转发和通信。

- Failed to download metadata for repo ‘docker-ce-stable

``` bash
$ cd /etc/yum.repos.d
$ rm -rf docker*
$ yum update
$ yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

- yum-config-manager --add-repo干嘛用的

```
yum-config-manager --add-repo用于添加一个新的yum软件源地址，并将其保存在yum配置文件中
以便yum命令可以从该软件源中下载和安装软件包。该命令可以帮助用户获得更多的软件源
以便在软件包依赖项解决方案中更好地满足其需求。
```
- kubueadm 的--pod-network-cidr是什么

"kubeadm --pod-network-cidr" 是一个命令行参数，用于指定 Kubernetes 集群中 Pod 网络的 CIDR 范围。这个参数需要在初始化 Kubernetes 集群时使用，在部署网络插件时使用。Pod 网络 CIDR 是一个 IP 地址段，用于定义 Kubernetes 集群中 Pod 之间通信的网络地址。这个 CIDR 范围定义了 Kubernetes 集群中 Pod 网络的 IP 地址。常见的 CIDR 范围包括 10.244.0.0/16、172.16.0.0/16 等。正确设置 Pod 网络 CIDR 很重要，因为它对 Kubernetes 集群的网络和通信架构有重要的影响。


- kuernetes.repo

``` bash
# repo地址
cat /etc/yum.repos.d/kubernetes.repo
```

``` bash
cat << EOF > /etc/yum.repos.d/kubernetes.repo 
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
```

- kube-flannel是干嘛的

``` txt
kube-flannel是一个CNI插件，用于为Kubernetes集群创建和管理网络。
它提供了一种简单而有效的方法，让容器在不同节点上进行通信，而无需手动配置网络。
kube-flannel使用VXLAN或UDP封装技术来创建一个覆盖整个集群的扁平网络，
使得Kubernetes Pod能够互相通信，同时确保网络性能的高效和可靠性。
```

- 没有安装flannel的话kubernetes能够运行吗?如果不可以那么k8s网络模型中的哪一块没有实现呢

在 Kubernetes 的网络模型中，一个重要的目标是让不同节点上的容器能够像在同一局域网中一样相互通信。在默认的网络设置下，不同节点上的容器可能无法直接通信，因为它们处于不同的子网中，没有一个统一的网络层来连接它们。
没有网络插件，就缺少了统一的 IP 分配和管理机制。网络插件会为每个 Pod 分配一个唯一的 IP 地址，可能会出现 IP 地址冲突的情况。

- k8s的控制平面有哪些

1. kube-apiserver：Kubernetes API服务器，提供Kubernetes API的访问入口，以及对Kubernetes内部对象的认证、授权和验证。
2. etcd：Kubernetes使用etcd作为其默认的分布式键值存储系统，用于存储Kubernetes集群的所有配置数据、元数据和状态信息。
3. kube-scheduler：负责将新创建的Pod调度到集群中的Node上，选择最佳的Node来运行Pod。
4. kube-controller-manager：Kubernetes控制器管理器，包含了多个控制器，用于自动化管理Kubernetes集群中的各种资源和对象。
5. cloud-controller-manager：云控制器管理器，负责管理云平台上的资源，如EC2、ELB等，并将这些资源与Kubernetes集群进行集成。

> 这些组件共同组成了Kubernetes控制平面，负责管理和控制整个Kubernetes集群的运行状态。

- 检查 IP 为 192.168.1.1 的计算机的端口 80 是否开放

``` bash
$ yum install telnet
$ telnet 192.168.1.1 80
```

- kubectl get svc的输出解释

``` bash
$ NAME：Service名称。
$ TYPE：Service类型。通常有ClusterIP、NodePort、LoadBalancer和ExternalName四种类型。
$ CLUSTER-IP：Service的Cluster IP地址。
$ EXTERNAL-IP：Service的外部IP地址（仅适用于LoadBalancer类型）。
$ PORT(S)：Service暴露的端口号和协议。
$ AGE：Service被创建后的时间。

例如，以下是一段`kubectl get svc`命令的输出结果：

NAME           TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)          AGE
my-service     ClusterIP      10.0.0.5        <none>          80/TCP           5d
app-service    LoadBalancer   10.0.0.15       203.0.113.10   80:30000/TCP     2d

解释：

$ `my-service`是一个ClusterIP类型的Service，其Cluster IP地址为`10.0.0.5`，暴露的端口号为80/TCP。
$ `app-service`是一个LoadBalancer类型的Service，其Cluster IP地址为`10.0.0.15`
    暴露的端口号为80/TCP，同时外部IP地址为`203.0.113.10`，将请求转发到NodePort `30000`上
```

- kubeadm config print init-defaults

``` txt 
kubeadm config print init-defaults 是一个命令，用于打印 kubeadm 初始化时的默认配置。
这个命令可以帮助用户了解 kubeadm 在默认情况下会使用哪些配置，以及这些配置如何影响 Kubernetes 集群的部署和运行。
```

- containerd出现异常 failed to pull and unpack image "registry.k8s.io/pause:3.8"

``` bash
# 镜像拉取失败
$ ctr image pull registry.k8s.io/pause:3.8

# 需要配置sanbox为
sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.5"
```

- kubeadm init的时候监听日志

``` bash
$ journalctl -xeu kubelet -f
```

[使用 kubeadm 部署 kubernetes(CRI 使用 containerd)](https://docker-practice.github.io/zh-cn/kubernetes/setup/kubeadm.html)

- linux怎么样验证一个端口通不通

``` bash
# telnet
$ telnet ${IP地址} ${端口号}
$ telnet 192.168.1.10 80

# success
$ Connected to $ip
```

- telnet 127.0.0.1 30022 出现Connection refused

``` bash
# 没有运行正在监听30022端口的服务或防火墙等安全设置阻止了连接
$ sudo firewall-cmd --state
$ sudo firewall-cmd --list-ports
```

- 只有master节点无法调度怎么办

``` bash
# 获取节点信息
$ kubuctl get node

# 查看当前mster节点所有taint
# 输出之中所有的Taints:node.kubernetes.io/not-ready:NoExecute...
$ kubectl describe node

# 取消标记语法
$ kubectl taint nodes <master-node-name> node-role.kubernetes.io/master:NoSchedule-

# 取消2个标记
$ kubectl taint nodes k8s-master node.kubernetes.io/not-ready:NoExecute-
$ kubectl taint nodes k8s-master node.kubernetes.io/not-ready:NoSchedule-
$ kubectl taint nodes k8s-master node-role.kubernetes.io/master:NoSchedule-
```

- k8s会默认设置Taints在主节点吗

```  bash
# 给主节点打上一个Key为`node-role.kubernetes.io/master`，value为`NoSchedule`的Taint，即在主节点上设置Taints
# kubectl taint nodes `master-node-name` node-role.kubernetes.io/master=:NoSchedule

默认情况下，Kubernetes会在主节点上设置Taints。这是为了确保主节点不被普通的Pod调度和运行。
只有具有对应Tolerations的Pod才能被调度和运行在主节点上。
这可以确保主节点保持稳定和安全，防止普通的Pod对主节点产生负面影响。
```

- yum怎么下载rpm安装包

``` bash
$ sudo yum install yum-utils
$ sudo yumdownloader --resolve docker-ce-18.06.3.ce-3.el7
```

- Port 10250 is in use

> $ kubeadm reset

- k8s的默认CNI配置在哪里获取

``` log
默认情况下，Kubernetes使用CNI插件来管理容器网络，其中包括常见的插件如Flannel、Calico、Weave Net等。

```

- linux 的 /etc/cni/net.d/ 里面的配置是干嘛的

/etc/cni/net.d/目录是用于存放Kubernetes CNI插件的配置文件的，默认情况下是在kubelet启动时从这个目录读取配置文件。Kubernetes的默认CNI插件是`kubelet`在启动时自动加载。在使用kubelet启动Kubernetes集群时，kubelet会检查`/etc/cni/net.d/`目录中是否存在`10-kubenet.conf`或`10-bridge.conf`文件。CNI插件是Kubernetes系统中用于管理网络的组件，它可以为不同的Pod分配IP地址、创建和删除网络接口等操作。在该目录下，可以指定使用哪一个CNI插件，并为该插件提供相应的配置参数，例如网络类型、IP地址池、MTU等等。不同的CNI插件有不同的配置方式，但这个目录是它们的公共配置目录。

- k8s安装以后有哪些服务

``` bash
# nginx是唯一的业务pod
$ kubectl get pod -A -o wide

# NAMESPACE      NAME                                 READY   STATUS    
# default        nginx-55f8fd7cfc-vjqq5               1/1     Running
# kube-flannel   kube-flannel-ds-fs2wf                1/1     Running
# kube-system    coredns-7ff77c879f-hwjtl             1/1     Running  
# kube-system    coredns-7ff77c879f-pqjdk             1/1     Running 
# kube-system    etcd-k8s-master                      1/1     Running 
# kube-system    kube-apiserver-k8s-master            1/1     Running
# kube-system    kube-controller-manager-k8s-master   1/1     Running
# kube-system    kube-proxy-5qzvn                     1/1     Running
# kube-system    kube-scheduler-k8s-master            1/1     Running
```

- ifconfig 输出的 eth0是什么意思

eth0是指计算机中的第一个以太网接口，通常用于连接本地网络或连接到互联网的路由器。该接口可以通过ifconfig命令进行配置和管理。

- ifconfig 输出的 eth0之中的 inet 和 inet6是什么意思

ifconfig 输出的 eth0 中的 inet 和 inet6 是指该接口所分配的 IPv4 和 IPv6 地址。inet 是 IPv4 地址，inet6 是 IPv6 地址。这两个地址用于标识网络中的设备，以便它们可以相互通信。inet 和 inet6 地址是网络编程中常用的概念，它们分别对应着 IPv4 和 IPv6 协议，用于实现网络数据传输。

- couldn't get current server API group list: Get "http://localhost:8080/api

``` bash
$ echo "export KUBECONFIG=/etc/kubernetes/admin.conf" >> ~/.bash_profile
$ source ~/.bash_profile
```

- CRI为containerd的k8s集群如何定位异常

``` bash
$ crictl ps -a
$ crictl logs ${containerdID}
```

- k8s的版本怎么看，在安装了k8s集群的环境下

可以通过 `$ kubectl version` 输出结果中会有两个版本号，一个是Client Version，一个是Server Version，其中Server Version即为当前集群的Kubernetes版本号。如果使用的是kubeadm搭建的集群，也可以通过 `$ kubeadm version` 输出结果中的kubernetes版本号即为当前集群的版本号。

- 为什么安装了containerd的机器，执行 `ctr c list` 查看不到任何东西但是 `crictl ps -a` 却可以查看到容器列表

可能是因为 `ctr c` 和 `crictl ps` 使用的不同的容器运行时。`ctr c` 是使用 containerd 运行时查看容器，而`crictl` 是使用 CRI (Container Runtime Interface) 运行时查看容器。因此，如果您使用的容器运行时与 containerd 不同，那么您可能无法使用 `ctr c` 查看容器。建议您使用 CRI 运行时，使用 `crictl ps` 来查看容器。

- k8s怎么配置镜像源

  如果运行时是Docker，配置镜像源是`/etc/docker/daemon.json`,Kubernetes 组件镜像源通过配置文件`kubeadm-config.yaml`,配置内容是
  ```yaml
  apiVersion: kubeadm.k8s.io/v1beta3
  kind: ClusterConfiguration
  imageRepository: <镜像仓库地址>
  ```
  执行的时候通过命令参数 `--config kubeadm-config.yaml`可以让kubeadm镜像拉取。修改 kubelet 配置（用于已有集群）`/etc/kubernetes/kubelet.conf`，设置 `image-service-endpoint`字段。

### 七、架构图

![高级容器运行时](/images/high-OCI.png)

![docker-oci](/images/docker-oci.png)

![docker cri与控制平面](/images/cri-plane.png)

- 拉取镜像 ImageService.PullImage
- 运行容器 RuntimeService.RunPodSandbox
- 创建容器 RuntimeService.CreateContainer
- 启动容器 RuntimeService.StartContainer
- 停止容器 RuntimeService.StopContainer

![containerd发展史](/images/containerd发展史.png)

![kubernetes_diagram-cluster红帽](/images/kubernetes_diagram-cluster.svg)

### 相关资料

- [kubernetes.io/zh-cn/安装kubeadm](https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)
- [官方docker离线安装](https://download.docker.com/linux/static/stable)
- [kubernetes/yum/repos各个架构下的](https://mirrors.aliyun.com/kubernetes/yum/repos/)
- [zhihu/k8s 1.16.0 版本的coreDNS一直处于pending状态的解决方案](https://zhuanlan.zhihu.com/p/602370492)
- [k8s部署flannel时报failed to find plugin /opt/cni/bin](https://blog.csdn.net/qq_41586875/article/details/124688043)
- [kubernetes.io使用kubeadm安装集群](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [离线运行kubeadm初始化集群](https://kubernetes.io/zh-cn/docs/reference/setup-tools/kubeadm/kubeadm-init/#without-internet-connection)
- [Kubernetes 中文指南/云原生应用架构实战手册](https://jimmysong.io/kubernetes-handbook/)
- [https://kubernetes.io/zh-cn/](https://kubernetes.io/zh-cn/)
- [k8s源码大学](https://cit965.com/docs/category/k8s%E6%BA%90%E7%A0%81%E5%A4%A7%E5%AD%A6%E4%BB%8E%E5%A4%B4%E5%AD%A6)
- [语雀/许大仙/云原生](https://www.yuque.com/fairy-era/yg511q/xuuq7g)
- [kubeadm quickstart](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/)
- [kubeam create cluster](https://jimmysong.io/kubernetes-handbook/practice/install-kubernetes-on-ubuntu-server-16.04-with-kubeadm.html)
- [https://jimmysong.io/ 云原生资料库](https://jimmysong.io/)
- [k8s基础教程](https://lib.jimmysong.io/kubernetes-handbook/)
- [宝藏博客 - 外部访问pod](https://jimmysong.io/blog/accessing-kubernetes-pods-from-outside-of-the-cluster/)
- [云原生 - 必读](https://jimmysong.io/blog/must-read-for-cloud-native-beginner/)
- [Kubernetes 中文指南/云原生应用架构实战手册](https://jimmysong.io/kubernetes-handbook/)
- [高级容器运行时](https://www.modb.pro/db/407926)
- [rehat-k8s的架构设计](https://www.redhat.com/zh/topics/containers/kubernetes-architecture)
- [k8s中文社区-k8s的架构设计](https://www.kubernetes.org.cn/kubernetes%e8%ae%be%e8%ae%a1%e6%9e%b6%e6%9e%84)
- [k8s中文社区-k8s的设计理念](https://www.kubernetes.org.cn/kubernetes%e8%ae%be%e8%ae%a1%e7%90%86%e5%bf%b5)


### 常见的k8s问题

1. Service集群的cluster ip 可以直接访问吗
    虚拟的IP，主要用于在集群内部实现服务发现和负载均衡,外部网络无法访问
2. network policy
3. describe svc的时候endpoint可以直接访问吗
    pod的ip
4. host network模式
5. cluster级别和namespace级别
6. pod的ip和service的cluster ip关系
7. cluster ip 可以访问吗 pod的ip可以访问吗
8. metadata\selector\label\annotations分别是干嘛的他们之间的关系是什么
9. k8s的cert-manager下的pod是干嘛的（证书的更新、颁发、管理）
10. k8s运行起来需要哪些组件（Mater组件、Node组件）
```bash
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
40. 探针如何实现 LivenessProbe（存活探针）和 ReadinessProbe（就绪探针）
41. pod的状态有哪些
42. k8s的组件有哪些、控制平面是什么
43. k8s的权限说一下
44. k8s的CNI
45. k8s的网络模型是什么
    - 节点代理如kubelet和该节点Pod
    - 容器&&Pod
    - Pod内容器间
    - Pod与Pod间
    - 服务发现和负载均衡（Service\GatewayClass\Ingress）
46. Kubernetes中flannel的作用
47. PV和PVC是什么，Pod 通过 PVC 来使用 PV 提供的存储。通过PersistentVolume声明使用网络存储（如 NFS、iSCSI、Ceph 等）或本地存储.
```yml
# pod 之中直接引用pvc
    volumeMounts:
        - name: my-persistent-storage
          mountPath: /data
  volumes:
    - name: my-persistent-storage
      persistentVolumeClaim:
        claimName: my-pvc
```

48. Ingress是什么,Ingress控制器呢
      - 支持域名\访问路径指向service
      - 支持统一配置SSL/TLS层
49. k3s对比k8s少了什么
50. k8s的静态po是什么意思
    - 不受控制平面管理
    - 固定某一个节点部署的pod
    - /etc/kubernetes/manifests定义的pod
    - 不能通过kubectl管理apiserver进而管理静态pod
51. k8s的etcd是静态pod吗
52. 高可用的k8s是什么意思，高可用体现在哪个方面
53. k8s的高可用怎么实现(Etcd集群\ApiServer\Schedule\Controller-Manager)
54. k8s常用的存储有哪些（对象存储、文件存储）
55. 存储类是什么（使用存储类的 PersistentVolumeClaim（PVC）时，会根据存储类的定义自动创建对应的 PersistentVolume（PV），并将其绑定到 PVC 上
56. 块存储、对象存储、文件存储的主要区别是什么
57. 怎么安装s3并应用到k8s之中(MinIO Helm、minio-StorageClass、pvc of StorageClass、pvc)
58. 怎么安装ceph并应用到k8s之中
59. k8s的网络策略是什么（NetworkPolicy一种k8s资源可以控制pod之间的ingress和egress流量）
60. 有Service的NodePort了为什么还要Ingress
    - Ingress 支持基于域名和路径的路由规则
    - Ingress 层统一处理 SSL/TLS 加密和解密
    - NodePort 通常需要在每个后端服务上单独配置 TLS）
61. SSL/TLS是什么，拆开来说的话（SSL（安全套接层）TLS（传输层安全））
62. CRI是什么
63. Gin如何开发https的服务
    ```go
    gin.Default().RunTLS(":8080", "cert.pem", "key.pem")
    ```
64. Ingress支持统一配置SSL/TLS层是什么意思
      - 配置的Ingress支持https然后指向内部多个服务
      - 使用Secret对象来存储 SSL/TLS 证书和私钥
65. Serverless（无服务器架构）\服务网格（Service Mesh）是什么意思
    - Serverless 允许开发者不需要管理和维护服务器，而是由‌云服务提供商负责资源的分配和管理(事件驱动‌-事件触发自动分配计算资源)
    - ServiceMesh 基础设施层，用于处理服务间通信，TCP/IP 之上的一个抽象层，类似应用程序或者说微服务间的TCP/IP，负责服务之间的网络调用、限流、熔断和监控、灰度发布、统计、缓存。实现有Istio 
66. Istio是什么怎么用的(服务网格解决方案)连接（Connect）\安全加固（Secure）\控制（Control）\观察（Observe）
67. L3/L4网络是什么意思
    OSI模型 网络层（L3）IP协议、传输层（L4）TCP/UDP协议
68. TCP的1RTT是什么意思
    客户端Req->服务器ACK 这1个来回称为1RTT
1. 简述ETCD及其特点?
2. 简述ETCD适应的场景?
3. 简述什么是Kubernetes?
4. 简述Kubernetes和Docker的关系?
5. 简述Kubernetes中什么是Minikube、Kubectl、Kubele t?
6. 简述Kubernetes常见的部署方式?
7. 简述Kubernetes如何实现集群管理?
8. 简述Kubernetes的优势、适应场景及其特点?
9. 简述Kubernetes的缺点或当前的不足之处?
10. 简述Kubernetes相关基础概念?
11. 简述Kubernetes集群相关组件?
12. 简述Kubernetes RC的机制?
13. 简述kube-proxy作用?
14. 简述kube-proxy iptables原理?
15. 简述kube-proxy ipvs原理?
16. 简述kube-proxy ipvs和iptables的异同?
17. 简述Kubernetes中什么是静态Pod?
18. 简述Kubernetes中Pod可能位于的状态?
19. 简述Kubernetes创建一个Pod的主要流程?
20. 简述Kubernetes中Pod的重启策略?
21. 简述Kubernetes中Pod的健康检查方式?
22. 简述Kubernetes Pod的LivenessProbe探针的常见方式?
23. 简述Kubernetes Pod的常见调度方式?
24. 简述Kubernetes初始化容器（init container）?
25. 简述Kubernetes deployment升级过程?
26. 简述Kubernetes deployment升级策略?
27. 简述Kubernetes DaemonSet类型的资源特性?
28. 简述Kubernetes自动扩容机制?
29. 简述KubernetesService类型?
30. 简述KubernetesService分发后端的策略?
31. 简述Kubernetes Headless Service?
32. 简述Kubernetes外部如何访问集群内的服务?
33. 简述Kubernetes ingress?
34. 简述Kubernetes镜像的下载策略?
35. 简述Kubernetes的负载均衡器?
36. 简述Kubernetes各模块如何与API Server通信?
37. 简述Kubernetes Scheduler作用及实现原理?
38. 简述Kubernetes Scheduler使用哪两种算法将Pod绑定到worker节点?
39. 简述Kubernetes kubelet的作用?
40. 简述Kubernetes kubelet监控Worker节点资源是使用什么组件来实现的?
41. 简述Kubernetes如何保证集群的安全性?
42. 简述Kubernetes准入机制?
43. 简述Kubernetes RBAC及其特点（优势）?
44. 简述Kubernetes Secret作用?
45. 简述Kubernetes Secret有哪些使用方式?
46. 简述Kubernetes PodSecurityPolicy机制?
47. 简述Kubernetes PodSecurityPolicy机制能实现哪些安全策略?
48. 简述Kubernetes网络模型?
49. 简述Kubernetes CNI模型?
50. 简述Kubernetes网络策略?
51. 简述Kubernetes网络策略原理?
52. 简述Kubernetes中flannel的作用?
53. 简述Kubernetes Calico网络组件实现原理?
54. 简述Kubernetes共享存储的作用?
55. 简述Kubernetes数据持久化的方式有哪些?
56. 简述Kubernetes PV和PVC?
57. 简述Kubernetes PV生命周期内的阶段?
58. 简述Kubernetes所支持的存储供应模式?
59. 简述Kubernetes CSI模型?
60. 简述Kubernetes Worker节点加入集群的过程?
61. 简述Kubernetes Pod如何实现对节点的资源控制?
62. 简述Kubernetes Requests和Limits如何影响Pod的调度?
63. 简述Kubernetes Metric Service?
64. 简述Kubernetes中，如何使用EFK实现日志的统一管理
65. 简述Kubernetes如何进行优雅的节点关机维护?
66. 简述Kubernetes集群联邦?
67. 简述Helm及其优势?
68. k8s是什么?请说出你的了解?
69. K8s架构的组成是什么?
69. 容器和主机部署应用的区别是什么?
70. 请你说一下kubenetes针对pod资源对象的健康监测机制?
71. 如何控制滚动更新过程?
72. K8s中镜像的下载策略是什么?73、image的状态有哪些?
74. pod的重启策略是什么?
75. Service这种资源对象的作用是什么?
76. 版本回滚相关的命令?
77. 标签与标签选择器的作用是什么?
78. 常用的标签分类有哪些?
79. 有几种查看标签的方式?
80. 添加、修改、删除标签的命令?
81. DaemonSet资源对象的特性?
82. 说说你对Job这种资源对象的了解?
83. 描述一下pod的生命周期有哪些状态?
84. 创建一个pod的流程是什么?85、删除一个Pod会发生什么事情?
86. K8s的Service是什么?
87. k8s是怎么进行服务注册的?
88. k8s集群外流量怎么访问Pod?
89. k8s数据持久化的方式有哪些?
90. Kubernetes与Docker Swarm的区别如何?
91. 什么是Kubernetes?
92. Kubernetes与Docker有什么关系?
93. 在主机和容器上部署应用程序有什么区别?
94. 什么是Container Orchestration?
95. Container Orchestration需要什么?
96. Kubernetes有什么特点?
97. Kubernetes如何简化容器化部署?
98. 对Kubernetes的集群了解多少?
99. 什么是Google容器引擎?
100. 什么是Heapster?
101. 什么是Minikube?
102. 什么是Kubectl?
103. 什么是Kubelet?
104. Kubernetes Architecture的不同组件有哪些?
105. 你对Kube-proxy有什么了解?
106. 能否介绍一下Kubernetes中主节点的工作情况?
107. kube-apiserver和kube-scheduler的作用是什么?
108. 你能简要介绍一下Kubernetes控制管理器吗?
109. 什么是ETCD?
110. Kubernetes有哪些不同类型的服务?
111. 你对Kubernetes的负载均衡器有什么了解?
112. 什么是Ingress网络，它是如何工作的?
113. 您对云控制器管理器有何了解?
114. 什么是Container资源监控?
115. Replica Set和Replication Controller之间有什么区别?
116. 什么是Headless Service?
117. 使用Kubernetes时可以采取哪些最佳安全措施?
118. 什么是集群联邦?
119. 您如何看待公司从单—服务转向微服务并部署其服务容器?
120. 考虑一家拥有分布式系统的跨国公司，拥有大量数据中心，虚拟机和许多从事各种任务的员工。您认为这样公司如何以与Kubernetes一致的方式管理所有任务?
121. 考虑一种情况，即公司希望通过维持最低成本来提高其效率和技术运营速度。您认为公司将如何实现这一目标?122、假设一家公司想要修改它的部署方法，并希望建立一个更具可扩展性和响应性的平台。您如何看待这家公司能够实现这一目标以满足客户需求?
123. 考虑一家拥有非常分散的系统的跨国公司，期待解决整体代码库问题。您认为公司如何解决他们的问题?
124. 我们所有人都知道，从单片到微服务的转变解决了开发方面的问题，但却增加了部署方面的问题。公司如何解决部署方面的问题?
125. 公司如何有效地实现这种资源分配?
126. 您认为公司如何处理服务器及其安装?
127. 考虑一种情况，公司希望向具有各种环境的客户提供所有必需的分发。您认为他们如何以动态的方式实现这一关键目标?
128. 假设公司希望在不同的云基础架构上运行各种工作负载，从裸机到公共云。公司将如何在不同界面的存在下实现这一目标?
129. 怎么搭建高可用的k8s集群
130. k8s的MetricServer是什么以及怎么安装使用

### containerd 二进制安装

- [github.com/containerd/containerd/blob/main/docs/getting-started.md](https://github.com/containerd/containerd/blob/main/docs/getting-started.md)

- [github.com/containerd/containerd/releases](https://github.com/containerd/containerd/releases)

### 二进制包的命名格式
```
containerd-<VERSION>-<OS>-<ARCH>.tar.gz

https://github.com/containerd/containerd/releases/tag/v1.6.19
containerd-1.6.19-linux-arm64.tar.gz
```

### 解压
```
tar Cxzvf /usr/local containerd-1.6.19-linux-arm64.tar.gz
```


### 配置 systemctl

- [https://github.com/containerd/containerd/blob/v1.6.19/containerd.service](https://github.com/containerd/containerd/blob/v1.6.19/containerd.service)


```
mkdir -p /usr/local/lib/systemd/system

上述文件下载到 (注意下载对应的版本号的)

/usr/local/lib/systemd/system/containerd.service

# 重新加载 service 文件
$ systemctl daemon-reload
```

### runc安装

- [https://github.com/opencontainers/runc/releases](https://github.com/opencontainers/runc/releases)

```
安装到 /usr/local/sbin/runc

cp runc.arm64 /usr/local/bin/runc
chmod +x /usr/local/bin/runc
```

### 安装 CNI 插件

- [https://github.com/containernetworking/plugins/releases](https://github.com/containernetworking/plugins/releases)

```
mkdir -p /opt/cni/bin

# 解压到目录 /opt/cni/bin
tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.1.1.tgz
```

```
# 启动 containerd 并设置开机启动 
systemctl enable containerd
```
```
containerd -v
runc -v
```

### 配置文件 /etc/containerd/config.toml
```
# 生成默认配置
mkdir -p /etc/containerd/
containerd config default > /etc/containerd/config.toml

vi /etc/containerd/config.toml
# [plugins."io.containerd.grpc.v1.cri"] 下的 sandbox_image
# 修改为一个你可以获取到镜像的源地址，例如aliyun的
sandbox_image="registry.aliyuncs.com/google_containers/pause:3.5"

# 还有需要加上下面
在[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]中加入
  ...
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true

# 重启 containerd
sudo systemctl restart containerd
```

# crictl 安装
- [https://github.com/kubernetes-sigs/cri-tools/releases/](https://github.com/kubernetes-sigs/cri-tools/releases/)

```bash
tar -zxvf crictl-v1.24.0-linux-amd64.tar.gz -C /usr/local/bin
```

```bash
cat > /etc/crictl.yaml <<EOF
runtime-endpoint: unix:///var/run/containerd/containerd.sock
image-endpoint: unix:///var/run/containerd/containerd.sock
timeout: 10
debug: false
pull-image-on-create: false
EOF
```

```bash
# 重启服务
systemctl daemon-reload
sytemctl restart containerd
```
```
ctr作为 containerd 项目的一部分，是安装 containerd 时默认提供的命令行客户端，具有镜像和容器管理的简单功能
crictl是遵循 CRI 接口规范的一个命令行工具，通常用它来检查和管理 kubernetes 节点上的容器运行时和镜像
nerdctl是一个相对较新的containerd命令行客户端。与ctr不同，nerdctl的目标是对用户友好并且和 docker兼容
```

### 参考资料

- [参考文档](https://blog.csdn.net/qq_25874461/article/details/128358829)
- [什么是 istio](https://www.cnblogs.com/lidabo/p/16453818.html)