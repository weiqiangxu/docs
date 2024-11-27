# runner镜像制作

- [docker镜像制作](https://www.runoob.com/docker/docker-dockerfile.html)

### 制作 fmt && lint 的go镜像

1. 创建文件

```
touch Dockerfile
```

2. 创建用于fmt && lint 的 go 镜像
```
FROM golang:latest
RUN go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.49.0
```

3. 在Dockerfile所在的目录制作镜像
```
# 制作镜像在本地
docker build -t golang:v2 .

# 查看制作好的镜像
docker images

# 运行新的镜像
docker run -t -i golang:v2 /bin/bash

# 打标签
docker tag golang:v2 435861851/golang:1.0
```

4. 上传镜像到docker hub

```
docker login
docker push 435861851/golang:1.0
docker logout
```