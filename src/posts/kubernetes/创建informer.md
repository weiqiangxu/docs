---
hide: true
---


### lease infomer


``` golang
package main

import (
	"context"
	apiCoordinationV1 "k8s.io/api/coordination/v1"
	coordinationV1 "k8s.io/client-go/informers/coordination/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"log"
	"path/filepath"
	"time"
)

func buildConfig() (*kubernetes.Clientset, error) {

	var kubeConfigFile string
	if home := homedir.HomeDir(); home != "" {
		kubeConfigFile = filepath.Join(home, ".kube", "config")
	}
	restConfig, err := clientcmd.BuildConfigFromFlags("", kubeConfigFile)
	if err != nil {
		return nil, err
	}

	clientSet, err := kubernetes.NewForConfig(restConfig)

	return clientSet, nil
}

func main() {

	client, err := buildConfig()
	if err != nil {
		log.Fatal(err)
	}

	indexer := cache.Indexers{"name": func(obj interface{}) ([]string, error) {
		lease, ok := obj.(*apiCoordinationV1.Lease)
		if !ok {
			return nil, nil
		}

		return []string{lease.Name}, nil
	}}
	informer := coordinationV1.NewLeaseInformer(client, "kube-system", 0, indexer)

	go informer.Run(context.Background().Done())

	time.Sleep(time.Second * 5)

	list := informer.GetStore().List()
	log.Println(len(list))

	leaseObj, err := informer.GetIndexer().ByIndex("name", "my-lease")
	if err != nil {
		log.Fatal(err)
	}

	z := *leaseObj[0].(*apiCoordinationV1.Lease)
	log.Println(z.Spec.HolderIdentity)
}
```

### lease 

``` golang
package main

import (
	"context"
	"k8s.io/client-go/util/homedir"
	"log"
	"os"
	"path/filepath"
	"time"

	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/leaderelection"
	"k8s.io/client-go/tools/leaderelection/resourcelock"
)

func buildConfig() (*kubernetes.Clientset, error) {
	// ~/.kube/config
	var kubeConfigFile string
	if home := homedir.HomeDir(); home != "" {
		kubeConfigFile = filepath.Join(home, ".kube", "config")
	}
	restConfig, err := clientcmd.BuildConfigFromFlags("", kubeConfigFile)
	if err != nil {
		return nil, err
	}

	clientSet, err := kubernetes.NewForConfig(restConfig)

	return clientSet, nil
}

func main() {

	var leaseLockName = "my-lease"
	var leaseLockNamespace = "my-namespace"
	var id = "lease-holder-name1"

	client, err := buildConfig()
	if err != nil {
		log.Fatal(err)
	}

	// 我们使用Lease锁类型，因为对租约的编辑不太常见，并且集群中监视“所有租约”的对象较少
	// 启动领导人选举代码循环
	leaderelection.RunOrDie(context.Background(), leaderelection.LeaderElectionConfig{
		Lock: &resourcelock.LeaseLock{
			LeaseMeta: metaV1.ObjectMeta{
				Name:      leaseLockName,
				Namespace: leaseLockNamespace,
			},
			Client: client.CoordinationV1(),
			LockConfig: resourcelock.ResourceLockConfig{
				Identity: id,
			},
		},

		// 设置为true的时候
		// 表示续租或者选举失败的时候
		// 如果当前是leader
		// client-go会自动释放相关资源，如leader election的锁和租约
		ReleaseOnCancel: true,

		// 租约持续时间,占据租约后在时间T内占有租约
		LeaseDuration: 6 * time.Second,

		// 续约截止时间,占据租约后,在这个时间段以内重新续约不用参与抢锁
		RenewDeadline: 4 * time.Second,

		// 客户端抢占租约间隔等待时间
		RetryPeriod: 2 * time.Second,

		// 某些生命周期事件期间触发回调
		Callbacks: leaderelection.LeaderCallbacks{
			OnStartedLeading: func(ctx context.Context) {
				// 当前节点成功当选master时触发
				func(ctx context.Context) {
					log.Println("i got lease lock,i am leader...")
					select {}
				}(context.Background())

			},
			OnStoppedLeading: func() {
				// 当前节点失去master资格时触发
				log.Printf("leader lost: %s\n", id)
				os.Exit(0)
			},
			OnNewLeader: func(identity string) {
				// 集群中选出了master时触发
				if identity == id {
					return
				}
				log.Printf("new leader elected: %s\n", identity)
			},
		},
	})

	log.Println("lease done")

	time.Sleep(time.Hour)
}
```


### 一些工具库

``` golang 
ctx := context.Background()
wait.Until(func() {
	// 无限循环
	log.Println(2)
}, time.Second*2, ctx.Done())

ctx, cancel := context.WithCancel(ctx)
i := 1
wait.JitterUntil(func() {
	// 循环至i=5
	i++
	if i == 3 {
		return
	}
	log.Println(i)
	if i == 5 {
		cancel()
	}
}, time.Second*2, 1.2, true, ctx.Done())
```