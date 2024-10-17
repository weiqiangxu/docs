---
hide: true
---
# CI

[https://docs.gitlab.com/ee/ci/](https://docs.gitlab.com/ee/ci/)

[基本管道](https://docs.gitlab.com/ee/ci/pipelines/pipeline_architectures.html#basic-pipelines)

[gitlab_ci_yaml编写规则](https://docs.gitlab.cn/jh/ci/yaml/gitlab_ci_yaml.html)

[手把手教学编写gitlab-ci.yml文件以及应用](https://blog.csdn.net/qq_27759825/article/details/124691745)


### 大致步骤

1. 编写.gitlab-ci.yml文件

2. 通过tags和runner关联

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

3. k8s build && deploy
```
# 开发环境
build-k8s-develop:
  stage: build-k8s
  tags:
    - ack-runner
  script:
    - make build-k8s-develop
  cache:
    key: go-cache-${CI_PROJECT_PATH_SLUG}
    paths:
      - go/
  only:
    refs:
      - develop
      - /^feature\/.*/
```

```
build-k8s-develop: ci/binary Dockerfile
	@docker login -u $(TRI_USER) -p $(TRI_PWD) $(TRI_HOST)
	@docker build -q -t $(DOCKER_IMAGE_DEVELOP):$(DEV_TAG) .
	@docker push $(DOCKER_IMAGE_DEVELOP):$(DEV_TAG)
	@rm $(NAME) Dockerfile
```

```
deploy-k8s/develop:
	@cd /builds &&\
	git clone https://$(CI_USERNAME):$(CI_PASSWORD)@git.net/devops/kustomize.git &&\
	cd kustomize/develop/overlays/$(NAME) &&\
	/usr/local/bin/kustomize edit set image default_image=$(DOCKER_IMAGE_DEVELOP):$(DEV_TAG) &&\
	git add . &&\
	git commit -am "update $(PROJECT_NAME) develop kustomize config " &&\
	git pull &&\
	git push origin main || sleep 1 && git pull && git push origin main || echo "nothing to commit" &&\
	echo "xxxx->$(ARGO_HOST)" &&\
	echo y | /usr/local/bin/argocd --grpc-web --insecure login $(ARGO_HOST)  --username $(ARGO_USER) --password $(ARGO_PWD) &&\
	/usr/local/bin/argocd  app sync $(NEW_NAME) || echo "argo sync failed"
```

