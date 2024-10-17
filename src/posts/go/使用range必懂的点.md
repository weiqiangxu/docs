---
title: 使用range必懂的点
index_img: /images/bg/文章通用.png
tags:
  - golang
categories:
  - golang
date: 2021-04-11 09:40:12
excerpt: 使用range时候容易遗漏的点，就是range list之中的item地址是不可用的
hide: false
---

1. code

```golang
type User struct {
	Name string `json:"name"`
}

func GetUser() ([]*User, []User) {
	var list []User
	list = append(list, User{
		Name: "1",
	})
	list = append(list, User{
		Name: "2",
	})
	list = append(list, User{
		Name: "3",
	})
	var z []*User
	var y []User
	for _, v := range list {
		if v.Name == "1" {
			z = append(z, &v) // $v 的地址在一次 range 之中唯一不变的
			y = append(y, v)
		}
	}
	return z, y
}
```

2. unit test

```golang
func TestGetUser(t *testing.T) {
	tests := []struct {
		name  string
		want  []*User
		want1 []User
	}{
		{
			name:  "",
			want:  nil,
			want1: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, got1 := GetUser()
			for _, v := range got {
				t.Logf("got=%+v", v)
			}
			for _, v := range got1 {
				t.Logf("got1=%+v", v)
			}
		})
	}
}
```
