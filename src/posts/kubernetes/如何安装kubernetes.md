---
title: 如何安装kubernetes
icon: object-group
order: 2
category:
  - kubernetes
tag:
  - kubernetes
---

> 使用kubeadm搭建kubenertes环境


### 一、环境准备

CentOS 7.6 64bit 2核 2G * 2 ( 操作系统的版本至少在7.5以上 )

[1.环境准备之 kubernetes v1.26 CRI](https://v1-26.docs.kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/)
[2.使用部署工具kubeadm安装 kubernetes v1.26](https://v1-26.docs.kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/)

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

#### 7.启用桥接网络模块的IPv6\IPv4 数据包过滤功能

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


#### 1.containerd安装

[containerd v1.7.0 的安装](https://weiqiangxu.github.io/2023/05/06/k8s/containerd%E5%AE%89%E8%A3%85/)

更改镜像地址 /etc/containerd/config.yml:

``` yml
# 注意这里因为网络原因更改sanbox镜像地址否则会无法kubeadm init
[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "registry.cn-hangzhou.aliyuncs.com/google_containers/pause:3.5"
```

#### 2.添加kubernetes镜像源

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


[k8s v1.27.1默认移除dockershim，需要安装cri-dockerd](https://kubernetes.io/zh-cn/docs/setup/production-environment/container-runtimes/#docker)

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

### 相关资料

[kubernetes.io/zh-cn/安装kubeadm](https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)
[官方docker离线安装](https://download.docker.com/linux/static/stable)
[kubernetes/yum/repos各个架构下的](https://mirrors.aliyun.com/kubernetes/yum/repos/)
[zhihu/k8s 1.16.0 版本的coreDNS一直处于pending状态的解决方案](https://zhuanlan.zhihu.com/p/602370492)
[k8s部署flannel时报failed to find plugin /opt/cni/bin](https://blog.csdn.net/qq_41586875/article/details/124688043)
[kubernetes.io使用kubeadm安装集群](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
[离线运行kubeadm初始化集群](https://kubernetes.io/zh-cn/docs/reference/setup-tools/kubeadm/kubeadm-init/#without-internet-connection)