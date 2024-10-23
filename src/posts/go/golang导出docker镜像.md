---
title: golang导出docker镜像
tags:
  - golang
categories:
  - golang
excerpt: 通过golang执行shell命令导出镜像到tar文件
---

### 一、下载镜像

``` go
// downloadDockerImage imageTagName := "k8s.gcr.io/etcd:3.5.0-0"
func downloadDockerImage(imageTagName string) (string, error) {
    // 要执行的命令
    _, dockerFileName := filepath.Split(imageTagName)
    dockerCommand := fmt.Sprintf("docker save -o %s.tar %s", dockerFileName, imageTagName)
    cmd := exec.Command("bash", "-c", dockerCommand)
    // CombinedOutput-->捕获异常跟命令输出的内容
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "", err
    }
    return string(output), nil
}
```

### 二、单元测试

``` go
package internal

import "testing"

func TestOutputDockerImage(t *testing.T) {
    type args struct {
        imageTagName string
    }
    tests := []struct {
        name    string
        args    args
        want    string
        wantErr bool
    }{
        {
            name: "test output images",
            args: args{
                imageTagName: "nginx:1.14-alpine",
            },
            want:    "",
            wantErr: false,
        },
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := downloadDockerImage(tt.args.imageTagName)
            if err != nil {
                t.Fatal(err)
            }
            t.Log(got)
        })
    }
}
```