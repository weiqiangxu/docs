---
title: k8s的一些插件安装
tags:
  - runc
  - containerd
categories:
  - kubernetes
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
---

### containerd 二进制安装

[github.com/containerd/containerd/blob/main/docs/getting-started.md](https://github.com/containerd/containerd/blob/main/docs/getting-started.md)

[github.com/containerd/containerd/releases](https://github.com/containerd/containerd/releases)

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

[https://github.com/containerd/containerd/blob/v1.6.19/containerd.service](https://github.com/containerd/containerd/blob/v1.6.19/containerd.service)


```
mkdir -p /usr/local/lib/systemd/system

上述文件下载到 (注意下载对应的版本号的)

/usr/local/lib/systemd/system/containerd.service

# 重新加载 service 文件
$ systemctl daemon-reload
```

### runc安装

[https://github.com/opencontainers/runc/releases](https://github.com/opencontainers/runc/releases)

```
安装到 /usr/local/sbin/runc

cp runc.arm64 /usr/local/bin/runc
chmod +x /usr/local/bin/runc
```

### 安装 CNI 插件

[https://github.com/containernetworking/plugins/releases](https://github.com/containernetworking/plugins/releases)

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
[https://github.com/kubernetes-sigs/cri-tools/releases/](https://github.com/kubernetes-sigs/cri-tools/releases/)
```
tar -zxvf crictl-v1.24.0-linux-amd64.tar.gz -C /usr/local/bin
```
```
cat > /etc/crictl.yaml <<EOF
runtime-endpoint: unix:///var/run/containerd/containerd.sock
image-endpoint: unix:///var/run/containerd/containerd.sock
timeout: 10
debug: false
pull-image-on-create: false
EOF
```
```
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

[参考文档](https://blog.csdn.net/qq_25874461/article/details/128358829)
