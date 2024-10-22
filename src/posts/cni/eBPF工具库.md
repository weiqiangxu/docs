---
title: eBPF工具库
tags:
  - kubernetes
categories:
  - kubernetes
---

1. 工具库

``` bash
$ go get github.com/cilium/ebpf
```

[https://pkg.go.dev/github.com/cilium/ebpf](https://pkg.go.dev/github.com/cilium/ebpf)

2. 示例

``` golang
package ebpf_example

import (
	"context"
	"fmt"
	"github.com/cilium/ebpf"
	"github.com/rodaine/table"
	"golang.org/x/sys/unix"
	"os"
	"unsafe"
)

const (
	NodeMapName       = "my_node"
	NodeMapMaxEntries = 65536
	MapRoot           = "/sys/fs/bpf/tc/globals/"
)

type NodeMap struct {
	*ebpf.Map
}

func NewNodeMap() *NodeMap {
	return &NodeMap{}
}

type NodeMapKey struct {
	NodeId uint32  `align:"node_id"`
	Type   AuxType `align:"type"`
}

type NodeMapValue struct {
	Value1 uint32 `align:"value1"`
	Value2 uint32 `align:"value2"`
	Value3 uint64 `align:"value3"`
}

// GetBaseHashMapSpec 获取bpf spec对象
func GetBaseHashMapSpec(name string, keySize uint32, valueSize uint32, maxEntries uint32) *ebpf.MapSpec {
	spec := &ebpf.MapSpec{
		Name:       name,
		Type:       ebpf.Hash,
		MaxEntries: maxEntries,
		Flags:      unix.BPF_F_NO_PREALLOC,
		KeySize:    keySize,
		Pinning:    ebpf.PinByName,
		ValueSize:  valueSize,
	}
	if spec.Type == ebpf.HashOfMaps {
		spec.InnerMap = nil
	}
	return spec
}

func NewBpfMap(spec *ebpf.MapSpec) (*ebpf.Map, error) {
	//check root dir
	if _, err := os.Stat(MapRoot); os.IsNotExist(err) {
		if err := os.MkdirAll(MapRoot, 0755); err != nil {
			return nil, fmt.Errorf("create bpf map directory fail: %s", err)
		}
	}

	//check map exist
	filePath := MapRoot + spec.Name
	isExist := true
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		isExist = false
	}

	//create map
	var ebpfMap *ebpf.Map
	var err error
	if !isExist {
		ebpfMap, err = ebpf.NewMapWithOptions(spec, ebpf.MapOptions{PinPath: MapRoot})
		if err != nil {
			return nil, err
		}
	} else {
		ebpfMap, err = ebpf.LoadPinnedMap(filePath, nil)
		if err != nil {
			return nil, err
		}
	}

	return ebpfMap, nil
}

func (m *NodeMap) InitMap() error {
	keySize := uint32(unsafe.Sizeof(NodeMapKey{}))
	valueSize := uint32(unsafe.Sizeof(NodeMapValue{}))
	mapSpc := GetBaseHashMapSpec(NodeMapName, keySize, valueSize, NodeMapMaxEntries)
	bm, err := NewBpfMap(mapSpc)
	if err != nil {
		return err
	}
	m.Map = bm
	return nil
}

func (m *NodeMap) Start(ctx context.Context) error {
	return nil
}

type AuxType uint32

const (
	DhcpRelayDev AuxType = 0 // 节点上的dhcp_relay设备
	BroadcastDev AuxType = 1 // 节点上的b cast设备
	MulticastDev AuxType = 2 // 节点上的m cast设备
	RouterDev    AuxType = 3 // 节点上的router设备
	MirrorDev    AuxType = 4 // 节点上的mirror设备
	MirrorIp     AuxType = 5 // 节点提供的mirror IP
	InnerIp      AuxType = 6 // 节点提供的内部通信的IP（东西口IP）
)

func (m *NodeMap) Insert(nodeId uint32, typ AuxType, value1 uint32, value2 uint32, value3 uint64) error {
	key := NodeMapKey{NodeId: nodeId, Type: typ}
	val := NodeMapValue{Value1: value1, Value2: value2, Value3: value3}
	err := m.Map.Put(key, val)
	if err != nil {
		return err
	}
	return nil
}

func (m *NodeMap) Delete(nodeId uint32, typ AuxType) error {
	key := NodeMapKey{NodeId: nodeId, Type: typ}
	err := m.Map.Delete(key)
	if err != nil {
		return err
	}
	return nil
}

func (m *NodeMap) Dump() {
	iterator := m.Iterate()
	tbl := table.New("node_id", "key_type", "value1", "value2", "value3")
	for {
		var key NodeMapKey
		var value NodeMapValue
		if !iterator.Next(&key, &value) {
			break
		}
		tbl.AddRow(key.NodeId, key.Type, value.Value1, value.Value2, value.Value3)
	}
	tbl.Print()
}
```


``` golang
package ebpf_example

import (
	"github.com/cilium/ebpf"
	"github.com/cilium/ebpf/rlimit"
	"testing"
)

func TestNodeMap_Insert(t *testing.T) {
	if err := rlimit.RemoveMemlock(); err != nil {
		t.Fatal(err)
	}
	m := NewNodeMap()
	e := m.InitMap()
	if e != nil {
		t.Fatal(e)
	}
	type fields struct {
		Map *ebpf.Map
	}
	type args struct {
		nodeId uint32
		typ    AuxType
		value1 uint32
		value2 uint32
		value3 uint64
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			name: "",
			fields: fields{
				Map: nil,
			},
			args: args{
				nodeId: 1,
				typ:    MulticastDev,
				value1: 2,
				value2: 3,
				value3: 4,
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := m.Insert(tt.args.nodeId, tt.args.typ, tt.args.value1, tt.args.value2, tt.args.value3)
			if err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestNodeMap_Dump(t *testing.T) {
	m := NewNodeMap()
	e := m.InitMap()
	if e != nil {
		t.Fatal(e)
	}
	type fields struct {
		Map *ebpf.Map
	}
	tests := []struct {
		name   string
		fields fields
	}{
		{
			name:   "",
			fields: fields{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m.Dump()
		})
	}
}
```