---
hide: true
---
# gitlab

1. 一个很简答的流水线
```
stages:
  - build
  - deploy

image: alpine

build:
  stage: build
  tags :
    - test
  script:
    - echo "build success"

deploy:
  stage: deploy
  tags :
    - test
  script:
    - echo "deploy success"
```