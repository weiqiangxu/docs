## 目录

- [一、环境信息](#一环境信息)
- [二、官方资源](#二官方资源)
- [三、安装步骤](#三安装步骤)
- [四、配置containerd](#四配置containerd)
- [五、CNI配置](#五cni配置)
- [六、systemd配置](#六systemd配置)
- [七、测试运行](#七测试运行)
- [八、Q&A](#八qa)

## 一、环境信息

``` bash
[root🐳 ~]# uname -a
Linux ming-computer 5.15.0-71-generic #78~20.04.1-Ubuntu SMP Wed Apr 19
11:26:48 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux
```

## 二、官方资源

| 资源 | 地址 |
|------|------|
| containerd文档 | [containerd-v1.7.0/getting-started](https://github.com/containerd/containerd/blob/v1.7.0/docs/getting-started.md) |
| runc | [runc-v1.1.7](https://github.com/opencontainers/runc/releases/tag/v1.1.7) |
| CNI plugins | [containernetworking/plugins-CNI-v1.2.0](https://github.com/containernetworking/plugins/releases/tag/v1.2.0) |

## 三、安装步骤

### 3.1 安装runc

``` bash
install -m 755 runc.amd64 /usr/local/sbin/runc
```

### 3.2 安装CNI插件

``` bash
mkdir -p /opt/cni/bin
tar Cxzvf /opt/cni/bin cni-plugins-linux-amd64-v1.2.0.tgz
```

### 3.3 安装containerd

``` bash
# 安装至/usr/local
tar Cxzvf /usr/local containerd-1.1.7-linux-amd64.tar.gz
```

> 注意：在Alpine Linux上不适用

### 3.4 验证安装

``` bash
whereis containerd
containerd --version
```

## 四、配置containerd

### 4.1 生成默认配置

``` bash
# 创建配置目录
mkdir -p /etc/containerd

# 生成默认配置
containerd config default > /etc/containerd/config.toml

# 查看配置
containerd config dump
```

### 4.2 配置说明

``` bash
# 查看CNI配置目录
cat /etc/containerd/config.toml | grep cni

# plugins["io.containerd.grpc.v1.cri"].cni.conf_dir
# 配置目录：/etc/cni/net.d
```

## 五、CNI配置

### 5.1 创建CNI配置文件

``` bash
mkdir -p /etc/cni/net.d

cat <<EOF > /etc/cni/net.d/10-mynet.conf
{
    "cniVersion": "0.2.0",
    "name": "mynet",
    "type": "bridge",
    "bridge": "cni0",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "subnet": "172.19.0.0/24",
        "routes": [
            { "dst": "0.0.0.0/0" }
        ]
    }
}
EOF
```

### 5.2 CNI配置参数说明

| 参数 | 说明 |
|------|------|
| cniVersion | CNI规范版本 |
| name | 网络名称 |
| type | 插件类型（bridge、host-local等） |
| bridge | 桥接设备名称 |
| isGateway | 是否作为网关 |
| ipMasq | 是否启用IP伪装 |
| subnet |分配的子网范围 |
| routes | 路由规则 |

## 六、systemd配置

### 6.1 创建systemd服务文件

``` bash
mkdir -p /usr/local/lib/systemd/system/
touch /usr/local/lib/systemd/system/containerd.service
```

### 6.2 配置内容

复制 [containerd.service](https://raw.githubusercontent.com/containerd/containerd/main/containerd.service) 内容到 `/usr/local/lib/systemd/system/containerd.service`

### 6.3 启动containerd

``` bash
systemctl daemon-reload
systemctl enable --now containerd
systemctl status containerd
```

## 七、测试运行

### 7.1 运行测试容器

``` bash
sudo ctr image pull docker.io/library/busybox:latest
sudo ctr run --cni -t --rm docker.io/library/busybox:latest hello sh
```

### 7.2 验证插件

``` bash
ctr plugin ls
```

## 八、Q&A

### 8.1 如何查看containerd的插件列表

``` bash
ctr plugin ls
```

### 8.2 如何离线安装Golang

1. 在有网络的机器上下载[Golang二进制文件包](https://go.dev/dl/)

``` bash
# 下载tar.gz或zip格式
```

2. 复制到离线机器并解压

``` bash
tar -C /usr/local -xzf go1.19.10.linux-arm64.tar.gz
```

3. 配置环境变量

``` bash
echo 'export PATH=$PATH:/usr/local/go/bin' | tee -a /etc/profile
source /etc/profile
```

4. 验证安装

``` bash
go version
```

## 相关资料

- [CNI官方文档](https://www.cni.dev/)
- [containerd配置文件示例](https://github.com/kubernetes/website/blob/dev-1.24/content/en/docs/tasks/administer-cluster/migrating-from-dockershim/troubleshooting-cni-plugin-related-errors.md)
- [Kata Containers与containerd配置](https://github.com/kata-containers/kata-containers/blob/3.0.2/docs/how-to/containerd-kata.md)
- [containerd devmapper快照器](https://github.com/containerd/containerd/blob/v1.7.0/docs/snapshotters/devmapper.md)
