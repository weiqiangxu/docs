# Docker编译go程序

1. 编写Dockerfile制作镜像

```
mkdir gobuilder && cd gobuilder

touch Dockerfile
```

```
FROM golang:1.14.3-stretch
MAINTAINER author <email@xxx.com>

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    vim \
    htop \
    curl \
    sudo \
    git \
    net-tools \
    tzdata \
    && ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && rm -rf /var/lib/apt/lists/*

ENV GOBIN=$GOPATH/bin
ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.io,direct
ENV TZ=Asia/Shanghai

CMD ["sh", "launch.sh"]

WORKDIR $GOPATH/src/app

ENTRYPOINT ["go", "build"]
```

2. 制作镜像
```
cd gobuilder

docker build -t gobuilder:1.14.3-stretch .
```


3. 编译go代码
```
# 运行以下容器编译你的go项目并导出可执行文件到当前目录下
docker run --rm -it -v /Users/xuweiqiang/Documents/bingo/test_go/:/go/src/app gobuilder:1.14.3-stretch
```

### 参考博客

[https://juejin.cn/post/6844904166851084296](https://juejin.cn/post/6844904166851084296)


### centos

```
docker run -itd --name centos-test \
-v /Users/xuweiqiang/Documents/bingo/test_go/:/home \
centos:centos7
```
```
# 执行上面编译的golang代码

sh-4.2# ./test_go
hello world
```

```
docker run -itd --name centos-test \
-v /Users/xuweiqiang/Documents/bingo/kubernetes/:/home \
centos:centos7
```

### sh: make: command not found
```
yum -y install gcc automake autoconf libtool make
yum install gcc gcc-c++
```

### Can't find 'go' in PATH, please fix and retry


### 如何将以上的所有依赖打入一个镜像
```
mkdir centos_with_golang
touch Dockfile
```
```
FROM centos:centos7
MAINTAINER xuweiqiang <435861851@xxx.com>

RUN yum -y install gcc automake autoconf libtool make
RUN yum install gcc gcc-c++
RUN yum install -y rsync
RUN chmod +x _output/bin/prerelease-lifecycle-gen

FROM golang:1.20.1

ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.io,direct
ENV TZ=Asia/Shanghai
```
```
docker build -t mycentos:0.0.1 .
```
```
docker run -itd \
-c 4096 \
-u 0 \
-v /Users/xuweiqiang/Documents/bingo/kubernetes/:/home \
--privileged=true \
--name mycentos-test123 \
mycentos:0.0.1


docker run -itd --name mycentos-test2 \
-v /Users/xuweiqiang/Documents/bingo/test_go/:/home \
mycentos:0.0.1
```

### dockerfile制作多个基础镜像的镜像(多个FROM)

### docker运行时指定磁盘和cpu大小

### docker里面执行遇到Permission denied

### Docker容器运行.sh文件时Permission denied错误

### 进入docker的容器之中
```
docker exec -it {$container_id} /bin/sh
```

### Makefile调用sh文件
```
fmt:
	echo "hello"
	sh ./build.sh
```


### 实战之使用docker编译k8s
```
docker run --rm -v /Users/xuweiqiang/Documents/bingo/kubernetes:/go/src/k8s.io/kubernetes -it gcrcontainer/kube-cross:v1.13.6-1 bash
```

[看云kubeadm编译](https://www.kancloud.cn/pshizhsysu/kubernetes/2204250)