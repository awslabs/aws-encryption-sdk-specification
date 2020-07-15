[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Caching Cryptographic Materials Manager

## Version

0.2.0

### Changelog

- 0.2.0
  - [Enforce Safe Handling of Max Plaintext Length in Caching Cryptographic Materials Manager](../changes/2020-07-13_caching-cmm-max-plaintext-length/change.md)
- 0.1.0-preview
  - Initial record

## Implementations

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                                                  |
| ---------- | -------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C          | 0.1.0-preview                          | 0.1.0                     | [cache.h](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/cache.h)                                                                                                |
| NodeJS     | 0.1.0-preview                          | 0.1.0                     | [caching_materials_manager_node.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/caching-materials-manager-node/src/caching_materials_manager_node.ts)          |
| Browser JS | 0.1.0-preview                          | 0.1.0                     | [caching_materials_manager_browser.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/caching-materials-manager-browser/src/caching_materials_manager_browser.ts) |
| Python     | 0.1.0-preview                          | 1.3.0                     | [materials_managers/caching.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/materials_managers/caching.py)                                              |
| Java       | 0.1.0-preview                          | 1.3.0                     | [CachingCryptoMaterialsManager.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/caching/CachingCryptoMaterialsManager.java)           |

## Overview

The Caching Cryptographic Materials Manager (CMM) is a built-in implementation of the [CMM interface](cmm-interface.md) provided by the AWS Encryption SDK.
The caching CMM wraps around another CMM and caches the results of its underlying key provider's encryption and decryption operations.
A caching CMM reduces the number of calls made to the underlying key provider, thereby reducing cost and/or improving performance.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Initialization

On caching CMM initialization, a caching CMM MUST define the following:

- [Underlying Cryptographic Materials Cache (CMC)](#underlying-cryptographic-materials-cache)
- [Underlying Cryptographic Materials Manager (CMM)](#underlying-cryptographic-materials-manager)
- [Cache Limit TTL](#cache-limit-ttl)
- [Partition ID](#partition-id)
- [Limit Bytes](#limit-bytes)
- [Limit Messages](#limit-messages)

### Underlying Cryptographic Materials Cache

The caching CMM intercepts requests for [encryption](cmm-interface.md#encryption-materials-request) and
[decryption](cmm-interface.md#decrypt-materials-request) materials
and forwards them to the underlying [cryptographic materials cache (CMC)](cryptographic-materials-cache.md).

Multiple caching CMMs MAY share the same cryptographic materials cache,
but by default MUST NOT use each other's cache entries.
If multiple caching CMMs are attached to the same cryptograhic materials cache,
they will share cache entries if and only if the [partition ID](#partition-id) parameter is set to the same string.

### Underlying Cryptographic Materials Manager

The underlying [Cryptographic Materials Manager (CMM)](cmm-interface.md#supported-cmms)
to query for encryption/decryption materials on a cache miss.

### Cache Limit TTL

The maximum amount of time in seconds that a data key can be used.
The Caching CMM MUST set a time-to-live (TTL) for data keys in the CMC.
This value must be greater than zero.

### Partition ID

A string that is used to avoid collisions with other CMMs.
If this parameter is not set, the caching CMM MUST set a partition ID
that uniquely identifies the respective caching CMM.
The Partition ID MUST NOT be changed after initialization.

### Limit Bytes

The maximum number of bytes that MAY be encrypted by a single data key.
It is interpreted as Uint64.
If this parameter is not set, the caching CMM MUST set it to a value no more than 2^63-1.
This paramter is set as an additional security thresholds to ensure that,
the data keys expire and are refreshed periodically.

### Limit Messages

The maximum number of messages that MAY be encrypted by a single data key.
It is interpreted as Uint64.
If this parameter is not set, the caching CMM MUST set it to 2^32.
This paramter is set as an additional security thresholds to ensure that,
the data keys expire and are refreshed periodically.

The caching CMM MUST provide a structure as defined below,
to track usage statistics.

### Usage Stats

The usage stats contains two fields:

- [Messages Encrypted](#messages-encrypted)
- [Bytes Encrypted](#bytes-encrypted)

When the caching CMM stores encryption materials into the cryptographic materials cache,
the caching CMM MUST set the initial usage stats for the cache entry.

When the caching CMM obtains encryption materials from the cryptographic materials cache,
the caching CMM MUST update the usage stats for the cache entry retrieved.

#### Messages Encrypted

The number of messages encrypted by the [encryption](structures.md#encryption-materials) materials.

#### Bytes Encrypted

The number of bytes encrypted by the [encryption](structures.md#encryption-materials) materials.

## Behaviors

### Get Encryption Materials

If the [algorithm suite](algorithm-suites.md) requested contains a [Identity KDF](algorithm-suites.md#identity-kdf),
or if the request does not include a [Max Plaintext Length](cmm-interface.md#encryption-materials-request) value,
the caching CMM MUST obtain the encryption materials by making a call to the underlying CMM's [Get Encryption Materials](cmm-interface.md#get-encryption-materials) function.

Otherwise, the caching CMM MUST attempt to find the [encryption materials](structures.md#encryption-materials)
from the underlying [cryptographic materials cache (CMC)](#underlying-cryptographic-materials-cache).

If a cache entry is found, the caching CMM MUST return the encryption materials retrieved.
If a cache entry is not found, the caching CMM MUST then attempt to obtain the encryption materials
by making a call to the underlying CMM's [Get Encryption Materials](cmm-interface.md#get-encryption-materials).

If the caching CMM makes a call to the underlying CMM's [Get Encryption Materials](cmm-interface.md#get-encryption-materials) operation,
then it MUST include a [Max Plaintext Length](cmm-interface.md#encryption-materials-request) value,
which MUST be equal to its [Limit Bytes](#limit-bytes) value.

If the [algorithm suite](algorithm-suites.md) requested does not contain an [Identity KDF](algorithm-suites.md#identity-kdf),
and if the request includes a [Max Plaintext Length](cmm-interface.md#encryption-materials-request) value,
the caching CMM MUST add the encryption materials obtained from the underlying CMM into the underlying CMC.

If the [algorithm suite](algorithm-suites.md) requested contains an Identity KDF,
or if the request does not include a [Max Plaintext Length](cmm-interface.md#encryption-materials-request) value,
the caching CMM MUST NOT store the encryption materials in the underlying CMC.

### Decrypt Materials

If the [algorithm suite](algorithm-suites.md) requested contains a [Identity KDF](algorithm-suites.md#identity-kdf),
the caching CMM MUST obtain the decryption materials by making a call to the underlying CMM's [Decrypt Materials](cmm-interface.md#decrypt-materials) function.

Otherwise, the caching CMM MUST attempt to find the [decryption materials](structures.md#decryption-materials)
from the [underlying CMC](#underlying-cryptographic-materials-cache).

If a cache entry is found, the caching CMM MUST return the decryption materials retrieved.
If a cache entry is not found or the cache entry is expired, the caching CMM MUST attempt to obtain the decryption materials
by making a call to the underlying CMM's [Decrypt Materials](cmm-interface.md#decrypt-materials).

If the [algorithm suite](algorithm-suites.md) requested does not contain an [Identity KDF](algorithm-suites.md#identity-kdf),
the caching CMM MUST add the decryption materials obtained from the underlying CMM into the underlying CMC.

If the [algorithm suite](algorithm-suites.md) requested contains an Identity KDF,
the caching CMM MUST NOT store the decryption materials in the underlying CMC.

## Security Considerations

[TODO: What security properties can the caching CMM guarantee?]
