---
title: Go静态扫描
tags:
  - golang
  - golangci-lint
  - fmt
categories:
  - golang
---

> mackefile静态扫描和格式检查

### 一、makefile code

``` bash
$ touch Makefile
```

``` makefile
fmt:
　　command -v gofumpt || (WORK=$(shell pwd) && cd /tmp && GO111MODULE=on go install mvdan.cc/gofumpt@latest && cd $(WORK))
　　gofumpt -w -d .

lint:
　　command -v golangci-lint || (WORK=$(shell pwd) && cd /tmp && GO111MODULE=on go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.49.0 && cd $(WORK))
　　golangci-lint run  -v

ci/lint: export GOPATH=/go
ci/lint: export GO111MODULE=on
ci/lint: export GOPROXY=https://goproxy.cn
ci/lint: export GOPRIVATE=code.my.net
ci/lint: export GOOS=linux
ci/lint: export CGO_ENABLED=1
ci/lint: lint
```

### 二、执行静态扫描和格式检查

``` bash
$ make fmt && make lint
```
