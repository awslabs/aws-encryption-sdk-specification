[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Storage

## Version

0.3.0

### Changelog

- 0.3.0
  - [Branch Key Storage Changes for Mutating Branch Keys](../../changes/2025-01-17_key-store-storage-mutations/background.md)
- 0.2.0
  - [Mitigate Update Race in the Branch Key Store](../../changes/2025-01-16_key-store-mitigate-update-race/background.md)
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

- ActiveHierarchicalSymmetricVersion [ActiveHierarchicalSymmetric](#activehierarchicalsymmetric)
- HierarchicalSymmetricVersion [HierarchicalSymmetric](#hierarchicalsymmetric)
- ActiveHierarchicalSymmetricBeacon

### ActiveHierarchicalSymmetric

A structure that MUST have one member,
the UTF8 Encoded value of the version of the branch key.

### HierarchicalSymmetric

A structure that MUST have one member,
the UTF8 Encoded value of the version of the branch key.

### OverWriteEncryptedHierarchicalKey

A structure that holds two related [EncryptedHierarchicalKeys](#encryptedhierarchicalkey):

- Item: the [EncryptedHierarchicalKey](#encryptedhierarchicalkey) that will be written
- Old: the [EncryptedHierarchicalKey](#encryptedhierarchicalkey) that was read and is presumed to be the currently persisted item that will be replaced by `Item`.

Both `Item` and `Old` MUST have the same Branch Key ID and Type.

### EncryptedHierarchicalKeys

A List of
[EncryptedHierarchicalKey](../../framework/key-store/key-storage.md#encryptedhierarchicalkey).

### MutationCommitment

A structure holding information on
an in-flight Mutation of a Branch Key
that is never updated in-flight.

The members are:

- `Identifier`: a string, The Branch Key (ID) under Mutation
- `CreateTime`: a string, The ISO 8061 UTC Timestamp of when the Mutation was started
- `UUID`: a string, A unique identifier for the Mutation
- `Original`: a binary blob, A commitment of the original mutable properties of the Branch Key
- `Terminal`: a binary blob, A commitment of the terminal mutable properties of the Branch Key
- `Input`: a binary blob, A Description of the input to initialize a Mutation
- `CiphertextBlob`: a binary blob, which MAY be used to protect the Mutation Commitment

### MutationIndex

A structure holding information on
an in-flight Mutation of a Branch Key
that is regularly changed in-flight.

The members are:

- `Identifier`: a string, The Branch Key (ID) under Mutation
- `CreateTime`: a string, The ISO 8061 UTC Timestamp of when the Mutation was started
- `UUID`: a string, A unique identifier for the Mutation
- `PageIndex`: a binary blob, Indirectly describes which items of the Branch Key have already been Mutated
- `CiphertextBlob`: a binary blob, which MAY be used to protect the Mutation Index

### OverWriteMutationIndex

A structure, much like
[OverWriteEncryptedHierarchicalKey](../../framework/key-store/key-storage.md#overwriteencryptedhierarchicalkey),
that affords a conditioned update to the Mutation Index.

The members are:

- `Index`: The new Mutation Index
- `Old`: The last read Mutation Index

### WriteInitializeMutationVersion

A structure that allows for a Mutation to either
create a new Version (DECRYPT*ONLY) of a Branch Key
or update the Active's Version (DECRYPT_ONLy) of a Branch Key,
via an \_Optimistic Lock*.

The members are:

- `rotate`: An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of HierarchicalSymmetricVersion
- `mutate`: An [OverWriteEncryptedHierarchicalKey](#overwriteencryptedhierarchicalkey) with both `Item` and `Old` with [type](#type) of HierarchicalSymmetricVersion

## Interface

The KeyStorageInterface MUST support the following operations:

- [WriteNewEncryptedBranchKey](#writenewencryptedbranchkey)
- [WriteNewEncryptedBranchKeyVersion](#writenewencryptedbranchkeyversion)
- [GetEncryptedActiveBranchKey](#getencryptedactivebranchkey)
- [GetEncryptedBranchKeyVersion](#getencryptedbranchkeyversion)
- [GetEncryptedBeaconKey](#getencryptedbeaconkey)
- [GetKeyStorageInfo](#getkeystorageinfo)
- [GetItemsForInitializeMutation](#getitemsforinitializemutation)
- [WriteInitializeMutation](#writeinitializemutation)
- [WriteAtomicMutation]
- [QueryForVersions]
- [WriteMutatedVersions]
- [GetMutation]
- [DeleteMutation]
- [WriteMutationIndex]

### WriteNewEncryptedBranchKey

The WriteNewEncryptedBranchKey caller MUST provide:

- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of ActiveHierarchicalSymmetricVersion
- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of HierarchicalSymmetricVersion
- An [EncryptedHierarchicalKey](#encryptedhierarchicalkey) with a [type](#type) of ActiveHierarchicalSymmetricBeacon

All three keys need to be written together with an atomic transactional write.
See the [default key stores's write new key to store specification](./default-key-storage-interface.md#writenewencryptedbranchkey) for more details about what storage properties are expected.

### WriteNewEncryptedBranchKeyVersion

The WriteNewEncryptedBranchKeyVersion caller MUST provide:

- An [OverWriteEncryptedHierarchicalKey](#overwriteencryptedhierarchicalkey) with both `Item` and `Old` with [type](#type) of ActiveHierarchicalSymmetricVersion
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

### GetItemsForInitializeMutation

The `GetItemsForInitializeMutation` caller MUST provide an `Identifer` that is the Branch Key ID.

The operation MUST fetch the following from the storage,
if they exist:

- [`MutationCommitment`](#mutationcommitment) for the `Identifier`
- [`MutationIndex`](#mutationindex) for the `Identifier`

The operation MUST fetch the following from the storage:

- The Active Branch Key for the `Identifier`
- The Active Beacon Key for the `Identifier`

If the Active Branch Key or Active Beacon Key are not found,
an error MUST be thrown.

If any of the items are malformed,
an error MUST be thrown.

Otherwise,
at least the Active Branch and Active Beacon Keys MUST be
returned as [EncryptedHierarchicalKey](#encryptedhierarchicalkey),
along with the Mutation Commitment or Mutation Index IF they are present.

### WriteInitializeMutation

The caller MUST provide:

- `ActiveItem`: An [OverWriteEncryptedHierarchicalKey](#overwriteencryptedhierarchicalkey)
- `BeaconItem`: An [OverWriteEncryptedHierarchicalKey](#overwriteencryptedhierarchicalkey)
- `Version`: An [WriteInitializeMutationVersion](#writeinitializemutationversion)
- `MutationCommitment`: A [MutationCommitment](#mutationcommitment)
- `MutationIndex`: A [MutationIndex](#mutationindex)

If any of these are missing or malformed,
an error MUST be thrown.

All of these structures MUST have the same Branch Key ID/Identifier.

The operation MUST atomically persist all 5 items
in one write.

The write MUST only succeed if:

- there is no existing Mutation Commitment for the Branch Key ID
- the CiphertextBlob of the Branch Key ID's Active is equal to `ActiveItem`'s `old` CipherText Blob.
- the CiphertextBlob of the Branch Key ID's Beacon is equal to `BeaconItem`'s `old` CipherText Blob.
- If the `Version` is `mutate`, the CiphertextBlob of the Version is equal to `mutate`'s `old` CipherText Blob.
- If the `Version` is `rotate`, there is no Branch Key Item with the same `type` value as `rotate`

If the write does not succeed because of the above constraints,
the operation MUST yield error;
this error SHOULD suggest a race is occurring.

If the write fails for other reasons,
the operation MUST yield error;
this error SHOULD suggest why the write failed.

Otherwise, the operation MUST return a success.
