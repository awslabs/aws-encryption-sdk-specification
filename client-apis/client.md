[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Client

## Version

0.1.0

## Implementations

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                        |
| ---------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| C          | 0.1.0                                  | 0.1.0                     | [session.c](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/session.c)                                                 |
| NodeJS     | 0.1.0                                  | 0.1.0                     | [index.ts](https://github.com/aws/aws-encryption-sdk-javascript/blob/master/modules/client-node/src/index.ts)                         |
| Browser JS | 0.1.0                                  | 0.1.0                     | [index.ts](https://github.com/aws/aws-encryption-sdk-javascript/blob/master/modules/client-browser/src/index.ts)                      |
| Python     | 0.1.0                                  | 0.1.0                     | [\_\_init\_\_.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/__init__.py)                    |
| Java       | 0.1.0                                  | 0.1.0                     | [AwsCrypto.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/AwsCrypto.java) |

## Overview

This document describes the client experience for the AWS Encryption SDK.

The top level client supports configuration settings
that need to be coordinated between encrypt and decrypt.
Coordinating static settings between encrypt and decrypt across hosts is complicated.
It is important that all messages that could be sent to a host can be decrypted by that host.
A top level client makes such settings [hard to misuse](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/tenets.md#hard-to-misuse)
because anything a client encrypts can be decrypted by the same client.

## Initialization

On client initialization,
the caller MUST have the option to provide a:

- [commitment policy](#commitment-policy)
- [maximum number of encrypted data keys](#maximum-number-of-encrypted-data-keys)

If no [commitment policy](#commitment-policy) is provided the default MUST be [REQUIRE_ENCRYPT_REQUIRE_DECRYPT](../framework/algorithm-suites.md#require_encrypt_require_decrypt).
If no [maximum number of encrypted data keys](#maximum-number-of-encrypted-data-keys) is provided
the default MUST result in no limit on the number of encrypted data keys (aside from the limit imposed by the [message format](../format/message-header.md)).

Once a [commitment policy](#commitment-policy) has been set it SHOULD be immutable.

### Commitment Policy

The AWS Encryption SDK MUST use commitment policies defined in the Material Providers Library.

### Maximum Number Of Encrypted Data Keys

A AWS Encryption SDK message can contain multiple encrypted data keys.
This is the maximum number of encrypted data keys that the client will attempt to unwrap.
Callers MUST have a way to disable this limit.

## Operation

### Encrypt

The AWS Encryption SDK Client MUST provide an [encrypt](./encrypt.md#input) function
that adheres to [encrypt](./encrypt.md).

### Decrypt

The AWS Encryption SDK Client MUST provide an [decrypt](./decrypt.md#input) function
that adheres to [decrypt](./decrypt.md).
