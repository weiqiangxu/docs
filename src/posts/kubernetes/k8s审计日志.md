---
title: k8s审计日志
tags:
  - loki
categories:
  - kubernetes
---

> 如何开启k8s的审计日志以及如何配置审计日志记录策略、解读k8s的apiserver关于审计日志的源码逻辑，了解loki如何采集日志并且http API接口查看日志.

### 一、loki存档审计日志架构图

![审计日志接入](/images/audit-log.png)

### 二、配置k8s仅仅记录资源的delete edit add，不记录查看动作

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

### 三、日志写入策略

日志写入标准输出，标准输出默认挂载至宿主机目录 `/var/log/containers/` 的文件 `<POD-NAME>_<CONTAINER-NAME>_<CONTAINER-ID>.log` 之中，比如 `kube-apiserver-k8s-master_kube-system_kube-apiserver-xxx.log` 日志文件。

### 四、创建loki\promtail采集日志

- k8s之中安装loki
- docker安装loki


### 五、已经搭建好审计日志的服务器

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

### 六、通过http接口查看loki日志

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


### 七、使用docker搭建loki

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

### Q&A

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

### 参考资料

- [Grafana Loki 查询语言 LogQL 使用](https://zhuanlan.zhihu.com/p/535482931)
- [https://grafana.com/docs/loki/latest/getting-started/](https://grafana.com/docs/loki/latest/getting-started/)
- [https://grafana.com/docs/loki/latest/v2.8x](https://grafana.com/docs/loki/latest/)
- [https://grafana.com/docs/loki/latest/getting-started/](https://grafana.com/docs/loki/latest/getting-started/)
- [apiserver handler request过滤器校验审计日志规则源码](https://github.com/kubernetes/apiserver/blob/v0.27.2/pkg/audit/policy/checker.go)