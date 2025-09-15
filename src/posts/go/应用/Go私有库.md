---
title: Go私有库
tags:
  - golang
categories:
  - golang
---

### 一、配置golang环境

``` bash
$ go env -w GOINSECURE="gitlab.company.net" # 在 Go 1.13 版本中 没有 GOINSECURE 环境变量
$ go env -w GONOPROXY="gitlab.company.net"
$ go env -w GOPRIVATE="gitlab.company.net"
$ go env -w GONOSUMDB="gitlab.company.net"
$ go env -w GOPROXY="https://goproxy.io,direct"
$ go env -w GO111MODULE=on
```

``` bash
# 对于有些版本比如 go 1.13 没有GOINSECURE环境变量会出现 SSL x509 certificate signed by unknown authority
# 执行以下的可以绕过SSL验证问题
$ export GOSUMDB=off GONOSUMDB=*

# 删除环境变量
$ unset GOSUMDB
$ unset GONOSUMDB
```

### 二、配置git环境

``` bash
# 更改git#<url>替换为https://<url>
# git config --global url.git@<IP addr>:.insteadOf https://<IP addr>/ --replace-all
$ git config --global url.git@gitlab.company.net:.insteadOf https://gitlab.company.net/
$ git config --global --help

# 编辑配置
$ git config --global --edit

# 配置SSH证书登陆gitlab
mkdir ~/.ssh
ssh -T git@gitlab.company.net
```

### 三、验证

``` bash
# 手动绕过SSL 
# go get -insecure gitlab.company.net/client-go@v0.22.21
go get gitlab.company.net/client-go@v0.22.21
```


### Q&A

##### 1. go get 404 not found

``` bash
# 异常信息
reading https://mirrors.aliyun.com/goproxy/github.com/weiqiangxu/batchjob/@v/list: 404 Not Found

# 1.私有库未设置，默认会去`https://pkg.go.dev`
# 就是`go env | grep GOPROXY`查找
# GOPRIVATE设为一个以逗号分隔的模式列表时
# 避免从公共仓库下载私有模块
# 假设GOPRIVATE的值设置为"example.com/private-project"，那么当执行go get example.com/private-project时
# Go命令将会从私有仓库或者本地文件系统中查找并下载该模块，而不是从公共仓库中获取
go env -w GOPRIVATE=gitlab.mycompany.net

# 2.设置insecure
# 控制Go语言的不安全操作，当设置为"1"时，Go语言将允许一些不安全的操作
go env -w GOINSECURE=private.repo.com

# 3.手动指定
go get -inscure github.com/weiqiangxu/batchjob
```


### 相关文档

- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)
- [medium.com/geekculture发布包到pkg](https://medium.com/geekculture/release-your-go-package-on-pkg-go-dev-886ec42fbc77)
- [囊地鼠饲养员的碎碎念/如何优雅地发布模块到pkg.go.dev](https://blog.golang.im/how-to-release-go-module/)
- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)
- [topgoer](https://www.topgoer.com/)