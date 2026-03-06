[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Client

## Overview

This document describes the client experience for the AWS Encryption SDK.

The top level client supports configuration settings
that need to be coordinated between encrypt and decrypt.
Coordinating static settings between encrypt and decrypt across hosts is complicated.
It is important that all messages that could be sent to a host can be decrypted by that host.
A top level client makes such settings [hard to misuse](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/tenets.md#hard-to-misuse)
because anything a client encrypts can be decrypted by the same client.

## Initialization

- On client initialization,
  the caller MUST have the option to provide a [commitment policy](#commitment-policy).
- On client initialization,
  the caller MUST have the option to provide a [maximum number of encrypted data keys](#maximum-number-of-encrypted-data-keys).

If no [commitment policy](#commitment-policy) is provided the default MUST be [REQUIRE_ENCRYPT_REQUIRE_DECRYPT](../framework/algorithm-suites.md#require_encrypt_require_decrypt).
If no [maximum number of encrypted data keys](#maximum-number-of-encrypted-data-keys) is provided
the default MUST result in no limit on the number of encrypted data keys (aside from the limit imposed by the [message format](../format/message-header.md)).

Once a [commitment policy](#commitment-policy) has been set it SHOULD be immutable.

### Commitment Policy

The AWS Encryption SDK MUST use the ESDK [commitment policies](../framework/commitment-policy.md) defined in the Material Providers Library.

### Maximum Number Of Encrypted Data Keys

A AWS Encryption SDK message can contain multiple encrypted data keys.
This is the maximum number of encrypted data keys that the client will attempt to unwrap.

## Operation

### Encrypt

The AWS Encryption SDK Client MUST provide an [encrypt](./encrypt.md#input) function
that adheres to [encrypt](./encrypt.md).

### Decrypt

The AWS Encryption SDK Client MUST provide an [decrypt](./decrypt.md#input) function
that adheres to [decrypt](./decrypt.md).
