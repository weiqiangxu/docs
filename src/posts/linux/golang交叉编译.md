---
title: 交叉编译
hide: true
---

### 三个概念内核、架构和位

##### 内核
```
内核是操作系统的核心，windows不必多说，Linux家族主流内核freebsd、netbsd、solaris等。Mac内核darwin，Darwin 是一种Unix-like（类Unix）操作系统。
```

##### 架构：
```
目前市面上的CPU架构为X86和arm，amd和intel属于X86架构。
X86架构性能好，耗电多、电压高，主要用于PC机、服务器。
ARM架构耗电少、电压低，单核性能低于X86，主要用于移动设备。
```


##### 位
```
X86一般是指32位的系统，X64就是64位的系统。
X64本质上也是X86的一个版本，确切来说，应该叫x86_64，可以简单理解成X86的下一代版本
```


### golang支持的操作系统
```
$GOOS $GOARCH
darwin 386
darwin amd64
darwin arm
darwin arm64
dragonfly amd64
freebsd	386
freebsd	amd64
freebsd	arm
linux 386
linux amd64
linux arm
linux arm64
linux ppc64
linux ppc64le
netbsd 386
netbsd amd64
netbsd arm
openbsd	386
openbsd	amd64
openbsd	arm
plan9 386
plan9 amd64
solaris amd64
windows	386
windows	amd64
windows	arm
windows	arm64
```

### Windows

> $ GOOS=windows GOARCH=amd64 go build test.go

### Linux
> $ GOOS=linux GOARCH=amd64 go build test.go

### Mac
> $ GOOS=darwin GOARCH=amd64 go build test.go