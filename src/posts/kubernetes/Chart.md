---
hide: true
---
# chart


### 创建Chart
```
helm create mychart

ls -la mychart/templates/
```

```
touch mychart/templates/configmap.yaml
```

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-configmap
data:
  myvalue: "Hello World"
```

### install自定义chart
```
helm install full-coral ./mychart

# 查看
helm get manifest full-coral

# 卸载发布
helm uninstall full-coral
```

