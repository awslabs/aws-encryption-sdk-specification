[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Storage

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

Key Storage is the interface for customers to construct their own storage layer for the [key store](../branch-key-store.md#overview).
This is useful to either customize how DynamoDB is used or stored,
or to implement a custom storage system such as S3,
or to consolidate keystore data access behind some remote micro-service.

The key storage interface is not responsible for making sure that the encrypted keys are of the appropriate types.
This is the responsibility of the wrapping key store.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### EncryptedHierarchicalKey

An encrypted structure that holds an encrypted beacon or branch key.

This structure MUST include all of the following fields:

- [BranchKeyId](./structures.md#branch-key-id)
- [Type](#type)
- CreateTime: Timestamp in ISO 8601 format in UTC, to microsecond precision.
- KmsArn: The AWS KMS Key ARN used to protect the CiphertextBlob value.
- [EncryptionContext](./structures.md#encryption-context-3)
- CiphertextBlob: The encrypted binary for the hierarchical key.

### Type

A union that MUST hold the following three options

- ActiveHierarchicalSymmetricVersion [HierarchicalSymmetricVersion](#hierarchicalsymmetricversion)
- HierarchicalSymmetricVersion [HierarchicalSymmetricVersion](#hierarchicalsymmetricversion)
- ActiveHierarchicalSymmetricBeacon

### HierarchicalSymmetricVersion

A structure that MUST have one member,
the UTF8 Encoded value of the version of the branch key.

## Interface

The KeyStorageInterface MUST support the following operations:

- [WriteNewEncryptedBranchKey](#writenewencryptedbranchkey)
- [WriteNewEncryptedBranchKeyVersion](#writenewencryptedbranchkeyversion)
- [GetEncryptedActiveBranchKey](#getencryptedactivebranchkey)
- [GetEncryptedBranchKeyVersion](#getencryptedbranchkeyversion)
- [GetEncryptedBeaconKey](#getencryptedbeaconkey)
- [GetKeyStorageInfo](#getkeystorageinfo)

### WriteNewEncryptedBranchKey

The WriteNewEncryptedBranchKey caller MUST provide:

- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of ActiveHierarchicalSymmetricVersion
- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of HierarchicalSymmetricVersion
- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of ActiveHierarchicalSymmetricBeacon

All three keys need to be written together with an atomic transactional write.
See the [default key stores's write new key to store specification](./default-key-storage-interface.md#writenewencryptedbranchkey) for more details about what storage properties are expected.

### WriteNewEncryptedBranchKeyVersion

The WriteNewEncryptedBranchKeyVersion caller MUST provide:

- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of ActiveHierarchicalSymmetricVersion
- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of HierarchicalSymmetricVersion

Both keys need to be written together with a consistent transactional write.
See [default key stores's write new branch key version to store specification](./default-key-storage-interface.md#writenewencryptedbranchkeyversion) for more details about what storage properties are expected.

### GetEncryptedActiveBranchKey

The GetEncryptedActiveBranchKey caller MUST provide the same inputs as the [GetActiveBranchKey](../branch-key-store.md#getactivebranchkey) operation.
It MUST return an [EncryptedHierarchicalKey](#encryptedhierarchicalkey).

### GetEncryptedBranchKeyVersion

The GetEncryptedBranchKeyVersion caller MUST provide the same inputs as the [GetBranchKeyVersion](../branch-key-store.md#getbranchkeyversion) operation.
It MUST return an [EncryptedHierarchicalKey](#encryptedhierarchicalkey).

### GetEncryptedBeaconKey

The GetEncryptedBeaconKey caller MUST provide the same inputs as the [GetBeaconKey](../branch-key-store.md#getbeaconkey) operation.
It MUST return an [EncryptedHierarchicalKey](#encryptedhierarchicalkey).

### GetKeyStorageInfo

It MUST return the physical table name.
