FROM docker:dind

COPY file/ /tmp/

ENV GOPATH="/home/go" \
    GOROOT="/usr/local/go" \
    GOPROXY="https://goproxy.cn,direct" \
    GOINSECURE="gitlab.company.net" \
    GOPRIVATE="*.corp.com,gitlab.company.net" \
    GONOPROXY="gitlab.company.net" \
    GONOSUMDB="gitlab.company.net" \
    PATH="$PATH:/usr/local/go/bin"

# install golang
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories \
    && apk --update add tar make rsync bash \
    && cd /home && wget https://go.dev/dl/go1.18.linux-arm64.tar.gz && ls \
    && cd /home && tar -C /usr/local -xzf go1.18.linux-arm64.tar.gz \
    && echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile \
    && source /etc/profile \
    && apk add --no-cache tzdata gcc g++ binutils libc6-compat build-base git helm \
    && helm plugin install https://github.com/chartmuseum/helm-push \
    && ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && mkdir -p /root/.docker && mv /tmp/docker-config.json /root/.docker/config.json \
    && mkdir -p /etc/docker && mv /tmp/daemon.json /etc/docker/daemon.json \
    && ln -s /lib/libc.so.6 /usr/lib/libresolv.so.2 \
    && mkdir -p /etc/buildkit && mv /tmp/buildkitd.toml /etc/buildkit/buildkitd.toml \
    && mv /tmp/.ssh ~


