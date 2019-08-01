# Cryptographic Materials Manager Interface

## Overview

The Cryptographic Materials Manager (CMM) acts as a liaison between the AWS Encryption SDK and a [Key Provider](#key-provider.md).  
It assembles the cryptographic materials used to encrypt the plaintext data and decrypt the ciphertext.

The [Default CMM](#default-cmm.md) is provided by the AWS Encryption SDK to interact with the [Key Provider](#key-provider.md).  
OPTIONALLY, a user MAY create their own custom CMM.

The CMM is an ideal point for customization and extension, such as support for policy enforcement and caching.  
The AWS Encryption SDK currently provides a [Caching CMM](#caching-cmm.md) to support data key caching requirements.

## Structure

The CMM Interface consists of:

- [Encryption Materials Request](#encryption-materials-request)
- [Generate Encryption Materials](#generate-encryption-materials)
- [Decryption Materials Request](#decryption-materials-request)
- [Decryption Materials](#decryption-request)

A successful implementation of the CMM MUST include all of the above.

### Encryption Materials Request

The CMM receives encryption request from a user and attempts to [generatate encryption materials](#generate-encryption-materials).

The encryption request MUST include the following:

- [Encryption Context](#message-header.md#encryption-context)

Note that the [Encryption Context](#encryption-context.md) provided MAY be empty.

The encryption request MAY include the following:

- [Algorithm Suite](#algorithm-suite.md)
- [Plain Text Length](#TODO)

When an [encryption algorithm with signing](#algorithm-suite.md) is provided, the CMM MUST modify the [Encryption Context](#header.md#encryption-context).  
This is done by adding a public key pair to the existing encryption context.  
The public key pair MUST contain a reserved name, `aws-crypto-public-key`, and a value `{Qtxt}` that represents the public verification key, i.e `{'aws-crypto-public-key', Qtxt}`.  
For more informaton refer to the [Encryption Context](#encryption-context.md) specification.

### Generate Encryption Materials

The CMM attempts to generate the encryption materials, upon receiving an [encryption request](#encryption-request).

The encryption materials MUST include the following:

- [Algorithm Suite](#algorithm-suite.md)
- [Data Key](#TODO)
- [Encrypted Data Keys](#message-header.md#encrypted-data-key)
- [Encryption Context](#message-header.md#encryption-context)

The encryption materials MAY include the following:

- [Base64 encoded](#TODO) [Signing Key](#message-header.md#signing-key)

### Decryption Request

The CMM receives decryption request from a user and attempts to [generatate decryption materials](#generate-decryption-materials).

The decryption request MUST include the following:

- [Algorithm Suite](#algorithm-suite.md)
- [Encrypted Data Keys](#message-header.md#encrypted-data-key)
- [Encryption Context](#message-header.md#encryption-context)

Note that the [Encryption Context](#encryption-context.md) provided MAY be empty.

### Decryption Materials

The CMM obtains the decryption materials, upon receiving an [decryption request](#decryption-request).

The decryption materials MUST include the following:

- [Data Key](#TODO)

The decryption materials MAY include the following:

- Raw [Signature Verification Key](#message-header.md#signing-key)

## Test Vectors

[TODO](https://github.com/awslabs/aws-crypto-tools-test-vector-framework)

## Current Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/materials.h)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/materials_managers/__init__.py)
- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/CryptoMaterialsManager.java)
