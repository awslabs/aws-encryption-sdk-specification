[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Local Cryptographic Materials Cache

## Version

### Changelog

- 0.1.0
  - Initial record
  - [Refactor Cryptographic Materials Cache Specification](../changes/2020-07-14_refactor-cmc-spec/change.md)

## Implementations

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                                       |
| ---------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C          | n/a                                    | n/a                       | [local_cache.c](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/local_cache.c)                                                                                        |
| Javascript | 0.1.0                                  | 0.1.0                     | [get_local_cryptographic_materials_cache.ts](https://github.com/aws/aws-encryption-sdk-javascript/blob/master/modules/cache-material/src/get_local_cryptographic_materials_cache.ts) |
| Python     | n/a                                    | n/a                       | [caches/local.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/caches/local.py)                                                               |
| Java       | 0.1.0                                  | 1.3.0                     | [LocalCryptoMaterialsCache.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/caching/LocalCryptoMaterialsCache.java)        |

## Overview

The local Cryptographic Materials Cache (local CMC)
is a built-in implementation of the [CMC interface](cryptographic-materials-cache.md)
provided by the AWS Encryption SDK.
The local CMC is a configurable, in-memory, least recently used (LRU) cache.
It provides atomic access to [cache entries](cryptographic-materials-cache.md#cache-entry)
per [cache identifier](cryptographic-materials-cache.md#cache-identifier).

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### Time-to-live (TTL)

Each cache entry has a time-to-live (TTL) field
that represents a point in time at which the cache entry MUST be considered invalid.
After a cache entry's TTL has elapsed,
we say that the entry is _TTL-expired_,
and the local CMC MUST NOT return the entry to any caller.

## Initialization

On initialization of the local CMC,
the caller MUST provide the following:

- [Entry Capacity](#entry-capacity)

The local CMC MUST also define the following:

- [Entry Pruning Tail Size](#entry-pruning-tail-size)

### Entry Capacity

The _entry capacity_ is the maximum size of the local CMC in terms of cache entries.
The local CMC MUST NOT store more entries than this value,
except temporarily while performing a Put Cache Entry operation.
The local CMC MUST accept entry capacity values between zero
and an implementation-defined maximum, inclusive.

### Entry Pruning Tail Size

The _entry pruning tail size_
is the number of least recently used entries that the local CMC
MUST check during [pruning](#pruning)
for TTL-expired entries to evict.

## Behaviors

### Put Cache Entry

When calling the Put Cache Entry operation,
the caller MUST provide a time delta value,
which the local CMC uses to derive the cache entry's time-to-live (TTL) value.
The local CMC MUST NOT return any TTL-expired entry.

When performing a Put Cache Entry operation,
the local CMC MUST [prune TTL-expired cache entries](#pruning).

While performing a Put Cache Entry operation,
the local CMC MAY store more entries than the entry capacity.
However, before returning the inserted cache entry,
the local CMC MUST evict least-recently used entries
until the number of stored entries does not exceed the entry capacity.

### Get Cache Entry

When performing a Get Cache Entry operation,
the local CMC MUST [prune TTL-expired cache entries](#pruning).
The local CMC MUST NOT return any TTL-expired entry.

## Pruning

To prune TTL-expired cache entries,
the local CMC MUST evict all TTL-expired entries
among the `N` least recently used entries,
where `N` is the [Entry Pruning Tail Size](#entry-pruning-tail-size).

The local CMC SHOULD also periodically evict all TTL-expired entries
among the `N` least recently used entries.
