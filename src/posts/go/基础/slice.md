# slice

### 一、底层数据结构

```go
// runtime/slice.go
type slice struct {
    // 底层是数组
	array unsafe.Pointer
	// 长度
    len   int
    // 容量
    // 扩容是2倍速扩容当大于1024的时候1.25倍速扩容
	cap   int
}
```

### 使用Range循环的陷阱

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
