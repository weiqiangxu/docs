# Nginx 开启 HTTPS 实战

> 如何生成 SSL 证书并应用于 Nginx 服务开启 HTTPS。理论部分见 [HTTPS与SSL配置.md](./HTTPS与SSL配置.md),本文聚焦自签名证书实操步骤。

## 目录

- [一、生成自签名证书](#一生成自签名证书)
- [二、Nginx HTTPS 配置](#二nginx-https-配置)
- [三、HTTP 强制跳转 HTTPS](#三http-强制跳转-https)
- [四、Q&A](#四qa)
- [五、相关文档](#五相关文档)

## 一、生成自签名证书

### 1.1 创建证书目录

```bash
mkdir cert && cd cert
```

### 1.2 检查 OpenSSL

```bash
openssl version
# LibreSSL 3.3.6
```

### 1.3 生成自签名证书(测试用)

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout nginx.key \
  -out nginx.crt
```

按提示填写(测试场景任意值即可):

```text
Country Name (2 letter code) []:01
State or Province Name (full name) []:1
Locality Name (eg, city) []:1
Organization Name (eg, company) []:1
Organizational Unit Name (eg, section) []:1
Common Name (eg, fully qualified host name) []:1
Email Address []:1
```

> 浏览器访问时会警告"不安全",但加密通信正常,适用于本地/测试环境。

## 二、Nginx HTTPS 配置

### 2.1 配置文件

```nginx
server {
    # SSL 默认端口 443
    listen 443 ssl;
    # 绑定证书的域名
    server_name testnginx.com;

    # 证书与私钥路径
    ssl_certificate     /home/nginx.crt;
    ssl_certificate_key /home/nginx.key;

    ssl_session_timeout 5m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    # 加密套件(遵循 openssl 标准)
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        root  /usr/share/nginx/html;
        index index.html index.htm;
    }
}
```

### 2.2 Docker 启动

```bash
docker run -itd \
  -p 80:80 \
  -p 443:443 \
  -v ./nginx.crt:/home/nginx.crt \
  -v ./nginx.key:/home/nginx.key \
  -v ./nginx.conf:/etc/nginx/conf.d/proxy.conf \
  nginx:1.25.1
```

访问 [https://localhost/](https://localhost/) 输出 Welcome to nginx!。

## 三、HTTP 强制跳转 HTTPS

```nginx
server {
    listen 80;
    server_name example.com;

    # 把 HTTP 请求 301 跳转到 HTTPS
    return 301 https://$host$request_uri;
}
```

## 四、Q&A

### 4.1 默认 nginx.conf 配置

启动官方镜像:

```bash
docker run -itd nginx:1.25.1
```

容器内默认配置 `/etc/nginx/conf.d/default.conf`:

```nginx
server {
    listen      80;
    listen      [::]:80;
    server_name localhost;

    # 首页指向 /usr/share/nginx/html/index.html
    location / {
        root  /usr/share/nginx/html;
        index index.html index.htm;
    }

    # 5xx 错误页指向 /usr/share/nginx/html/50x.html
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

> 可以把本地 `nginx.conf` 挂载到 `/etc/nginx/conf.d/proxy.conf`,Nginx 会自动加载。

### 4.2 openssl 生成命令参数详解

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx.key -out nginx.crt
```

| 参数 | 含义 |
|------|------|
| `openssl req` | 使用请求子命令 |
| `-x509` | 输出自签名证书(而非 CSR) |
| `-nodes` | 私钥不加密(无密码) |
| `-days 365` | 有效期 365 天 |
| `-newkey rsa:2048` | 生成 2048 位 RSA 新私钥 |
| `-keyout nginx.key` | 私钥输出文件 |
| `-out nginx.crt` | 证书输出文件 |

## 五、相关文档

- [腾讯云/Nginx 配置 HTTPS](https://cloud.tencent.com/developer/article/2288334)
