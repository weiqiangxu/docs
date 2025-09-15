# Reflect的性能

### 反射的用途

1. 对象创建

```
reflect.New(reflect.TypeOf(Config{})).Interface().(*Config)
```

2. 对象字段值修改

```
ins := reflect.New(reflect.TypeOf(Config{})).Elem()

# index 访问
ins.Field(0).SetString("name")
# 字段名访问
ins.FieldByName("Name").SetString("name")


# 性能比较
FieldByName 逐个遍历时间复杂度 O(n)
Field(index) 时间复杂度 O(1)
```


### 避免使用反射比如 json.Marshal 和 json.UnMarshal 

- [easyJSON](https://github.com/mailru/easyjson)