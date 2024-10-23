---
title: 优雅地拼接URL
tags:
  - golang
categories:
  - golang
---

### 一、代码

``` go
package tool

import (
	"errors"
	"fmt"
	"net/url"
	"reflect"
)

// QueryRange 范围查找结构体
type QueryRange struct {
	Query string `json:"query"`
	Start int64  `json:"start"`
	End   int64  `json:"end"`
	Step  int    `json:"step"`
}

// GetStructTag 获取结构体标签
func GetStructTag(s interface{}) (map[string]string, error) {
	getValue := reflect.ValueOf(s)
	if getValue.Kind() != reflect.Struct {
		return nil, errors.New("not struct")
	}
	getType := reflect.TypeOf(s)
	t := map[string]string{}
	for i := 0; i < getValue.NumField(); i++ {
		t[getType.Field(i).Name] = getType.Field(i).Tag.Get("json")
	}
	return t, nil
}

// BuildURLByStruct build url
func BuildURLByStruct(path string, queryRange *QueryRange) (string, error) {
	if queryRange == nil {
		return "", errors.New("query range is nil")
	}
	tagMap, err := GetStructTag(*queryRange)
	if err != nil {
		return "", err
	}
	getValue := reflect.ValueOf(*queryRange)
	urlParamMap := url.Values{}
	for k, v := range tagMap {
		urlParamMap.Set(v, fmt.Sprintf("%v", getValue.FieldByName(k).Interface()))
	}
	base, err := url.Parse(path)
	if err != nil {
		return "", err
	}
	base.RawQuery = urlParamMap.Encode()
	return base.String(), nil
}

```

### 二、单元测试

``` go
func TestBuildURLByStruct(t *testing.T) {
	type args struct {
		path       string
		queryRange *QueryRange
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "build url",
			args: args{
				path: "www.baidu.com",
				queryRange: &QueryRange{
					Query: "cpu_counter",
					Start: 1,
					End:   2,
					Step:  15,
				},
			},
			want:    "",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := BuildURLByStruct(tt.args.path, tt.args.queryRange)
			if err != nil {
				t.Fatal(err)
			}
			t.Log(got)
		})
	}
}
```
### 三、输出结果

``` txt
config_test.go:74: www.baidu.com?end=2&query=cpu_counter&start=1&step=15
```

### 开源包推荐

- [github.com/google/go-querystring](https://github.com/google/go-querystring)
- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)