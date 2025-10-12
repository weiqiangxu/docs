---
title: kubernetes审计日志
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-05-23 18:40:12
excerpt: 介绍审计日志相关配置项，示例如何开启并且如何将审计日志打到标准输出
sticky: 1
hide: false
---

### 一、审计日志的策略

> 如何开启k8s的审计日志以及如何配置审计日志记录策略、解读k8s的apiserver关于审计日志的源码逻辑，了解loki如何采集日志并且http API接口查看日志.

1. 日志记录阶段

kube-apiserver 是负责接收及相应用户请求的一个组件，每一个请求都会有几个阶段，每个阶段都有对应的日志，当前支持的阶段有：
- RequestReceived - apiserver 在接收到请求后且在将该请求下发之前会生成对应的审计日志
- ResponseStarted - 在响应 header 发送后并在响应 body 发送前生成日志。这个阶段仅为长时间运行的请求生成（例如 watch）
- ResponseComplete - 当响应 body 发送完并且不再发送数据
- Panic - 当有 panic 发生时生成

>  apiserver 的每一个请求理论上会有三个阶段的审计日志生成

2. 日志记录级别

- None - 不记录日志。
- Metadata - 只记录 Request 的一些 metadata (例如 user, timestamp, resource, verb 等)，但不记录 Request 或 Response 的body。
- Request - 记录 Request 的 metadata 和 body。
- RequestResponse - 最全记录方式，会记录所有的 metadata、Request 和 Response 的 body。

3. 日志记录策略

- 一个请求不要重复记录，每个请求有三个阶段，只记录其中需要的阶段
- 不要记录所有的资源，不要记录一个资源的所有子资源
- 系统的请求不需要记录，kubelet、kube-proxy、kube-scheduler、kube-controller-manager 等对 kube-apiserver 的请求不需要记录
- 对一些认证信息（secerts、configmaps、token 等）的 body 不记录

### 二、启用审计日志

1. 在宿主机创建文件

``` bash
$ mkdir -p /etc/kubernetes/audit/
$ touch /etc/kubernetes/audit/audit-policy.yaml
```

``` yml
# /etc/kubernetes/audit/audit-policy.
apiVersion: audit.k8s.io/v1
kind: Policy
# ResponseStarted 阶段不记录
omitStages:
  - "ResponseStarted"
rules:
  # 记录用户对 pod 和 statefulset 的操作
  - level: RequestResponse
    resources:
    - group: ""
      resources: ["pods","pods/status"]
    - group: "apps"
      resources: ["statefulsets","statefulsets/scale"]
  # kube-controller-manager、kube-scheduler 等已经认证过身份的请求不需要记录
  - level: None
    userGroups: ["system:authenticated"]
    nonResourceURLs:
    - "/api*"
    - "/version"
  # 对 config、secret、token 等认证信息不记录请求体和返回体
  - level: Metadata
    resources:
    - group: "" # core API group
      resources: ["secrets", "configmaps"]
```

2. 配置静态pod记录审计日志

``` bash
$ vim /etc/kubernetes/manifests/kube-apiserver.yaml
```

``` yml
# 日志文件保留7天，并保留最近的5个备份。
# 如果日志文件大小超过100MB，它也将被轮转。当日志文件到达最大保留时间或备份数时，较旧的日志文件将被删除。
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit/audit-policy.yaml            # 审计日志配置
    - --audit-log-path=/var/log/containers/audit.log                         # 输出到标准输出
    - --audit-log-format=json                                                # 输出格式json
    - --audit-log-maxage=7
    - --audit-log-maxbackup=5
    - --audit-log-maxsize=100
```

``` bash
# 日志文件展示
$ ls /var/log/containers/ | grep audit

audit-2023-06-05T07-12-55.439.log # 备份文件最大100MB
audit-2023-06-05T07-12-52.231.log # 备份文件
audit-2023-06-05T07-12-55.891.log # 备份文件
audit-2023-06-05T07-12-58.439.log # 备份文件
audit-2023-06-05T07-12-58.786.log # 备份文件
audit. # 最新的日志文件，超过100MB会自动轮转
```

``` yml
# 创建两个卷etc-audit && audit-log分别挂载容器内的两个路径
volumeMounts:
- mountPath: /etc/kubernetes/audit
  name: etc-audit
  readOnly: true
- mountPath: /var/log/containers/
  name: audit-log
```

``` yml
# 将两个卷 etc-audit && audit-log 分别挂载至宿主机
volumes:
- hostPath:
    path: /etc/kubernetes/audit
    type: DirectoryOrCreate
  name: etc-audit
- hostPath:
    path: /var/log/containers
    type: DirectoryOrCreate
  name: audit-log
```

> 更改了之后会自动重启 kube-apiserver

3. 审计日志查看

``` bash
$ kubectl get pod -A
$ kubectl logs kube-apiserver-k8s-master -n kube-system -f
```



### 三、loki存档审计日志架构图

![审计日志接入](/images/audit-log.png)

### 四、配置k8s仅仅记录资源的delete edit add，不记录查看动作

``` json
// 原始日志结构
{
    "kind":"Event",
    "apiVersion":"audit.k8s.io/v1",
    "level":"", // 日志详细级别
    "auditID":"",
    "stage":"", // 请求阶段
    "requestURI":"",
    "verb":"", // 动作 update\get\list\delete\patch
    "user":{
        "username":"", // 用户名称 kube-system\node:k8s-master
        "groups":[] // 所属用户组
    },
    "sourceIPs":[
        "" // 请求IP
    ],
    "userAgent":"",
    "objectRef":{
        "resource":"", // 资源类型 pods\lease
        "namespace":"",
        "name":"",
        "apiGroup":"",
        "apiVersion":""
    },
    "requestReceivedTimestamp":"",
    "stageTimestamp":""
}
```

``` yml
# /etc/kubernetes/audit/audit-policy.yml
# 通过排除法，特定的角色、资源、动作类型不做记录，其余记录为审计日志
apiVersion: audit.k8s.io/v1
kind: Policy
# 仅仅记录
omitStages:
  - "ResponseStarted"
  - "ResponseComplete"
rules:
  # 排除watch\get\list\
  - level: None
    verbs: ["watch","get","list","patch"]
  # 排除特定角色
  - level: None
    users: ["system:kube-scheduler","system:apiserver","system:kube-controller-manager"]
  # 租约更新不需要
  - level: None
    resources:
    - group: "coordination.k8s.io"
      resources: ["leases"]
  - level: RequestResponse
```

``` go
// 源代码：
// k8s.io/apiserver
// pkg/audit/policy.EvaluatePolicyRule
// 规则验证，自上而下，遇到匹配的规则返回当前的路由日志的处理策略
func (p *policyRuleEvaluator) EvaluatePolicyRule(attrs authorizer.Attributes)
// 规则对象
type audit.PolicyRule
```

### 五、日志写入策略

日志写入标准输出，标准输出默认挂载至宿主机目录 `/var/log/containers/` 的文件 `<POD-NAME>_<CONTAINER-NAME>_<CONTAINER-ID>.log` 之中，比如 `kube-apiserver-k8s-master_kube-system_kube-apiserver-xxx.log` 日志文件。

### 六、创建loki\promtail采集日志

- k8s之中安装loki
- docker安装loki


### 七、已经搭建好审计日志的服务器

``` bash
# bingokube
$ 127.0.0.1
```

``` bash 
# 创建service暴露http服务
# loki.svc.yml
apiVersion: v1
kind: Service
metadata:
  name: loki-service
  namespace: loki
spec:
  type: NodePort
  selector:
    app: loki
  ports:
  - name: loki-port
    protocol: TCP
    port: 80
    targetPort: 3100
    nodePort: 30019
```

``` bash
# 在机器上直接用pod的IP访问
$ curl 192.100.0.11:3100/loki/api/v1/query
$ curl http://127.0.0.1:30019/loki/api/v1/query
```

``` bash
# 示例日志查询
http://127.0.0.1:30019/loki/api/v1/query_range?query={container="kube-apiserver"}|json|auditID!=""
```

### 八、通过http接口查看loki日志

1. 查询一段时间范围内的所有指标原始日志

``` bash
$ curl http://localhost:3101/loki/api/v1/query_range
query={container="evaluate-loki-flog-1"}| json| method="GET"
start=1685531767028752000
end=1685531767029752000


# 原始查询样式
http://localhost:3101/loki/api/v1/query_range?query={container=%22evaluate-loki-flog-1%22}|%20json|%20method=%22GET%22&start=1685531767028752000&end=

### 查询结果
{
    "status": "success",
    "data": {
        "resultType": "streams",
        "result": [
            {
                "stream": {
                    "bytes": "9822",
                    "container": "evaluate-loki-flog-1",
                    "datetime": "31/May/2023:11:29:51 +0000",
                    "host": "34.255.123.249",
                    "method": "GET",
                    "protocol": "HTTP/1.1",
                    "referer": "https://www.productvisionary.io/extensible/intuitive",
                    "request": "/utilize/redefine/robust/recontextualize",
                    "status": "504",
                    "user_identifier": "-"
                },
                "values": [
                    [
                        "1685534541758917343",
                        "{"name":"xxx"}"
                    ]
                ]
            },
            {
                "stream": {
                    "bytes": "9809",
                    "container": "evaluate-loki-flog-1",
                    "datetime": "31/May/2023:11:34:35 +0000",
                    "host": "142.152.85.195",
                    "method": "GET",
                    "protocol": "HTTP/1.1",
                    "referer": "http://www.humanoptimize.org/syndicate/generate",
                    "request": "/distributed/syndicate",
                    "status": "501",
                    "user_identifier": "aufderhar3522"
                },
```

2. 查看所有的时间序列(一般一个容器有一个序列)

``` bash
$ curl http://localhost:3101/loki/api/v1/series
```


### 九、使用docker搭建loki

1. 如何搭建loki服务

``` bash

mkdir evaluate-loki

cd evaluate-loki

wget https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/loki-config.yaml -O loki-config.yaml
wget https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/promtail-local-config.yaml -O promtail-local-config.yaml
wget https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/docker-compose.yaml -O docker-compose.yaml

docker-compose up -d

http://localhost:3101/ready.
http://localhost:3000

{container="evaluate-loki-flog-1"}
```

### 相关疑问


1. 范围查询的start时间格式

``` go
func Test_formatTS(t *testing.T) {
	type args struct {
		ts time.Time
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "",
			args: args{
				ts: time.Now().Add(-1 * time.Minute),
			},
			want: "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
      // 1685531472028872000
      // 时间戳纳秒格式字符串
			if got := strconv.FormatInt(tt.args.ts.UnixNano(), 10); got != tt.want {
				t.Errorf("formatTS() = %v, want %v", got, tt.want)
			}
		})
	}
}
```

2. http接口查看loki数据时候如何取消身份校验

``` yml
# 取消验证  disable the auth feature
# https://github.com/grafana/loki/issues/7081
auth_enabled: false
```

3. promtail 如何配置采集日志(/var/log) 并且更新helm包

> 待定，使用已经搭建好的服务先

4. 如何获取当前审计日志之中所有user.username有哪些

``` bash
$ curl http://localhost:3101/loki/api/v1/query?query=count(count_over_time({container="evaluate-loki-flog-1"}[5m] |json)) by (method)

{
    "status": "success",
    "data": {
        "resultType": "vector",
        "result": [
            {
                "metric": {
                    "method": "DELETE"
                },
                "value": [
                    1685534804.433,
                    "49"
                ]
            },
            {
                "metric": {
                    "method": "GET"
                },
                "value": [
                    1685534804.433,
                    "50"
                ]
            }
        ]
    }
}
```

5. loki是如何拉取并存储日志的

![loki](/images/simple-scalable-test-environment.png)

6. 如何配置apiserver将审计日志写入固定的目录被loki采集

因为默认Loki会采集宿主机目录的 `/var/log/containers/` 所有日志文件，所以将审计日志写入该文件夹即可。如何配置呢请[访问](https://weiqiangxu.github.io/2023/05/23/k8s/kubernetes%E5%AE%A1%E8%AE%A1%E6%97%A5%E5%BF%97/).

7. 开启审计日志后时不时会有2条日志是干嘛的

```json
# ResponseComplete /api/v1/namespaces/kube-system/configmaps?watch=true,"user":{"username":"system:node:k8s-master"}
# RequestReceived /api/v1/namespaces/kube-system/configmaps?watch=true, "user":{"username":"system:node:k8s-master"}
```


### 参考资料

- [kubernertes安装](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/%E5%A6%82%E4%BD%95%E5%AE%89%E8%A3%85kubernetes/)
- [简书/kubernetes 审计日志功能](https://www.jianshu.com/p/8117bc2fb966)
- [任务/日志监控/审计](https://kubernetes.io/zh-cn/docs/tasks/debug/debug-cluster/audit/)
- [Grafana Loki 查询语言 LogQL 使用](https://zhuanlan.zhihu.com/p/535482931)
- [https://grafana.com/docs/loki/latest/getting-started/](https://grafana.com/docs/loki/latest/getting-started/)
- [https://grafana.com/docs/loki/latest/v2.8x](https://grafana.com/docs/loki/latest/)
- [https://grafana.com/docs/loki/latest/getting-started/](https://grafana.com/docs/loki/latest/getting-started/)
- [apiserver handler request过滤器校验审计日志规则源码](https://github.com/kubernetes/apiserver/blob/v0.27.2/pkg/audit/policy/checker.go)