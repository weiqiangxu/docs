# docker集成gvisor

### 一、安装gvisor

https://gvisor.dev/docs/user_guide/install/

### 二、运行容器验证

``` bash
# 查看当前docker支持的运行时
$ docker info | grep Runtime

# 基于runtime=runsc创建容器
$ docker run --runtime=runsc --memory=1g -itd --name centos-test3 centos:centos7

# 进入容器查看
$ docker exec -it centos-test3 /bin/bash

# 比较和宿主机的内存
$ free -m

# 基于runc创建容器试试(验证后发现内存隔离并未生效)
$ docker run --runtime=runc --memory=1g -itd --name centos-test5 centos:centos7
```

### 相关资料

[docker use gvisor](https://gvisor.dev/docs/user_guide/quick_start/docker/)
[gvisor install](https://gvisor.dev/docs/user_guide/install/)
[containerd quick_start](https://gvisor.dev/docs/user_guide/containerd/quick_start/)