# RSA

在日常设计及开发中，为确保数据传输和数据存储的安全，可通过特定的算法，将数据明文加密成复杂的密文。目前主流加密手段大致可分为单向加密和双向加密。

- 单向加密
    
    通过对数据进行摘要计算生成密文，密文不可逆推还原。算法代表：Base64，MD5，SHA; 

- 双向加密
    
    与单向加密相反，可以把密文逆推还原成明文，双向加密又分为对称加密和非对称加密。

- 对称加密

    指数据使用者必须拥有相同的密钥才可以进行加密解密，就像彼此约定的一串暗号。算法代表：DES，3DES，AES，IDEA，RC4，RC5;

- 非对称加密

    非对称加密需要公开密钥和私有密钥两组密钥，公开密钥和私有密钥是配对起来的，也就是说使用公开密钥进行数据加密，只有对应的私有密钥才能解密。如果知道了其中一个，并不能计算出另外一个。因此如果公开了一对密钥中的一个，并不会危害到另外一个密钥性质。这里把公开的密钥为公钥，不公开的密钥为私钥。算法代表：RSA，DSA。


### 一、私钥公钥生成

```bash
# 下载开源RSA密钥生成工具openssl（通常Linux系统都自带该程序）执行以下命令：

# 生成原始 RSA私钥文件 rsa_private_key.pem
$ openssl genrsa -out rsa_private_key.pem 1024

# RSA私钥转换为pkcs8格式
$ openssl pkcs8 -topk8 -inform PEM -in rsa_private_key.pem -outform PEM -nocrypt -out private_key.pem

# 生成RSA公钥 rsa_public_key.pem
$ openssl rsa -in rsa_private_key.pem -pubout -out rsa_public_key.pem
```

- [RSA私钥公钥在线生成(可选)](https://www.hlytools.top/tools/rsa.html)

- RSA用公钥加密和用私钥加密有什么不同

    公钥加密，只有用私钥能解密，私钥妥善保管，这种加密方式是安全的，常见的场景是发送方（如客户端）可以使用接收方（如服务器）公开的 RSA 公钥对消息进行加密。私钥加密，用公钥可以解密数据，通常不是为了保密消息内容，而是用于生成数字签名。数字签名用于验证消息的来源和完整性。更准确地说是对消息的摘要进行加密，可以验证消息在传输过程中没有被篡改，因为私钥只有发送方拥有，所以通过验证签名可以确保消息的真实性。

### 二、Golang使用RSA加密数据

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


func main(){

    // 加密和解密填充方式需要一致
    // x509.ParsePKCS8PrivateKey(block.Bytes) 解密 
    // x509.MarshalPKCS8PrivateKey(privateKey) 加密

    // RSA/ECB/PKCS1Padding
    // RSA是算法，ECB是分块模式，PKCS1Padding是填充模式

    // pkcs1私钥生成 openssl genrsa -out pkcs1.pem 1024 
    // pkcs1转pkcs8私钥 openssl pkcs8 -in pkcs8.pem -nocrypt -out pkcs1.pem

    // pkcs1 BEGIN RSA PRIVATE KEY
    // pkcs8 BEGIN PRIVATE KEY

    GenerateRSAKey(1024)
    publicPath := "/Users/xuweiqiang/nginx/www/php_rsa/public_key.pem"
    privatePath := "/Users/xuweiqiang/nginx/www/php_rsa/private_key.pem"

    publicPath = "public.pem"
    privatePath = "private.pem"

    txt := []byte("hello")
    encrptTxt := RSA_Encrypt(txt,publicPath)
    decrptCode := RSA_Decrypt(encrptTxt,privatePath)
    fmt.Println(string(decrptCode))
}

// GenerateRSAKey 生成RSA私钥和公钥，保存到文件中
func GenerateRSAKey(bits int){
    //GenerateKey函数使用随机数据生成器random生成一对具有指定字位数的RSA密钥
    //Reader是一个全局、共享的密码用强随机数生成器
    privateKey, err := rsa.GenerateKey(rand.Reader, bits)
    if err!=nil{
        panic(err)
    }
    //保存私钥
    //通过x509标准将得到的ras私钥序列化为ASN.1 的 DER编码字符串
    // X509PrivateKey := x509.MarshalPKCS1PrivateKey(privateKey) // PKCS1 和 9 是不一致的
    X509PrivateKey,err := x509.MarshalPKCS8PrivateKey(privateKey)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(0)
    }    
    //使用pem格式对x509输出的内容进行编码
    //创建文件保存私钥
    privateFile, err := os.Create("private.pem")
    if err!=nil{
        panic(err)
    }
    defer privateFile.Close()
    //构建一个pem.Block结构体对象
    privateBlock:= pem.Block{Type: "PRIVATE KEY",Bytes:X509PrivateKey}
    //将数据保存到文件
    pem.Encode(privateFile,&privateBlock)
    //保存公钥
    //获取公钥的数据
    publicKey:=privateKey.PublicKey
    //X509对公钥编码
    X509PublicKey,err:=x509.MarshalPKIXPublicKey(&publicKey)
    if err!=nil{
        panic(err)
    }
    //pem格式编码
    //创建用于保存公钥的文件
    publicFile, err := os.Create("public.pem")
    if err!=nil{
        panic(err)
    }
    defer publicFile.Close()
    //创建一个pem.Block结构体对象
    publicBlock:= pem.Block{Type: "Public Key",Bytes:X509PublicKey}
    //保存到文件
    pem.Encode(publicFile,&publicBlock)
}

// RSA_Encrypt RSA加密
func RSA_Encrypt(plainText []byte,path string)[]byte{
    //打开文件
    file,err:=os.Open(path)
    if err!=nil{
        panic(err)
    }
    defer file.Close()
    //读取文件的内容
    info, _ := file.Stat()
    buf:=make([]byte,info.Size())
    file.Read(buf)
    //pem解码
    block, _ := pem.Decode(buf)
    //x509解码
    publicKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
    if err!=nil{
        panic(err)
    }
    //类型断言
    publicKey:=publicKeyInterface.(*rsa.PublicKey)
    //对明文进行加密
    cipherText, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, plainText)
    if err!=nil{
        panic(err)
    }
    //返回密文
    return cipherText
}

// RSA_Decrypt RSA解密
func RSA_Decrypt(cipherText []byte,path string) []byte{
    //打开文件
    file,err:=os.Open(path)
    if err!=nil{
        panic(err)
    }
    defer file.Close()
    //获取文件内容
    info, _ := file.Stat()
    buf:=make([]byte,info.Size())
    file.Read(buf)
    //pem解码
    block, _ := pem.Decode(buf)
    //X509解码
    privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
    if err!=nil{
        fmt.Println(err.Error())
        os.Exit(0)
    }
    //对密文进行解密
    plainText,_:=rsa.DecryptPKCS1v15(rand.Reader,privateKey.(*rsa.PrivateKey),cipherText)
    //返回明文
    return plainText
}
```

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
    "log"
    "os"
)

// 分块加密
func main() {
    GenerateRSAKey(2048)
    publicPath := "public.pem"
    privatePath := "private.pem"
    var a = []byte("jack")
    encrptTxt, err := RsaEncryptBlock(a, publicPath)
    if err != nil {
        fmt.Println(err.Error())
    }
    encodeString := base64.StdEncoding.EncodeToString(encrptTxt)
    decodeByte, err := base64.StdEncoding.DecodeString(encodeString)
    if err != nil {
        panic(err)
    }
    decrptCode := RSA_Decrypts(decodeByte, privatePath)
    fmt.Println(string(decrptCode))
}

// GenerateRSAKey生成RSA私钥和公钥，保存到文件中
func GenerateRSAKey(bits int) {
    //GenerateKey函数使用随机数据生成器random生成一对具有指定字位数的RSA密钥
    //Reader是一个全局、共享的密码用强随机数生成器
    privateKey, err := rsa.GenerateKey(rand.Reader, bits)
    if err != nil {
        panic(err)
    }
    //保存私钥
    //通过x509标准将得到的ras私钥序列化为ASN.1 的 DER编码字符串
    // X509PrivateKey := x509.MarshalPKCS1PrivateKey(privateKey) // PKCS1 和 9 是不一致的
    X509PrivateKey, err := x509.MarshalPKCS8PrivateKey(privateKey)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(0)
    }
    //使用pem格式对x509输出的内容进行编码
    //创建文件保存私钥
    privateFile, err := os.Create("private.pem")
    if err != nil {
        panic(err)
    }
    defer privateFile.Close()
    //构建一个pem.Block结构体对象
    privateBlock := pem.Block{Type: "PRIVATE KEY", Bytes: X509PrivateKey}
    //将数据保存到文件
    pem.Encode(privateFile, &privateBlock)
    //保存公钥
    //获取公钥的数据
    publicKey := privateKey.PublicKey
    //X509对公钥编码
    X509PublicKey, err := x509.MarshalPKIXPublicKey(&publicKey)
    if err != nil {
        panic(err)
    }
    //pem格式编码
    //创建用于保存公钥的文件
    publicFile, err := os.Create("public.pem")
    if err != nil {
        panic(err)
    }
    defer publicFile.Close()
    //创建一个pem.Block结构体对象
    publicBlock := pem.Block{Type: "Public Key", Bytes: X509PublicKey}
    //保存到文件
    pem.Encode(publicFile, &publicBlock)
}

// RSA_Decrypts RSA解密支持分段解密
func RSA_Decrypts(cipherText []byte, path string) []byte {
    //打开文件
    var bytesDecrypt []byte
    file, err := os.Open(path)
    if err != nil {
        panic(err)
    }
    defer file.Close()
    //获取文件内容
    info, _ := file.Stat()
    buf := make([]byte, info.Size())
    file.Read(buf)
    //pem解码
    block, _ := pem.Decode(buf)
    //X509解码
    privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
    if err != nil {
        fmt.Println(err.Error())
        os.Exit(0)
    }
    p := privateKey.(*rsa.PrivateKey)
    keySize := p.Size()
    srcSize := len(cipherText)
    log.Println("密钥长度", keySize, "密文长度", srcSize)
    var offSet = 0
    var buffer = bytes.Buffer{}
    for offSet < srcSize {
        endIndex := offSet + keySize
        if endIndex > srcSize {
            endIndex = srcSize
        }
        bytesOnce, err := rsa.DecryptPKCS1v15(rand.Reader, p, cipherText[offSet:endIndex])
        if err != nil {
            return nil
        }
        buffer.Write(bytesOnce)
        offSet = endIndex
    }
    bytesDecrypt = buffer.Bytes()
    return bytesDecrypt
}

// RsaEncryptBlock 公钥加密-分段
func RsaEncryptBlock(src []byte, path string) (bytesEncrypt []byte, err error) {
    //打开文件
    file, err := os.Open(path)
    if err != nil {
        panic(err)
    }
    defer file.Close()
    //读取文件的内容
    info, _ := file.Stat()
    buf := make([]byte, info.Size())
    file.Read(buf)
    //pem解码
    block, _ := pem.Decode(buf)
    //x509解码
    publicKeyInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
    if err != nil {
        panic(err)
    }
    //类型断言
    publicKey := publicKeyInterface.(*rsa.PublicKey)
    keySize, srcSize := publicKey.Size(), len(src)
    log.Println("密钥长度", keySize, "明文长度", srcSize)
    offSet, once := 0, keySize-11
    buffer := bytes.Buffer{}
    for offSet < srcSize {
        endIndex := offSet + once
        if endIndex > srcSize {
            endIndex = srcSize
        }
        // 加密一部分
        bytesOnce, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, src[offSet:endIndex])
        if err != nil {
            return nil, err
        }
        buffer.Write(bytesOnce)
        offSet = endIndex
    }
    bytesEncrypt = buffer.Bytes()
    return
}
```

### 三、Java使用RSA加密

```java
package com.example.one.utils;

import cn.hutool.core.io.FileUtil;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import javax.crypto.Cipher;
import java.security.*;

public class RSAUtils {

    private static final String encrypt_file = "/Users/xuweiqiang/nginx/www/php_rsa/encrypt_file.txt";
    private static final String private_key = "/Users/xuweiqiang/nginx/www/php_rsa/private_key.pem";
    private static final String public_key = "/Users/xuweiqiang/nginx/www/php_rsa/public_key.pem";
    private static final String transformationCode = "RSA/ECB/PKCS1Padding";

    public static void main(String[] args) {
        byte[] encryptFile = FileUtil.readBytes(encrypt_file);
        String content = new String(encryptFile, StandardCharsets.UTF_8);
        PrivateKey p = null;
        try {
            p = readPrivateKey(private_key);
        } catch (IOException e) {
            e.printStackTrace();
        }
        String c = decryptRSA(p, content);
        System.out.println(c);
        PublicKey pbk = null;
        try {
            pbk = readPublicKey(public_key);
        } catch (IOException e) {
            e.printStackTrace();
        }
        String d = encryptRSA(pbk, "hello world");
        System.out.println(d);

    }

    // 返回 RSA 加密的结果
    public static String encryptRSA(Key publicKey, String text) {
        try {
            Cipher rsa = Cipher.getInstance(transformationCode);
            rsa.init(Cipher.ENCRYPT_MODE, publicKey);
            byte[] originBytes = text.getBytes();
            //大于117时进行分段 加密
            int subLength = originBytes.length / 117 + (originBytes.length % 117 == 0 ? 0 : 1);
            byte[] finalByte = new byte[128 * subLength];
            for (int i = 0; i < subLength; i++) {
                //需要加密的字节长度
                int len = i == subLength - 1 ? (originBytes.length - i * 117) : 117;
                //加密完成的字节数组
                byte[] doFinal = rsa.doFinal(originBytes, i * 117, len);
                //复制这次加密的数组
                System.arraycopy(doFinal, 0, finalByte, i * 128, doFinal.length);
            }
            return new String(Base64.getEncoder().encode(finalByte),
                    StandardCharsets.UTF_8);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    /**
     * 返回 RSA 解密的结果
     */
    public static String decryptRSA(Key privateKey, String content) {
        try {
            byte[] text = Base64.getDecoder().decode(content);
            Cipher rsa = Cipher.getInstance(transformationCode);
            rsa.init(Cipher.DECRYPT_MODE, privateKey);
            //大于128时进行分段 解密
            int subLength = text.length / 128;
            StringBuilder finalString = new StringBuilder();
            for (int i = 0; i < subLength; i++) {
                finalString.append(new String(rsa.doFinal(text, i * 128, 128), StandardCharsets.UTF_8));
            }
            return finalString.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }


    //根据文件路径返回公匙
    public static PublicKey readPublicKey(String filePath) throws IOException {
        return readPublicKey(new FileInputStream(filePath));
    }

    // 根据输入流返回公匙
    public static PublicKey readPublicKey(InputStream input) throws IOException {
        final ByteArrayOutputStream output = new ByteArrayOutputStream();
        int n;
        final byte[] buffer = new byte[1024 * 4];
        while (-1 != (n = input.read(buffer))) {
            output.write(buffer, 0, n);
        }
        String publicPEM = output.toString()
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replaceAll(System.lineSeparator(), "")
                .replace("-----END PUBLIC KEY-----", "");
        X509EncodedKeySpec spec =
                new X509EncodedKeySpec(Base64.getMimeDecoder().decode(publicPEM.getBytes(StandardCharsets.UTF_8)));
        try {
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePublic(spec);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            e.printStackTrace();
        }
        return null;
    }

    // 根据文件路径返回私匙
    public static PrivateKey readPrivateKey(String filePath) throws IOException {
        return readPrivateKey(new FileInputStream(filePath));
    }

    // 根据输入流返回私匙
    public static PrivateKey readPrivateKey(InputStream input) throws IOException {
        final ByteArrayOutputStream output = new ByteArrayOutputStream();
        int n;
        final byte[] buffer = new byte[1024 * 4];
        while (-1 != (n = input.read(buffer))) {
            output.write(buffer, 0, n);
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        String privateKeyPEM = output.toString()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replaceAll(System.lineSeparator(), "")
                .replace("-----END PRIVATE KEY-----", "");
        PKCS8EncodedKeySpec spec =
                new PKCS8EncodedKeySpec(org.apache.commons.codec.binary.Base64.decodeBase64(privateKeyPEM.getBytes(StandardCharsets.UTF_8)));
        try {
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            e.printStackTrace();
        }
        return null;
    }
}
```

```yaml
<dependency>
   <groupId>cn.hutool</groupId>
   <artifactId>hutool-all</artifactId>
   <version>5.7.5</version>
</dependency>
```

### 四、PHP使用RSA加解密


```php
// <-- RSA.class.php !-->
<?php
 
/**
 * RSA算法类
 * 签名及密文编码：base64字符串/十六进制字符串/二进制字符串流
 * 填充方式: PKCS1Padding（加解密）/NOPadding（解密）
 *
 * Notice:Only accepts a single block. Block size is equal to the RSA key size!
 * 如密钥长度为1024 bit，则加密时数据需小于128字节，加上PKCS1Padding本身的11字节信息，所以明文需小于117字节
 */
class RSA
{
    private $pubKey = null;
    private $priKey = null;
 
    /**
     * 构造函数
     */
    public function __construct()
    {
        // 需要开启openssl扩展
        if (!extension_loaded("openssl")) {
            $this->_error("Please open the openssl extension first.");
        }
    }
 
    /**
     * 读取公钥和私钥
     * @param string $public_key_file 公钥文件（验签和加密时传入）
     * @param string $private_key_file 私钥文件（签名和解密时传入）
     */
    public function init($public_key_file = '', $private_key_file = '')
    {
        if ($public_key_file) {
            $this->_getPublicKey($public_key_file);
        }
 
        if ($private_key_file) {
            $this->_getPrivateKey($private_key_file);
        }
    }

    
    /**
     * 自定义错误处理
     */
    private function _error($msg)
    {
        die('RSA Error:' . $msg); //TODO
    }
 
    /**
     * 检测填充类型
     * 加密只支持PKCS1_PADDING
     * 解密支持PKCS1_PADDING和NO_PADDING
     *
     * @param int 填充模式
     * @param string 加密en/解密de
     * @return bool
     */
    private function _checkPadding($padding, $type)
    {
        if ($type == 'en') {
            switch ($padding) {
                case OPENSSL_PKCS1_PADDING:
                    $ret = true;
                    break;
                default:
                    $ret = false;
            }
        } else {
            switch ($padding) {
                case OPENSSL_PKCS1_PADDING:
                case OPENSSL_NO_PADDING:
                    $ret = true;
                    break;
                default:
                    $ret = false;
            }
        }
        return $ret;
    }
 
    private function _encode($data, $code)
    {
        switch (strtolower($code)) {
            case 'base64':
                $data = base64_encode('' . $data);
                break;
            case 'hex':
                $data = bin2hex($data);
                break;
            case 'bin':
            default:
        }
        return $data;
    }
 
    private function _decode($data, $code)
    {
        switch (strtolower($code)) {
            case 'base64':
                $data = base64_decode($data);
                break;
            case 'hex':
                $data = $this->_hex2bin($data);
                break;
            case 'bin':
            default:
        }
        return $data;
    }

    
    private function _getPublicKey($file)
    {
        $key_content = $this->_readFile($file);
        if ($key_content) {
            $this->pubKey = openssl_get_publickey($key_content);
        }
    }
 
    private function _getPrivateKey($file)
    {
        $key_content = $this->_readFile($file);
        if ($key_content) {
            $this->priKey = openssl_get_privatekey($key_content);
        }
    }
 
    private function _readFile($file)
    {
        $ret = false;
        if (!file_exists($file)) {
            $this->_error("The file {$file} is not exists");
        } else {
            $ret = file_get_contents($file);
        }
        return $ret;
    }
 
    private function _hex2bin($hex = false)
    {
        $ret = $hex !== false && preg_match('/^[0-9a-fA-F]+$/i', $hex) ? pack("H*", $hex) : false;
        return $ret;
    }
    
    /**
     * 生成Rsa公钥和私钥
     * @param int $private_key_bits 建议：[512, 1024, 2048, 4096]
     * @return array
     */
    public function generate(int $private_key_bits = 1024)
    {
        $rsa = [
            "private_key" => "",
            "public_key" => ""
        ];
 
        $config = [　　　　　　　　
            "config" => "C:/Program Files (x86)/php-7.4.29-Win32-vc15-x64/extras/ssl/openssl.cnf",
            "digest_alg" => "sha512",
            "private_key_bits" => $private_key_bits, #此处必须为int类型
            "private_key_type" => OPENSSL_KEYTYPE_RSA,

        ];
 
        //创建公钥和私钥
        $res = openssl_pkey_new($config);
 
        //提取私钥
        $z = openssl_pkey_export($res, $rsa['private_key'], null, $config);
        var_dump($z);
        var_dump($rsa['private_key']);
 
        //生成公钥
        $rsa['public_key'] = openssl_pkey_get_details($res)["key"];
        /*Array
        (
            [bits] => 512
            [key] =>
            [rsa] =>
            [type] => 0
        )*/
        return $rsa;
    }
 
    /**
     * 生成签名
     *
     * @param string 签名材料
     * @param string 签名编码（base64/hex/bin）
     * @return bool|string 签名值
     */
    public function sign($data, $code = 'base64')
    {
        $ret = false;
        if (openssl_sign($data, $ret, $this->priKey)) {
            $ret = $this->_encode($ret, $code);
        }
        return $ret;
    }
 
    /**
     * 验证签名
     *
     * @param string 签名材料
     * @param string 签名值
     * @param string 签名编码（base64/hex/bin）
     * @return bool
     */
    public function verify($data, $sign, $code = 'base64')
    {
        $ret = false;
        $sign = $this->_decode($sign, $code);
        if ($sign !== false) {
            switch (openssl_verify($data, $sign, $this->pubKey)) {
                case 1:
                    $ret = true;
                    break;
                case 0:
                case -1:
                default:
                    $ret = false;
            }
        }
        return $ret;
    }
 
    /**
     * 加密
     *
     * @param string 明文
     * @param string 密文编码（base64/hex/bin）
     * @param int 填充方式（貌似php有bug，所以目前仅支持OPENSSL_PKCS1_PADDING）
     * @return string 密文
     */
    public function encrypt($data, $code = 'base64', $padding = OPENSSL_PKCS1_PADDING)
    {
        $ret = false;
        if (!$this->_checkPadding($padding, 'en')) $this->_error('padding error');
        if (openssl_public_encrypt($data, $result, $this->pubKey, $padding)) {
            $ret = $this->_encode($result, $code);
        }
        return $ret;
    }
 
    /**
     * 解密
     *
     * @param string 密文
     * @param string 密文编码（base64/hex/bin）
     * @param int 填充方式（OPENSSL_PKCS1_PADDING / OPENSSL_NO_PADDING）
     * @param bool 是否翻转明文（When passing Microsoft CryptoAPI-generated RSA cyphertext, revert the bytes in the block）
     * @return string 明文
     */
    public function decrypt($data, $code = 'base64', $padding = OPENSSL_PKCS1_PADDING, $rev = false)
    {
        $ret = false;
        $data = $this->_decode($data, $code);
        if (!$this->_checkPadding($padding, 'de')) $this->_error('padding error');
        if ($data !== false) {
            if (openssl_private_decrypt($data, $result, $this->priKey, $padding)) {
                $ret = $rev ? rtrim(strrev($result), "\0") : '' . $result;
            }
        }
        return $ret;
    }
}
```

```php
// 使用类库
<?php
 
if (!class_exists("RSA")) {
    require_once "Rsa.class.php";
}
 
$private_key_file = __DIR__ . "/private_key.pem";
$public_key_file = __DIR__ . "/public_key.pem";
 
$rsa = new RSA();
 
// 没有就生成一对
$key = $rsa->generate();
 
file_put_contents($private_key_file, $key['private_key'], LOCK_EX);
file_put_contents($public_key_file, $key['public_key'], LOCK_EX);

$key = [
    "private_key" => file_get_contents($private_key_file),
    "public_key" => file_get_contents($public_key_file)
];

 
//显示数据
echo "private_key:\n" . $key['private_key'] . "\n\r";
echo "public_key:\n" . $key['public_key'] . "\n\r";
 
//要加密的数据
$data = "Web site:http://blog.kilvn.com";
echo '加密的数据：' . $data, "\n";
 
$rsa->init($public_key_file, $private_key_file);
 
 
//加密
$encrypt = $rsa->encrypt($data);
echo "公钥加密后的数据: " . $encrypt . "\n";
 
//解密
$decrypt = $rsa->decrypt($encrypt);
echo "私钥解密后的数据: " . $decrypt, "\n";
 
//签名
$sign = $rsa->sign($data);
echo "签名的数据: " . $sign . "\n";
 
//验证
$verify = $rsa->verify($data, $sign);
echo "验证的数据: " . $verify . "\n", "\n";
```

```php
<?php 


function superLongPublicKeyEncrypt($content, $rsaPublicKey, $choicePath = true, $withBase64 = false)
{
    if ($choicePath) {
        $pubKeyId = openssl_pkey_get_public($rsaPublicKey);//绝对路径读取
    } else {
        $pubKeyId = $rsaPublicKey;//公钥
    }
    $RSA_ENCRYPT_BLOCK_SIZE = 117;
    $result = '';
    $data = str_split($content, $RSA_ENCRYPT_BLOCK_SIZE);
    foreach ($data as $block) {
        openssl_public_encrypt($block, $dataEncrypt, $pubKeyId, OPENSSL_PKCS1_PADDING);
        $result .= $dataEncrypt;
    }

    if ($withBase64) {
        return base64_encode($result);
    } else {
        return $result;
    }
}

function superLongPrivateKeyDecrypt($content, $rsaPrivateKey, $choicePath = true, $withBase64 = false)
{
    if ($choicePath) {
        $priKeyId = openssl_pkey_get_private($rsaPrivateKey);//绝对路径
    } else {
        $priKeyId = $rsaPrivateKey;//私钥
    }

    if ($withBase64) {
        $data = base64_decode($content);
    }

    $RSA_DECRYPT_BLOCK_SIZE = 128;

    $result = '';
    $data = str_split($data, $RSA_DECRYPT_BLOCK_SIZE);
    foreach ($data as $block) {
        openssl_private_decrypt($block, $dataDecrypt, $priKeyId, OPENSSL_PKCS1_PADDING);
        $result .= $dataDecrypt;
    }

    if ($result) {
        return $result;
    } else {
        return false;
    }
}

$private_key = "-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDvluFNiF8IrIsddK0OXBAvVBJH11OKvy9er1tRGn9yEJoHCJY3
EU/xz2LasCK8AwgRIqGJbvDBgRa70c3QT9j+wPqNqqJCSoSEKifnDUk1RgUReJT6
iqWaJyfM+WM3aHnKl61RZL4NV5qKe4CHMtaH/JtBCC/JzpuFER1P1IhCtQIDAQAB
AoGAaFYQb68/k4twWbeB1YsKEVJPU7HV08pGWrmKztr3PTk1mnKG2BxV8DwcFJg3
yCCZ1rx6FFuXxOzudYR8WIctO4wdsEbFky/cEGsfc6JJjiktmZaQ7MvobGNwnoFJ
QvRxDd+5uD87JE19iBSgUpLVtXbv+pZxSpD70vitnMdSctECQQD66Z5HsuC8DUPu
OLQHNN4ra5Op179Xlq7LiEFW4GaVgonw24kiLX23c7CK7295Rgxct1fwQKyuU9br
n2uj8toDAkEA9HJ85BWlm2OfUm6VI3Q99rjlpCnhRyz70+sEtf7if1SpctVxNTkX
UOnXlpPTohjAHNhzh9fa1hh/ySH9sRMu5wJAa//8uh3br/YBxFsx2lw+OPBQGe4c
lSXtzPu0LCHg5f/PQhYs28I696jbV6IiGFA3Z/0e4/HiohLCUp9HJMWWYwJACE53
pfyCUyRwfomZccn6bQ7dZtWxfQyvRgU/dLvDkJYc5/UO0sMs4qf/lnNRhrmWlaRZ
UK1qF0pf1ULdbw360wJBAObrYopW2kvIlE09j9SEgNtgVsmfZlf85c4EAZrFJP/T
8nMNKQGo92Gd3HvbjJ+ZBOP1IFt+FDAsXeSLWLAwJrg=
-----END RSA PRIVATE KEY-----";

$public_key = "-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDvluFNiF8IrIsddK0OXBAvVBJH
11OKvy9er1tRGn9yEJoHCJY3EU/xz2LasCK8AwgRIqGJbvDBgRa70c3QT9j+wPqN
qqJCSoSEKifnDUk1RgUReJT6iqWaJyfM+WM3aHnKl61RZL4NV5qKe4CHMtaH/JtB
CC/JzpuFER1P1IhCtQIDAQAB
-----END PUBLIC KEY-----
";

$content = "hello world";
$res = superLongPublicKeyEncrypt($content,$public_key,false,true);
var_dump($res);
$res = superLongPrivateKeyDecrypt($res,$private_key,false,true);
var_dump($res);
```

### 相关文档

- [RSA加密遇到的坑](https://blog.csdn.net/weixin_34124577/article/details/91403667)
- [PHP-RSA分块加密](http://t.zoukankan.com/meetuj-p-14954533.html)