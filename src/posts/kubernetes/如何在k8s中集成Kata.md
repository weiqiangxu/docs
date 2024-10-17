---
title: 如何在k8s中集成Kata
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-04-18 18:40:12
excerpt: 如何在k8s之中集成kata
sticky: 1
hide: true
---

1. centos

``` bash
$ source /etc/os-release
$ yum -y install yum-utils
$ ARCH=$(arch)
$ BRANCH="${BRANCH:-master}"
$ yum-config-manager --add-repo "http://download.opensuse.org/repositories/home:/katacontainers:/releases:/${ARCH}:/${BRANCH}/CentOS_${VERSION_ID}/home:katacontainers:releases:${ARCH}:${BRANCH}.repo"
$ yum -y install kata-runtime kata-proxy kata-shim
```

``` bash
# 离线安装
# 下载地址 https://github.com/kata-containers/kata-containers/releases/tag/3.1.0
# kata-static-3.1.0-x86_64.tar.xz
$ vim ~/.bashrc

# 添加行
$ export PATH=$PATH:/opt/kata/

# 环境变量加载
$ source ~/.bashrc

# 验证安装是否成功
$ kata-runtime --version
```

``` bash
# download source code
$ git clone https://github.com/kata-containers/kata-containers.git
$ git checkout 3.1.0

# 编译kata支持 aarch64 架构
# Kata Containers runtime
$ go get -d -u github.com/kata-containers/runtime
$ cd $GOPATH/src/github.com/kata-containers/runtime
$ make
$ mkdir /usr/bin/kata && mv {containerd-shim-kata-v2,kata-monitor,kata-runtime} /usr/bin/kata

#
$ cd /kata-containers/proxy && make
```


2. 检测硬件是否匹配

``` bash
$ kata-runtime kata-check
```

3. 配置并测试 Docker

``` bash
$ vim /etc/docker/daemon.json
```


``` yml
# 添加配置
{
  "runtimes": {
    "kata-runtime": {
      "path": "/usr/bin/kata-runtime"
    }
  }
}
```

``` bash
# 服务重启
$ systemctl daemon-reload
$ systemctl restart docker
```

4. 验证是否成功

``` bash
# kata-runtime 容器使用的内核版本与宿主机不同，这就说明 kata-runtime 配置成功了
$ docker run --runtime=kata-runtime  busybox uname -a
$ docker run busybox uname -a
```

### 相关文章

[如何在 Kubernetes 集群中集成 Kata](https://cloud.tencent.com/developer/article/1730700)
[官网kata手动安装/离线安装 Manual Installation](https://github.com/kata-containers/kata-containers/blob/main/docs/install/container-manager/containerd/containerd-install.md)
[官网kata的多种安装方式](https://github.com/kata-containers/kata-containers/tree/main/docs/install)
[3.1.0下载链接](https://github.com/kata-containers/kata-containers/releases/tag/3.1.0)
[3.1.0手动安装文档](https://github.com/kata-containers/kata-containers/blob/3.1.0/docs/install/container-manager/containerd/containerd-install.md)
[官方-kata的架构设计图](https://github.com/kata-containers/documentation/blob/master/design/architecture.md)
[3.1.0官方文档开发者文档](https://github.com/kata-containers/kata-containers/blob/3.1.0/docs/Developer-Guide.md)