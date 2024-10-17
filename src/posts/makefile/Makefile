# 定义变量从go.mod之中获取
PROJECT_NAME := $(shell grep 'module ' go.mod | awk '{print $$2}' | sed 's/cod.tencent.cn\///g')
# 定义name名称 - 剥离文件路径保留文件名
NAME := $(notdir $(PROJECT_NAME))
NEW_NAME :=$(shell echo $(NAME) | tr '_' '-')
# 当前时间
NOW := $(shell date +'%Y%m%d%H%M%S')
TAG := $(shell git describe --always --tags --abbrev=0 | tr -d "[\r\n]")
COMMIT := $(shell git rev-parse --short HEAD| tr -d "[ \r\n\']")
VERSION_PKG := cod.tencent.cn/backend/infra/gms/config
LD_FLAGS_BASE := -X $(VERSION_PKG).serviceName=$(NAME) -X $(VERSION_PKG).version=$(TAG)-$(COMMIT) -X $(VERSION_PKG).buildTime=$(shell date +%Y%m%d%H%M%S) -X main.version=$(TAG)-$(COMMIT) -X 'main.buildTime=$(shell date +%Y-%m-%d\ %H:%M:%S)'
LD_FLAGS := -s -w $(LD_FLAGS_BASE)

DEV_TAG := $(TAG)"-"$(COMMIT)"-dev"
RELEASE_VERSION := $(shell echo $(CI_COMMIT_BRANCH) | tr -d "[release/\r\n]")
RELEASE_TAG := "v"$(RELEASE_VERSION)"-"$(COMMIT)"-test"
RELEASE_LD_FLAGS_BASE := -X $(VERSION_PKG).serviceName=$(NAME) -X $(VERSION_PKG).version=$(RELEASE_TAG) -X $(VERSION_PKG).buildTime=$(shell date +%Y%m%d-%H%M%S) -X main.version=$(RELEASE_TAG) -X 'main.buildTime=$(shell date +%Y-%m-%d\ %H:%M:%S)'
RELEASE_LD_FLAGS := -s -w $(RELEASE_LD_FLAGS_BASE)

LOCAL_TAG := "local-"$(NOW)
LATEST_TAG := "latest"

IMPORTANT_GO_ENV_VARS := "GOPATH|GO111MODULE|GOARCH|GOCACHE|GOMODCACHE|GONOPROXY|GONOSUMDB|GOPRIVATE|GOPROXY|GOSUMDB|GOMOD|CGO"

TRI_USER_LOCAL := ""
TRI_PWD_LOCAL := ""
TRI_HOST_LOCAL := ""

DOCKER_IMAGE_LOCAL := $(TRI_HOST_LOCAL)/logic/local-$(NEW_NAME)
DOCKER_IMAGE_DEVELOP := $(TRI_HOST)/logic/develop-$(NEW_NAME)
DOCKER_IMAGE_TEST := $(TRI_HOST)/logic/test-$(NEW_NAME)
DOCKER_IMAGE_PROD := $(TRI_HOST)/logic/prod-$(NEW_NAME)
DEPLOY_DIR := $(HOME)/deploy
KUSTOMIZE_DIR := $(HOME)/kustomize

define DOCKERFILE

FROM mine.aliyuncs.com/public/baseimages:v0.1.0

COPY __BIN__ /usr/local/bin
CMD ["__BIN__"]

endef
export DOCKERFILE

.PHONY: build/binary
build/binary: export CGO_ENABLED=1
build/binary: export GOARCH=amd64
build/binary: export GOOS=linux
build/binary:
	@echo "\n###### building $(NAME)"
	@go env | grep -E $(IMPORTANT_GO_ENV_VARS)
	go build -trimpath -ldflags="$(LD_FLAGS)" -o $(NAME)

.PHONY: build/release-binary
build/release-binary: export CGO_ENABLED=1
build/release-binary:
	@echo "\n###### building $(NAME)"
	@go env | grep -E $(IMPORTANT_GO_ENV_VARS)
	go build -trimpath -ldflags="$(RELEASE_LD_FLAGS)" -o $(NAME)

.PHONY: build/tar
build/tar: build/binary
	@mv $(NAME) $(NAME)_$(NOW)
	@ln -sf $(NAME)_$(NOW) $(NAME) && \
        tar -zcf $(NAME).tar.gz $(NAME)_$(NOW) $(NAME) && \
        rm $(NAME) $(NAME)_$(NOW)

.PHONY: build/debug
build/debug:
	@echo "\n###### building debug binary $(NAME)"
	@go env | grep -E $(IMPORTANT_GO_ENV_VARS)
	@go version
	go build -gcflags "all=-N -l" -ldflags="$(LD_FLAGS_BASE)" -o $(NAME)

ci/binary: build/ensureGoPath
ci/binary: export GOPATH=$(abspath go)
ci/binary: export GO111MODULE=on
ci/binary: export GOPROXY=https://goproxy.cn
ci/binary: export GOPRIVATE=cod.tencent.cn
ci/binary: export GOOS=linux
ci/binary: export CGO_ENABLED=1
ci/binary: build/binary

ci/release-binary: build/ensureGoPath
ci/release-binary: export GOPATH=$(abspath go)
ci/release-binary: export GO111MODULE=on
ci/release-binary: export GOPROXY=https://goproxy.cn
ci/release-binary: export GOPRIVATE=cod.tencent.cn
ci/release-binary: export GOOS=linux
ci/release-binary: export CGO_ENABLED=1
ci/release-binary: build/release-binary


.SECONDARY: $(wildcard Dockerfile)
Dockerfile:
	@mkdir -p $(@D)
	@echo "$$DOCKERFILE" \
        | sed -e 's|__BIN__|$(NAME)|g' \
        > $@

.PHONY: build/ensureGoPath
build/ensureGoPath:
	@$(shell if [ ! -d go ]; then mkdir go;fi)

.PHONY: local-cicd
local-cicd: build/binary Dockerfile
	@docker build -q -t $(DOCKER_IMAGE_LOCAL):$(LOCAL_TAG) .
	@docker login -u $(TRI_USER_LOCAL) -p $(TRI_PWD_LOCAL) $(TRI_HOST_LOCAL)
	@docker push $(DOCKER_IMAGE_LOCAL):$(LOCAL_TAG)
	@rm $(NAME) Dockerfile
	@cd $(KUSTOMIZE_DIR)/test/overlays/$(NAME) && git pull &&\
	kustomize edit set image default_image=$(DOCKER_IMAGE_LOCAL):$(LOCAL_TAG) &&\
	git add . &&\
	git commit -am "update $(PROJECT_NAME) test kustomize config " &&\
	git pull &&\
	git push origin main || sleep 1 && git pull && git push origin main || echo "nothing to commit"


build-k8s-develop: ci/binary Dockerfile
	@docker login -u $(TRI_USER) -p $(TRI_PWD) $(TRI_HOST)
	@docker build -q -t $(DOCKER_IMAGE_DEVELOP):$(DEV_TAG) .
	@docker push $(DOCKER_IMAGE_DEVELOP):$(DEV_TAG)
	@rm $(NAME) Dockerfile

build-k8s/release: ci/release-binary Dockerfile
	@docker login -u $(TRI_USER) -p $(TRI_PWD) $(TRI_HOST)
	@docker build -q -t $(DOCKER_IMAGE_TEST):$(RELEASE_TAG) .
	@docker push $(DOCKER_IMAGE_TEST):$(RELEASE_TAG)
	@rm $(NAME) Dockerfile

build-k8s/prod: ci/binary Dockerfile
	@docker login -u $(TRI_USER) -p $(TRI_PWD) $(TRI_HOST)
	@docker build -q -t $(DOCKER_IMAGE_PROD):$(TAG) .
	@docker tag $(DOCKER_IMAGE_PROD):$(TAG) $(DOCKER_IMAGE_PROD):$(LATEST_TAG)
	@docker push $(DOCKER_IMAGE_PROD):$(TAG)
	@docker push $(DOCKER_IMAGE_PROD):$(LATEST_TAG)
	@rm $(NAME) Dockerfile

deploy-k8s/develop:
	@cd /builds &&\
	git clone https://$(CI_USERNAME):$(CI_PASSWORD)@cod.tencent.cn/devops/kustomize.git &&\
	cd kustomize/develop/overlays/$(NAME) &&\
	/usr/local/bin/kustomize edit set image default_image=$(DOCKER_IMAGE_DEVELOP):$(DEV_TAG) &&\
	git add . &&\
	git commit -am "update $(PROJECT_NAME) develop kustomize config " &&\
	git pull &&\
	git push origin main || sleep 1 && git pull && git push origin main || echo "nothing to commit" &&\
	echo y | /usr/local/bin/argocd --grpc-web --insecure login argocd-server.argocd.svc.cluster.local:80  --username $(ARGO_USER) --password $(ARGO_PWD) &&\
	/usr/local/bin/argocd  app sync $(NEW_NAME) || echo "argo sync failed"

deploy-k8s/release:
	@cd /builds &&\
	git clone https://$(CI_USERNAME):$(CI_PASSWORD)@cod.tencent.cn/devops/kustomize.git &&\
	cd kustomize/test/overlays/$(NAME) &&\
	/usr/local/bin/kustomize edit set image default_image=$(DOCKER_IMAGE_TEST):$(RELEASE_TAG) &&\
	git add . &&\
	git commit -am "update $(PROJECT_NAME) test kustomize config " &&\
	git pull &&\
	git push origin main || sleep 1 && git pull && git push origin main || echo "nothing to commit" &&\
	echo y | /usr/local/bin/argocd --grpc-web --insecure login argocd-server.argocd.svc.cluster.local:80 --username $(ARGO_USER) --password $(ARGO_PWD) &&\
	/usr/local/bin/argocd app sync $(NEW_NAME) || echo "argo sync failed"

deploy-k8s/prod:
	@cd /builds &&\
	git clone https://$(CI_USERNAME):$(CI_PASSWORD)@cod.tencent.cn/devops/kustomize-prod.git &&\
	cd kustomize-prod/overlays/$(NAME) &&\
	/usr/local/bin/kustomize edit set image default_image=$(DOCKER_IMAGE_PROD):$(TAG) &&\
	git add . &&\
	git commit -am "update $(PROJECT_NAME) prod kustomize config " &&\
	git pull &&\
	git push origin main || sleep 1 && git pull && git push origin main || echo "nothing to commit"

clean:
	@rm -f $(NAME)
	@rm -f $(NAME).tar.gz

fmt:
	command -v gofumpt || (WORK=$(shell pwd) && cd /tmp && GO111MODULE=on go install mvdan.cc/gofumpt@latest && cd $(WORK))
	gofumpt -w -d .

lint:
	command -v golangci-lint || (WORK=$(shell pwd) && cd /tmp && GO111MODULE=on go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.49.0 && cd $(WORK))
	golangci-lint run  -v

ci/lint: export GOPATH=/go
ci/lint: export GO111MODULE=on
ci/lint: export GOPROXY=https://goproxy.cn
ci/lint: export GOPRIVATE=cod.tencent.cn
ci/lint: export GOOS=linux
ci/lint: export CGO_ENABLED=1
ci/lint: lint


update:
	@curl -Ls https://cod.tencent.cn/snippets/1/raw > Makefile
	@curl -Ls https://cod.tencent.cn/snippets/2/raw > .gitlab-ci.yml
	@curl -Ls https://cod.tencent.cn/snippets/3/raw > .golangci.toml
