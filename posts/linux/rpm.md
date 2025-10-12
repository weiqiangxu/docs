# RPM

1. 如何安装rpm包

``` bash
# 其中，-i 表示安装（install），-v 表示显示详细信息，-h 表示显示进度条。包名可以是绝对路径或相对路径，可以自动补全
$ rpm -ivh 包名.rpm

# 卸载
$ rpm -e 包名
```

2. 如何导出rpm包

``` bash
$ yum install -y yum-utils
$ yumdownloader --resolve initscripts-10.01-6.jw4.aarch64
```

``` bash
# 如果没有安装
$ yum -y install --downloadonly --downloaddir=./ initscripts
# 如果已经安装
$ yum -y reinstall --downloadonly --downloaddir=./ initscripts
```

3. yum

``` bash
$ cd /etc/yum.repos.d
```