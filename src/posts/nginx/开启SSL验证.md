---
title: 开启SSL验证
tags:
  - Nginx
categories:
  - Nginx
---

> 如何生成SSL证书并且应用于Nginx服务开启https


### 1.创建证书

```bash
$ mkdir cert
```

### 2.生成证书

```bash
# 下载openssl并安装配置环境变量
$ openssl version 
LibreSSL 3.3.6

$ cd cert

# 生成自签名SSL证书（仅用于测试)
$ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx.key -out nginx.crt

# 格式符合即可
# Country Name (2 letter code) []:01
# State or Province Name (full name) []:1
# Locality Name (eg, city) []:1
# Organization Name (eg, company) []:1
# Organizational Unit Name (eg, section) []:1
# Common Name (eg, fully qualified host name) []:1
# Email Address []:1
```

### 3.配置给Nginx后启动服务

```conf
server {
    #SSL 默认访问端口号为 443
    listen 443 ssl; 
    #请填写绑定证书的域名
    server_name testnginx.com;  #注意填写自己的域名
    #请填写证书文件的相对路径或绝对路径
    ssl_certificate /home/nginx.crt; #步骤2中拷贝的证书文件
    #请填写私钥文件的相对路径或绝对路径
    ssl_certificate_key /home/nginx.key; #步骤2中拷贝的私钥文件
    ssl_session_timeout 5m;
    #请按照以下协议配置
    ssl_protocols TLSv1.2 TLSv1.3; 
    #请按照以下套件配置，配置加密套件，写法遵循 openssl 标准。
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    location / {
        #网站主页路径。此路径仅供参考，具体请您按照实际目录操作。
        #例如，您的网站主页在 Nginx 服务器的 /etc/www 目录下，
        # 则请修改 root 后面的 html 为 /etc/www。
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }
}
```

```bash
$ docker run -itd \
  -p 80:80 \
  -p 443:443 \
  -v ./nginx.crt:/home/nginx.crt \
  -v ./nginx.key:/home/nginx.key \
  -v ./nginx.conf:/etc/nginx/conf.d/proxy.conf \
  nginx:1.25.1
```

现在可以访问 [https://localhost/](https://localhost/) 输出 Welcome to nginx!

### 4. 如果想关闭HTTP访问

```conf
# 如果想关闭http访问
server {
  listen 80;
  #请填写绑定证书的域名
  server_name example.com;    #注意填写自己的域名
  #把http的域名请求转成https
  return 301 https://$host$request_uri; 
}
```

### Q&A

1. 默认的Nginx.conf配置

```bash
$ docker run -itd nginx:1.25.1
```

```conf
# 以下文件在容器 nginx:1.25.1的/etc/nginx/conf.d/default.conf
# 可以将本地 nginx.conf 挂载到 /etc/nginx/conf.d/proxy.conf 那么Nginx一样会加载
server {
    listen       80;
    listen  [::]:80;
    server_name  localhost;

    # Index重定向到以下文件/usr/share/nginx/html/index.html
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    # 状态码为以下几个的时候输出/usr/share/nginx/html/50x.html
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```

2. 解释一下openssl生成命令

```bash
$ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx.key -out nginx.crt

openssl req: 此命令告诉 OpenSSL 我们要使用请求子命令。
-x509: 此选项指定我们要生成自签名证书，而不是证书签名请求 (CSR)。
-nodes: 此选项告诉 OpenSSL 不要在证书本身中包含私钥信息。私钥将存储在单独的文件中。
-days 365: 此选项将证书的有效期设置为 365 天（一年）。
-newkey rsa:2048: 此选项告诉 OpenSSL 生成一个新的 RSA 私钥，密钥大小为 2048 位
          密钥将存储在由 -keyout 指定的文件中。
-keyout nginx.key: 此选项指定生成私钥的文件名。在这种情况下，它将命名为 nginx.key。
-out nginx.crt: 此选项指定生成自签名证书的文件名。在这种情况下，它将命名为 nginx.crt。
```

### 相关文档

[腾讯云/Nginx配置HTTPS](https://cloud.tencent.com/developer/article/2288334)