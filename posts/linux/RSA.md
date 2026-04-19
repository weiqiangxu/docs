# RSA 加密算法

## 一、加密体系概述

在日常设计及开发中，为确保数据传输和数据存储的安全，可通过特定的算法，将数据明文加密成复杂的密文。目前主流加密手段大致可分为**单向加密**和**双向加密**。

```mermaid
graph TB
    A[加密体系] --> B[单向加密]
    A --> C[双向加密]
    
    C --> D[对称加密]
    C --> E[非对称加密]
    
    B --> B1[MD5]
    B --> B2[SHA]
    B --> B3[Base64]
    
    D --> D1[DES]
    D --> D2[3DES]
    D --> D3[AES]
    D --> D4[RC4]
    
    E --> E1[RSA]
    E --> E2[DSA]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px
    style D fill:#bfb,stroke:#333,stroke-width:2px
    style E fill:#bfb,stroke:#333,stroke-width:2px
```

| 加密类型 | 特点 | 算法代表 |
|----------|------|----------|
| **单向加密** | 密文不可逆推还原 | MD5, SHA, Base64 |
| **对称加密** | 加解密使用相同密钥 | DES, 3DES, AES, RC4 |
| **非对称加密** | 公钥加密，私钥解密 | RSA, DSA |

### 1.1 单向加密

通过对数据进行摘要计算生成密文，密文不可逆推还原。主要用于数据完整性校验和密码存储。

### 1.2 对称加密

指数据使用者必须拥有相同的密钥才可以进行加密解密，就像彼此约定的一串暗号。

### 1.3 非对称加密

非对称加密需要公开密钥和私有密钥两组密钥：
- **公钥加密**：只有对应的私钥才能解密
- **私钥签名**：用公钥可以解密，用于验证消息来源和完整性

## 二、私钥公钥生成

### 2.1 OpenSSL 命令行生成

```bash
# 生成原始 RSA私钥文件 rsa_private_key.pem
openssl genrsa -out rsa_private_key.pem 1024

# RSA私钥转换为pkcs8格式
openssl pkcs8 -topk8 -inform PEM -in rsa_private_key.pem -outform PEM -nocrypt -out private_key.pem

# 生成RSA公钥 rsa_public_key.pem
openssl rsa -in rsa_private_key.pem -pubout -out rsa_public_key.pem
```

### 2.2 密钥格式说明

```mermaid
flowchart LR
    A[PKCS1格式] -->|BEGIN RSA PRIVATE KEY| B[私钥文件]
    C[PKCS8格式] -->|BEGIN PRIVATE KEY| B
    
    D[公钥格式] -->|BEGIN PUBLIC KEY| E[公钥文件]
```

| 格式 | 文件头 | 说明 |
|------|--------|------|
| PKCS1 | `BEGIN RSA PRIVATE KEY` | 传统格式 |
| PKCS8 | `BEGIN PRIVATE KEY` | 更通用的格式 |
| 公钥 | `BEGIN PUBLIC KEY` | X.509格式 |

### 2.3 公钥加密 vs 私钥加密

```mermaid
flowchart LR
    subgraph 公钥加密场景
        A1[发送方] -->|使用接收方公钥加密| B1[加密数据]
        B1 -->|只有私钥能解密| A2[接收方]
    end
    
    subgraph 私钥签名场景
        B1[发送方] -->|使用私钥签名| C1[数字签名]
        C1 -->|公钥验证签名| C2[接收方]
    end
```

- **公钥加密**：只有用私钥能解密，用于保密消息内容
- **私钥加密**：用公钥可以解密，用于生成数字签名，验证消息来源和完整性

## 三、Golang 使用 RSA 加密数据

### 3.1 基础加密实现

```go
package main

import (
    "crypto/rand"
    "crypto/rsa"
    "crypto/x509"
    "encoding/pem"
    "fmt"
    "os"
)

func main() {
    GenerateRSAKey(1024)
    publicPath := "public.pem"
    privatePath := "private.pem"

    txt := []byte("hello")
    encrptTxt := RSA_Encrypt(txt, publicPath)
    decrptCode := RSA_Decrypt(encrptTxt, privatePath)
    fmt.Println(string(decrptCode))
}

// GenerateRSAKey 生成RSA私钥和公钥，保存到文件中
func GenerateRSAKey(bits int) {
    privateKey, err := rsa.GenerateKey(rand.Reader, bits)
    if err != nil {
        panic(err)
    }
    
    // 保存私钥（PKCS8格式）
    X509PrivateKey, err := x509.MarshalPKCS8PrivateKey(privateKey)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(0)
    }
    
    privateFile, _ := os.Create("private.pem")
    defer privateFile.Close()
    privateBlock := pem.Block{Type: "PRIVATE KEY", Bytes: X509PrivateKey}
    pem.Encode(privateFile, &privateBlock)
    
    // 保存公钥
    publicKey := privateKey.PublicKey
    X509PublicKey, err := x509.MarshalPKIXPublicKey(&publicKey)
    if err != nil {
        panic(err)
    }
    
    publicFile, _ := os.Create("public.pem")
    defer publicFile.Close()
    publicBlock := pem.Block{Type: "Public Key", Bytes: X509PublicKey}
    pem.Encode(publicFile, &publicBlock)
}

// RSA_Encrypt RSA加密
func RSA_Encrypt(plainText []byte, path string) []byte {
    file, err := os.Open(path)
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    info, _ := file.Stat()
    buf := make([]byte, info.Size())
    file.Read(buf)
    
    block, _ := pem.Decode(buf)
    publicKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
    if err != nil {
        panic(err)
    }
    
    publicKey := publicKeyInterface.(*rsa.PublicKey)
    cipherText, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, plainText)
    if err != nil {
        panic(err)
    }
    
    return cipherText
}

// RSA_Decrypt RSA解密
func RSA_Decrypt(cipherText []byte, path string) []byte {
    file, err := os.Open(path)
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    info, _ := file.Stat()
    buf := make([]byte, info.Size())
    file.Read(buf)
    
    block, _ := pem.Decode(buf)
    privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(0)
    }
    
    plainText, _ := rsa.DecryptPKCS1v15(rand.Reader, privateKey.(*rsa.PrivateKey), cipherText)
    return plainText
}
```

### 3.2 分块加密实现

由于 RSA 加密有长度限制，需要对数据进行分块处理：

```go
package main

import (
    "bytes"
    "crypto/rand"
    "crypto/rsa"
    "crypto/x509"
    "encoding/base64"
    "encoding/pem"
    "fmt"
    "os"
)

// RsaEncryptBlock 公钥加密-分段
func RsaEncryptBlock(src []byte, path string) (bytesEncrypt []byte, err error) {
    file, err := os.Open(path)
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    info, _ := file.Stat()
    buf := make([]byte, info.Size())
    file.Read(buf)
    
    block, _ := pem.Decode(buf)
    publicKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
    if err != nil {
        panic(err)
    }
    
    publicKey := publicKeyInterface.(*rsa.PublicKey)
    keySize, srcSize := publicKey.Size(), len(src)
    once := keySize - 11 // PKCS1Padding 占用11字节
    
    var buffer bytes.Buffer
    for offset := 0; offset < srcSize; offset += once {
        endIndex := offset + once
        if endIndex > srcSize {
            endIndex = srcSize
        }
        
        bytesOnce, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, src[offset:endIndex])
        if err != nil {
            return nil, err
        }
        buffer.Write(bytesOnce)
    }
    
    return buffer.Bytes(), nil
}

// RSA_Decrypts RSA解密支持分段解密
func RSA_Decrypts(cipherText []byte, path string) []byte {
    file, err := os.Open(path)
    if err != nil {
        panic(err)
    }
    defer file.Close()
    
    info, _ := file.Stat()
    buf := make([]byte, info.Size())
    file.Read(buf)
    
    block, _ := pem.Decode(buf)
    privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(0)
    }
    
    p := privateKey.(*rsa.PrivateKey)
    keySize := p.Size()
    srcSize := len(cipherText)
    
    var buffer bytes.Buffer
    for offset := 0; offset < srcSize; offset += keySize {
        endIndex := offset + keySize
        if endIndex > srcSize {
            endIndex = srcSize
        }
        
        bytesOnce, err := rsa.DecryptPKCS1v15(rand.Reader, p, cipherText[offset:endIndex])
        if err != nil {
            return nil
        }
        buffer.Write(bytesOnce)
    }
    
    return buffer.Bytes()
}
```

### 3.3 RSA 加密参数说明

| 参数 | 说明 |
|------|------|
| `RSA/ECB/PKCS1Padding` | 算法/模式/填充方式 |
| `keySize` | 密钥长度（1024/2048/4096） |
| `once = keySize - 11` | 单次加密最大字节数 |
| `PKCS8` | 更通用的私钥格式 |

## 四、Java 使用 RSA 加密

### 4.1 RSA 工具类

```java
package com.example.utils;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import java.security.*;

public class RSAUtils {
    private static final String TRANSFORMATION = "RSA/ECB/PKCS1Padding";

    public static String encryptRSA(Key publicKey, String text) {
        try {
            Cipher rsa = Cipher.getInstance(TRANSFORMATION);
            rsa.init(Cipher.ENCRYPT_MODE, publicKey);
            byte[] originBytes = text.getBytes();
            int subLength = originBytes.length / 117 + (originBytes.length % 117 == 0 ? 0 : 1);
            byte[] finalByte = new byte[128 * subLength];
            
            for (int i = 0; i < subLength; i++) {
                int len = i == subLength - 1 ? (originBytes.length - i * 117) : 117;
                byte[] doFinal = rsa.doFinal(originBytes, i * 117, len);
                System.arraycopy(doFinal, 0, finalByte, i * 128, doFinal.length);
            }
            return Base64.getEncoder().encodeToString(finalByte);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public static String decryptRSA(Key privateKey, String content) {
        try {
            byte[] text = Base64.getDecoder().decode(content);
            Cipher rsa = Cipher.getInstance(TRANSFORMATION);
            rsa.init(Cipher.DECRYPT_MODE, privateKey);
            int subLength = text.length / 128;
            StringBuilder result = new StringBuilder();
            
            for (int i = 0; i < subLength; i++) {
                result.append(new String(rsa.doFinal(text, i * 128, 128), StandardCharsets.UTF_8));
            }
            return result.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public static PublicKey readPublicKey(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024 * 4];
        int n;
        while (-1 != (n = input.read(buffer))) {
            output.write(buffer, 0, n);
        }
        
        String publicPEM = output.toString()
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replaceAll(System.lineSeparator(), "")
            .replace("-----END PUBLIC KEY-----", "");
        
        X509EncodedKeySpec spec = new X509EncodedKeySpec(
            Base64.getMimeDecoder().decode(publicPEM.getBytes(StandardCharsets.UTF_8)));
        
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return kf.generatePublic(spec);
    }

    public static PrivateKey readPrivateKey(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024 * 4];
        int n;
        while (-1 != (n = input.read(buffer))) {
            output.write(buffer, 0, n);
        }
        
        String privateKeyPEM = output.toString()
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replaceAll(System.lineSeparator(), "")
            .replace("-----END PRIVATE KEY-----", "");
        
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(
            java.util.Base64.getDecoder().decode(privateKeyPEM.getBytes(StandardCharsets.UTF_8)));
        
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return kf.generatePrivate(spec);
    }
}
```

### 4.2 Maven 依赖

```xml
<dependency>
   <groupId>cn.hutool</groupId>
   <artifactId>hutool-all</artifactId>
   <version>5.7.5</version>
</dependency>
```

## 五、相关资料

- [RSA私钥公钥在线生成工具](https://www.hlytools.top/tools/rsa.html)
- [一文读懂RSA算法原理](https://zhuanlan.zhihu.com/p/75291280)