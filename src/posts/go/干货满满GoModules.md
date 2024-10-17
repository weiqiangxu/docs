---
title: 干货满满的GoModules
index_img: /images/bg/文章通用.png
tags:
  - golang
categories:
  - golang
date: 2023-04-11 09:40:12
excerpt: 腾讯内部的代码风格要求
hide: true
---

# 干货满满的 Go Modules

[go-modules 干货满满的 Go Modules 和 goproxy.cn](https://www.jishuchi.com/read/gin-practice/3794#8c7ywi)
[理解Go中的go.sum和go.mod文件](https://golangbyexample.com/go-mod-sum-module/)
[终极入门](https://www.jishuchi.com/read/gin-practice/3795)

### 关键词

> Russ Cox 还是 Go 现在的掌舵人（大家应该知道之前 Go 的掌舵人是 Rob Pike，离开了美国，他岁数也挺大的了，所以也正在逐渐交权）

```
Go modules
GOPATH
1.13
tag支持commit id
间接依赖项
直接依赖项
```

### go.mod文件结构 5个动词

```
module
go
require
exclude
replace
```

> go.mod文件只记录直接依赖
> go.sum该文件列出了所需的直接和间接依赖项的校验和以及版本

### 为什么需要go.sum文件

```
go.sum文件中的校验和用于验证每个直接和间接依赖项的校验和，以确认它们都没有被修改
间接依赖项在这里会被罗列出来，一堆版本的hash值
```
> go env -w

### 配置项

```
GO111MODULE (Go modules 的开关)  auto\on\off

GOPROXY（设置 Go 模块代理）

GOSUMDB（Go Checksum Database）
Go 在拉取模块版本时(无论是从源站拉取还是通过 Go module proxy 拉取)保证拉取到的模块版本数据未经篡改
```

### 项目依赖私有模块
```
GONOPROXY

GONOSUMDB

GOPRIVATE
```

> 英文逗号 “,” 分割的模块路径前缀

> GOPRIVATE 较为特殊，它的值将作为 GONOPROXY 和 GONOSUMDB 的默认值，所以建议的最佳姿势是只是用 GOPRIVATE


### 常用命令

```
go get golang.org/x/text@latest
go get golang.org/x/text@v0.3.2
go mod tidy
go mod edit
go env -w

git config --global url."git@test.com:".insteadOf "https://github.com/"
```

### 涉及环境变量

```
$ go env
GO111MODULE="auto"
GOPROXY="https://proxy.golang.org,direct"
GONOPROXY=""
GOSUMDB="sum.golang.org"
GONOSUMDB=""
GOPRIVATE=""
...
```

### 目录

> GOPATH

```
bin：存储所编译生成的二进制文件。
pkg：存储预编译的目标文件，以加快程序的后续编译速度。
src：存储所有.go文件或源代码
```

```
go
├── bin
├── pkg
└── src
    ├── github.com
    ├── golang.org
    ├── google.golang.org
    ├── gopkg.in
    ....
```

> $GOPATH/pkg/mod

```
mod
├── cache
├── github.com
├── golang.org
├── google.golang.org
├── gopkg.in
...
```

# 参考文档

- [Gin实践](https://www.jishuchi.com/books/gin-practice)