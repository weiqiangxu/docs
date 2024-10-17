---
hide: true
---

# docker生成证书开启ssl验证

### 1. docker生成证书
### 2. 使用生成的证书和密钥启动客户端
### 3. 使用证书和密钥连接服务端


```bash
$ docker run -it -v $(pwd)/etcd:/root centos:centos7 sh
$ yum install wget
$ wget https://github.com/cloudflare/cfssl/releases/download/v1.6.4/cfssljson_1.6.4_linux_arm64
$ wget https://github.com/cloudflare/cfssl/releases/download/v1.6.4/cfssl_1.6.4_linux_arm64
$ cp cfssl_1.6.4_linux_arm64 /usr/local/bin/cfssl
$ cp cfssljson_1.6.4_linux_arm64 /usr/local/bin/cfssljson
$ chmod +x /usr/local/bin/cfssl && chmod +x /usr/local/bin/cfssljson
```


```json 
// config.json
{
  "signing": {
    "default": {
        "usages": [
          "signing",
          "key encipherment",
          "server auth",
          "client auth"
        ],
        "expiry": "87600h"
    }
  }
}
```
```json
// ca-csr.json 
{
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "O": "etcd",
      "OU": "etcd",
      "L": "apisix",
      "ST": "apisix",
      "C": "china"
    }
  ],
  "CN": "etcd"
} 
```

```json
// server.json 
{
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "O": "etcd",
      "OU": "etcd",
      "L": "apisix",
      "ST": "apisix",
      "C": "china"
    }
  ],
  "CN": "etcd",
  "hosts": [
    "192.168.4.61"
  ]
}
```

```bash
# 生成 CA 证书和密钥 
# ca-key.pem 文件是 CA 私钥文件。CA 私钥用于签署服务器证书。CA 私钥是敏感文件，请妥善保管。
# ca.pem 文件是 CA 证书文件。CA 证书用于验证服务器证书。CA 证书是可公开访问的文件。
# server-key.pem 文件是服务器私钥文件。服务器私钥用于加密客户端数据。服务器私钥是敏感文件，请妥善保管。
# ca.csr 文件是 CA 证书请求文件。CA 证书请求文件包含服务器的信息，用于 CA 签署服务器证书。
# server.csr 文件是服务器证书请求文件。服务器证书请求文件包含服务器的信息，用于 CA 签署服务器证书。
# server.pem 文件是服务器证书文件。服务器证书用于验证客户端连接。服务器证书是可公开访问的文件
cfssl gencert --initca=true ca-csr.json | cfssljson --bare ca


# 生成服务器证书和密钥的命令
# 查看服务器证书和密钥 ls -al server*
cfssl gencert --ca ca.pem --ca-key ca-key.pem --config config.json server.json | cfssljson --bare server
```

```bash
# vim /app/etcd/conf/conf.yml
name: etcd01
data-dir: /app/etcd/data
initial-advertise-peer-urls: https://192.168.4.61:2380
listen-peer-urls: https://192.168.4.61:2380
listen-client-urls: https://192.168.4.61:2379,http://127.0.0.1:2379
advertise-client-urls: https://192.168.4.61:2379
initial-cluster-token: apisix-etcd-cluster
initial-cluster: etcd01=https://192.168.4.61:238
initial-cluster-state: new

# [security]
client-transport-security:
  client-cert-auth: true
  trusted-ca-file: /app/etcd/cfssl/ca.pem
  cert-file: /app/etcd/cfssl/server.pem
  key-file: /app/etcd/cfssl/server-key.pem
peer-transport-security: 
  client-cert-auth: true
  trusted-ca-file: /app/etcd/cfssl/ca.pem
  cert-file: /app/etcd/cfssl/server.pem
  key-file: /app/etcd/cfssl/server-key.pem
```

```bash
docker network create app-tier --driver bridge

# 启动服务端
docker run -d --name Etcd-server \
    --network app-tier \
    -v $(pwd)/data:/bitnami/etcd/data \
    -v $(pwd)/etcd/ca.pem:/bitnami/etcd/certs/ca.pem \
    -v $(pwd)/etcd/server.pem:/bitnami/etcd/certs/server.pem \
    -v $(pwd)/etcd/server-key.pem:/bitnami/etcd/certs/server-key.pem \
    -v $(pwd)/conf.yml:/opt/bitnami/etcd/conf/etcd.conf.yml \
    --env ALLOW_NONE_AUTHENTICATION=yes \
    --env ETCD_ADVERTISE_CLIENT_URLS=https://etcd-server:2379 \
    bitnami/etcd:latest
```

```bash
docker run -it --rm \
    bitnami/etcd:latest etcdctl cert create-ca --out ca.pem
```

```bash


# 启动客户端
docker run -it --rm \
    --network app-tier \
    -v $(pwd)/etcd:/home/etcd \
    bitnami/etcd:latest etcdctl --cacert=/home/etcd/ca.pem \
    --cert=/home/etcd/server.pem --key=/home/etcd/server-key.pem \
    --endpoints https://etcd-server:2379 put /message Hello
```
